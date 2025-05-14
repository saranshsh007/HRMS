# This file makes the routers directory a Python package

from .users import router as users_router
from .attendance import router as attendance_router
from .leave import router as leave_router
from .policies import router as policies_router

__all__ = [
    "users_router",
    "attendance_router",
    "leave_router",
    "policies_router",
]
