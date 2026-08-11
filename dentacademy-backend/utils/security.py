import os
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
