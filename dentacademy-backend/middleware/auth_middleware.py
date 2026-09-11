from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from utils.security import decode_access_token
from starlette.middleware.base import BaseHTTPMiddleware
import os

security_scheme = HTTPBearer(auto_error=False)


def _csp_connect_src() -> list[str]:
    origins = ["'self'"]
    env = os.getenv("ENVIRONMENT", "production").lower()
    if env in {"development", "dev", "test", "local"}:
        origins.extend(
            [
                "http://localhost:8000",
                "http://localhost:3000",
                "https://*.trycloudflare.com",
            ]
        )
    extra = os.getenv("CSP_CONNECT_SRC", "").strip()
    if extra:
        origins.extend(p for p in extra.split() if p)
    return origins


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob:; "
            f"connect-src {' '.join(_csp_connect_src())};"
        )
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
        # Avoid caching authenticated API responses in shared caches/browsers.
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
            response.headers["Pragma"] = "no-cache"
        return response


def get_token_from_header(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> str:
    """Extract Bearer token from Authorization header (never from cookies/localStorage)."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


def get_current_user(
    request: Request,
    token: str = Depends(get_token_from_header),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_access_token(token)
    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
        )
    return user


def require_role(roles: list):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {roles}",
            )
        return current_user

    return role_checker


require_admin = require_role(["Administrator"])
require_supervisor = require_role(["Supervisor"])
require_mentor = require_role(["Mentor"])
require_admin_or_supervisor = require_role(["Administrator", "Supervisor"])
require_mentor_or_admin = require_role(["Administrator", "Mentor"])
require_mentor_or_supervisor = require_role(["Supervisor", "Mentor"])
require_staff = require_role(["Administrator", "Supervisor", "Mentor"])
