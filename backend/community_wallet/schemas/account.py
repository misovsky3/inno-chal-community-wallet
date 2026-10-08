from typing import Optional

from decimal import Decimal

from pydantic import BaseModel, field_validator

from .membership import MembershipRole


class Account(BaseModel):
    id: int
    name: str
    iban: Optional[str] = None
    balance: Decimal
    currency: str
    payme_url: Optional[str] = None

    @field_validator("iban", "payme_url", mode="before")
    @classmethod
    def empty_string_is_none(cls, value: object) -> object:
        return None if value == "" else value


class UserAccount(Account):
    role: MembershipRole