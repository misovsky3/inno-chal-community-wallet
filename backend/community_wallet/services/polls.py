from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from threading import RLock
from typing import Optional

from fastapi import HTTPException

from ..schemas.membership import Membership
from ..schemas.poll import (
    CastVoteRequest,
    PollCreateRequest,
    PollOptionResult,
    PollResult,
)
from ..storage.csv_store import CsvStore
from .community import DATA_DIR, get_account


MAX_POLL_ATTACHMENT_SIZE = 5 * 1024 * 1024
POLL_ATTACHMENTS_DIR = DATA_DIR / "poll_attachments"
POLLS_STORE = CsvStore(
    DATA_DIR / "polls.csv",
    (
        "id",
        "account_id",
        "question",
        "description",
        "created_at",
        "closes_at",
        "amount",
        "details",
        "attachment_name",
    ),
)
POLL_OPTIONS_STORE = CsvStore(
    DATA_DIR / "poll_options.csv", ("id", "poll_id", "label")
)
VOTES_STORE = CsvStore(
    DATA_DIR / "votes.csv", ("poll_id", "user_id", "option_id", "updated_at")
)
MEMBERSHIPS_STORE = CsvStore(
    DATA_DIR / "memberships.csv", ("account_id", "user_id", "role")
)
_poll_lock = RLock()


def _parse_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _next_id(rows: list[dict[str, str]]) -> int:
    return max((int(row["id"]) for row in rows), default=0) + 1


def _build_poll_result(
    poll: dict[str, str], user_id: Optional[int] = None
) -> PollResult:
    poll_id = int(poll["id"])
    options = [
        row
        for row in POLL_OPTIONS_STORE.read_all()
        if int(row["poll_id"]) == poll_id
    ]
    votes = [row for row in VOTES_STORE.read_all() if int(row["poll_id"]) == poll_id]
    options_result = [
        PollOptionResult(
            id=int(option["id"]),
            label=option["label"],
            votes=sum(int(vote["option_id"]) == int(option["id"]) for vote in votes),
        )
        for option in options
    ]
    closes_at = _parse_datetime(poll["closes_at"])
    return PollResult(
        id=poll_id,
        account_id=int(poll["account_id"]),
        question=poll["question"],
        description=poll["description"] or None,
        created_at=_parse_datetime(poll["created_at"]),
        closes_at=closes_at,
        status="open" if datetime.now(timezone.utc) < closes_at else "closed",
        total_votes=len(votes),
        options=options_result,
        user_has_voted=any(
            user_id is not None and int(vote["user_id"]) == user_id
            for vote in votes
        ),
        amount=Decimal(poll["amount"]) if poll.get("amount") else None,
        details=poll.get("details") or None,
        attachment_name=poll.get("attachment_name") or None,
        attachment_url=(
            f"/api/polls/{poll_id}/attachment"
            if poll.get("attachment_name")
            else None
        ),
    )


def list_account_polls(
    account_id: int, user_id: Optional[int] = None
) -> list[PollResult]:
    if get_account(account_id) is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return [
        _build_poll_result(row, user_id)
        for row in POLLS_STORE.read_all()
        if int(row["account_id"]) == account_id
    ]


def _normalize_attachment_name(filename: Optional[str]) -> str:
    if not filename:
        raise HTTPException(status_code=422, detail="Attachment filename is required")
    name = Path(filename.replace("\\", "/")).name.strip()
    name = "".join(character for character in name if character.isprintable())
    if not name.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Attachment must be a PDF")
    if len(name) > 180:
        name = f"{name[:176].rstrip('. ')}.pdf"
    if name == ".pdf":
        raise HTTPException(status_code=422, detail="Attachment filename is required")
    return name


