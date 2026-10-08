from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


NotificationStatus = Literal["new", "read"]


class NotificationCreateRequest(BaseModel):
    created_by_user_id: int
    recipient_user_id: int
    account_id: Optional[int] = None
    notification_type: str = Field(min_length=1, max_length=60)
    title: str = Field(min_length=1, max_length=160)
    message: str = Field(min_length=1, max_length=1000)
    target_path: Optional[str] = Field(default=None, max_length=500)

    @field_validator("target_path", mode="before")
    @classmethod
    def empty_target_is_none(cls, value: object) -> object:
        return None if value == "" else value


class NotificationReadRequest(BaseModel):
    user_id: int


class Notification(BaseModel):
    id: int
    created_by_user_id: int
    recipient_user_id: int
    account_id: Optional[int]
    notification_type: str
    title: str
    message: str
    target_path: Optional[str]
    created_at: datetime
    read_at: Optional[datetime]
    status: NotificationStatus

    @field_validator("account_id", "target_path", "read_at", mode="before")
    @classmethod
    def empty_values_are_none(cls, value: object) -> object:
        return None if value == "" else value