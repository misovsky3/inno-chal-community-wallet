from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


PollStatus = Literal["open", "closed"]


class PollOptionInput(BaseModel):
    label: str = Field(min_length=1, max_length=120)


class PollCreateRequest(BaseModel):
    created_by_user_id: int
    question: str = Field(min_length=3, max_length=240)
    description: Optional[str] = Field(default=None, max_length=4000)
    closes_at: datetime
    options: list[PollOptionInput] = Field(min_length=2, max_length=8)
    amount: Optional[Decimal] = Field(
        default=None, gt=0, max_digits=12, decimal_places=2
    )
    details: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("description", mode="before")
    @classmethod
    def empty_description_is_none(cls, value: object) -> object:
        return None if value == "" else value


class PollOptionResult(BaseModel):
    id: int
    label: str
    votes: int


class PollResult(BaseModel):
    id: int
    account_id: int
    question: str
    description: Optional[str]
    created_at: datetime
    closes_at: datetime
    status: PollStatus
    total_votes: int
    options: list[PollOptionResult]
    user_has_voted: bool = False
    amount: Optional[Decimal] = None
    details: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_url: Optional[str] = None


class CastVoteRequest(BaseModel):
    user_id: int
    option_id: int