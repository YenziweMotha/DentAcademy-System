"""Official PDF report generation for DentAcademy."""

from __future__ import annotations

import os
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from models.apprentice import Apprentice
from models.attendance import Attendance
from models.education import Education
from models.evaluation import Evaluation
from models.experience_chat import ApprenticeExperience
from models.mentor import MentorAssignment
from models.module import Module, ModuleProgress
from models.prediction import AIPrediction
from models.user import User
from services.ai.report_commentary import (
    generate_apprentice_commentary,
    generate_programme_commentary,
)
from services.config_service import get_int_setting
from utils.security import mask_id_number

try:
    from weasyprint import HTML
except ImportError:
    HTML = None

TZ = ZoneInfo("Africa/Johannesburg")
TEMPLATES_DIR = Path(__file__).resolve().parents[1] / "templates" / "reports"
NA = "Not recorded"

_jinja_env: Optional[Environment] = None


def _env() -> Environment:
    global _jinja_env
    if _jinja_env is None:
        _jinja_env = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=select_autoescape(["html", "xml"]),
        )
    return _jinja_env


def _now() -> datetime:
    return datetime.now(TZ)


def _fmt_date(value: Any) -> str:
    if value is None:
        return NA
    if hasattr(value, "strftime"):
        return value.strftime("%d %B %Y")
    return str(value)


def _fmt_datetime(value: Any) -> str:
    if value is None:
        return NA
    if hasattr(value, "strftime"):
        return value.strftime("%d %B %Y, %H:%M")
    return str(value)


def _fmt_pct(value: Optional[float], digits: int = 1) -> str:
    if value is None:
        return NA
    return f"{value:.{digits}f}%"


def _fmt_num(value: Optional[float], digits: int = 2) -> str:
    if value is None:
        return NA
    return f"{value:.{digits}f}"


def _avg(values: List[float]) -> Optional[float]:
    if not values:
        return None
    return round(sum(values) / len(values), 2)


def _address(app: Apprentice) -> str:
    parts = [p for p in (app.address_line1, app.city, app.province) if p]
    return ", ".join(parts) if parts else NA


def _write_pdf(html_content: str, pdf_path: str) -> str:
    os.makedirs(os.path.dirname(pdf_path) or ".", exist_ok=True)
    if HTML:
        HTML(string=html_content, base_url=str(TEMPLATES_DIR)).write_pdf(pdf_path)
    else:
        with open(pdf_path, "wb") as handle:
            handle.write(
                b"%PDF-1.4\n%WeasyPrint not installed. Install with `pip install weasyprint` "
                b"to enable PDF generation. This is a placeholder file.\n"
            )
    return pdf_path


def _commentary_view(raw: Dict[str, Any]) -> Dict[str, Any]:
    source = raw.get("source") or "system"
    return {
        **raw,
        "source_label": "AI generated" if source == "ai" else "System generated",
    }


def _risk_meta(dropout: Optional[float], threshold: int) -> Dict[str, str]:
    if dropout is None:
        return {"risk_label": "Not assessed", "risk_class": "none"}
    if dropout > threshold:
        return {"risk_label": "High risk", "risk_class": "high"}
    if dropout > threshold * 0.5:
        return {"risk_label": "Monitor", "risk_class": "medium"}
    return {"risk_label": "On track", "risk_class": "low"}


