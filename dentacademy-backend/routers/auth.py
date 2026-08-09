from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks, Response
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from database import get_db
from models.user import User
from schemas.auth import Token, PasswordResetRequest, PasswordResetConfirm
from utils.security import (
    verify_password, create_access_token,
    get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
)
from middleware.auth_middleware import get_current_user
from middleware.audit_middleware import log_audit_action, get_client_ip
from pydantic import BaseModel
import secrets
import os

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginData(BaseModel):
    username: str
    password: str

@router.options("/login")
async def login_options():
    return {"ok": True}

@router.post("/login", response_model=Token)
def login(response: Response, request: Request, form_data: LoginData, db: Session = Depends(get_db)):
    ip = get_client_ip(request)
    user = db.query(User).filter(User.username == form_data.username).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Incorrect username or password")

    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account locked for 30 minutes."
        )

    if not verify_password(form_data.password, user.password_hash):
        user.failed_attempts = (user.failed_attempts or 0) + 1
        if user.failed_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=30)
            db.commit()
            log_audit_action(db, "ACCOUNT_LOCKED", user.user_id, "User", user.user_id,
                             ip_address=ip)
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account locked for 30 minutes."
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

    response.set_cookie(
        "access_token",
        token,
        httponly=True,
        samesite="strict",
        max_age=3600
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
    return {"message": "Logged out successfully. Discard your token."}


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
    user = db.query(User).filter(User.email == body.email).first()
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = get_password_hash(token)
        user.reset_token_expiry = datetime.utcnow() + timedelta(
            minutes=int(os.getenv("PASSWORD_RESET_EXPIRE_MINUTES", "30"))
        )
        db.commit()
        log_audit_action(db, "PASSWORD_RESET_REQUEST", user.user_id, "User",
                         user.user_id, ip_address=get_client_ip(request))
        if os.getenv("ENVIRONMENT", "production") == "development":
            return {"message": "Reset token issued", "dev_token": token}
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-confirm", status_code=200)
def password_reset_confirm(
    body: PasswordResetConfirm,
    request: Request,
    db: Session = Depends(get_db),
):
    raise HTTPException(
        status_code=400,
        detail="Token verification requires email context. Use /reset-confirm-email endpoint."
    )


@router.post("/reset-confirm-with-email", status_code=200)
def password_reset_confirm_with_email(
    email: str,
    token: str,
    new_password: str,
    request: Request,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.reset_token or not user.reset_token_expiry:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if user.reset_token_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired")
    if not verify_password(token, user.reset_token):
        raise HTTPException(status_code=400, detail="Invalid reset token")

    user.password_hash = get_password_hash(new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    user.failed_attempts = 0
    user.locked_until = None
    db.commit()
    log_audit_action(db, "PASSWORD_RESET_DONE", user.user_id, "User",
                     user.user_id, ip_address=get_client_ip(request))
    return {"message": "Password reset successfully"}
