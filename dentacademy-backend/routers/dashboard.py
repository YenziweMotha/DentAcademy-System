from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from middleware.auth_middleware import get_current_user, require_admin, require_supervisor, require_mentor

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/admin")
def get_admin_dashboard(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    from models.user import User
    from models.apprentice import Apprentice
    total_users = db.query(User).count()
    total_apprentices = db.query(Apprentice).filter(Apprentice.status == 'Active').count()
    return {"total_users": total_users, "active_apprentices": total_apprentices}

@router.get("/supervisor")
def get_supervisor_dashboard(db: Session = Depends(get_db), current_user: User = Depends(require_supervisor)):
    from models.evaluation import Evaluation
    pending_evals = db.query(Evaluation).filter(Evaluation.approved == False).count()
    return {"pending_evaluations": pending_evals}

@router.get("/mentor")
def get_mentor_dashboard(db: Session = Depends(get_db), current_user: User = Depends(require_mentor)):
    from models.mentor import Mentor, MentorAssignment
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    assigned = 0
    if mentor:
        assigned = db.query(MentorAssignment).filter(MentorAssignment.mentor_id == mentor.mentor_id).count()
    return {"assigned_apprentices": assigned}

@router.get("/apprentice")
def get_apprentice_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models.apprentice import Apprentice
    from models.module import ModuleProgress
    if current_user.role != "Apprentice":
        return {}
    apprentice = db.query(Apprentice).filter(Apprentice.user_id == current_user.user_id).first()
    if not apprentice:
        return {}
    completed_modules = db.query(ModuleProgress).filter(
        ModuleProgress.apprentice_id == apprentice.apprentice_id,
        ModuleProgress.status == 'Completed'
    ).count()
    return {"completed_modules": completed_modules}
