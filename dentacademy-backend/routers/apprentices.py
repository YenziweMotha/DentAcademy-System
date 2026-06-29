from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.apprentice import Apprentice, Education
from models.mentor import MentorAssignment, Mentor
from models.user import User
from schemas.apprentice import (
    ApprenticeCreate, ApprenticeUpdate, ApprenticeOut,
    ApprenticeDetailOut, EducationCreate, EducationOut
)
from middleware.auth_middleware import (
    get_current_user, require_admin, require_admin_or_supervisor
)
from middleware.audit_middleware import log_audit_action, get_client_ip
import shutil, os
from datetime import datetime

router = APIRouter(prefix="/api/apprentices", tags=["apprentices"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads/photos")
MAX_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "2"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _check_mentor_access(current_user: User, apprentice_id: int, db: Session):
    """Raise 403 if a Mentor tries to access an unassigned apprentice."""
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    if not mentor:
        raise HTTPException(403, "Mentor profile not found")
    assigned = db.query(MentorAssignment).filter(
        MentorAssignment.mentor_id == mentor.mentor_id,
        MentorAssignment.apprentice_id == apprentice_id,
        MentorAssignment.is_current == True,
    ).first()
    if not assigned:
        raise HTTPException(403, "You are not assigned to this apprentice")


@router.get("", response_model=List[ApprenticeOut])
def list_apprentices(
    skip: int = 0, limit: int = 50,
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Apprentice).filter(Apprentice.is_synthetic == False)
    if current_user.role == "Apprentice":
        apprentice = db.query(Apprentice).filter(
            Apprentice.user_id == current_user.user_id
        ).first()
        return [apprentice] if apprentice else []
    if current_user.role == "Mentor":
        mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
        if not mentor:
            return []
        assigned_ids = db.query(MentorAssignment.apprentice_id).filter(
            MentorAssignment.mentor_id == mentor.mentor_id,
            MentorAssignment.is_current == True,
        ).all()
        ids = [r[0] for r in assigned_ids]
        q = q.filter(Apprentice.apprentice_id.in_(ids))
    if search:
        q = q.filter(
            (Apprentice.first_name.ilike(f"%{search}%")) |
            (Apprentice.surname.ilike(f"%{search}%")) |
            (Apprentice.id_number.ilike(f"%{search}%"))
        )
    if status:
        q = q.filter(Apprentice.status == status.upper())
    return q.offset(skip).limit(limit).all()


@router.post("", response_model=ApprenticeDetailOut, status_code=201)
def create_apprentice(
    request: Request,
    app_in: ApprenticeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if db.query(Apprentice).filter(Apprentice.id_number == app_in.id_number).first():
        raise HTTPException(400, "An apprentice with this ID number already exists")
    new_app = Apprentice(**app_in.model_dump())
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    log_audit_action(db, "CREATE", current_user.user_id, "Apprentice",
                     new_app.apprentice_id, ip_address=get_client_ip(request))
    return new_app


@router.get("/{apprentice_id}", response_model=ApprenticeDetailOut)
def get_apprentice(
    apprentice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Apprentice).filter(
        Apprentice.apprentice_id == apprentice_id,
        Apprentice.is_synthetic == False,
    ).first()
    if not app:
        raise HTTPException(404, "Apprentice not found")
    if current_user.role == "Apprentice" and app.user_id != current_user.user_id:
        raise HTTPException(403, "Access denied")
    if current_user.role == "Mentor":
        _check_mentor_access(current_user, apprentice_id, db)
    return app


@router.put("/{apprentice_id}", response_model=ApprenticeDetailOut)
def update_apprentice(
    apprentice_id: int,
    request: Request,
    app_in: ApprenticeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    app = db.query(Apprentice).filter(Apprentice.apprentice_id == apprentice_id).first()
    if not app:
        raise HTTPException(404, "Apprentice not found")
    old_data = {c.name: str(getattr(app, c.name)) for c in app.__table__.columns}
    for k, v in app_in.model_dump(exclude_unset=True).items():
        setattr(app, k, v)
    app.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(app)
    log_audit_action(db, "UPDATE", current_user.user_id, "Apprentice",
                     app.apprentice_id, old_value=old_data, ip_address=get_client_ip(request))
    return app


@router.patch("/{apprentice_id}/deactivate", status_code=200)
def deactivate_apprentice(
    apprentice_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Soft-delete: set status to INACTIVE. Never hard-delete."""
    app = db.query(Apprentice).filter(Apprentice.apprentice_id == apprentice_id).first()
    if not app:
        raise HTTPException(404, "Apprentice not found")
    app.status = "INACTIVE"
    app.updated_at = datetime.utcnow()
    db.commit()
    log_audit_action(db, "UPDATE", current_user.user_id, "Apprentice",
                     app.apprentice_id, new_value={"status": "INACTIVE"},
                     ip_address=get_client_ip(request))
    return {"message": "Apprentice deactivated", "apprentice_id": apprentice_id}


@router.post("/{apprentice_id}/photo", status_code=200)
def upload_photo(
    apprentice_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    app = db.query(Apprentice).filter(Apprentice.apprentice_id == apprentice_id).first()
    if not app:
        raise HTTPException(404, "Apprentice not found")
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(400, "Only JPG and PNG files are accepted")
    content = file.file.read()
    if len(content) > MAX_MB * 1024 * 1024:
        raise HTTPException(400, f"File exceeds {MAX_MB}MB limit")
    ext = "jpg" if file.content_type == "image/jpeg" else "png"
    path = os.path.join(UPLOAD_DIR, f"apprentice_{apprentice_id}.{ext}")
    with open(path, "wb") as f:
        f.write(content)
    app.photo_url = path
    db.commit()
    log_audit_action(db, "PHOTO_UPLOADED", current_user.user_id, "Apprentice",
                     apprentice_id, ip_address=get_client_ip(request))
    return {"photo_url": path}


# ── Education ──────────────────────────────────────────────────────────────────

@router.get("/{apprentice_id}/education", response_model=EducationOut)
def get_education(
    apprentice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "Mentor":
        _check_mentor_access(current_user, apprentice_id, db)
    edu = db.query(Education).filter(Education.apprentice_id == apprentice_id).first()
    if not edu:
        raise HTTPException(404, "Education record not found")
    return edu


@router.post("/{apprentice_id}/education", response_model=EducationOut, status_code=201)
def create_education(
    apprentice_id: int,
    request: Request,
    edu_in: EducationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    app = db.query(Apprentice).filter(Apprentice.apprentice_id == apprentice_id).first()
    if not app:
        raise HTTPException(404, "Apprentice not found")
    if db.query(Education).filter(Education.apprentice_id == apprentice_id).first():
        raise HTTPException(400, "Education record already exists. Use PUT to update.")
    subjects = edu_in.subjects_json or []
    avg = (
        sum(s.mark for s in subjects) / len(subjects)
        if subjects else None
    )
    edu = Education(
        apprentice_id=apprentice_id,
        qualification_type=edu_in.qualification_type,
        institution_name=edu_in.institution_name,
        subjects_json=[s.model_dump() for s in subjects],
        average_mark=round(avg, 2) if avg is not None else None,
    )
    db.add(edu)
    db.commit()
    db.refresh(edu)
    log_audit_action(db, "CREATE", current_user.user_id, "Education",
                     edu.education_id, ip_address=get_client_ip(request))
    return edu


@router.put("/{apprentice_id}/education", response_model=EducationOut)
def update_education(
    apprentice_id: int,
    request: Request,
    edu_in: EducationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    edu = db.query(Education).filter(Education.apprentice_id == apprentice_id).first()
    if not edu:
        raise HTTPException(404, "Education record not found. Use POST to create.")
    subjects = edu_in.subjects_json or []
    avg = (
        sum(s.mark for s in subjects) / len(subjects)
        if subjects else None
    )
    edu.qualification_type = edu_in.qualification_type
    edu.institution_name = edu_in.institution_name
    edu.subjects_json = [s.model_dump() for s in subjects]
    edu.average_mark = round(avg, 2) if avg is not None else None
    db.commit()
    db.refresh(edu)
    log_audit_action(db, "UPDATE", current_user.user_id, "Education",
                     edu.education_id, ip_address=get_client_ip(request))
    return edu
