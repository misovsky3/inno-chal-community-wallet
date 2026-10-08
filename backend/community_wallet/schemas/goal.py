from datetime import date
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


GoalType = Literal["permanent", "temporary"]
GoalStatus = Literal["in_progress", "completed", "expired"]


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