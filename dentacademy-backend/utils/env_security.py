"""Shared security helpers for environment and secret disclosure."""

from __future__ import annotations

import os
import secrets
import string


def is_development() -> bool:
    return os.getenv("ENVIRONMENT", "production").lower() in {
        "development",
        "dev",
        "test",
        "local",
    }


def allow_credential_reveal() -> bool:
    """Plaintext passwords may only leave the API in non-production."""
    return is_development()


def generate_secure_password(length: int = 16) -> str:
    """Cryptographically strong password meeting app strength rules."""
    length = max(12, min(length, 64))
    alphabet = string.ascii_letters + string.digits + "!@#$%&*"
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(c.isupper() for c in password)
            and any(c.islower() for c in password)
            and any(c.isdigit() for c in password)
            and any(c in "!@#$%&*" for c in password)
        ):
            return password
