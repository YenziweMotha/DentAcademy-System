from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_db
from models.evaluation import Evaluation
from models.mentor import Mentor, MentorAssignment
from models.apprentice import Apprentice
from models.user import User
from schemas.evaluation import EvaluationCreate, EvaluationOut
from middleware.auth_middleware import (
    get_current_user,
    require_admin_or_supervisor,
    require_supervisor,
)
from middleware.audit_middleware import log_audit_action, get_client_ip

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])


def _get_mentor_for_user(user: User, db: Session) -> Mentor:
    mentor = db.query(Mentor).filter(Mentor.user_id == user.user_id).first()
    if not mentor:
        raise HTTPException(403, "Mentor profile not found for this user")
    return mentor


@router.get("", response_model=List[EvaluationOut])
def list_evaluations(
    apprentice_id: Optional[int] = Query(None),
    approved: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from middleware.access_control import require_apprentice_access

    q = db.query(Evaluation)
    if current_user.role == "Apprentice":
        app = db.query(Apprentice).filter(
            Apprentice.user_id == current_user.user_id
        ).first()
        if not app:
            return []
        q = q.filter(Evaluation.apprentice_id == app.apprentice_id)
    elif current_user.role == "Mentor":
        mentor = _get_mentor_for_user(current_user, db)
        assigned_ids = db.query(MentorAssignment.apprentice_id).filter(
            MentorAssignment.mentor_id == mentor.mentor_id,
            MentorAssignment.is_current == True,
        ).all()
        ids = [r[0] for r in assigned_ids]
        if not ids:
            return []
        q = q.filter(Evaluation.apprentice_id.in_(ids))
    if apprentice_id is not None:
        require_apprentice_access(current_user, apprentice_id, db)
        q = q.filter(Evaluation.apprentice_id == apprentice_id)
    if approved is not None:
        q = q.filter(Evaluation.approved == approved)
    return q.order_by(Evaluation.submitted_at.desc()).offset(skip).limit(limit).all()


@router.get("/pending", response_model=List[EvaluationOut])
def get_pending_evaluations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    return (
        db.query(Evaluation)
        .filter(Evaluation.approved == False)
        .order_by(Evaluation.submitted_at.desc())
        .all()
    )


@router.post("", response_model=EvaluationOut, status_code=201)
def submit_evaluation(
    request: Request,
    eval_in: EvaluationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["Mentor", "Administrator"]:
        raise HTTPException(403, "Only Mentors or Administrators can submit evaluations")

    app = db.query(Apprentice).filter(
        Apprentice.apprentice_id == eval_in.apprentice_id,
    ).first()
    if not app:
        raise HTTPException(404, "Apprentice not found")

    mentor = (
        _get_mentor_for_user(current_user, db)
        if current_user.role == "Mentor"
        else None
    )
    if mentor:
        assignment = db.query(MentorAssignment).filter(
            MentorAssignment.mentor_id == mentor.mentor_id,
            MentorAssignment.apprentice_id == eval_in.apprentice_id,
            MentorAssignment.is_current == True,
        ).first()
        if not assignment:
            raise HTTPException(
                403, "You are not currently assigned to this apprentice"
            )

    scores = [
        eval_in.discipline,
        eval_in.commitment,
        eval_in.willingness,
        eval_in.teamwork,
        eval_in.time_management,
        eval_in.professional_conduct,
    ]
    overall = round(sum(scores) / 6.0, 2)

    if mentor:
        mentor_id = mentor.mentor_id
    else:
        admin_mentor = db.query(Mentor).filter(
            Mentor.user_id == current_user.user_id
        ).first()
        if not admin_mentor:
            assignment = db.query(MentorAssignment).filter(
                MentorAssignment.apprentice_id == eval_in.apprentice_id,
                MentorAssignment.is_current == True,
            ).first()
            if not assignment:
                raise HTTPException(400, "No mentor assigned to this apprentice")
            mentor_id = assignment.mentor_id
        else:
            mentor_id = admin_mentor.mentor_id

    new_eval = Evaluation(
        apprentice_id=eval_in.apprentice_id,
        mentor_id=mentor_id,
        discipline=eval_in.discipline,
        commitment=eval_in.commitment,
        willingness=eval_in.willingness,
        teamwork=eval_in.teamwork,
        time_management=eval_in.time_management,
        professional_conduct=eval_in.professional_conduct,
        overall_score=overall,
        comments=eval_in.comments,
    )
    db.add(new_eval)
    db.commit()
    db.refresh(new_eval)
    log_audit_action(
        db,
        "CREATE",
        current_user.user_id,
        "Evaluation",
        new_eval.evaluation_id,
        ip_address=get_client_ip(request),
    )
    return new_eval


@router.get("/overdue", response_model=List[dict])
def get_overdue_apprentices(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    cutoff = datetime.utcnow() - timedelta(days=30)
    active_apprentices = db.query(Apprentice).filter(
        Apprentice.status == "ACTIVE",
    ).all()
    overdue = []
    for app in active_apprentices:
        latest = (
            db.query(Evaluation)
            .filter(Evaluation.apprentice_id == app.apprentice_id)
            .order_by(Evaluation.submitted_at.desc())
            .first()
        )
        if not latest or latest.submitted_at < cutoff:
            overdue.append(
                {
                    "apprentice_id": app.apprentice_id,
                    "name": f"{app.first_name} {app.surname}",
                    "last_evaluation": latest.submitted_at if latest else None,
                    "days_overdue": (
                        (datetime.utcnow() - latest.submitted_at).days
                        if latest
                        else None
                    ),
                }
            )
    return overdue


@router.get("/{evaluation_id}", response_model=EvaluationOut)
def get_evaluation(
    evaluation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from middleware.access_control import require_apprentice_access

    ev = db.query(Evaluation).filter(Evaluation.evaluation_id == evaluation_id).first()
    if not ev:
        raise HTTPException(404, "Evaluation not found")
    require_apprentice_access(current_user, ev.apprentice_id, db)
    return ev


@router.put("/{evaluation_id}/approve", response_model=EvaluationOut)
def approve_evaluation(
    evaluation_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    if current_user.role == "Mentor":
        raise HTTPException(
            status_code=403,
            detail="Mentors cannot approve evaluations",
        )
    ev = db.query(Evaluation).filter(Evaluation.evaluation_id == evaluation_id).first()
    if not ev:
        raise HTTPException(404, "Evaluation not found")
    if ev.approved:
        raise HTTPException(400, "Evaluation already approved")
    ev.approved = True
    ev.approved_by = current_user.user_id
    ev.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(ev)
    log_audit_action(
        db,
        "EVALUATION_APPROVED",
        current_user.user_id,
        "Evaluation",
        ev.evaluation_id,
        ip_address=get_client_ip(request),
    )
    return ev


@router.get("/apprentice/{apprentice_id}", response_model=List[EvaluationOut])
def get_apprentice_evaluations(
    apprentice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from middleware.access_control import require_apprentice_access

    require_apprentice_access(current_user, apprentice_id, db)
    return (
        db.query(Evaluation)
        .filter(Evaluation.apprentice_id == apprentice_id)
        .order_by(Evaluation.submitted_at.desc())
        .all()
    )
