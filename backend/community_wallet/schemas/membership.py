from typing import Literal

from pydantic import BaseModel

from .user import User


MembershipRole = Literal[
    "admin",
    "disponent",
    "payment_preparer",
    "controller",
    "read_only",
]


class Membership(BaseModel):
    account_id: int
    user_id: int
    role: MembershipRole


class AccountMember(User):
    role: MembershipRole