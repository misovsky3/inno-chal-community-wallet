from datetime import date
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


GoalType = Literal["permanent", "temporary"]
GoalStatus = Literal["in_progress", "completed", "expired"]


class GoalCreateRequest(BaseModel):
    created_by_user_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=240)
    target_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    end_date: date
    description: Optional[str] = Field(default=None, max_length=4000)

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("description", mode="before")
    @classmethod
    def empty_description_is_none(cls, value: object) -> object:
        return None if value == "" else value


class Goal(BaseModel):
    id: int
    account_id: int
    name: str
    goal_type: GoalType
    target_amount: Decimal = Field(gt=0)
    currency: str
    start_date: date
    end_date: Optional[date] = None
    description: Optional[str] = None

    @field_validator("end_date", "description", mode="before")
    @classmethod
    def empty_values_are_none(cls, value: object) -> object:
        return None if value == "" else value


class GoalProgress(Goal):
    raised_amount: Decimal
    remaining_amount: Decimal
    progress_percentage: Decimal
    status: GoalStatus