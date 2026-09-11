from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
from database import get_db
from models.mentor import Mentor, MentorAssignment
from models.user import User
from models.apprentice import Apprentice
from schemas.mentor import (
    MentorCreate,
    MentorUpdate,
    MentorOut,
    AssignmentCreate,
    AssignmentOut,
)
from middleware.auth_middleware import (
    get_current_user,
    require_admin,
    require_admin_or_supervisor,
)
from middleware.audit_middleware import log_audit_action, get_client_ip

router = APIRouter(prefix="/api/mentors", tags=["mentors"])


class AssignApprenticeBody(BaseModel):
    apprentice_id: int


@router.get("", response_model=List[MentorOut])
def list_mentors(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    return db.query(Mentor).offset(skip).limit(limit).all()


@router.post("", response_model=MentorOut, status_code=201)
def create_mentor(
    request: Request,
    mentor_in: MentorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.user_id == mentor_in.user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.role != "Mentor":
        raise HTTPException(400, "User must have role 'Mentor'")
    if db.query(Mentor).filter(Mentor.user_id == mentor_in.user_id).first():
        raise HTTPException(400, "A mentor profile already exists for this user")
    mentor = Mentor(**mentor_in.model_dump())
    db.add(mentor)
    db.commit()
    db.refresh(mentor)
    log_audit_action(
        db,
        "CREATE",
        current_user.user_id,
        "Mentor",
        mentor.mentor_id,
        ip_address=get_client_ip(request),
    )
    return mentor


@router.get("/{mentor_id}", response_model=MentorOut)
def get_mentor(
    mentor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mentor = db.query(Mentor).filter(Mentor.mentor_id == mentor_id).first()
    if not mentor:
        raise HTTPException(404, "Mentor not found")
    if current_user.role == "Mentor" and mentor.user_id != current_user.user_id:
        raise HTTPException(403, "Access denied")
    if current_user.role == "Apprentice":
        raise HTTPException(403, "Access denied")
    return mentor


@router.put("/{mentor_id}", response_model=MentorOut)
def update_mentor(
    mentor_id: int,
    request: Request,
    mentor_in: MentorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    mentor = db.query(Mentor).filter(Mentor.mentor_id == mentor_id).first()
    if not mentor:
        raise HTTPException(404, "Mentor not found")
    for k, v in mentor_in.model_dump(exclude_unset=True).items():
        setattr(mentor, k, v)
    db.commit()
    db.refresh(mentor)
    log_audit_action(
        db,
        "UPDATE",
        current_user.user_id,
        "Mentor",
        mentor.mentor_id,
        ip_address=get_client_ip(request),
    )
    return mentor


@router.get("/{mentor_id}/assignments", response_model=List[AssignmentOut])
def get_mentor_assignments(
    mentor_id: int,
    current_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mentor = db.query(Mentor).filter(Mentor.mentor_id == mentor_id).first()
    if not mentor:
        raise HTTPException(404, "Mentor not found")
    if current_user.role == "Apprentice":
        raise HTTPException(403, "Access denied")
    if current_user.role == "Mentor" and mentor.user_id != current_user.user_id:
        raise HTTPException(403, "Access denied")
    q = db.query(MentorAssignment).filter(MentorAssignment.mentor_id == mentor_id)
    if current_only:
        q = q.filter(MentorAssignment.is_current == True)  # noqa: E712
    return q.all()


@router.post("/{mentor_id}/assign", response_model=AssignmentOut, status_code=201)
def assign_apprentice_direct(
    mentor_id: int,
    request: Request,
    body: AssignApprenticeBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    mentor = db.query(Mentor).filter(Mentor.mentor_id == mentor_id).first()
    if not mentor:
        raise HTTPException(404, "Mentor not found")
    app = db.query(Apprentice).filter(
        Apprentice.apprentice_id == body.apprentice_id
    ).first()
    if not app:
        raise HTTPException(404, "Apprentice not found")

    existing = db.query(MentorAssignment).filter(
        MentorAssignment.apprentice_id == body.apprentice_id,
        MentorAssignment.is_current == True,
    ).first()
    if existing:
        existing.is_current = False

    new_assignment = MentorAssignment(
        mentor_id=mentor_id,
        apprentice_id=body.apprentice_id,
        assigned_date=date.today(),
        is_current=True,
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    log_audit_action(
        db,
        "CREATE",
        current_user.user_id,
        "MentorAssignment",
        new_assignment.assignment_id,
        ip_address=get_client_ip(request),
    )
    return new_assignment


@router.post("/{mentor_id}/assignments", response_model=AssignmentOut, status_code=201)
def assign_apprentice(
    mentor_id: int,
    request: Request,
    body: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    mentor = db.query(Mentor).filter(Mentor.mentor_id == mentor_id).first()
    if not mentor:
        raise HTTPException(404, "Mentor not found")
    app = db.query(Apprentice).filter(
        Apprentice.apprentice_id == body.apprentice_id
    ).first()
    if not app:
        raise HTTPException(404, "Apprentice not found")

    existing = db.query(MentorAssignment).filter(
        MentorAssignment.apprentice_id == body.apprentice_id,
        MentorAssignment.is_current == True,
    ).first()
    if existing:
        existing.is_current = False

    new_assignment = MentorAssignment(
        mentor_id=mentor_id,
        apprentice_id=body.apprentice_id,
        assigned_date=body.assigned_date or date.today(),
        is_current=True,
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    log_audit_action(
        db,
        "CREATE",
        current_user.user_id,
        "MentorAssignment",
        new_assignment.assignment_id,
        ip_address=get_client_ip(request),
    )
    return new_assignment


@router.delete("/{mentor_id}/assignments/{assignment_id}", status_code=200)
def remove_assignment(
    mentor_id: int,
    assignment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    assignment = db.query(MentorAssignment).filter(
        MentorAssignment.assignment_id == assignment_id,
        MentorAssignment.mentor_id == mentor_id,
    ).first()
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    assignment.is_current = False
    db.commit()
    log_audit_action(
        db,
        "UPDATE",
        current_user.user_id,
        "MentorAssignment",
        assignment_id,
        ip_address=get_client_ip(request),
    )
    return {"message": "Assignment removed"}
