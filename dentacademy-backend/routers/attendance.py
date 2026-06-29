from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from database import get_db
from models.attendance import Attendance
from models.apprentice import Apprentice
from models.user import User
from schemas.prediction import AttendanceCreate, AttendanceOut
from middleware.auth_middleware import get_current_user, require_staff
from middleware.audit_middleware import log_audit_action, get_client_ip

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


@router.get("/apprentice/{apprentice_id}", response_model=List[AttendanceOut])
def get_apprentice_attendance(
    apprentice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "Apprentice":
        app = db.query(Apprentice).filter(
            Apprentice.user_id == current_user.user_id
        ).first()
        if not app or app.apprentice_id != apprentice_id:
            raise HTTPException(403, "Access denied")
    return (
        db.query(Attendance)
        .filter(Attendance.apprentice_id == apprentice_id)
        .order_by(Attendance.period_start.desc())
        .all()
    )


@router.post("", response_model=AttendanceOut, status_code=201)
def record_attendance(
    request: Request,
    att_in: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    app = db.query(Apprentice).filter(
        Apprentice.apprentice_id == att_in.apprentice_id,
        Apprentice.is_synthetic == False,
    ).first()
    if not app:
        raise HTTPException(404, "Apprentice not found")

    rate = round(att_in.days_present / att_in.days_expected * 100, 2)
    att = Attendance(
        apprentice_id=att_in.apprentice_id,
        period_start=att_in.period_start,
        period_end=att_in.period_end,
        days_expected=att_in.days_expected,
        days_present=att_in.days_present,
        attendance_rate=rate,
        recorded_by=current_user.user_id,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    log_audit_action(db, "CREATE", current_user.user_id, "Attendance",
                     att.attendance_id, ip_address=get_client_ip(request))
    return att
