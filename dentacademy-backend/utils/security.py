import os
import random
import re
import string
from datetime import datetime, timedelta
from typing import Optional
import jwt
import bcrypt
from fastapi import HTTPException, status

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRY_MINUTES", "60"))
BCRYPT_ROUNDS = int(os.getenv("BCRYPT_ROUNDS", "12"))

DEFAULT_SECRET = "dentacademy-secret-key-change-in-production-32chars"

if SECRET_KEY is None or (SECRET_KEY == DEFAULT_SECRET and os.getenv("ENVIRONMENT", "production") == "production"):
    raise RuntimeError(
        "JWT_SECRET_KEY must be set to a strong secret in production. "
        "Refusing to start with an insecure default."
    )


def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(password=pwd_bytes, salt=salt)
    return hashed.decode("utf-8")


def mask_id_number(value: str) -> str:
    """Mask a 13-digit South African ID for list views: 900101***1234."""
    if value and isinstance(value, str) and len(value) == 13 and value.isdigit():
        return value[:6] + "***" + value[-4:]
    return value


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


def _clean_name_part(value: Optional[str], fallback: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]", "", value or "").strip()
    return cleaned if cleaned else fallback


def generate_username(full_name: str, email: str = "", db=None) -> str:
    """Derive a unique username from the user's name/email credentials."""
    parts = [p for p in (full_name or "").split() if p.strip()]
    first = _clean_name_part(parts[0] if parts else "", "user")
    last = _clean_name_part(parts[-1] if len(parts) > 1 else "", first)

    base = f"{first}.{last}".lower()
    base = re.sub(r"[^a-z0-9.]", "", base)
    if not base:
        base = _clean_name_part(email.split("@")[0], "user").lower()

    candidate = base
    suffix = 1
    if db is not None:
        from models.user import User  # local import avoids circular dependency
        while db.query(User).filter(User.username == candidate).first():
            candidate = f"{base}{suffix}"
            suffix += 1
    return candidate


def generate_credential_password(
    full_name: str,
    id_number: Optional[str] = None,
    contact_number: Optional[str] = None,
    email: str = "",
) -> str:
    """Build a strong password from the person's own credentials.

    The password is a deterministic combination of their name, identity
    number, contact number and email, so it is memorable to the owner but
    still satisfies the strength rules (upper, lower, digit, special).
    """
    parts = [p for p in (full_name or "").split() if p.strip()]
    first = _clean_name_part(parts[0] if parts else "", "Apprentice").capitalize()
    last = _clean_name_part(parts[-1] if len(parts) > 1 else "", "User").capitalize()

    digits = ""
    for source in (id_number, contact_number, email):
        if source:
            digits += "".join(ch for ch in str(source) if ch.isdigit())
    digits = digits[-6:]

    if len(digits) < 4:
        digits = (digits + "2026").zfill(4)[:4]

    special = random.choice("!@#$%&")
    password = f"{first}{special}{last}{digits}!"
    return password[:24]


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
