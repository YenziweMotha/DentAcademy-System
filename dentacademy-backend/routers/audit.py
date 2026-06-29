from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_db
from models.audit import AuditLog
from models.user import User
from schemas.prediction import AuditLogOut
from middleware.auth_middleware import require_admin
from middleware.audit_middleware import get_client_ip

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("", response_model=List[AuditLogOut])
def get_audit_logs(
    user_id: Optional[int] = Query(None),
    action_type: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin-only: filterable audit log view. Retained ≥24 months."""
    q = db.query(AuditLog)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if action_type:
        q = q.filter(AuditLog.action_type == action_type)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if from_date:
        q = q.filter(AuditLog.timestamp >= from_date)
    if to_date:
        q = q.filter(AuditLog.timestamp <= to_date)
    return q.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
