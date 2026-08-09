from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.user import User
from schemas.auth import UserCreate, UserUpdate, UserOut
from utils.security import get_password_hash
from middleware.auth_middleware import get_current_user, require_admin
from middleware.audit_middleware import log_audit_action, get_client_ip

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=List[UserOut])
def list_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return db.query(User).offset(skip).limit(limit).all()


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    request: Request,
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(
            status_code=409,
            detail="Username already taken.",
        )
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=409,
            detail="Email already registered.",
        )
    user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_audit_action(
        db,
        "CREATE",
        current_user.user_id,
        "User",
        user.user_id,
        ip_address=get_client_ip(request),
    )
    return user


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    request: Request,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    update_data = user_in.model_dump(exclude_unset=True)

    if "is_active" in update_data and update_data["is_active"] == False:
        if user_id == current_user.user_id:
            raise HTTPException(
                status_code=403,
                detail="You cannot deactivate your own account.",
            )

    if user_in.email and user_in.email != user.email:
        if db.query(User).filter(User.email == user_in.email).first():
            raise HTTPException(400, "Email already in use")

    for k, v in update_data.items():
        setattr(user, k, v)

    db.commit()
    db.refresh(user)
    log_audit_action(
        db,
        "UPDATE",
        current_user.user_id,
        "User",
        user.user_id,
        ip_address=get_client_ip(request),
    )
    return user


@router.patch("/{user_id}/unlock", status_code=200)
def unlock_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.locked_until = None
    user.failed_attempts = 0
    db.commit()
    log_audit_action(
        db,
        "UPDATE",
        current_user.user_id,
        "User",
        user_id,
        new_value={"locked_until": None, "failed_attempts": 0},
        ip_address=get_client_ip(request),
    )
    return {"message": "User account unlocked"}
