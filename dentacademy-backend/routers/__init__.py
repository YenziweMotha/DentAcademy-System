from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .apprentices import router as apprentices_router
from .modules import router as modules_router
from .evaluations import router as evaluations_router
from .mentors import router as mentors_router
from .predictions import router as predictions_router
from .reports import router as reports_router
from .dashboard import router as dashboard_router
