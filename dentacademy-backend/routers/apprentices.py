from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.apprentice import Apprentice, Education
from models.mentor import MentorAssignment, Mentor
from models.user import User
from models.module import ModuleProgress, Module
from models.evaluation import Evaluation
from models.prediction import AIPrediction
from schemas.apprentice import (
    ApprenticeCreate,
    ApprenticeUpdate,
    ApprenticeOut,
    ApprenticeDetailOut,
    EducationCreate,
    EducationOut,
    ApprenticePaginatedOut
)
from middleware.auth_middleware import (
    get_current_user,
    require_admin,
    require_admin_or_supervisor,
)
from middleware.audit_middleware import log_audit_action, get_client_ip
import shutil, os
from datetime import datetime

router = APIRouter(prefix="/api/apprentices", tags=["apprentices"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads/photos")
MAX_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "2"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _enrich_apprentice_out(app: Apprentice, db: Session) -> dict:
    data = {
        "apprentice_id": app.apprentice_id,
        "surname": app.surname,
        "first_name": app.first_name,
        "id_number": app.id_number,
        "gender": app.gender,
        "contact_number": app.contact_number,
        "city": app.city,
        "province": app.province,
        "photo_url": app.photo_url,
        "status": app.status,
        "created_at": app.created_at,
        "updated_at": app.updated_at,
    }
    if app.education:
        data["qualification_type"] = app.education.qualification_type
        data["institution"] = app.education.institution_name

    total = db.query(Module).count()
    if total > 0:
        completed = db.query(ModuleProgress).filter(
            ModuleProgress.apprentice_id == app.apprentice_id,
            ModuleProgress.status == "Completed",
        ).count()
        data["completion_pct"] = round((completed / total) * 100, 2)
    else:
        data["completion_pct"] = 0.0

    return data


def _enrich_apprentice_detail(app: Apprentice, db: Session) -> dict:
    data = _enrich_apprentice_out(app, db)
    data["date_of_birth"] = app.date_of_birth
    data["address_line1"] = app.address_line1
    data["user_id"] = app.user_id

    total_modules = db.query(Module).count()
    completed_modules = db.query(ModuleProgress).filter(
        ModuleProgress.apprentice_id == app.apprentice_id,
        ModuleProgress.status == "Completed",
    ).count()
    data["module_count"] = total_modules
    data["completed_modules"] = completed_modules

    latest_eval = (
        db.query(Evaluation)
        .filter(Evaluation.apprentice_id == app.apprentice_id)
        .order_by(Evaluation.submitted_at.desc())
        .first()
    )
    if latest_eval:
        data["latest_evaluation"] = {
            "overall_score": float(latest_eval.overall_score),
            "submitted_at": latest_eval.submitted_at,
        }
    else:
        data["latest_evaluation"] = None

    return data



def _check_mentor_access(current_user: User, apprentice_id: int, db: Session):
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


@router.get("", response_model=ApprenticePaginatedOut)
def list_apprentices(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List apprentices according to the logged-in user's role.

    Administrator:
        Can see all apprentices.

    Supervisor:
        Can see apprentices assigned to mentors belonging
        to that supervisor.

    Mentor:
        Can see only apprentices currently assigned to them.

    Apprentice:
        Can see only their own record.
    """

    # =========================================================
    # BASE QUERY
    # =========================================================

    q = db.query(Apprentice)

    # =========================================================
    # ADMINISTRATOR
    # =========================================================

    if current_user.role == "Administrator":
        # Administrator has unrestricted access.
        pass

    # =========================================================
    # MENTOR
    # =========================================================

    elif current_user.role == "Mentor":

        mentor = (
            db.query(Mentor)
            .filter(
                Mentor.user_id == current_user.user_id
            )
            .first()
        )

        if not mentor:
            raise HTTPException(
                status_code=403,
                detail="Mentor profile not found."
            )

        # Subquery containing apprentices currently assigned
        # to this mentor.
        assigned_apprentice_ids = (
            db.query(MentorAssignment.apprentice_id)
            .filter(
                MentorAssignment.mentor_id == mentor.mentor_id,
                MentorAssignment.is_current == True,
            )
            .subquery()
        )

        q = q.filter(
            Apprentice.apprentice_id.in_(
                assigned_apprentice_ids
            )
        )

    # =========================================================
    # APPRENTICE
    # =========================================================

    elif current_user.role == "Apprentice":

        q = q.filter(
            Apprentice.user_id ==
            current_user.user_id
        )

    # =========================================================
    # SUPERVISOR
    # =========================================================

    elif current_user.role == "Supervisor":

        # -----------------------------------------------------
        # IMPORTANT:
        #
        # We need the relationship between Supervisor and
        # Mentor before this section can be completed.
        #
        # Your current Mentor model does NOT contain a
        # supervisor_id field.
        # -----------------------------------------------------

        raise HTTPException(
            status_code=501,
            detail=(
                "Supervisor mentor assignment has not yet "
                "been configured in the database."
            )
        )

    # =========================================================
    # UNKNOWN ROLE
    # =========================================================

    else:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view apprentices."
        )

    # =========================================================
    # SEARCH
    # =========================================================

    if search:
        search_term = f"%{search.strip()}%"

        q = q.filter(
            (Apprentice.first_name.ilike(search_term))
            |
            (Apprentice.surname.ilike(search_term))
            |
            (Apprentice.id_number.ilike(search_term))
        )

    # =========================================================
    # STATUS FILTER
    # =========================================================

    if status:
        normalized_status = status.upper()

        if normalized_status not in [
            "ACTIVE",
            "INACTIVE",
        ]:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid status. "
                    "Use ACTIVE or INACTIVE."
                )
            )

        q = q.filter(
            Apprentice.status ==
            normalized_status
        )

    # =========================================================
    # TOTAL
    #
    # This must happen BEFORE pagination.
    # =========================================================

    total = q.count()

    # =========================================================
    # PAGINATION
    # =========================================================

    results = (
        q
        .order_by(
            Apprentice.apprentice_id.asc()
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    # =========================================================
    # RESPONSE
    # =========================================================

    return {
        "items": [
            _enrich_apprentice_out(
                apprentice,
                db
            )
            for apprentice in results
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }

@router.get("/{apprentice_id}", response_model=ApprenticeDetailOut)
def get_apprentice(
    apprentice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Apprentice).filter(
        Apprentice.apprentice_id == apprentice_id,
    ).first()
    if not app:
        raise HTTPException(404, "Apprentice not found")
    if current_user.role == "Apprentice" and app.user_id != current_user.user_id:
        raise HTTPException(403, "Access denied")
    if current_user.role == "Mentor":
        _check_mentor_access(current_user, apprentice_id, db)
    return _enrich_apprentice_detail(app, db)


@router.put("/{apprentice_id}", response_model=ApprenticeDetailOut)
def update_apprentice(
    apprentice_id: int,
    request: Request,
    app_in: ApprenticeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    app = db.query(Apprentice).filter(
        Apprentice.apprentice_id == apprentice_id
    ).first()
    if not app:
        raise HTTPException(404, "Apprentice not found")
    old_data = {
        c.name: str(getattr(app, c.name)) for c in app.__table__.columns
    }
    update_data = app_in.to_model_dict()
    for k, v in update_data.items():
        setattr(app, k, v)
    app.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(app)
    log_audit_action(
        db,
        "UPDATE",
        current_user.user_id,
        "Apprentice",
        app.apprentice_id,
        old_value=old_data,
        ip_address=get_client_ip(request),
    )
    return _enrich_apprentice_detail(app, db)


@router.patch("/{apprentice_id}/deactivate", status_code=200)
def deactivate_apprentice(
    apprentice_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    app = db.query(Apprentice).filter(
        Apprentice.apprentice_id == apprentice_id
    ).first()
    if not app:
        raise HTTPException(404, "Apprentice not found")
    app.status = "INACTIVE"
    app.updated_at = datetime.utcnow()
    db.commit()
    log_audit_action(
        db,
        "UPDATE",
        current_user.user_id,
        "Apprentice",
        app.apprentice_id,
        new_value={"status": "INACTIVE"},
        ip_address=get_client_ip(request),
    )
    return {
        "message": "Apprentice deactivated",
        "apprentice_id": apprentice_id,
    }


@router.post("/{apprentice_id}/photo", status_code=200)
def upload_photo(
    apprentice_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    app = db.query(Apprentice).filter(
        Apprentice.apprentice_id == apprentice_id
    ).first()
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
    log_audit_action(
        db,
        "PHOTO_UPLOADED",
        current_user.user_id,
        "Apprentice",
        apprentice_id,
        ip_address=get_client_ip(request),
    )
    return {"photo_url": path}


@router.get("/{apprentice_id}/education", response_model=EducationOut)
def get_education(
    apprentice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "Mentor":
        _check_mentor_access(current_user, apprentice_id, db)
    edu = db.query(Education).filter(
        Education.apprentice_id == apprentice_id
    ).first()
    if not edu:
        raise HTTPException(404, "Education record not found")
    return edu


@router.post(
    "/{apprentice_id}/education", response_model=EducationOut, status_code=201
)
def create_education(
    apprentice_id: int,
    request: Request,
    edu_in: EducationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    app = db.query(Apprentice).filter(
        Apprentice.apprentice_id == apprentice_id
    ).first()
    if not app:
        raise HTTPException(404, "Apprentice not found")
    if db.query(Education).filter(
        Education.apprentice_id == apprentice_id
    ).first():
        raise HTTPException(
            400, "Education record already exists. Use PUT to update."
        )
    subjects = edu_in.subjects_json or []
    avg = (
        sum(s.mark for s in subjects) / len(subjects) if subjects else None
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
    log_audit_action(
        db,
        "CREATE",
        current_user.user_id,
        "Education",
        edu.education_id,
        ip_address=get_client_ip(request),
    )
    return edu


@router.put("/{apprentice_id}/education", response_model=EducationOut)
def update_education(
    apprentice_id: int,
    request: Request,
    edu_in: EducationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    edu = db.query(Education).filter(
        Education.apprentice_id == apprentice_id
    ).first()
    if not edu:
        raise HTTPException(
            404, "Education record not found. Use POST to create."
        )
    subjects = edu_in.subjects_json or []
    avg = (
        sum(s.mark for s in subjects) / len(subjects) if subjects else None
    )
    edu.qualification_type = edu_in.qualification_type
    edu.institution_name = edu_in.institution_name
    edu.subjects_json = [s.model_dump() for s in subjects]
    edu.average_mark = round(avg, 2) if avg is not None else None
    db.commit()
    db.refresh(edu)
    log_audit_action(
        db,
        "UPDATE",
        current_user.user_id,
        "Education",
        edu.education_id,
        ip_address=get_client_ip(request),
    )
    return edu
