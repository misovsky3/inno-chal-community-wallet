from fastapi import APIRouter

from ..schemas.poll import CastVoteRequest, PollCreateRequest, PollResult
from ..services.polls import cast_poll_vote, create_account_poll, list_account_polls


router = APIRouter(tags=["polls"])


@router.get("/accounts/{account_id}/polls", response_model=list[PollResult])
def get_account_polls(account_id: int) -> list[PollResult]:
    return list_account_polls(account_id)


@router.post("/accounts/{account_id}/polls", response_model=PollResult, status_code=201)
def post_account_poll(
    account_id: int, request: PollCreateRequest
) -> PollResult:
    return create_account_poll(account_id, request)


@router.post("/polls/{poll_id}/votes", response_model=PollResult)
def post_poll_vote(poll_id: int, request: CastVoteRequest) -> PollResult:
    return cast_poll_vote(poll_id, request)