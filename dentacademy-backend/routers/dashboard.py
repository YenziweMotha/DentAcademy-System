from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.user import User
from models.apprentice import Apprentice
from models.education import Education
from models.evaluation import Evaluation
from models.module import ModuleProgress, Module
from models.prediction import AIPrediction
from models.audit import AuditLog
from models.mentor import Mentor, MentorAssignment
from models.attendance import Attendance
from middleware.auth_middleware import (
    get_current_user,
    require_admin,
    require_supervisor,
    require_mentor,
    require_admin_or_supervisor,
)
from services.config_service import get_int_setting
from utils.security import mask_id_number
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _active_module_count(db: Session) -> int:
    return db.query(Module).filter(Module.is_active == True).count()


def _calculate_completion_pct(apprentice_id: int, db: Session) -> float:
    total = _active_module_count(db)
    if total == 0:
        return 0.0
    completed = db.query(ModuleProgress).filter(
        ModuleProgress.apprentice_id == apprentice_id,
        ModuleProgress.status == "Completed",
    ).count()
    return round((completed / total) * 100, 2)


@router.get("/admin")
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    total_apprentices = db.query(Apprentice).count()

    active_apprentices = (
        db.query(Apprentice)
        .filter(Apprentice.status == "ACTIVE")
        .count()
    )

    threshold = get_int_setting(db, "dropout_risk_threshold")
    at_risk_count = (
        db.query(AIPrediction)
        .filter(AIPrediction.dropout_risk > threshold)
        .distinct(AIPrediction.apprentice_id)
        .count()
    )

    total_modules = _active_module_count(db)

    avg_completion_pct = 0.0
    if total_modules > 0:
        completed_progress = (
            db.query(
                ModuleProgress.apprentice_id,
                func.count(ModuleProgress.progress_id).label("completed")
            )
            .filter(ModuleProgress.status == "Completed")
            .group_by(ModuleProgress.apprentice_id)
            .all()
        )
        if completed_progress:
            percentages = [
                (row.completed / total_modules) * 100
                for row in completed_progress
            ]
            avg_completion_pct = round(sum(percentages) / len(percentages), 2)

    pending_evaluations = (
        db.query(Evaluation)
        .filter(Evaluation.approved == False)
        .count()
    )

    recent_audit = (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .limit(10)
        .all()
    )

    return {
        "total_apprentices": total_apprentices,
        "active_apprentices": active_apprentices,
        "at_risk_count": at_risk_count,
        "avg_completion_pct": avg_completion_pct,
        "pending_evaluations": pending_evaluations,
        "recent_audit": [
            {
                "log_id": row.log_id,
                "action_type": row.action_type,
                "entity_type": row.entity_type,
                "record_id": row.record_id,
                "timestamp": row.timestamp,
            }
            for row in recent_audit
        ],
    }


@router.get("/supervisor")
def get_supervisor_dashboard(
    db: Session = Depends(get_db), current_user: User = Depends(require_supervisor)
):
    total_modules = _active_module_count(db)
    avg_completion_pct = 0.0
    if total_modules > 0:
        all_progress = db.query(ModuleProgress).all()
        apprentice_completed = {}
        for p in all_progress:
            if p.apprentice_id not in apprentice_completed:
                apprentice_completed[p.apprentice_id] = 0
            if p.status == "Completed":
                apprentice_completed[p.apprentice_id] += 1
        if apprentice_completed:
            pcts = [
                (c / total_modules * 100)
                for c in apprentice_completed.values()
            ]
            avg_completion_pct = round(sum(pcts) / len(pcts), 2)

    pending_approvals = db.query(Evaluation).filter(
        Evaluation.approved == False
    ).count()

    threshold = get_int_setting(db, "dropout_risk_threshold")
    at_risk_count = (
        db.query(AIPrediction)
        .filter(AIPrediction.dropout_risk > threshold)
        .distinct(AIPrediction.apprentice_id)
        .count()
    )

    alert_days = get_int_setting(db, "evaluation_alert_days")
    overdue_cutoff = datetime.utcnow() - timedelta(days=alert_days)

    apprentices = db.query(Apprentice).filter(
        Apprentice.status == "ACTIVE"
    ).all()

    apprentice_list = []
    for app in apprentices:
        completion_pct = _calculate_completion_pct(app.apprentice_id, db)

        latest_eval = (
            db.query(Evaluation)
            .filter(Evaluation.apprentice_id == app.apprentice_id)
            .order_by(Evaluation.submitted_at.desc())
            .first()
        )
        last_eval_date = latest_eval.submitted_at if latest_eval else None

        needs_evaluation = (
            last_eval_date is None or last_eval_date < overdue_cutoff
        )

        pred = (
            db.query(AIPrediction)
            .filter(AIPrediction.apprentice_id == app.apprentice_id)
            .order_by(AIPrediction.generated_at.desc())
            .first()
        )
        dropout_risk = float(pred.dropout_risk) if pred and pred.dropout_risk else 0.0

        if dropout_risk > threshold:
            status_label = "At Risk"
        elif dropout_risk > threshold * 0.5:
            status_label = "Monitor"
        else:
            status_label = "On Track"

        apprentice_list.append({
            "apprentice_id": app.apprentice_id,
            "full_name": f"{app.first_name} {app.surname}",
            "completion_pct": completion_pct,
            "last_eval_date": last_eval_date,
            "dropout_risk": dropout_risk,
            "status_label": status_label,
            "needs_evaluation": needs_evaluation,
        })

    return {
        "avg_completion_pct": avg_completion_pct,
        "pending_approvals": pending_approvals,
        "at_risk_count": at_risk_count,
        "evaluation_alert_days": alert_days,
        "apprentice_list": apprentice_list,
    }


