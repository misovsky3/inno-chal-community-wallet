from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

InvitationRole = Literal[
    "disponent",
    "payment_preparer",
    "controller",
    "read_only",
]


class InvitationCreateRequest(BaseModel):
    created_by_user_id: int
    role: InvitationRole = "read_only"
    expires_in_hours: int = Field(default=72, ge=1, le=720)
    max_uses: int = Field(default=1, ge=1, le=100)


class InvitationAcceptRequest(BaseModel):
    user_id: int


class InvitationInfo(BaseModel):
    token: str
    account_id: int
    role: InvitationRole
    expires_at: datetime
    uses_remaining: int
    invite_path: str


class InvitationJoinResult(BaseModel):
    account_id: int
    user_id: int
    role: InvitationRole
    message: str