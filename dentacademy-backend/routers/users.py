from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.user import User
from models.apprentice import Apprentice
from models.mentor import Mentor
from schemas.auth import UserCreate, UserUpdate, UserOut, UserCreatedOut
from utils.security import get_password_hash, generate_username, generate_credential_password
from middleware.auth_middleware import get_current_user, require_admin
from middleware.audit_middleware import log_audit_action, get_client_ip
from services.email_service import send_account_credentials_email

router = APIRouter(prefix="/api/users", tags=["users"])


def _split_full_name(full_name: str) -> tuple[str, str]:
    """Split a full name into first name and surname."""
    parts = [p for p in (full_name or "").split() if p.strip()]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], parts[0]
    return parts[0], " ".join(parts[1:])


@router.get("", response_model=List[UserOut])
def list_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return db.query(User).offset(skip).limit(limit).all()


@router.post("", response_model=UserCreatedOut, status_code=201)
def create_user(
    request: Request,
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a user. When no password is supplied, the system generates a
    username and a credential-combination password and emails them to the
    user's address.

    Apprentice and Mentor accounts also get the matching domain profile, so the
    new user can immediately use their role's dashboard."""
    id_number = (user_in.id_number or "").strip()
    first_name, surname = _split_full_name(user_in.full_name)
    linked_apprentice = None

    if user_in.role in ("Apprentice", "Mentor") and not first_name:
        raise HTTPException(
            status_code=422,
            detail="A full name is required for apprentice and mentor accounts.",
        )

    if user_in.role == "Apprentice":
        if len(id_number) != 13 or not id_number.isdigit():
            raise HTTPException(
                status_code=422,
                detail="An ID number of exactly 13 digits is required for apprentice accounts.",
            )
        linked_apprentice = db.query(Apprentice).filter(
            Apprentice.id_number == id_number
        ).first()
        if linked_apprentice and linked_apprentice.user_id is not None:
            raise HTTPException(
                status_code=409,
                detail="An apprentice with this national ID number already has a login account.",
            )

    username = user_in.username.strip() if user_in.username else generate_username(
        user_in.full_name, user_in.email, db
    )
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(
            status_code=409,
            detail="Username already taken.",
        )
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=409,
            detail="Email already registered.",
        )

    if user_in.password:
        password = user_in.password
    else:
        password = generate_credential_password(
            full_name=user_in.full_name,
            id_number=user_in.id_number,
            contact_number=user_in.contact_number,
            email=user_in.email,
        )

    user = User(
        username=username,
        email=user_in.email,
        password_hash=get_password_hash(password),
        full_name=user_in.full_name,
        role=user_in.role,
    )
    db.add(user)
    db.flush()

    contact_number = (user_in.contact_number or "").strip() or None
    apprentice_id = None
    mentor_id = None

    if user_in.role == "Apprentice":
        if linked_apprentice:
            # An apprentice was registered without an account; attach this one.
            linked_apprentice.user_id = user.user_id
            if not linked_apprentice.email:
                linked_apprentice.email = user.email
        else:
            linked_apprentice = Apprentice(
                user_id=user.user_id,
                first_name=first_name,
                surname=surname,
                id_number=id_number,
                contact_number=contact_number,
                email=user.email,
            )
            db.add(linked_apprentice)
        db.flush()
        apprentice_id = linked_apprentice.apprentice_id

    elif user_in.role == "Mentor":
        mentor = Mentor(
            user_id=user.user_id,
            name=first_name,
            surname=surname,
            contact_number=contact_number,
            email=user.email,
        )
        db.add(mentor)
        db.flush()
        mentor_id = mentor.mentor_id

    db.commit()
    db.refresh(user)

    sent = send_account_credentials_email(user.email, username, password, user.full_name)
    log_audit_action(
        db,
        "CREATE",
        current_user.user_id,
        "User",
        user.user_id,
        new_value={
            "role": user.role,
            "credentials_emailed": sent,
            "apprentice_id": apprentice_id,
            "mentor_id": mentor_id,
        },
        ip_address=get_client_ip(request),
    )

    result = UserOut.model_validate(user, from_attributes=True).model_dump()
    result["credentials_sent"] = sent
    result["apprentice_id"] = apprentice_id
    result["mentor_id"] = mentor_id
    if not sent:
        result["dev_password"] = password
    return result


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
