# This file makes the routers directory a Python package 

from . import users
from . import attendance
from . import leave
from .users import router as users_router
from .attendance import router as attendance_router
from .leave import router as leave_router
from .notifications import router as notifications_router

__all__ = ["users_router", "attendance_router", "leave_router", "notifications_router"] 