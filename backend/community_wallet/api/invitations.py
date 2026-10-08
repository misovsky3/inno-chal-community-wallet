from fastapi import APIRouter, Response

from ..schemas.invitation import (
    InvitationAcceptRequest,
    InvitationCreateRequest,
    InvitationInfo,
    InvitationJoinResult,
)
from ..services.invitations import (
    accept_invitation,
    create_invitation,
    get_invitation,
    revoke_invitation,
)


router = APIRouter(tags=["invitations"])


@router.post(
    "/accounts/{account_id}/invitations",
    response_model=InvitationInfo,
    status_code=201,
)
def post_invitation(
    account_id: int, request: InvitationCreateRequest
) -> InvitationInfo:
    return create_invitation(account_id, request)


@router.get("/invitations/{token}", response_model=InvitationInfo)
def get_invitation_preview(token: str) -> InvitationInfo:
    return get_invitation(token)


@router.post("/invitations/{token}/accept", response_model=InvitationJoinResult)
def post_invitation_accept(
    token: str, request: InvitationAcceptRequest
) -> InvitationJoinResult:
    return accept_invitation(token, request)


@router.delete("/invitations/{token}", status_code=204)
def delete_invitation(token: str, revoked_by_user_id: int) -> Response:
    revoke_invitation(token, revoked_by_user_id)
    return Response(status_code=204)