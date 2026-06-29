from sqlalchemy.orm import Session
from models.audit import AuditLog
from datetime import datetime


def log_audit_action(
    db: Session,
    action_type: str,
    user_id: int,
    entity_type: str,
    record_id: int,
    old_value: dict = None,
    new_value: dict = None,
    ip_address: str = None,
):
    """
    Insert an audit log entry. This is INSERT-ONLY — never update or delete.
    Called after every create/update/delete/login/logout action.
    """
    try:
        log = AuditLog(
            user_id=user_id,
            action_type=action_type,
            entity_type=entity_type,
            record_id=record_id,
            old_value_json=old_value,
            new_value_json=new_value,
            ip_address=ip_address,
            timestamp=datetime.utcnow(),
        )
        db.add(log)
        db.commit()
    except Exception as e:
        # Never let audit failure break the main request
        db.rollback()


def get_client_ip(request) -> str:
    """Extract real client IP, accounting for reverse proxy X-Forwarded-For."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return getattr(request.client, "host", "unknown")
