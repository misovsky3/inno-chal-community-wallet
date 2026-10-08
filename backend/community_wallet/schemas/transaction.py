from datetime import date
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


TransactionDirection = Literal["credit", "debit"]


def normalize_optional_csv_value(value: object) -> object:
    if isinstance(value, str) and value.strip().casefold() in {"", "none", "null"}:
        return None
    return value


class TransactionCreateRequest(BaseModel):
    created_by_user_id: Optional[int] = None
    goal_id: Optional[int] = None
    date: date
    amount: Decimal = Field(gt=0)
    currency: str
    counterparty: str = Field(min_length=1)
    direction: TransactionDirection
    payment_type: str = Field(min_length=1)
    details: Optional[str] = None
    recipient_message: Optional[str] = None
    variable_symbol: Optional[str] = None
    specific_symbol: Optional[str] = None
    constant_symbol: Optional[str] = None
    payer_reference: Optional[str] = None

    @field_validator("goal_id", "created_by_user_id", mode="before")
    @classmethod
    def empty_ids_are_none(cls, value: object) -> object:
        return normalize_optional_csv_value(value)


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
    specific_symbol: Optional[str] = None
    constant_symbol: Optional[str] = None
    payer_reference: Optional[str] = None

    @field_validator("goal_id", "payer_user_id", "contribution_id", mode="before")
    @classmethod
    def empty_goal_id_is_none(cls, value: object) -> object:
        return normalize_optional_csv_value(value)

    @field_validator(
        "details",
        "recipient_message",
        "variable_symbol",
        "specific_symbol",
        "constant_symbol",
        "payer_reference",
        mode="before",
    )
    @classmethod
    def empty_string_is_none(cls, value: object) -> object:
        return normalize_optional_csv_value(value)