def gather_apprentice_context(
    apprentice_id: int,
    db: Session,
    *,
    prepared_by: str = "DentAcademy",
    prepared_role: Optional[str] = None,
) -> Dict[str, Any]:
    app = (
        db.query(Apprentice)
        .options(
            joinedload(Apprentice.education).joinedload(Education.subjects),
            joinedload(Apprentice.mentor_assignments).joinedload(MentorAssignment.mentor),
        )
        .filter(Apprentice.apprentice_id == apprentice_id)
        .first()
    )
    if not app:
        raise ValueError("Apprentice not found")

    threshold = get_int_setting(db, "dropout_risk_threshold")
    issued = _now()
    report_ref = f"DA-APR-{apprentice_id:04d}-{issued.strftime('%Y%m%d')}"

    modules = (
        db.query(Module)
        .filter(Module.is_active.is_(True))
        .order_by(Module.module_name)
        .all()
    )
    progress_by_id = {
        p.module_id: p
        for p in db.query(ModuleProgress)
        .filter(ModuleProgress.apprentice_id == apprentice_id)
        .all()
    }
    scores: List[float] = []
    completed = 0
    module_rows = []
    for module in modules:
        progress = progress_by_id.get(module.module_id)
        status = progress.status if progress else "Not Started"
        if status == "Completed":
            completed += 1
        score = (
            float(progress.assessment_score)
            if progress and progress.assessment_score is not None
            else None
        )
        if score is not None:
            scores.append(score)
        module_rows.append(
            {
                "name": module.module_name,
                "category": module.category or NA,
                "status": status,
                "score": _fmt_num(score, 1) if score is not None else NA,
                "pass_mark": _fmt_num(float(module.pass_mark), 1)
                if module.pass_mark is not None
                else NA,
                "completion_date": _fmt_date(progress.completion_date) if progress else NA,
            }
        )
    total_modules = len(modules)
    completion_pct = (
        round((completed / total_modules) * 100, 2) if total_modules else 0.0
    )
    avg_module = _avg(scores)

    evals = (
        db.query(Evaluation)
        .options(joinedload(Evaluation.mentor_profile), joinedload(Evaluation.approver))
        .filter(Evaluation.apprentice_id == apprentice_id)
        .order_by(Evaluation.submitted_at.desc())
        .all()
    )
    approved = [e for e in evals if e.approved]
    pending_count = len(evals) - len(approved)
    dim_keys = (
        "discipline",
        "commitment",
        "willingness",
        "teamwork",
        "time_management",
        "professional_conduct",
    )
    dim_avgs = {}
    if approved:
        for key in dim_keys:
            dim_avgs[key] = _fmt_num(_avg([float(getattr(e, key)) for e in approved]))
    avg_eval = _avg([float(e.overall_score) for e in approved]) if approved else None

    eval_rows = []
    for index, evaluation in enumerate(evals, 1):
        mentor = evaluation.mentor_profile
        mentor_name = (
            f"{mentor.name} {mentor.surname}".strip() if mentor else f"Mentor #{evaluation.mentor_id}"
        )
        approval = "Approved"
        if evaluation.approved:
            if evaluation.approved_at:
                approval = f"Approved on {_fmt_datetime(evaluation.approved_at)}"
        else:
            approval = "Pending supervisor approval"
        eval_rows.append(
            {
                "number": index,
                "submitted_at": _fmt_datetime(evaluation.submitted_at),
                "mentor": mentor_name,
                "overall_score": _fmt_num(float(evaluation.overall_score)),
                "approval": approval,
                "discipline": evaluation.discipline,
                "commitment": evaluation.commitment,
                "willingness": evaluation.willingness,
                "teamwork": evaluation.teamwork,
                "time_management": evaluation.time_management,
                "professional_conduct": evaluation.professional_conduct,
                "comments": (evaluation.comments or "").strip(),
            }
        )

    att_rows_db = (
        db.query(Attendance)
        .filter(Attendance.apprentice_id == apprentice_id)
        .order_by(Attendance.period_start.desc())
        .all()
    )
    att_rates = [float(a.attendance_rate) for a in att_rows_db]
    avg_attendance = _avg(att_rates)
    attendance_rows = [
        {
            "period": f"{_fmt_date(a.period_start)} – {_fmt_date(a.period_end)}",
            "days_expected": a.days_expected,
            "days_present": a.days_present,
            "rate": _fmt_pct(float(a.attendance_rate)),
        }
        for a in att_rows_db
    ]

    pred = (
        db.query(AIPrediction)
        .filter(AIPrediction.apprentice_id == apprentice_id)
        .order_by(AIPrediction.generated_at.desc())
        .first()
    )
    dropout = float(pred.dropout_risk) if pred and pred.dropout_risk is not None else None
    completion_likelihood = (
        float(pred.completion_likelihood)
        if pred and pred.completion_likelihood is not None
        else None
    )
    employment_readiness = (
        float(pred.employment_readiness)
        if pred and pred.employment_readiness is not None
        else None
    )
    confidence = (
        float(pred.confidence_score) if pred and pred.confidence_score is not None else None
    )
    risk_meta = _risk_meta(dropout, threshold)
    missing = NA
    if pred and pred.missing_fields:
        if isinstance(pred.missing_fields, list):
            missing = ", ".join(str(x) for x in pred.missing_fields) or "None"
        else:
            missing = str(pred.missing_fields)

    prediction_view = None
    if pred:
        prediction_view = {
            "model_version": pred.model_version or NA,
            "generated_at": _fmt_datetime(pred.generated_at),
            "completion_likelihood": _fmt_pct(completion_likelihood),
            "dropout_risk": _fmt_pct(dropout),
            "employment_readiness": _fmt_pct(employment_readiness),
            "confidence_score": _fmt_pct(confidence),
            "predictable": "Yes" if pred.predictable else "No",
            "missing_fields": missing,
            "risk_label": risk_meta["risk_label"],
            "risk_class": risk_meta["risk_class"],
        }

    exp_rows = (
        db.query(ApprenticeExperience.classification, func.count())
        .filter(ApprenticeExperience.apprentice_id == apprentice_id)
        .group_by(ApprenticeExperience.classification)
        .all()
    )
    exp_counts = {label: count for label, count in exp_rows}
    exp_total = sum(exp_counts.values())
    exp_escalated = (
        db.query(ApprenticeExperience)
        .filter(
            ApprenticeExperience.apprentice_id == apprentice_id,
            ApprenticeExperience.requires_escalation.is_(True),
        )
        .count()
    )

    education_view = None
    if app.education:
        subjects = []
        for subject in getattr(app.education, "subjects", []) or []:
            subjects.append(
                {
                    "name": subject.subject_name,
                    "mark": _fmt_num(float(subject.mark), 1),
                }
            )
        education_view = {
            "qualification_type": app.education.qualification_type,
            "institution_name": app.education.institution_name,
            "average_mark": _fmt_pct(float(app.education.average_mark), 1)
            if app.education.average_mark is not None
            else NA,
            "subjects": subjects,
        }

    mentors = []
    for assignment in app.mentor_assignments or []:
        mentor = assignment.mentor
        if not mentor:
            continue
        contact_bits = [p for p in (mentor.email, mentor.contact_number) if p]
        mentors.append(
            {
                "name": f"{mentor.name} {mentor.surname}".strip(),
                "specialisation": mentor.specialisation or NA,
                "contact": ", ".join(contact_bits) if contact_bits else NA,
                "assigned_date": _fmt_date(assignment.assigned_date),
                "current": "Yes" if assignment.is_current else "No",
            }
        )

    overall_bits: List[float] = []
    if avg_module is not None:
        overall_bits.append(avg_module)
    latest_eval_score = float(evals[0].overall_score) if evals and evals[0].overall_score is not None else None
    if latest_eval_score is not None:
        overall_bits.append(latest_eval_score)
    overall_score = _avg(overall_bits)
    if overall_score is None:
        performance_status = "Insufficient data"
    elif overall_score >= 75:
        performance_status = "Excellent"
    elif overall_score >= 60:
        performance_status = "Good"
    elif overall_score >= 50:
        performance_status = "Satisfactory"
    else:
        performance_status = "Needs improvement"

    commentary_metrics = {
        "full_name": f"{app.first_name} {app.surname}".strip(),
        "status": app.status,
        "completion_pct": completion_pct,
        "avg_evaluation": avg_eval,
        "avg_module_score": avg_module,
        "avg_attendance": avg_attendance,
        "dropout_risk": dropout,
        "completion_likelihood": completion_likelihood,
        "employment_readiness": employment_readiness,
        "evaluation_count": len(approved),
        "pending_evaluations": pending_count,
        "risk_label": risk_meta["risk_label"],
        "experience_reports": exp_total,
        "experience_escalated": exp_escalated,
    }
    commentary = generate_apprentice_commentary(commentary_metrics)

    return {
        "document_title": "Individual Apprentice Progress Report",
        "report_ref": report_ref,
        "issued_at": _fmt_datetime(issued),
        "issued_date": _fmt_date(issued),
        "prepared_by": prepared_by or "DentAcademy",
        "prepared_role": prepared_role,
        "apprentice": {
            "full_name": f"{app.first_name} {app.surname}".strip(),
            "apprentice_id": app.apprentice_id,
            "id_number": mask_id_number(app.id_number) or NA,
            "date_of_birth": _fmt_date(app.date_of_birth),
            "gender": app.gender or NA,
            "status": app.status or NA,
            "registered_at": _fmt_datetime(app.registered_at),
            "created_at": _fmt_datetime(app.created_at),
            "email": app.email or NA,
            "contact_number": app.contact_number or NA,
            "address": _address(app),
        },
        "education": education_view,
        "mentors": mentors,
        "attendance": {
            "average": _fmt_pct(avg_attendance),
            "period_count": len(att_rows_db),
            "rows": attendance_rows,
        },
        "modules": {
            "completed": completed,
            "total": total_modules,
            "completion_pct": _fmt_pct(completion_pct),
            "average_score": _fmt_num(avg_module, 1),
            "rows": module_rows,
        },
        "evaluations": {
            "total": len(evals),
            "approved_count": len(approved),
            "pending_count": pending_count,
            "average": _fmt_num(avg_eval),
            "dimension_averages": dim_avgs,
            "rows": eval_rows,
        },
        "prediction": prediction_view,
        "experience": {
            "total": exp_total,
            "good": exp_counts.get("GOOD", 0),
            "bad": exp_counts.get("BAD", 0),
            "misconduct": exp_counts.get("APPRENTICE_MISCONDUCT", 0),
            "escalated": exp_escalated,
        },
        "summary": {
            "performance_status": performance_status,
            "overall_score": _fmt_num(overall_score, 1),
        },
        "commentary": _commentary_view(commentary),
    }


