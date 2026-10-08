from datetime import datetime, timezone
from threading import RLock
from typing import Literal, Optional, Union

from fastapi import HTTPException

from ..schemas.notification import (
    Notification,
    NotificationCreateRequest,
    NotificationStatus,
)
from ..storage.csv_store import CsvStore
from .community import (
    DATA_DIR,
    get_account,
    get_user,
    list_account_members,
    list_account_organizations,
)


NOTIFICATIONS_STORE = CsvStore(
    DATA_DIR / "notifications.csv",
    (
        "id",
        "created_by_user_id",
        "recipient_user_id",
        "account_id",
        "notification_type",
        "title",
        "message",
        "target_path",
        "created_at",
        "read_at",
    ),
)
_notification_lock = RLock()


def _to_notification(row: dict[str, str]) -> Notification:
    return Notification(
        id=int(row["id"]),
        created_by_user_id=int(row["created_by_user_id"]),
        recipient_user_id=int(row["recipient_user_id"]),
        account_id=int(row["account_id"]) if row["account_id"] else None,
        notification_type=row["notification_type"],
        title=row["title"],
        message=row["message"],
        target_path=row["target_path"] or None,
        created_at=datetime.fromisoformat(row["created_at"]),
        read_at=datetime.fromisoformat(row["read_at"]) if row["read_at"] else None,
        status="read" if row["read_at"] else "new",
    )


def create_notification(request: NotificationCreateRequest) -> Notification:
    if get_user(request.created_by_user_id) is None:
        raise HTTPException(status_code=404, detail="Sender user not found")
    if get_user(request.recipient_user_id) is None:
        raise HTTPException(status_code=404, detail="Recipient user not found")
    if request.account_id is not None and get_account(request.account_id) is None:
        raise HTTPException(status_code=404, detail="Account not found")

    with _notification_lock:
        rows = NOTIFICATIONS_STORE.read_all()
        notification_id = max((int(row["id"]) for row in rows), default=0) + 1
        row = {
            "id": str(notification_id),
            "created_by_user_id": str(request.created_by_user_id),
            "recipient_user_id": str(request.recipient_user_id),
            "account_id": str(request.account_id) if request.account_id is not None else "",
            "notification_type": request.notification_type,
            "title": request.title,
            "message": request.message,
            "target_path": request.target_path or "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "read_at": "",
        }
        NOTIFICATIONS_STORE.append(row)
    return _to_notification(row)


def notify_account_members_new_goal(
    account_id: int,
    created_by_user_id: int,
    goal_id: int,
    goal_name: str,
) -> None:
    account = get_account(account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")

    organizations = list_account_organizations(account_id)
    community_name = organizations[0].name if organizations else account.name
    for member in list_account_members(account_id):
        if member.id == created_by_user_id:
            continue

        create_notification(
            NotificationCreateRequest(
                created_by_user_id=created_by_user_id,
                recipient_user_id=member.id,
                account_id=account_id,
                notification_type="new_goal",
                title=f"Nový cieľ v komunite {community_name}",
                message=f"Komunita {community_name} má nový cieľ: {goal_name}.",
                target_path=(
                    f"/communities-list?userId={member.id}&accountId={account_id}"
                    f"&goalId={goal_id}"
                ),
            )
        )


def list_user_notifications(
    user_id: int, status: Union[NotificationStatus, Literal["all"]] = "all"
) -> list[Notification]:
    if get_user(user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")
    notifications = [
        _to_notification(row)
        for row in NOTIFICATIONS_STORE.read_all()
        if int(row["recipient_user_id"]) == user_id
    ]
    if status != "all":
        notifications = [item for item in notifications if item.status == status]
    return sorted(notifications, key=lambda item: (item.created_at, item.id), reverse=True)


def mark_notification_read(notification_id: int, user_id: int) -> Notification:
    with _notification_lock:
        rows = NOTIFICATIONS_STORE.read_all()
        row = next((row for row in rows if int(row["id"]) == notification_id), None)
        if row is None:
            raise HTTPException(status_code=404, detail="Notification not found")
        if int(row["recipient_user_id"]) != user_id:
            raise HTTPException(status_code=403, detail="Notification belongs to another user")
        if not row["read_at"]:
            row["read_at"] = datetime.now(timezone.utc).isoformat()
            NOTIFICATIONS_STORE.write_all(rows)
    return _to_notification(row)