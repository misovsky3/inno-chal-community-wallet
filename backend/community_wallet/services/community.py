from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Optional

from fastapi import HTTPException

from ..schemas.account import Account, UserAccount
from ..schemas.contribution import (
    ContributionCreateRequest,
    ContributionEntry,
    ContributionSummary,
)
from ..schemas.goal import Goal, GoalCreateRequest, GoalProgress
from ..schemas.membership import AccountMember, Membership
from ..schemas.organization import Organization
from ..schemas.transaction import (
    Transaction,
    TransactionCreateRequest,
    TransactionDirection,
)
from ..schemas.user import User
from ..storage.csv_store import CsvStore


DATA_DIR = Path(__file__).resolve().parents[2] / "data"
USERS_STORE = CsvStore(DATA_DIR / "users.csv", ("id", "name", "email"))
ACCOUNTS_STORE = CsvStore(
    DATA_DIR / "accounts.csv",
    ("id", "name", "iban", "balance", "currency", "payme_url"),
)
MEMBERSHIPS_STORE = CsvStore(
    DATA_DIR / "memberships.csv", ("account_id", "user_id", "role")
)
ORGANIZATIONS_STORE = CsvStore(DATA_DIR / "organizations.csv", ("id", "name"))
ACCOUNT_ORGANIZATIONS_STORE = CsvStore(
    DATA_DIR / "account_organizations.csv", ("account_id", "organization_id")
)
TRANSACTIONS_STORE = CsvStore(
    DATA_DIR / "transactions.csv",
    (
        "id",
        "account_id",
        "date",
        "amount",
        "currency",
        "counterparty",
        "direction",
        "payment_type",
        "details",
        "recipient_message",
        "variable_symbol",
        "specific_symbol",
        "constant_symbol",
        "payer_reference",
        "goal_id",
        "payer_user_id",
        "contribution_id",
    ),
)
CONTRIBUTIONS_STORE = CsvStore(
    DATA_DIR / "contributions.csv",
    ("id", "account_id", "user_id", "goal_id", "amount", "currency", "due_date"),
)
GOALS_STORE = CsvStore(
    DATA_DIR / "goals.csv",
    (
        "id",
        "account_id",
        "name",
        "goal_type",
        "target_amount",
        "currency",
        "start_date",
        "end_date",
        "description",
    ),
)


def list_users() -> list[User]:
    return [User.model_validate(row) for row in USERS_STORE.read_all()]


def get_user(user_id: int) -> Optional[User]:
    return next((user for user in list_users() if user.id == user_id), None)


def list_accounts() -> list[Account]:
    return [Account.model_validate(row) for row in ACCOUNTS_STORE.read_all()]


def get_account(account_id: int) -> Optional[Account]:
    return next(
        (account for account in list_accounts() if account.id == account_id), None
    )


def list_account_contributions(account_id: int) -> ContributionSummary:
    if get_account(account_id) is None:
        raise HTTPException(status_code=404, detail="Account not found")

    users_by_id = {user.id: user for user in list_users()}
    transactions_by_contribution: dict[tuple[int, str], Decimal] = {}
    for row in TRANSACTIONS_STORE.read_all():
        transaction = Transaction.model_validate(row)
        if (
            transaction.account_id == account_id
            and transaction.direction == "credit"
            and transaction.contribution_id is not None
        ):
            key = (transaction.contribution_id, transaction.currency)
            transactions_by_contribution[key] = (
                transactions_by_contribution.get(
                    key, Decimal("0")
                )
                + transaction.amount
            )

    contributions = []
    for row in CONTRIBUTIONS_STORE.read_all():
        if int(row["account_id"]) != account_id:
            continue
        user_id = int(row["user_id"])
        user = users_by_id.get(user_id)
        if user is None:
            continue

        amount = Decimal(row["amount"])
        paid_amount = transactions_by_contribution.get(
            (int(row["id"]), row["currency"]), Decimal("0")
        )
        remaining_amount = max(amount - paid_amount, Decimal("0"))
        due_date = date.fromisoformat(row["due_date"]) if row["due_date"] else None
        if remaining_amount == 0:
            status = "paid"
        elif due_date is not None and due_date < date.today():
            status = "overdue"
        elif paid_amount > 0:
            status = "partial"
        else:
            status = "pending"

        contributions.append(
            ContributionEntry(
                id=int(row["id"]),
                account_id=account_id,
                user_id=user_id,
                user_name=user.name,
                goal_id=int(row["goal_id"]) if row["goal_id"] else None,
                amount=amount,
                currency=row["currency"],
                due_date=due_date,
                paid_amount=paid_amount,
                remaining_amount=remaining_amount,
                status=status,
            )
        )

    member_states = {}
    for contribution in contributions:
        member_states.setdefault(contribution.user_id, []).append(
            contribution.status == "paid"
        )
    paid_members = sum(all(states) for states in member_states.values())

    return ContributionSummary(
        account_id=account_id,
        total_members=len(member_states),
        paid_members=paid_members,
        expected_amount=sum((item.amount for item in contributions), Decimal("0")),
        paid_amount=sum((item.paid_amount for item in contributions), Decimal("0")),
        contributions=contributions,
    )


