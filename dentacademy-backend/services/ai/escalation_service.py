"""Escalation creation and supervisor workflow helpers."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from models.experience_chat import ApprenticeExperience, ExperienceEscalation
from schemas.experience_chat import AIClassificationResult


def should_create_escalation(result: AIClassificationResult) -> bool:
    return bool(
        result.requires_escalation
        or result.emergency
        or result.severity in ("HIGH", "CRITICAL")
    )


def create_escalation_if_needed(
    db: Session,
    experience: ApprenticeExperience,
    result: AIClassificationResult,
) -> Optional[ExperienceEscalation]:
    if not should_create_escalation(result):
        return None

    existing = (
        db.query(ExperienceEscalation)
        .filter(ExperienceEscalation.experience_id == experience.experience_id)
        .first()
    )
    if existing:
        return existing

    reason = result.reason
    if result.emergency:
        category = "Emergency / immediate safety concern"
    elif result.mentor_related:
        category = "Mentor-related concern"
    elif result.apprentice_misconduct:
        category = "Possible apprentice behaviour concern"
    else:
        category = "Experience report requiring review"

    escalation = ExperienceEscalation(
        experience_id=experience.experience_id,
        reason=f"{category}. {reason}".strip(),
        severity=result.severity,
        status="PENDING_REVIEW",
    )
    db.add(escalation)
    db.flush()
    return escalation


def update_escalation_status(
    escalation: ExperienceEscalation,
    *,
    status: Optional[str],
    supervisor_notes: Optional[str],
    reviewer_user_id: int,
) -> ExperienceEscalation:
    now = datetime.utcnow()
    if status:
        escalation.status = status
        if status == "UNDER_REVIEW" and not escalation.reviewed_at:
            escalation.reviewed_at = now
            escalation.reviewed_by = reviewer_user_id
        if status == "RESOLVED":
            escalation.resolved_at = now
            escalation.reviewed_by = reviewer_user_id
            if not escalation.reviewed_at:
                escalation.reviewed_at = now
        if status == "ESCALATED_FURTHER":
            escalation.reviewed_by = reviewer_user_id
            if not escalation.reviewed_at:
                escalation.reviewed_at = now

    if supervisor_notes is not None:
        escalation.supervisor_notes = supervisor_notes
        if not escalation.reviewed_at:
            escalation.reviewed_at = now
            escalation.reviewed_by = reviewer_user_id
        if escalation.status == "PENDING_REVIEW":
            escalation.status = "UNDER_REVIEW"

    return escalation