@router.get("/mentor")
def get_mentor_dashboard(
    db: Session = Depends(get_db), current_user: User = Depends(require_mentor)
):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    if not mentor:
        raise HTTPException(403, "Mentor profile not found")

    assignments = (
        db.query(MentorAssignment)
        .filter(
            MentorAssignment.mentor_id == mentor.mentor_id,
            MentorAssignment.is_current == True,
        )
        .all()
    )

    apprentice_list = []
    for assignment in assignments:
        app = db.query(Apprentice).filter(
            Apprentice.apprentice_id == assignment.apprentice_id
        ).first()
        if not app:
            continue
        in_progress = db.query(ModuleProgress).filter(
            ModuleProgress.apprentice_id == app.apprentice_id,
            ModuleProgress.status == "In Progress",
        ).count()
        completed = db.query(ModuleProgress).filter(
            ModuleProgress.apprentice_id == app.apprentice_id,
            ModuleProgress.status == "Completed",
        ).count()
        pending_evals = db.query(Evaluation).filter(
            Evaluation.apprentice_id == app.apprentice_id,
            Evaluation.approved == False,
        ).count()
        latest_eval = (
            db.query(Evaluation)
            .filter(Evaluation.apprentice_id == app.apprentice_id)
            .order_by(Evaluation.submitted_at.desc())
            .first()
        )
        apprentice_list.append({
            "apprentice_id": app.apprentice_id,
            "full_name": f"{app.first_name} {app.surname}",
            "completion_pct": _calculate_completion_pct(app.apprentice_id, db),
            "in_progress_modules": in_progress,
            "completed_modules": completed,
            "pending_evaluations": pending_evals,
            "latest_evaluation_score": (
                float(latest_eval.overall_score) if latest_eval else None
            ),
        })

    return {
        "assigned_apprentices": len(apprentice_list),
        "apprentice_list": apprentice_list,
    }


