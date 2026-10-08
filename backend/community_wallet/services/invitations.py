import secrets
from datetime import datetime, timedelta, timezone
from threading import RLock

from fastapi import HTTPException

from ..schemas.invitation import (
    InvitationAcceptRequest,
    InvitationCreateRequest,
    InvitationInfo,
    InvitationJoinResult,
)
from ..schemas.membership import Membership
from ..storage.csv_store import CsvStore
from .community import DATA_DIR, get_account, get_user


INVITATIONS_STORE = CsvStore(
    DATA_DIR / "invitations.csv",
    (
        "token",
        "account_id",
        "role",
        "created_by_user_id",
        "created_at",
        "expires_at",
        "max_uses",
        "used_count",
        "revoked_at",
    ),
)
MEMBERSHIPS_STORE = CsvStore(
    DATA_DIR / "memberships.csv", ("account_id", "user_id", "role")
)
_invitation_lock = RLock()


def _find_invitation(token: str) -> dict[str, str]:
    row = next(
        (row for row in INVITATIONS_STORE.read_all() if row["token"] == token),
        None,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Invitation not found")
    return row


def _ensure_usable(row: dict[str, str]) -> None:
    if row["revoked_at"]:
        raise HTTPException(status_code=410, detail="Invitation was revoked")
    if datetime.now(timezone.utc) >= datetime.fromisoformat(row["expires_at"]):
        raise HTTPException(status_code=410, detail="Invitation expired")
    if int(row["used_count"]) >= int(row["max_uses"]):
        raise HTTPException(status_code=410, detail="Invitation use limit reached")


def _to_info(row: dict[str, str]) -> InvitationInfo:
    return InvitationInfo(
        token=row["token"],
        account_id=int(row["account_id"]),
        role="read_only",
        expires_at=datetime.fromisoformat(row["expires_at"]),
        uses_remaining=int(row["max_uses"]) - int(row["used_count"]),
        invite_path=f"/join/{row['token']}",
    )


def create_invitation(
    account_id: int, request: InvitationCreateRequest
) -> InvitationInfo:
    if get_account(account_id) is None:
        raise HTTPException(status_code=404, detail="Account not found")
    if get_user(request.created_by_user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")

    is_admin = any(
        int(row["account_id"]) == account_id
        and int(row["user_id"]) == request.created_by_user_id
        and row["role"] == "admin"
        for row in MEMBERSHIPS_STORE.read_all()
    )
    if not is_admin:
        raise HTTPException(status_code=403, detail="Demo account admin role required")

    now = datetime.now(timezone.utc)
    row = {
        "token": secrets.token_urlsafe(32),
        "account_id": str(account_id),
        "role": "read_only",
        "created_by_user_id": str(request.created_by_user_id),
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=request.expires_in_hours)).isoformat(),
        "max_uses": str(request.max_uses),
        "used_count": "0",
        "revoked_at": "",
    }
    with _invitation_lock:
        INVITATIONS_STORE.append(row)
    return _to_info(row)


def get_invitation(token: str) -> InvitationInfo:
    row = _find_invitation(token)
    _ensure_usable(row)
    return _to_info(row)


def accept_invitation(
    token: str, request: InvitationAcceptRequest
) -> InvitationJoinResult:
    with _invitation_lock:
        invitations = INVITATIONS_STORE.read_all()
        row = next((row for row in invitations if row["token"] == token), None)
        if row is None:
            raise HTTPException(status_code=404, detail="Invitation not found")
        _ensure_usable(row)
        if get_user(request.user_id) is None:
            raise HTTPException(status_code=404, detail="User not found")

        account_id = int(row["account_id"])
        memberships = MEMBERSHIPS_STORE.read_all()
        if any(
            int(membership["account_id"]) == account_id
            and int(membership["user_id"]) == request.user_id
            for membership in memberships
        ):
            raise HTTPException(status_code=409, detail="User is already a member")

        memberships.append(
            {
                "account_id": str(account_id),
                "user_id": str(request.user_id),
                "role": "read_only",
            }
        )
        MEMBERSHIPS_STORE.write_all(memberships)

        row["used_count"] = str(int(row["used_count"]) + 1)
        INVITATIONS_STORE.write_all(invitations)

    return InvitationJoinResult(
        account_id=account_id,
        user_id=request.user_id,
        role="read_only",
        message="User joined the demo account",
    )


def revoke_invitation(token: str, revoked_by_user_id: int) -> None:
    with _invitation_lock:
        invitations = INVITATIONS_STORE.read_all()
        row = next((row for row in invitations if row["token"] == token), None)
        if row is None:
            raise HTTPException(status_code=404, detail="Invitation not found")
        account_id = int(row["account_id"])
        is_admin = any(
            int(membership["account_id"]) == account_id
            and int(membership["user_id"]) == revoked_by_user_id
            and membership["role"] == "admin"
            for membership in MEMBERSHIPS_STORE.read_all()
        )
        if not is_admin:
            raise HTTPException(status_code=403, detail="Demo account admin role required")
        row["revoked_at"] = datetime.now(timezone.utc).isoformat()
        INVITATIONS_STORE.write_all(invitations)