def create_account_contribution(
    account_id: int, request: ContributionCreateRequest
) -> ContributionEntry:
    account = get_account(account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    if request.currency != account.currency:
        raise HTTPException(
            status_code=422, detail="Contribution currency must match account currency"
        )
    if get_user(request.user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")

    memberships = [
        Membership.model_validate(row)
        for row in MEMBERSHIPS_STORE.read_all()
        if int(row["account_id"]) == account_id
    ]
    if not any(member.user_id == request.user_id for member in memberships):
        raise HTTPException(status_code=422, detail="Contribution user must be a member")
    if not any(
        member.user_id == request.created_by_user_id and member.role == "admin"
        for member in memberships
    ):
        raise HTTPException(status_code=403, detail="Demo account admin role required")

    if request.goal_id is not None and not any(
        int(row["id"]) == request.goal_id and int(row["account_id"]) == account_id
        for row in GOALS_STORE.read_all()
    ):
        raise HTTPException(status_code=422, detail="Goal does not belong to account")

    rows = CONTRIBUTIONS_STORE.read_all()
    contribution_id = max((int(row["id"]) for row in rows), default=0) + 1
    CONTRIBUTIONS_STORE.append(
        {
            "id": contribution_id,
            "account_id": account_id,
            "user_id": request.user_id,
            "goal_id": request.goal_id or "",
            "amount": request.amount,
            "currency": request.currency,
            "due_date": request.due_date.isoformat() if request.due_date else "",
        }
    )
    summary = list_account_contributions(account_id)
    return next(item for item in summary.contributions if item.id == contribution_id)


def list_account_members(account_id: int) -> list[AccountMember]:
    users_by_id = {user.id: user for user in list_users()}
    memberships = [
        Membership.model_validate(row)
        for row in MEMBERSHIPS_STORE.read_all()
        if int(row["account_id"]) == account_id
    ]
    return [
        AccountMember(
            **users_by_id[membership.user_id].model_dump(), role=membership.role
        )
        for membership in memberships
        if membership.user_id in users_by_id
    ]


def list_user_accounts(user_id: int) -> list[UserAccount]:
    accounts_by_id = {account.id: account for account in list_accounts()}
    memberships = [
        Membership.model_validate(row)
        for row in MEMBERSHIPS_STORE.read_all()
        if int(row["user_id"]) == user_id
    ]
    return [
        UserAccount(
            **accounts_by_id[membership.account_id].model_dump(), role=membership.role
        )
        for membership in memberships
        if membership.account_id in accounts_by_id
    ]


def list_account_organizations(account_id: int) -> list[Organization]:
    organizations_by_id = {
        organization.id: organization
        for organization in (
            Organization.model_validate(row)
            for row in ORGANIZATIONS_STORE.read_all()
        )
    }
    organization_ids = [
        int(row["organization_id"])
        for row in ACCOUNT_ORGANIZATIONS_STORE.read_all()
        if int(row["account_id"]) == account_id
    ]
    return [
        organizations_by_id[organization_id]
        for organization_id in organization_ids
        if organization_id in organizations_by_id
    ]


def list_account_transactions(
    account_id: int,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    direction: Optional[TransactionDirection] = None,
    query: Optional[str] = None,
) -> list[Transaction]:
    transactions = [
        Transaction.model_validate(row)
        for row in TRANSACTIONS_STORE.read_all()
        if int(row["account_id"]) == account_id
    ]

    if date_from is not None:
        transactions = [item for item in transactions if item.date >= date_from]
    if date_to is not None:
        transactions = [item for item in transactions if item.date <= date_to]
    if direction is not None:
        transactions = [item for item in transactions if item.direction == direction]
    if query:
        search_term = query.casefold()
        transactions = [
            item
            for item in transactions
            if any(
                search_term in str(value).casefold()
                for value in (
                    item.date,
                    item.amount,
                    item.counterparty,
                    item.payment_type,
                    item.details,
                    item.recipient_message,
                    item.variable_symbol,
                    item.payer_reference,
                )
                if value is not None
            )
        ]

    return sorted(transactions, key=lambda item: (item.date, item.id), reverse=True)


def create_account_transaction(
    account_id: int, request: TransactionCreateRequest
) -> Transaction:
    account = get_account(account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    if request.currency != account.currency:
        raise HTTPException(
            status_code=422, detail="Transaction currency must match account currency"
        )

    memberships = [
        Membership.model_validate(row)
        for row in MEMBERSHIPS_STORE.read_all()
        if int(row["account_id"]) == account_id
    ]
    requester_membership = next(
        (
            member
            for member in memberships
            if member.user_id == request.created_by_user_id
        ),
        None,
    )
    if requester_membership is None:
        raise HTTPException(status_code=403, detail="Community membership required")
    if request.direction == "debit" and requester_membership.role != "admin":
        raise HTTPException(status_code=403, detail="Demo account admin role required")
    if request.goal_id is not None:
        goal = next(
            (
                Goal.model_validate(row)
                for row in GOALS_STORE.read_all()
                if int(row["id"]) == request.goal_id
                and int(row["account_id"]) == account_id
            ),
            None,
        )
        if goal is None:
            raise HTTPException(status_code=422, detail="Goal does not belong to account")
        if request.direction != "credit":
            raise HTTPException(
                status_code=422, detail="Goal transactions must be credits"
            )
        if request.date < goal.start_date or (
            goal.end_date is not None and request.date > goal.end_date
        ):
            raise HTTPException(
                status_code=422, detail="Transaction date is outside the goal period"
            )

    if request.direction == "debit" and request.amount > account.balance:
        raise HTTPException(status_code=422, detail="Insufficient account balance")

    transaction_rows = TRANSACTIONS_STORE.read_all()
    transaction_id = max(
        (int(row["id"]) for row in transaction_rows),
        default=0,
    ) + 1
    transaction = Transaction(
        id=transaction_id,
        account_id=account_id,
        goal_id=request.goal_id,
        payer_user_id=request.created_by_user_id if request.direction == "credit" else None,
        contribution_id=None,
        date=request.date,
        amount=request.amount,
        currency=request.currency,
        counterparty=request.counterparty.strip(),
        direction=request.direction,
        payment_type=request.payment_type.strip(),
        details=request.details,
        recipient_message=request.recipient_message,
        variable_symbol=request.variable_symbol,
        specific_symbol=request.specific_symbol,
        constant_symbol=request.constant_symbol,
        payer_reference=request.payer_reference,
    )
    transaction_row = transaction.model_dump(mode="json")
    TRANSACTIONS_STORE.append(
        {
            key: "" if value is None else value
            for key, value in transaction_row.items()
        }
    )

    updated_accounts = ACCOUNTS_STORE.read_all()
    balance_adjustment = (
        request.amount if request.direction == "credit" else -request.amount
    )
    for row in updated_accounts:
        if int(row["id"]) == account_id:
            row["balance"] = str(account.balance + balance_adjustment)
            break
    ACCOUNTS_STORE.write_all(updated_accounts)
    return transaction


def list_account_goals(account_id: int) -> list[GoalProgress]:
    goals = [
        Goal.model_validate(row)
        for row in GOALS_STORE.read_all()
        if int(row["account_id"]) == account_id
    ]
    transactions = [
        Transaction.model_validate(row)
        for row in TRANSACTIONS_STORE.read_all()
        if int(row["account_id"]) == account_id
    ]
    today = date.today()
    results = []

    for goal in goals:
        raised_amount = sum(
            (
                transaction.amount
                for transaction in transactions
                if transaction.goal_id == goal.id
                and transaction.direction == "credit"
                and transaction.date >= goal.start_date
                and (goal.end_date is None or transaction.date <= goal.end_date)
            ),
            start=Decimal("0"),
        )
        remaining_amount = max(goal.target_amount - raised_amount, Decimal("0"))
        progress_percentage = min(
            raised_amount / goal.target_amount * Decimal("100"), Decimal("100")
        ).quantize(Decimal("0.01"))

        if raised_amount >= goal.target_amount:
            status = "completed"
        elif goal.goal_type == "temporary" and goal.end_date and today > goal.end_date:
            status = "expired"
        else:
            status = "in_progress"

        results.append(
            GoalProgress(
                **goal.model_dump(),
                raised_amount=raised_amount,
                remaining_amount=remaining_amount,
                progress_percentage=progress_percentage,
                status=status,
            )
        )

    return results


def get_account_goal(account_id: int, goal_id: int) -> Optional[GoalProgress]:
    return next(
        (goal for goal in list_account_goals(account_id) if goal.id == goal_id),
        None,
    )


def create_account_goal(
    account_id: int, request: GoalCreateRequest
) -> GoalProgress:
    account = get_account(account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")

    membership = next(
        (
            Membership.model_validate(row)
            for row in MEMBERSHIPS_STORE.read_all()
            if int(row["account_id"]) == account_id
            and int(row["user_id"]) == request.created_by_user_id
        ),
        None,
    )
    if membership is None or membership.role != "admin":
        raise HTTPException(status_code=403, detail="Demo account admin role required")
    if request.end_date < date.today():
        raise HTTPException(status_code=422, detail="end_date cannot be in the past")

    rows = GOALS_STORE.read_all()
    goal_id = max((int(row["id"]) for row in rows), default=0) + 1
    GOALS_STORE.append(
        {
            "id": goal_id,
            "account_id": account_id,
            "name": request.name.strip(),
            "goal_type": "temporary",
            "target_amount": request.target_amount,
            "currency": account.currency,
            "start_date": date.today().isoformat(),
            "end_date": request.end_date.isoformat(),
            "description": request.description or "",
        }
    )
    return next(
        goal for goal in list_account_goals(account_id) if goal.id == goal_id
    )