@router.get("/apprentice")
def get_apprentice_dashboard(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role != "Apprentice":
        return {}
    apprentice = db.query(Apprentice).filter(
        Apprentice.user_id == current_user.user_id
    ).first()
    if not apprentice:
        return {}

    completed_modules = db.query(ModuleProgress).filter(
        ModuleProgress.apprentice_id == apprentice.apprentice_id,
        ModuleProgress.status == "Completed",
    ).count()
    in_progress_modules = db.query(ModuleProgress).filter(
        ModuleProgress.apprentice_id == apprentice.apprentice_id,
        ModuleProgress.status == "In Progress",
    ).count()

    education = db.query(Education).filter(
        Education.apprentice_id == apprentice.apprentice_id
    ).first()

    recent_evaluations = (
        db.query(Evaluation)
        .filter(Evaluation.apprentice_id == apprentice.apprentice_id)
        .order_by(Evaluation.submitted_at.desc())
        .limit(5)
        .all()
    )

    return {
        "apprentice_id": apprentice.apprentice_id,
        "full_name": f"{apprentice.first_name} {apprentice.surname}",
        "status": apprentice.status,
        "completion_pct": _calculate_completion_pct(apprentice.apprentice_id, db),
        "completed_modules": completed_modules,
        "in_progress_modules": in_progress_modules,
        "total_modules": _active_module_count(db),
        "qualification_type": education.qualification_type if education else None,
        "institution": education.institution_name if education else None,
        "academic_average": float(education.average_mark) if education and education.average_mark else None,
        "recent_evaluations": [
            {
                "evaluation_id": e.evaluation_id,
                "overall_score": float(e.overall_score),
                "submitted_at": e.submitted_at,
                "approved": e.approved,
            }
            for e in recent_evaluations
        ],
    }


@router.get("/performance/{apprentice_id}")
def get_apprentice_performance(
    apprentice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    apprentice = (
        db.query(Apprentice)
        .filter(Apprentice.apprentice_id == apprentice_id)
        .first()
    )

    if not apprentice:
        raise HTTPException(status_code=404, detail="Apprentice not found")

    modules = (
        db.query(ModuleProgress)
        .join(Module)
        .filter(ModuleProgress.apprentice_id == apprentice_id)
        .all()
    )

    module_records = []

    total_modules = _active_module_count(db)
    completed_modules = 0
    scores = []

    for progress in modules:
        if progress.status == "Completed":
            completed_modules += 1
        if progress.assessment_score is not None:
            scores.append(float(progress.assessment_score))
        module_records.append({
            "module_id": progress.module_id,
            "module_name": progress.module.module_name,
            "category": progress.module.category,
            "status": progress.status,
            "assessment_score": (
                float(progress.assessment_score)
                if progress.assessment_score is not None
                else None
            ),
            "pass_mark": (
                float(progress.module.pass_mark)
                if progress.module.pass_mark is not None
                else None
            ),
            "completion_date": progress.completion_date,
            "updated_at": progress.updated_at,
        })

    completion_percentage = (
        round((completed_modules / total_modules) * 100, 2)
        if total_modules > 0
        else 0
    )

    average_score = (
        round(sum(scores) / len(scores), 2)
        if scores
        else None
    )

    evaluations = (
        db.query(Evaluation)
        .filter(Evaluation.apprentice_id == apprentice_id)
        .order_by(Evaluation.submitted_at.desc())
        .all()
    )

    evaluation_records = []
    for evaluation in evaluations:
        evaluation_records.append({
            "evaluation_id": evaluation.evaluation_id,
            "overall_score": (
                float(evaluation.overall_score)
                if evaluation.overall_score is not None
                else None
            ),
            "submitted_at": evaluation.submitted_at,
            "approved": evaluation.approved,
        })

    latest_evaluation = evaluations[0] if evaluations else None
    evaluation_score = (
        float(latest_evaluation.overall_score)
        if latest_evaluation and latest_evaluation.overall_score is not None
        else None
    )

    latest_prediction = (
        db.query(AIPrediction)
        .filter(AIPrediction.apprentice_id == apprentice_id)
        .order_by(AIPrediction.generated_at.desc())
        .first()
    )

    prediction = None

    if latest_prediction:
        dropout_risk = (
            float(latest_prediction.dropout_risk)
            if latest_prediction.dropout_risk is not None
            else None
        )

        threshold = get_int_setting(db, "dropout_risk_threshold")
        if dropout_risk is not None:
            if dropout_risk > threshold:
                risk_label = "High Risk"
            elif dropout_risk > threshold * 0.5:
                risk_label = "Monitor"
            else:
                risk_label = "Low Risk"
        else:
            risk_label = None

        prediction = {
            "dropout_risk": dropout_risk,
            "completion_likelihood": (
                float(latest_prediction.completion_likelihood)
                if latest_prediction.completion_likelihood is not None
                else None
            ),
            "employment_readiness": (
                float(latest_prediction.employment_readiness)
                if latest_prediction.employment_readiness is not None
                else None
            ),
            "confidence_score": (
                float(latest_prediction.confidence_score)
                if latest_prediction.confidence_score is not None
                else None
            ),
            "model_version": latest_prediction.model_version,
            "risk_label": risk_label,
            "generated_at": latest_prediction.generated_at,
        }

    performance_scores = []
    if average_score is not None:
        performance_scores.append(average_score)
    if evaluation_score is not None:
        performance_scores.append(evaluation_score)

    overall_score = (
        round(sum(performance_scores) / len(performance_scores), 2)
        if performance_scores
        else None
    )

    if overall_score is None:
        performance_status = "Insufficient Data"
    elif overall_score >= 75:
        performance_status = "Excellent"
    elif overall_score >= 60:
        performance_status = "Good"
    elif overall_score >= 50:
        performance_status = "Satisfactory"
    else:
        performance_status = "Needs Improvement"

    return {
        "apprentice": {
            "apprentice_id": apprentice.apprentice_id,
            "first_name": apprentice.first_name,
            "surname": apprentice.surname,
            "id_number": mask_id_number(apprentice.id_number),
            "status": apprentice.status,
        },

        "summary": {
            "total_modules": total_modules,
            "completed_modules": completed_modules,
            "completion_percentage": completion_percentage,
            "average_module_score": average_score,
            "latest_evaluation_score": evaluation_score,
            "overall_score": overall_score,
            "performance_status": performance_status,
        },

        "modules": module_records,

        "evaluations": evaluation_records,

        "prediction": prediction,
    }
