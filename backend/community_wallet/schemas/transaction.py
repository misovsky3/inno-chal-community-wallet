from datetime import date
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, field_validator


TransactionDirection = Literal["credit", "debit"]


class Transaction(BaseModel):
    id: int
    account_id: int
    goal_id: Optional[int] = None
    payer_user_id: Optional[int] = None
    contribution_id: Optional[int] = None
    date: date
    amount: Decimal
    currency: str
    counterparty: str
    direction: TransactionDirection
    payment_type: str
    details: Optional[str] = None
    recipient_message: Optional[str] = None
    variable_symbol: Optional[str] = None
    payer_reference: Optional[str] = None

    @field_validator("goal_id", "payer_user_id", "contribution_id", mode="before")
    @classmethod
    def empty_goal_id_is_none(cls, value: object) -> object:
        return None if value == "" else value

    @field_validator(
        "details",
        "recipient_message",
        "variable_symbol",
        "payer_reference",
        mode="before",
    )
    @classmethod
    def empty_string_is_none(cls, value: object) -> object:
        return None if value == "" else value