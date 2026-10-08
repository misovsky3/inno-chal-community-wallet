from typing import Literal

from fastapi import APIRouter, Query

from ..schemas.notification import (
    Notification,
    NotificationCreateRequest,
    NotificationReadRequest,
)
from ..services.notifications import (
    create_notification,
    list_user_notifications,
    mark_notification_read,
)


router = APIRouter(tags=["notifications"])


@router.post("/notifications", response_model=Notification, status_code=201)
def post_notification(request: NotificationCreateRequest) -> Notification:
    return create_notification(request)


@router.get("/users/{user_id}/notifications", response_model=list[Notification])
def get_user_notifications(
    user_id: int,
    status: Literal["all", "new", "read"] = Query(default="all"),
) -> list[Notification]:
    return list_user_notifications(user_id, status)


@router.post("/notifications/{notification_id}/read", response_model=Notification)
def post_notification_read(
    notification_id: int, request: NotificationReadRequest
) -> Notification:
    return mark_notification_read(notification_id, request.user_id)