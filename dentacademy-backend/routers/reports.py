from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from database import get_db
from models.user import User
from models.audit import AuditLog
from middleware.auth_middleware import (
    require_admin,
    require_supervisor,
    require_admin_or_supervisor,
)
from middleware.audit_middleware import log_audit_action

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/apprentice/{id}")
def get_apprentice_report(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    from services.report_service import generate_apprentice_pdf

    pdf_path = generate_apprentice_pdf(id, db)
    log_audit_action(db, "REPORT_GENERATED", current_user.user_id, "Apprentice", id)
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"apprentice_{id}_report.pdf",
    )


@router.get("/programme-summary")
def get_programme_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    from services.report_service import generate_summary_pdf

    pdf_path = generate_summary_pdf(db)
    log_audit_action(db, "REPORT_GENERATED", current_user.user_id, "System")
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename="programme_summary.pdf",
    )


@router.get("/audit-log")
def get_audit_log(
    from_date: str = Query(None, alias="from"),
    to_date: str = Query(None, alias="to"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    q = db.query(AuditLog)

    if from_date:
        try:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d")
            q = q.filter(AuditLog.timestamp >= from_dt)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid 'from' date format. Use YYYY-MM-DD.",
            )

    if to_date:
        try:
            to_dt = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
            q = q.filter(AuditLog.timestamp < to_dt)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid 'to' date format. Use YYYY-MM-DD.",
            )

    logs = q.order_by(AuditLog.timestamp.desc()).limit(1000).all()
    return [
        {
            "log_id": log.log_id,
            "user_id": log.user_id,
            "action_type": log.action_type,
            "entity_type": log.entity_type,
            "record_id": log.record_id,
            "ip_address": log.ip_address,
            "timestamp": log.timestamp,
        }
        for log in logs
    ]



