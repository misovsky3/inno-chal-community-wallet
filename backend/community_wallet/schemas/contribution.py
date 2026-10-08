from datetime import date
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


ContributionState = Literal["pending", "partial", "paid", "overdue"]


class ContributionCreateRequest(BaseModel):
    created_by_user_id: int
    user_id: int
    goal_id: Optional[int] = None
    amount: Decimal = Field(gt=0)
    currency: str = "EUR"
    due_date: Optional[date] = None

    @field_validator("goal_id", "due_date", mode="before")
    @classmethod
    def empty_values_are_none(cls, value: object) -> object:
        return None if value == "" else value


class ContributionEntry(BaseModel):
    id: int
    account_id: int
    user_id: int
    user_name: str
    goal_id: Optional[int]
    amount: Decimal
    currency: str
    due_date: Optional[date]
    paid_amount: Decimal
    remaining_amount: Decimal
    status: ContributionState


class ContributionSummary(BaseModel):
    account_id: int
    total_members: int
    paid_members: int
    expected_amount: Decimal
    paid_amount: Decimal
    contributions: list[ContributionEntry]