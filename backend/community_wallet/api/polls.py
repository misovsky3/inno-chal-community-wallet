from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from ..schemas.poll import (
    CastVoteRequest,
    PollCreateRequest,
    PollOptionInput,
    PollResult,
)
from ..services.polls import (
    MAX_POLL_ATTACHMENT_SIZE,
    cast_poll_vote,
    create_account_poll,
    get_poll_attachment,
    list_account_polls,
)


router = APIRouter(tags=["polls"])


@router.get("/accounts/{account_id}/polls", response_model=list[PollResult])
def get_account_polls(
    account_id: int, user_id: Optional[int] = Query(default=None, gt=0)
) -> list[PollResult]:
    return list_account_polls(account_id, user_id)


@router.post("/accounts/{account_id}/polls", response_model=PollResult, status_code=201)
def post_account_poll(
    account_id: int, request: PollCreateRequest
) -> PollResult:
    return create_account_poll(account_id, request)


@router.post(
    "/accounts/{account_id}/polls/proposals",
    response_model=PollResult,
    status_code=201,
)
async def post_account_poll_proposal(
    account_id: int,
    created_by_user_id: int = Form(..., gt=0),
    question: str = Form(..., min_length=3, max_length=240),
    closes_at: datetime = Form(...),
    amount: Decimal = Form(..., gt=0, max_digits=12, decimal_places=2),
    description: Optional[str] = Form(None, max_length=4000),
    details: Optional[str] = Form(None, max_length=2000),
    attachment: Optional[UploadFile] = File(None),
) -> PollResult:
    request = PollCreateRequest(
        created_by_user_id=created_by_user_id,
        question=question,
        description=description,
        closes_at=closes_at,
        amount=amount,
        details=details,
        options=[PollOptionInput(label="Za"), PollOptionInput(label="Proti")],
    )
    attachment_content = None
    attachment_name = None
    if attachment is not None:
        if (
            attachment.size is not None
            and attachment.size > MAX_POLL_ATTACHMENT_SIZE
        ):
            await attachment.close()
            raise HTTPException(status_code=413, detail="PDF attachment is too large")
        attachment_content = await attachment.read(MAX_POLL_ATTACHMENT_SIZE + 1)
        attachment_name = attachment.filename
        await attachment.close()

    return create_account_poll(
        account_id,
        request,
        attachment_name=attachment_name,
        attachment_content=attachment_content,
    )


@router.get("/polls/{poll_id}/attachment")
def get_account_poll_attachment(poll_id: int) -> FileResponse:
    path, filename = get_poll_attachment(poll_id)
    return FileResponse(path, media_type="application/pdf", filename=filename)


@router.post("/polls/{poll_id}/votes", response_model=PollResult)
def post_poll_vote(poll_id: int, request: CastVoteRequest) -> PollResult:
    return cast_poll_vote(poll_id, request)