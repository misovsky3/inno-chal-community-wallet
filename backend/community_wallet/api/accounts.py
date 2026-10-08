from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query

from ..schemas.account import Account
from ..schemas.contribution import (
    ContributionCreateRequest,
    ContributionEntry,
    ContributionSummary,
)
from ..schemas.goal import GoalCreateRequest, GoalProgress
from ..schemas.membership import AccountMember
from ..schemas.organization import Organization
from ..schemas.transaction import Transaction, TransactionCreateRequest
from ..services.community import (
    create_account_contribution,
    create_account_goal,
    create_account_transaction,
    get_account_goal,
    get_account,
    list_account_contributions,
    list_account_goals,
    list_account_members,
    list_account_organizations,
    list_accounts,
    list_account_transactions,
)
from ..services.notifications import notify_account_members_new_goal


router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[Account])
def get_accounts() -> list[Account]:
    return list_accounts()


@router.get("/{account_id}", response_model=Account)
def get_account_details(account_id: int) -> Account:
    account = get_account(account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.get("/{account_id}/members", response_model=list[AccountMember])
def get_account_members(account_id: int) -> list[AccountMember]:
    if get_account(account_id) is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return list_account_members(account_id)


@router.get("/{account_id}/organizations", response_model=list[Organization])
def get_account_organizations(account_id: int) -> list[Organization]:
    if get_account(account_id) is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return list_account_organizations(account_id)


@router.get("/{account_id}/goals", response_model=list[GoalProgress])
def get_account_goals(account_id: int) -> list[GoalProgress]:
    if get_account(account_id) is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return list_account_goals(account_id)


@router.get("/{account_id}/goals/{goal_id}", response_model=GoalProgress)
def get_account_goal_details(account_id: int, goal_id: int) -> GoalProgress:
    if get_account(account_id) is None:
        raise HTTPException(status_code=404, detail="Account not found")
    goal = get_account_goal(account_id, goal_id)
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.post("/{account_id}/goals", response_model=GoalProgress, status_code=201)
def post_account_goal(
    account_id: int, request: GoalCreateRequest
) -> GoalProgress:
    goal = create_account_goal(account_id, request)
    notify_account_members_new_goal(
        account_id,
        request.created_by_user_id,
        goal.id,
        goal.name,
    )
    return goal


@router.get("/{account_id}/contributions", response_model=ContributionSummary)
def get_account_contributions(account_id: int) -> ContributionSummary:
    return list_account_contributions(account_id)


@router.post(
    "/{account_id}/contributions",
    response_model=ContributionEntry,
    status_code=201,
)
def post_account_contribution(
    account_id: int, request: ContributionCreateRequest
) -> ContributionEntry:
    return create_account_contribution(account_id, request)


@router.get("/{account_id}/transactions", response_model=list[Transaction])
def get_account_transactions(
    account_id: int,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    direction: Literal["all", "credit", "debit"] = "all",
    q: Optional[str] = Query(default=None, min_length=1),
) -> list[Transaction]:
    if get_account(account_id) is None:
        raise HTTPException(status_code=404, detail="Account not found")
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from must be before date_to")

    return list_account_transactions(
        account_id,
        date_from=date_from,
        date_to=date_to,
        direction=None if direction == "all" else direction,
        query=q,
    )


@router.post(
    "/{account_id}/transactions",
    response_model=Transaction,
    status_code=201,
)
def post_account_transaction(
    account_id: int, request: TransactionCreateRequest
) -> Transaction:
    return create_account_transaction(account_id, request)