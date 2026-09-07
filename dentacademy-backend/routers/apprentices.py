from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import uuid4
from database import get_db
from models.apprentice import Apprentice
from models.education import Education, EducationSubject
from models.mentor import MentorAssignment, Mentor
from models.user import User
from models.module import ModuleProgress, Module
from models.evaluation import Evaluation
from models.prediction import AIPrediction
from schemas.apprentice import (
    ApprenticeCreate,
    ApprenticeRegister,
    ApprenticeUpdate,
    ApprenticeOut,
    ApprenticeDetailOut,
    EducationCreate,
    EducationOut,
    ApprenticePaginatedOut,
    ApprenticeCreatedOut,
)
from middleware.auth_middleware import (
    get_current_user,
    require_admin,
    require_admin_or_supervisor,
)
from middleware.audit_middleware import log_audit_action, get_client_ip
from utils.security import (
    mask_id_number,
    get_password_hash,
    generate_username,
    generate_credential_password,
)
from services.email_service import send_account_credentials_email
import os
from datetime import datetime

router = APIRouter(prefix="/api/apprentices", tags=["apprentices"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads/photos")
MAX_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "2"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

JPEG_MAGIC = b"\xff\xd8\xff"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def _completion_pct(app: Apprentice, db: Session) -> float:
    total = (
        db.query(Module)
        .filter(Module.is_active == True)
        .count()
    )
    if total == 0:
        return 0.0
    completed = db.query(ModuleProgress).filter(
        ModuleProgress.apprentice_id == app.apprentice_id,
        ModuleProgress.status == "Completed",
    ).count()
    return round((completed / total) * 100, 2)


def _enrich_apprentice_out(app: Apprentice, db: Session) -> dict:
    data = {
        "apprentice_id": app.apprentice_id,
        "surname": app.surname,
        "first_name": app.first_name,
"id_number": mask_id_number(app.id_number),
        "gender": app.gender,
        "contact_number": app.contact_number,
        "email": app.email,
        "city": app.city,
        "province": app.province,
        "photo_url": app.photo_url,
        "status": app.status,
        "created_at": app.created_at,
        "updated_at": app.updated_at,
        "registered_at": app.registered_at,
        "is_registered": app.registered_at is not None,
    }
    if app.education:
        data["qualification_type"] = app.education.qualification_type
        data["institution"] = app.education.institution_name
    data["completion_pct"] = _completion_pct(app, db)
    return data


def _enrich_apprentice_detail(app: Apprentice, db: Session) -> dict:
    data = _enrich_apprentice_out(app, db)
    data["date_of_birth"] = app.date_of_birth
    data["address_line1"] = app.address_line1
    data["user_id"] = app.user_id

    total_modules = db.query(Module).filter(Module.is_active == True).count()
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
    data["latest_evaluation"] = (
        {
            "overall_score": float(latest_eval.overall_score),
            "submitted_at": latest_eval.submitted_at,
        }
        if latest_eval else None
    )

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


def _sync_subjects(edu: Education, subjects: List[dict]):
    edu.subjects = [
        EducationSubject(subject_name=s["subject"], mark=s["mark"])
        for s in subjects
    ]
    edu.average_mark = (
        round(sum(s["mark"] for s in subjects) / len(subjects), 2)
        if subjects else None
    )


def _provision_account(
    full_name: str,
    email: str,
    id_number: Optional[str],
    contact_number: Optional[str],
    db: Session,
):
    """Create a login account for an apprentice and email the credentials."""
    username = generate_username(full_name, email, db)
    password = generate_credential_password(
        full_name=full_name,
        id_number=id_number,
        contact_number=contact_number,
        email=email,
    )
    user = User(
        username=username,
        email=email,
        password_hash=get_password_hash(password),
        full_name=full_name,
        role="Apprentice",
    )
    db.add(user)
    db.flush()
    sent = send_account_credentials_email(email, username, password, full_name)
    return user, password, sent


def _resolve_account_for_email(
    email: Optional[str], current_app: Optional[Apprentice], db: Session
) -> Optional[User]:
    """Return an existing Apprentice-role account that may be reused for this
    email, or None. Raises 409 when the address belongs to someone else."""
    if not email:
        return None
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        return None
    linked = db.query(Apprentice).filter(
        Apprentice.user_id == user.user_id
    ).first()
    if user.role != "Apprentice" or (
        linked is not None and linked is not current_app
    ):
        raise HTTPException(
            status_code=409,
            detail="A user account already exists for this email address.",
        )
    return user


def _complete_registration(
    app: Apprentice,
    app_in,
    existing_user: Optional[User],
    current_user: User,
    request: Request,
    db: Session,
) -> dict:
    """Fill in a placeholder apprentice created alongside a login account."""
    old_data = {
        c.name: str(getattr(app, c.name)) for c in app.__table__.columns
    }

    for field in (
        "first_name", "surname", "date_of_birth", "gender",
        "contact_number", "email", "address_line1", "city", "province",
    ):
        value = getattr(app_in, field)
        if value is not None:
            setattr(app, field, value)

    password = None
    credentials_sent = False
    app_user = app.user or existing_user

    if app_user is None and app_in.email:
        app_user, password, credentials_sent = _provision_account(
            f"{app_in.first_name} {app_in.surname}",
            app_in.email,
            app.id_number,
            app_in.contact_number,
            db,
        )

    if app_user is not None:
        app.user_id = app_user.user_id
        app_user.full_name = f"{app_in.first_name} {app_in.surname}"

    app.registered_at = datetime.utcnow()
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
        new_value={
            "registration_completed": True,
            "names": f"{app.first_name} {app.surname}",
            "credentials_emailed": credentials_sent,
        },
        ip_address=get_client_ip(request),
    )

    data = _enrich_apprentice_detail(app, db)
    if app_user is not None:
        data["account_credentials"] = {
            "username": app_user.username,
            "sent": credentials_sent,
            "password": None if credentials_sent else password,
            "existing_account": password is None,
        }
    return data


@router.get("", response_model=ApprenticePaginatedOut)
def list_apprentices(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    registration: Optional[str] = Query(
        None, description="Filter by registration state: pending or complete."
    ),
    sort_by: Optional[str] = Query("apprentice_id"),
    order: str = Query("asc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List apprentices according to the logged-in user's role.

    Administrator: all apprentices.
    Supervisor: programme-wide apprentice list.
    Mentor: only apprentices currently assigned to them.
    Apprentice: only their own record.
    """
    q = db.query(Apprentice)

    if current_user.role == "Administrator":
        pass
    elif current_user.role == "Supervisor":
        pass
    elif current_user.role == "Mentor":
        mentor = (
            db.query(Mentor)
            .filter(Mentor.user_id == current_user.user_id)
            .first()
        )
        if not mentor:
            raise HTTPException(403, "Mentor profile not found")
        assigned_apprentice_ids = (
            db.query(MentorAssignment.apprentice_id)
            .filter(
                MentorAssignment.mentor_id == mentor.mentor_id,
                MentorAssignment.is_current == True,
            )
            .subquery()
        )
        q = q.filter(Apprentice.apprentice_id.in_(assigned_apprentice_ids))
    elif current_user.role == "Apprentice":
        q = q.filter(Apprentice.user_id == current_user.user_id)
    else:
        raise HTTPException(403, "You do not have permission to view apprentices.")

    if search:
        search_term = f"%{search.strip()}%"
        q = q.filter(
            (Apprentice.first_name.ilike(search_term))
            | (Apprentice.surname.ilike(search_term))
            | (Apprentice.id_number.ilike(search_term))
        )

    if status:
        normalized_status = status.upper()
        if normalized_status not in ["ACTIVE", "INACTIVE"]:
            raise HTTPException(400, "Invalid status. Use ACTIVE or INACTIVE.")
        q = q.filter(Apprentice.status == normalized_status)

    if registration:
        normalized_registration = registration.lower()
        if normalized_registration == "pending":
            q = q.filter(Apprentice.registered_at.is_(None))
        elif normalized_registration == "complete":
            q = q.filter(Apprentice.registered_at.isnot(None))
        else:
            raise HTTPException(400, "Invalid registration filter. Use pending or complete.")

    total = q.count()

    if sort_by not in {"apprentice_id", "first_name", "surname"}:
        sort_by = "apprentice_id"
    sort_column = getattr(Apprentice, sort_by)
    if order == "desc":
        sort_column = sort_column.desc()

    results = q.order_by(sort_column).offset(skip).limit(limit).all()

    return {
        "items": [_enrich_apprentice_out(a, db) for a in results],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=ApprenticeCreatedOut, status_code=201)
def create_apprentice(
    request: Request,
    app_in: ApprenticeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Register an apprentice. National ID must be unique.

    A placeholder record created alongside a login account on the Users page is
    completed in place rather than rejected as a duplicate."""
    existing = db.query(Apprentice).filter(
        Apprentice.id_number == app_in.id_number
    ).first()
    if existing and existing.registered_at is not None:
        raise HTTPException(
            status_code=409,
            detail="An apprentice with this national ID number is already registered.",
        )

    # Reusing the account already attached to the record being completed is
    # expected; any other match on the address is a genuine clash.
    existing_user = _resolve_account_for_email(app_in.email, existing, db)

    if existing is not None:
        return _complete_registration(
            existing, app_in, existing_user, current_user, request, db
        )

    # Auto-provision a login account so the apprentice can sign in and give
    # feedback. The password is a combination of their credentials. An unlinked
    # apprentice account created from the Users page is reused instead.
    app_user = existing_user
    password = None
    credentials_sent = False
    if app_in.email and existing_user is None:
        app_user, password, credentials_sent = _provision_account(
            f"{app_in.first_name} {app_in.surname}",
            app_in.email,
            app_in.id_number,
            app_in.contact_number,
            db,
        )

    app = Apprentice(
        first_name=app_in.first_name,
        surname=app_in.surname,
        id_number=app_in.id_number,
        date_of_birth=app_in.date_of_birth,
        gender=app_in.gender,
        contact_number=app_in.contact_number,
        email=app_in.email,
        address_line1=app_in.address_line1,
        city=app_in.city,
        province=app_in.province,
        user_id=app_user.user_id if app_user else None,
        registered_at=datetime.utcnow(),
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    log_audit_action(
        db,
        "CREATE",
        current_user.user_id,
        "Apprentice",
        app.apprentice_id,
        new_value={
            "id_number": app.id_number,
            "names": f"{app.first_name} {app.surname}",
            "account_created": app_user is not None and existing_user is None,
            "account_linked": existing_user is not None,
            "credentials_emailed": credentials_sent,
        },
        ip_address=get_client_ip(request),
    )
    data = _enrich_apprentice_detail(app, db)
    if app_user is not None:
        data["account_credentials"] = {
            "username": app_user.username,
            "sent": credentials_sent,
            "password": None if credentials_sent else password,
            "existing_account": existing_user is not None,
        }
    return data


@router.post(
    "/{apprentice_id}/registration",
    response_model=ApprenticeCreatedOut,
    status_code=200,
)
def register_existing_apprentice(
    apprentice_id: int,
    request: Request,
    app_in: ApprenticeRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Complete the registration of a placeholder apprentice.

    Placeholders are created when an Apprentice login account is added from the
    Users page; this captures the remaining personal details. The national ID
    already on the record is kept."""
    app = db.query(Apprentice).filter(
        Apprentice.apprentice_id == apprentice_id
    ).first()
    if not app:
        raise HTTPException(404, "Apprentice not found")
    if app.registered_at is not None:
        raise HTTPException(
            status_code=409,
            detail="This apprentice is already registered. Use edit to change their details.",
        )

    existing_user = _resolve_account_for_email(app_in.email, app, db)
    return _complete_registration(
        app, app_in, existing_user, current_user, request, db
    )


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
    for field in (
        "first_name", "surname", "date_of_birth", "gender",
        "contact_number", "email", "address_line1", "city", "province",
    ):
        value = getattr(app_in, field)
        if value is not None:
            setattr(app, field, value)
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
    return {"message": "Apprentice deactivated", "apprentice_id": apprentice_id}


@router.patch("/{apprentice_id}/reactivate", status_code=200)
def reactivate_apprentice(
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
    app.status = "ACTIVE"
    app.updated_at = datetime.utcnow()
    db.commit()
    log_audit_action(
        db,
        "UPDATE",
        current_user.user_id,
        "Apprentice",
        app.apprentice_id,
        new_value={"status": "ACTIVE"},
        ip_address=get_client_ip(request),
    )
    return {"message": "Apprentice reactivated", "apprentice_id": apprentice_id}


def _detect_image_type(content: bytes) -> Optional[str]:
    if content.startswith(JPEG_MAGIC):
        return "jpg"
    if content.startswith(PNG_MAGIC):
        return "png"
    return None


@router.post("/{apprentice_id}/photo", status_code=200)
def upload_photo(
    apprentice_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
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
    ext = _detect_image_type(content)
    if ext is None:
        raise HTTPException(400, "File content does not match a valid JPG/PNG image")
    filename = f"{uuid4().hex}.{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(content)
    if app.photo_url and os.path.exists(app.photo_url):
        try:
            os.remove(app.photo_url)
        except OSError:
            pass
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


@router.get("/{apprentice_id}/photo")
def get_photo(
    apprentice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Serve the apprentice photograph through an authorised endpoint only."""
    app = db.query(Apprentice).filter(
        Apprentice.apprentice_id == apprentice_id
    ).first()
    if not app:
        raise HTTPException(404, "Apprentice not found")
    if current_user.role == "Apprentice" and app.user_id != current_user.user_id:
        raise HTTPException(403, "Access denied")
    if current_user.role == "Mentor":
        _check_mentor_access(current_user, apprentice_id, db)
    if not app.photo_url or not os.path.exists(app.photo_url):
        raise HTTPException(404, "No photograph recorded")
    media_type = "image/jpeg" if app.photo_url.lower().endswith(".jpg") else "image/png"
    return FileResponse(app.photo_url, media_type=media_type)


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
    edu = Education(
        apprentice_id=apprentice_id,
        qualification_type=edu_in.qualification_type,
        institution_name=edu_in.institution_name,
    )
    _sync_subjects(edu, [s.model_dump() for s in (edu_in.subjects or [])])
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
    edu.qualification_type = edu_in.qualification_type
    edu.institution_name = edu_in.institution_name
    _sync_subjects(edu, [s.model_dump() for s in (edu_in.subjects or [])])
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