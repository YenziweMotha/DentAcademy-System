from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from middleware.auth_middleware import require_admin, require_supervisor, require_admin_or_supervisor
from middleware.audit_middleware import log_audit_action

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/apprentice/{id}")
def get_apprentice_report(id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_supervisor)):
    from services.report_service import generate_apprentice_pdf
    pdf_path = generate_apprentice_pdf(id, db)
    log_audit_action(db, "REPORT_GENERATED", current_user.user_id, "Apprentice", id)
    return {"message": "Report generated", "path": pdf_path}

@router.get("/programme-summary")
def get_programme_summary(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_supervisor)):
    from services.report_service import generate_summary_pdf
    pdf_path = generate_summary_pdf(db)
    log_audit_action(db, "REPORT_GENERATED", current_user.user_id, "System")
    return {"message": "Programme summary generated", "path": pdf_path}

@router.get("/audit-log")
def get_audit_log(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    from models.audit import AuditLog
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    return logs
