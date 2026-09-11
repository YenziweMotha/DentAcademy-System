from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.module import Module, ModuleProgress
from models.mentor import Mentor, MentorAssignment
from models.apprentice import Apprentice
from models.user import User
from schemas.module import (
    ModuleCreate, ModuleOut, ModuleProgressUpdate, ModuleProgressOut
)
from middleware.auth_middleware import get_current_user, require_admin
from middleware.audit_middleware import log_audit_action, get_client_ip

router = APIRouter(prefix="/api/modules", tags=["modules"])


@router.get("", response_model=List[ModuleOut])
def list_modules(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Module)
    if active_only:
        q = q.filter(Module.is_active == True)
    return q.all()


@router.post("", response_model=ModuleOut, status_code=201)
def create_module(
    request: Request,
    module_in: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if db.query(Module).filter(Module.module_name == module_in.module_name).first():
        raise HTTPException(400, "Module name already exists")
    module = Module(**module_in.model_dump())
    db.add(module)
    db.commit()
    db.refresh(module)
    log_audit_action(db, "CREATE", current_user.user_id, "Module",
                     module.module_id, ip_address=get_client_ip(request))
    return module


@router.put("/{module_id}", response_model=ModuleOut)
def update_module(
    module_id: int,
    request: Request,
    module_in: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    module = db.query(Module).filter(Module.module_id == module_id).first()
    if not module:
        raise HTTPException(404, "Module not found")
    duplicate = db.query(Module).filter(
        Module.module_name == module_in.module_name,
        Module.module_id != module_id,
    ).first()
    if duplicate:
        raise HTTPException(400, "Module name already exists")
    for field, value in module_in.model_dump().items():
        setattr(module, field, value)
    db.commit()
    db.refresh(module)
    log_audit_action(db, "UPDATE", current_user.user_id, "Module",
                     module.module_id, ip_address=get_client_ip(request))
    return module


@router.get("/apprentice/{apprentice_id}", response_model=List[ModuleProgressOut])
def get_apprentice_progress(
    apprentice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from middleware.access_control import require_apprentice_access

    require_apprentice_access(current_user, apprentice_id, db)
    return (
        db.query(ModuleProgress)
        .filter(ModuleProgress.apprentice_id == apprentice_id)
        .all()
    )


@router.get("/apprentice/{apprentice_id}/percentage")
def get_completion_percentage(
    apprentice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from middleware.access_control import require_apprentice_access

    require_apprentice_access(current_user, apprentice_id, db)
    total = db.query(Module).filter(Module.is_active == True).count()  # noqa: E712
    if total == 0:
        return {"apprentice_id": apprentice_id, "completion_pct": 0.0, "total_modules": 0}
    completed = db.query(ModuleProgress).filter(
        ModuleProgress.apprentice_id == apprentice_id,
        ModuleProgress.status == "Completed",
    ).count()
    return {
        "apprentice_id": apprentice_id,
        "completion_pct": round(completed / total * 100, 2),
        "completed": completed,
        "total_modules": total,
    }


@router.put("/apprentice/{apprentice_id}/{module_id}", response_model=ModuleProgressOut)
def update_progress(
    apprentice_id: int,
    module_id: int,
    request: Request,
    progress_in: ModuleProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "Apprentice":
        raise HTTPException(403, "Apprentices cannot update their own module progress")

    from middleware.access_control import require_apprentice_access

    # Mentors: assigned only; staff: any; apprentices already blocked above.
    require_apprentice_access(
        current_user, apprentice_id, db, allow_apprentice_self=False
    )

    # Validate: if Completed, score and date required
    if progress_in.status == "Completed":
        if progress_in.assessment_score is None:
            raise HTTPException(422, "Assessment score is required when status is Completed")
        if progress_in.completion_date is None:
            raise HTTPException(422, "Completion date is required when status is Completed")

    # Upsert
    progress = db.query(ModuleProgress).filter(
        ModuleProgress.apprentice_id == apprentice_id,
        ModuleProgress.module_id == module_id,
    ).first()
    if not progress:
        module = db.query(Module).filter(Module.module_id == module_id).first()
        if not module:
            raise HTTPException(404, "Module not found")
        progress = ModuleProgress(
            apprentice_id=apprentice_id,
            module_id=module_id,
            updated_by=current_user.user_id,
        )
        db.add(progress)

    progress.status = progress_in.status
    progress.assessment_score = progress_in.assessment_score
    progress.completion_date = progress_in.completion_date
    progress.updated_by = current_user.user_id
    db.commit()
    db.refresh(progress)
    log_audit_action(db, "UPDATE", current_user.user_id, "ModuleProgress",
                     progress.progress_id, ip_address=get_client_ip(request))
    return progress