def create_account_poll(
    account_id: int,
    request: PollCreateRequest,
    attachment_name: Optional[str] = None,
    attachment_content: Optional[bytes] = None,
) -> PollResult:
    if get_account(account_id) is None:
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
    if request.closes_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="closes_at must be in the future")
    if (attachment_name is None) != (attachment_content is None):
        raise HTTPException(status_code=422, detail="Incomplete attachment")
    normalized_attachment_name = None
    if attachment_name is not None and attachment_content is not None:
        normalized_attachment_name = _normalize_attachment_name(attachment_name)
        if len(attachment_content) > MAX_POLL_ATTACHMENT_SIZE:
            raise HTTPException(status_code=413, detail="PDF attachment is too large")
        if b"%PDF-" not in attachment_content[:1024]:
            raise HTTPException(status_code=422, detail="Attachment must be a PDF")

    with _poll_lock:
        polls = POLLS_STORE.read_all()
        poll_id = _next_id(polls)
        poll_row = {
            "id": poll_id,
            "account_id": account_id,
            "question": request.question,
            "description": request.description or "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "closes_at": request.closes_at.isoformat(),
            "amount": str(request.amount) if request.amount is not None else "",
            "details": request.details or "",
            "attachment_name": normalized_attachment_name or "",
        }
        if attachment_content is not None:
            POLL_ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)
            (POLL_ATTACHMENTS_DIR / f"{poll_id}.pdf").write_bytes(attachment_content)
        POLLS_STORE.append(poll_row)

        options = POLL_OPTIONS_STORE.read_all()
        next_option_id = _next_id(options)
        options.extend(
            {
                "id": next_option_id + index,
                "poll_id": poll_id,
                "label": option.label,
            }
            for index, option in enumerate(request.options)
        )
        POLL_OPTIONS_STORE.write_all(options)

    return _build_poll_result(poll_row)


def get_poll_attachment(poll_id: int) -> tuple[Path, str]:
    poll = next(
        (row for row in POLLS_STORE.read_all() if int(row["id"]) == poll_id),
        None,
    )
    if poll is None or not poll.get("attachment_name"):
        raise HTTPException(status_code=404, detail="Poll attachment not found")

    attachment_path = POLL_ATTACHMENTS_DIR / f"{poll_id}.pdf"
    if not attachment_path.is_file():
        raise HTTPException(status_code=404, detail="Poll attachment not found")
    return attachment_path, poll["attachment_name"]


def cast_poll_vote(poll_id: int, request: CastVoteRequest) -> PollResult:
    with _poll_lock:
        poll = next(
            (row for row in POLLS_STORE.read_all() if int(row["id"]) == poll_id),
            None,
        )
        if poll is None:
            raise HTTPException(status_code=404, detail="Poll not found")

        membership = next(
            (
                row
                for row in MEMBERSHIPS_STORE.read_all()
                if int(row["account_id"]) == int(poll["account_id"])
                and int(row["user_id"]) == request.user_id
            ),
            None,
        )
        if membership is None:
            raise HTTPException(status_code=403, detail="Poll membership required")
        if datetime.now(timezone.utc) >= _parse_datetime(poll["closes_at"]):
            raise HTTPException(status_code=409, detail="Poll is closed")

        options = POLL_OPTIONS_STORE.read_all()
        if not any(
            int(row["poll_id"]) == poll_id
            and int(row["id"]) == request.option_id
            for row in options
        ):
            raise HTTPException(status_code=422, detail="Option does not belong to poll")

        votes = VOTES_STORE.read_all()
        existing = next(
            (
                row
                for row in votes
                if int(row["poll_id"]) == poll_id
                and int(row["user_id"]) == request.user_id
            ),
            None,
        )
        if existing is not None:
            raise HTTPException(
                status_code=409, detail="User has already voted in this poll"
            )

        vote_row = {
            "poll_id": poll_id,
            "user_id": request.user_id,
            "option_id": request.option_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        votes.append(vote_row)
        VOTES_STORE.write_all(votes)

    return _build_poll_result(poll, request.user_id)