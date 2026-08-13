from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, Optional
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from middleware.auth_middleware import require_admin
from middleware.audit_middleware import log_audit_action, get_client_ip
from services.config_service import (
    get_setting, update_setting, DEFAULT_SETTINGS, ensure_default_settings,
)

router = APIRouter(prefix="/api/config", tags=["config"])


class ConfigOut(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


class ConfigUpdate(BaseModel):
    settings: Dict[str, str]


@router.get("", response_model=list[ConfigOut])
def get_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Return all configurable system settings (admin only)."""
    ensure_default_settings(db)
    rows = []
    for key, (_, description) in DEFAULT_SETTINGS.items():
        rows.append(
            ConfigOut(key=key, value=get_setting(db, key), description=description)
        )
    return rows


@router.put("", response_model=list[ConfigOut])
def put_config(
    body: ConfigUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update system settings (admin only)."""
    for key, value in body.settings.items():
        try:
            update_setting(db, key, str(value))
        except ValueError as exc:
            raise HTTPException(400, str(exc))
    log_audit_action(
        db, "UPDATE", current_user.user_id, "Setting",
        record_id=0,
        new_value=body.settings,
        ip_address=get_client_ip(request),
    )
    return get_config(db, current_user)
