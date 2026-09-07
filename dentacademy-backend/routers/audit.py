from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models.audit import AuditLog
from models.user import User
from schemas.audit import AuditLogListOut, AuditLogMetaOut, AuditLogOut
from middleware.auth_middleware import require_admin

router = APIRouter(prefix="/api/audit", tags=["audit"])

KNOWN_ACTIONS = [
    "CREATE",
    "UPDATE",
    "DELETE",
    "LOGIN",
    "LOGOUT",
    "ACCESS",
    "LOGIN_FAILED",
    "ACCOUNT_LOCKED",
    "PASSWORD_RESET_REQUEST",
    "PASSWORD_RESET_DONE",
    "PREDICTION_GENERATED",
    "EVALUATION_APPROVED",
    "REPORT_GENERATED",
    "PHOTO_UPLOADED",
]

SECURITY_ACTIONS = ("LOGIN_FAILED", "ACCOUNT_LOCKED")
AUTH_ACTIONS = ("LOGIN", "LOGOUT")
DATA_ACTIONS = ("CREATE", "UPDATE", "DELETE")


def _serialize(log: AuditLog) -> dict:
    actor = log.user
    return {
        "log_id": log.log_id,
        "user_id": log.user_id,
        "user_name": actor.full_name if actor else None,
        "user_username": actor.username if actor else None,
        "user_role": actor.role if actor else None,
        "action_type": log.action_type,
        "entity_type": log.entity_type,
        "record_id": log.record_id,
        "old_value_json": log.old_value_json,
        "new_value_json": log.new_value_json,
        "ip_address": log.ip_address,
        "timestamp": log.timestamp,
    }


def _apply_filters(
    q,
    user_id: Optional[int],
    action_type: Optional[str],
    entity_type: Optional[str],
    from_date: Optional[date],
    to_date: Optional[date],
    search: Optional[str],
):
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if action_type:
        q = q.filter(AuditLog.action_type == action_type)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if from_date:
        q = q.filter(AuditLog.timestamp >= from_date)
    if to_date:
        q = q.filter(AuditLog.timestamp < to_date + timedelta(days=1))
    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.outerjoin(User, AuditLog.user_id == User.user_id).filter(
            or_(
                User.full_name.ilike(term),
                User.username.ilike(term),
                AuditLog.entity_type.ilike(term),
                AuditLog.action_type.ilike(term),
                AuditLog.ip_address.ilike(term),
            )
        )
    return q


@router.get("", response_model=AuditLogListOut)
def get_audit_logs(
    user_id: Optional[int] = Query(None),
    action_type: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin-only: filterable, paginated audit log view."""
    filtered = _apply_filters(
        db.query(AuditLog),
        user_id,
        action_type,
        entity_type,
        from_date,
        to_date,
        search,
    )
    total = filtered.count()
    counts = dict(
        filtered.with_entities(AuditLog.action_type, func.count(AuditLog.log_id))
        .group_by(AuditLog.action_type)
        .all()
    )

    rows = (
        _apply_filters(
            db.query(AuditLog).options(joinedload(AuditLog.user)),
            user_id,
            action_type,
            entity_type,
            from_date,
            to_date,
            search,
        )
        .order_by(AuditLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "items": [_serialize(row) for row in rows],
        "total": total,
        "skip": skip,
        "limit": limit,
        "summary": {
            "total": total,
            "security_events": sum(counts.get(a, 0) for a in SECURITY_ACTIONS),
            "auth_events": sum(counts.get(a, 0) for a in AUTH_ACTIONS),
            "data_changes": sum(counts.get(a, 0) for a in DATA_ACTIONS),
        },
    }


@router.get("/meta", response_model=AuditLogMetaOut)
def get_audit_meta(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Action and entity types available for the admin logs filters."""
    used_actions = [
        row[0] for row in db.query(AuditLog.action_type).distinct().all() if row[0]
    ]
    action_types = list(dict.fromkeys([*KNOWN_ACTIONS, *used_actions]))
    entity_types = sorted(
        row[0] for row in db.query(AuditLog.entity_type).distinct().all() if row[0]
    )
    return {"action_types": action_types, "entity_types": entity_types}


@router.get("/{log_id}", response_model=AuditLogOut)
def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    log = (
        db.query(AuditLog)
        .options(joinedload(AuditLog.user))
        .filter(AuditLog.log_id == log_id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Audit log entry not found.")
    return _serialize(log)