def gather_programme_context(
    db: Session,
    *,
    prepared_by: str = "DentAcademy",
    prepared_role: Optional[str] = None,
) -> Dict[str, Any]:
    issued = _now()
    report_ref = f"DA-PRG-{issued.strftime('%Y%m%d-%H%M')}"
    threshold = get_int_setting(db, "dropout_risk_threshold")

    apprentices = (
        db.query(Apprentice)
        .order_by(Apprentice.surname, Apprentice.first_name)
        .all()
    )
    total_apprentices = len(apprentices)
    active_apprentices = sum(1 for a in apprentices if a.status == "ACTIVE")
    inactive_apprentices = total_apprentices - active_apprentices

    total_modules = db.query(Module).filter(Module.is_active.is_(True)).count()
    progress_rows = db.query(ModuleProgress).all()
    completed_by: Dict[int, int] = defaultdict(int)
    for progress in progress_rows:
        if progress.status == "Completed":
            completed_by[progress.apprentice_id] += 1

    eval_rows = db.query(Evaluation).all()
    approved_evals = [e for e in eval_rows if e.approved]
    pending_evals = len(eval_rows) - len(approved_evals)
    eval_by: Dict[int, List[float]] = defaultdict(list)
    for evaluation in approved_evals:
        eval_by[evaluation.apprentice_id].append(float(evaluation.overall_score))

    att_rows = db.query(Attendance).all()
    att_by: Dict[int, List[float]] = defaultdict(list)
    for record in att_rows:
        att_by[record.apprentice_id].append(float(record.attendance_rate))
    all_att = [float(r.attendance_rate) for r in att_rows]
    avg_attendance = _avg(all_att)

    preds = (
        db.query(AIPrediction)
        .order_by(AIPrediction.generated_at.desc())
        .all()
    )
    latest_pred: Dict[int, AIPrediction] = {}
    for pred in preds:
        latest_pred.setdefault(pred.apprentice_id, pred)

    completion_pcts = []
    apprentice_rows = []
    at_risk_rows = []
    for apprentice in apprentices:
        completed = completed_by.get(apprentice.apprentice_id, 0)
        completion = (
            round((completed / total_modules) * 100, 1) if total_modules else 0.0
        )
        completion_pcts.append(completion)
        pred = latest_pred.get(apprentice.apprentice_id)
        dropout = float(pred.dropout_risk) if pred and pred.dropout_risk is not None else None
        likelihood = (
            float(pred.completion_likelihood)
            if pred and pred.completion_likelihood is not None
            else None
        )
        eval_avg = _avg(eval_by.get(apprentice.apprentice_id, []))
        att_avg = _avg(att_by.get(apprentice.apprentice_id, []))
        row = {
            "name": f"{apprentice.first_name} {apprentice.surname}".strip(),
            "id_number": mask_id_number(apprentice.id_number) or NA,
            "status": apprentice.status or NA,
            "completion": _fmt_pct(completion),
            "attendance": _fmt_pct(att_avg),
            "eval_avg": _fmt_num(eval_avg),
            "dropout_risk": _fmt_pct(dropout),
            "completion_likelihood": _fmt_pct(likelihood),
        }
        apprentice_rows.append(row)
        if dropout is not None and dropout > threshold:
            at_risk_rows.append(
                {
                    "name": row["name"],
                    "status": row["status"],
                    "completion": row["completion"],
                    "dropout_risk": _fmt_pct(dropout),
                    "completion_likelihood": _fmt_pct(likelihood),
                }
            )

    avg_completion = _avg(completion_pcts) if completion_pcts else 0.0
    mentors_count = db.query(User).filter(User.role == "Mentor").count()
    supervisors_count = db.query(User).filter(User.role == "Supervisor").count()

    stats = {
        "total_apprentices": total_apprentices,
        "active_apprentices": active_apprentices,
        "inactive_apprentices": inactive_apprentices,
        "at_risk_count": len(at_risk_rows),
        "avg_completion": _fmt_pct(avg_completion),
        "avg_attendance": _fmt_pct(avg_attendance),
        "pending_evaluations": pending_evals,
        "total_evaluations": len(eval_rows),
        "approved_evaluations": len(approved_evals),
        "attendance_periods": len(att_rows),
        "supervisors": supervisors_count,
        "mentors": mentors_count,
        "total_modules": total_modules,
    }

    commentary = generate_programme_commentary(
        {
            "total_apprentices": total_apprentices,
            "active_apprentices": active_apprentices,
            "at_risk_count": len(at_risk_rows),
            "avg_completion_pct": avg_completion,
            "pending_evaluations": pending_evals,
            "avg_attendance": avg_attendance,
            "approved_evaluations": len(approved_evals),
            "total_modules": total_modules,
        }
    )

    return {
        "document_title": "Programme Summary Report",
        "report_ref": report_ref,
        "issued_at": _fmt_datetime(issued),
        "issued_date": _fmt_date(issued),
        "prepared_by": prepared_by or "DentAcademy",
        "prepared_role": prepared_role,
        "risk_threshold": threshold,
        "stats": stats,
        "at_risk_rows": at_risk_rows,
        "apprentice_rows": apprentice_rows,
        "commentary": _commentary_view(commentary),
    }


