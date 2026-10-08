from fastapi import APIRouter, HTTPException

from ..schemas.account import UserAccount
from ..schemas.user import User
from ..services.community import get_user, list_user_accounts, list_users


router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[User])
def get_users() -> list[User]:
    return list_users()


@router.get("/{user_id}/accounts", response_model=list[UserAccount])
def get_user_accounts(user_id: int) -> list[UserAccount]:
    if get_user(user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")
    return list_user_accounts(user_id)