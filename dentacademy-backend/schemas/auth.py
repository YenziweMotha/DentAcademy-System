from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
import re

PASSWORD_PATTERN = re.compile(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;\'`~]')
ALLOWED_ROLES = {"Administrator", "Supervisor", "Mentor", "Apprentice"}


def validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", v):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one number")
    if not PASSWORD_PATTERN.search(v):
        raise ValueError("Password must contain at least one special character")
    return v


class UserCreate(BaseModel):
    model_config = {"extra": "forbid"}

    username: Optional[str] = None
    email: EmailStr
    password: Optional[str] = None
    full_name: str
    role: str
    # Used when auto-generating a password (name/id are NOT used as password material).
    id_number: Optional[str] = None
    contact_number: Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v not in ALLOWED_ROLES:
            raise ValueError(f"Role must be one of {sorted(ALLOWED_ROLES)}")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if v is None:
            return v
        return validate_password_strength(v)


class UserUpdate(BaseModel):
    model_config = {"extra": "forbid"}

    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v is not None and v not in ALLOWED_ROLES:
            raise ValueError(f"Role must be one of {sorted(ALLOWED_ROLES)}")
        return v


class UserOut(BaseModel):
    user_id: int
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreatedOut(UserOut):
    """User creation response; may include auto-generated credentials in
    development when SMTP is not configured, so admins can relay them."""
    credentials_sent: bool = False
    dev_password: Optional[str] = None
    apprentice_id: Optional[int] = None
    apprentice_registered: Optional[bool] = None
    mentor_id: Optional[int] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        return validate_password_strength(v)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        return validate_password_strength(v)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    full_name: str
    email: str


class TokenData(BaseModel):
    username: str | None = None


class UserBase(BaseModel):
    username: str