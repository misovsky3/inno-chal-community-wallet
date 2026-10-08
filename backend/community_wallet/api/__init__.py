from fastapi import APIRouter

from .accounts import router as accounts_router
from .health import router as health_router
from .invitations import router as invitations_router
from .notifications import router as notifications_router
from .polls import router as polls_router
from .users import router as users_router


api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(accounts_router)
api_router.include_router(invitations_router)
api_router.include_router(notifications_router)
api_router.include_router(polls_router)
api_router.include_router(users_router)