from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import os
import secrets
from database import get_db
from models.user import User
from schemas.auth import (
    Token,
    PasswordResetRequest,
    PasswordResetConfirm,
    PasswordChange,
)
from utils.security import (
    verify_password, create_access_token, get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from middleware.auth_middleware import get_current_user
from middleware.audit_middleware import log_audit_action, get_client_ip
from services.email_service import send_password_reset_email, smtp_enabled
from services.config_service import get_int_setting, ensure_default_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginData(BaseModel):
    username: str
    password: str


@router.post("/login", response_model=Token)
def login(response: Response, request: Request, form_data: LoginData, db: Session = Depends(get_db)):
    ensure_default_settings(db)
    ip = get_client_ip(request)
    user = db.query(User).filter(User.username == form_data.username).first()

    lockout_minutes = get_int_setting(db, "account_lockout_minutes")

    # Generic failure for unknown usernames: do not reveal whether a
    # username exists (SRS §7).
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account locked. Try again later.",
        )

    if not verify_password(form_data.password, user.password_hash):
        user.failed_attempts = (user.failed_attempts or 0) + 1
        if user.failed_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=lockout_minutes)
            db.commit()
            log_audit_action(db, "ACCOUNT_LOCKED", user.user_id, "User", user.user_id,
                             ip_address=ip)
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account locked. Try again later.",
            )
        db.commit()
        log_audit_action(db, "LOGIN_FAILED", user.user_id, "User", user.user_id,
                         ip_address=ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Incorrect username or password")

    user.failed_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token(
        data={"user_id": user.user_id, "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    secure = os.getenv("SECURE_COOKIES", "false").lower() == "true"
    response.set_cookie(
        "access_token",
        token,
        httponly=True,
        samesite="strict",
        secure=secure,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    log_audit_action(db, "LOGIN", user.user_id, "User", user.user_id, ip_address=ip)

    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role,
        user_id=user.user_id,
        full_name=user.full_name,
        email=user.email,
    )


@router.post("/logout", status_code=200)
def logout(
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ip = get_client_ip(request)
    response.delete_cookie("access_token")
    log_audit_action(db, "LOGOUT", current_user.user_id, "User", current_user.user_id,
                     ip_address=ip)
    return {"message": "Logged out successfully."}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "user_id": current_user.user_id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "last_login": current_user.last_login,
    }


@router.post("/reset-request", status_code=200)
def password_reset_request(
    body: PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Request a password reset. A single-use 30-minute token is emailed."""
    ensure_default_settings(db)
    ip = get_client_ip(request)
    user = db.query(User).filter(User.email == body.email).first()

    # Always return the same message regardless of whether the email exists.
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = get_password_hash(token)
        user.reset_token_expiry = datetime.utcnow() + timedelta(
            minutes=get_int_setting(db, "password_reset_expire_minutes")
        )
        db.commit()
        log_audit_action(db, "PASSWORD_RESET_REQUEST", user.user_id, "User",
                         user.user_id, ip_address=ip)
        sent = send_password_reset_email(user.email, token)
        if os.getenv("ENVIRONMENT", "production") == "development" and not sent:
            # Development fallback: expose the token so flows can be tested
            # without a live SMTP server.
            return {"message": "Reset token issued (development).", "dev_token": token}
        if not sent:
            log_audit_action(db, "PASSWORD_RESET_REQUEST", user.user_id, "User",
                             user.user_id, ip_address=ip)

    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-confirm", status_code=200)
def password_reset_confirm(
    body: PasswordResetConfirm,
    request: Request,
    db: Session = Depends(get_db),
):
    """Complete a password reset with email + single-use token + new password."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.reset_token or not user.reset_token_expiry:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if user.reset_token_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired")
    if not verify_password(body.token, user.reset_token):
        raise HTTPException(status_code=400, detail="Invalid reset token")

    user.password_hash = get_password_hash(body.new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    user.failed_attempts = 0
    user.locked_until = None
    db.commit()
    log_audit_action(db, "PASSWORD_RESET_DONE", user.user_id, "User",
                     user.user_id, ip_address=get_client_ip(request))
    return {"message": "Password reset successfully"}


@router.post("/change-password", status_code=200)
def change_password(
    body: PasswordChange,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Self-service password change for an authenticated user."""
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = get_password_hash(body.new_password)
    db.commit()
    log_audit_action(db, "UPDATE", current_user.user_id, "User",
                     current_user.user_id, ip_address=get_client_ip(request),
                     new_value={"password": "changed"})
    return {"message": "Password changed successfully"}