def render_apprentice_html(
    apprentice_id: int,
    db: Session,
    *,
    prepared_by: str = "DentAcademy",
    prepared_role: Optional[str] = None,
) -> str:
    context = gather_apprentice_context(
        apprentice_id, db, prepared_by=prepared_by, prepared_role=prepared_role
    )
    return _env().get_template("apprentice_report.html").render(**context)


def render_programme_html(
    db: Session,
    *,
    prepared_by: str = "DentAcademy",
    prepared_role: Optional[str] = None,
) -> str:
    context = gather_programme_context(
        db, prepared_by=prepared_by, prepared_role=prepared_role
    )
    return _env().get_template("programme_summary.html").render(**context)


def generate_apprentice_pdf(
    apprentice_id: int,
    db: Session,
    prepared_by: str = "DentAcademy",
    prepared_role: Optional[str] = None,
) -> str:
    output_dir = "reports_output"
    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, f"apprentice_{apprentice_id}_report.pdf")
    html_content = render_apprentice_html(
        apprentice_id, db, prepared_by=prepared_by, prepared_role=prepared_role
    )
    return _write_pdf(html_content, pdf_path)


def generate_summary_pdf(
    db: Session,
    prepared_by: str = "DentAcademy",
    prepared_role: Optional[str] = None,
) -> str:
    output_dir = "reports_output"
    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, "programme_summary.pdf")
    html_content = render_programme_html(
        db, prepared_by=prepared_by, prepared_role=prepared_role
    )
    return _write_pdf(html_content, pdf_path)
