"""AI Apprentice Experience Chat + supervisor escalation API."""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from database import get_db
from middleware.auth_middleware import (
    get_current_user,
    require_admin_or_supervisor,
)
from middleware.audit_middleware import get_client_ip, log_audit_action
from models.apprentice import Apprentice
from models.experience_chat import (
    ApprenticeExperience,
    ChatConversation,
    ChatMessage,
    ExperienceEscalation,
)
from models.user import User
from schemas.experience_chat import (
    ConversationOut,
    ConversationSummaryOut,
    CreateConversationIn,
    EscalationDetailOut,
    EscalationListItemOut,
    EscalationUpdateIn,
    ExperienceAnalyticsOut,
    ExperienceApprenticeOut,
    SendMessageIn,
    SendMessageOut,
    ChatMessageOut,
)
from services.ai.chatbot_service import (
    get_conversation_for_apprentice,
    get_or_create_active_conversation,
    list_apprentice_conversations,
    process_incoming_message,
)
from services.ai.escalation_service import update_escalation_status

router = APIRouter(prefix="/api/experience-chat", tags=["experience-chat"])


def _get_apprentice_for_user(db: Session, user: User) -> Apprentice:
    apprentice = (
        db.query(Apprentice).filter(Apprentice.user_id == user.user_id).first()
    )
    if not apprentice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No apprentice profile is linked to your account.",
        )
    return apprentice


def _safe_audit(
    db: Session,
    action: str,
    user_id: int,
    entity_type: str,
    record_id: int,
    request: Optional[Request] = None,
    meta: Optional[dict] = None,
):
    """Audit without storing original report text."""
    log_audit_action(
        db,
        action,
        user_id,
        entity_type,
        record_id,
        new_value=meta,
        ip_address=get_client_ip(request) if request else None,
    )


# ---------------------------------------------------------------------------
# Apprentice chat endpoints
# ---------------------------------------------------------------------------


@router.post("/conversations", response_model=ConversationOut)
def start_or_resume_conversation(
    body: CreateConversationIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "Apprentice":
        raise HTTPException(status_code=403, detail="Only apprentices can start experience chats.")
    apprentice = _get_apprentice_for_user(db, current_user)
    conversation = get_or_create_active_conversation(db, apprentice, body.channel)
    db.commit()
    db.refresh(conversation)
    _safe_audit(
        db,
        "CREATE",
        current_user.user_id,
        "ChatConversation",
        conversation.conversation_id,
        request,
        {"event": "conversation_opened", "channel": body.channel},
    )
    # Reload messages
    conversation = (
        db.query(ChatConversation)
        .options(joinedload(ChatConversation.messages))
        .filter(ChatConversation.conversation_id == conversation.conversation_id)
        .first()
    )
    return conversation


@router.get("/conversations", response_model=List[ConversationSummaryOut])
def list_my_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "Apprentice":
        raise HTTPException(status_code=403, detail="Only apprentices can list their chats.")
    apprentice = _get_apprentice_for_user(db, current_user)
    conversations = list_apprentice_conversations(db, apprentice.apprentice_id)
    out: List[ConversationSummaryOut] = []
    for c in conversations:
        msgs = (
            db.query(ChatMessage)
            .filter(ChatMessage.conversation_id == c.conversation_id)
            .order_by(ChatMessage.created_at.desc())
            .all()
        )
        preview = msgs[0].content if msgs else None
        if preview and len(preview) > 120:
            preview = preview[:117] + "..."
        out.append(
            ConversationSummaryOut(
                conversation_id=c.conversation_id,
                channel=c.channel,
                status=c.status,
                created_at=c.created_at,
                updated_at=c.updated_at,
                message_count=len(msgs),
                last_message_preview=preview,
            )
        )
    return out


@router.get("/conversations/{conversation_id}", response_model=ConversationOut)
def get_my_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "Apprentice":
        raise HTTPException(status_code=403, detail="Access denied.")
    apprentice = _get_apprentice_for_user(db, current_user)
    conversation = get_conversation_for_apprentice(
        db, conversation_id, apprentice.apprentice_id
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    conversation = (
        db.query(ChatConversation)
        .options(joinedload(ChatConversation.messages))
        .filter(ChatConversation.conversation_id == conversation_id)
        .first()
    )
    return conversation


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=SendMessageOut,
)
def send_message(
    conversation_id: int,
    body: SendMessageIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "Apprentice":
        raise HTTPException(status_code=403, detail="Only apprentices can send experience messages.")
    apprentice = _get_apprentice_for_user(db, current_user)

    try:
        result = process_incoming_message(
            db,
            apprentice=apprentice,
            content=body.content,
            channel=body.channel,
            conversation_id=conversation_id,
        )
    except LookupError:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    db.commit()

    experience = result["experience"]
    escalation = result["escalation"]

    _safe_audit(
        db,
        "CREATE",
        current_user.user_id,
        "ApprenticeExperience",
        experience.experience_id,
        request,
        {
            "event": "experience_reported",
            "classification": experience.classification,
            "severity": experience.severity,
            "requires_escalation": experience.requires_escalation,
            "is_emergency": experience.is_emergency,
            "mentor_related": experience.mentor_related,
            "source": result["source"],
        },
    )
    if escalation:
        _safe_audit(
            db,
            "CREATE",
            current_user.user_id,
            "ExperienceEscalation",
            escalation.escalation_id,
            request,
            {
                "event": "escalation_created",
                "severity": escalation.severity,
                "experience_id": experience.experience_id,
            },
        )

    return SendMessageOut(
        conversation_id=result["conversation"].conversation_id,
        user_message=ChatMessageOut.model_validate(result["user_message"]),
        assistant_message=ChatMessageOut.model_validate(result["assistant_message"]),
        experience=ExperienceApprenticeOut.model_validate(experience),
        emergency_notice=result["emergency_notice"],
    )


@router.post("/messages", response_model=SendMessageOut)
def send_message_channel_agnostic(
    body: SendMessageIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Channel-agnostic send (auto-resumes active conversation).
    Prefer this path for future WhatsApp adapters.
    """
    if current_user.role != "Apprentice":
        raise HTTPException(status_code=403, detail="Only apprentices can send experience messages.")
    apprentice = _get_apprentice_for_user(db, current_user)
    conversation = get_or_create_active_conversation(db, apprentice, body.channel)
    db.flush()

    try:
        result = process_incoming_message(
            db,
            apprentice=apprentice,
            content=body.content,
            channel=body.channel,
            conversation_id=conversation.conversation_id,
        )
    except LookupError:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    db.commit()
    experience = result["experience"]
    escalation = result["escalation"]

    _safe_audit(
        db,
        "CREATE",
        current_user.user_id,
        "ApprenticeExperience",
        experience.experience_id,
        request,
        {
            "event": "experience_reported",
            "classification": experience.classification,
            "severity": experience.severity,
            "requires_escalation": experience.requires_escalation,
            "is_emergency": experience.is_emergency,
            "source": result["source"],
        },
    )
    if escalation:
        _safe_audit(
            db,
            "CREATE",
            current_user.user_id,
            "ExperienceEscalation",
            escalation.escalation_id,
            request,
            {"event": "escalation_created", "severity": escalation.severity},
        )

    return SendMessageOut(
        conversation_id=result["conversation"].conversation_id,
        user_message=ChatMessageOut.model_validate(result["user_message"]),
        assistant_message=ChatMessageOut.model_validate(result["assistant_message"]),
        experience=ExperienceApprenticeOut.model_validate(experience),
        emergency_notice=result["emergency_notice"],
    )


@router.get("/experiences/me", response_model=List[ExperienceApprenticeOut])
def list_my_experiences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "Apprentice":
        raise HTTPException(status_code=403, detail="Access denied.")
    apprentice = _get_apprentice_for_user(db, current_user)
    rows = (
        db.query(ApprenticeExperience)
        .filter(ApprenticeExperience.apprentice_id == apprentice.apprentice_id)
        .order_by(ApprenticeExperience.created_at.desc())
        .limit(50)
        .all()
    )
    return rows


# ---------------------------------------------------------------------------
# Supervisor / Admin escalation + analytics
# ---------------------------------------------------------------------------


def _escalation_to_list_item(
    esc: ExperienceEscalation, experience: ApprenticeExperience, apprentice: Apprentice
) -> EscalationListItemOut:
    return EscalationListItemOut(
        escalation_id=esc.escalation_id,
        experience_id=experience.experience_id,
        apprentice_id=experience.apprentice_id,
        apprentice_name=f"{apprentice.first_name} {apprentice.surname}".strip(),
        reason=esc.reason,
        severity=esc.severity,
        status=esc.status,
        classification=experience.classification,
        mentor_related=experience.mentor_related,
        apprentice_misconduct=experience.apprentice_misconduct,
        is_emergency=experience.is_emergency,
        ai_summary=experience.ai_summary,
        created_at=esc.created_at,
        reviewed_at=esc.reviewed_at,
        resolved_at=esc.resolved_at,
    )


@router.get("/escalations", response_model=List[EscalationListItemOut])
def list_escalations(
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    q = (
        db.query(ExperienceEscalation, ApprenticeExperience, Apprentice)
        .join(
            ApprenticeExperience,
            ExperienceEscalation.experience_id == ApprenticeExperience.experience_id,
        )
        .join(Apprentice, ApprenticeExperience.apprentice_id == Apprentice.apprentice_id)
    )
    if status_filter:
        q = q.filter(ExperienceEscalation.status == status_filter)
    if severity:
        q = q.filter(ExperienceEscalation.severity == severity)

    rows = q.order_by(ExperienceEscalation.created_at.desc()).limit(200).all()
    return [_escalation_to_list_item(esc, exp, app) for esc, exp, app in rows]


@router.get("/escalations/{escalation_id}", response_model=EscalationDetailOut)
def get_escalation(
    escalation_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    row = (
        db.query(ExperienceEscalation, ApprenticeExperience, Apprentice)
        .join(
            ApprenticeExperience,
            ExperienceEscalation.experience_id == ApprenticeExperience.experience_id,
        )
        .join(Apprentice, ApprenticeExperience.apprentice_id == Apprentice.apprentice_id)
        .filter(ExperienceEscalation.escalation_id == escalation_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Escalation not found.")

    esc, exp, app = row
    _safe_audit(
        db,
        "ACCESS",
        current_user.user_id,
        "ExperienceEscalation",
        escalation_id,
        request,
        {"event": "escalation_viewed"},
    )

    base = _escalation_to_list_item(esc, exp, app)
    return EscalationDetailOut(
        **base.model_dump(),
        original_message=exp.original_message,
        escalation_reason=exp.escalation_reason,
        confidence=exp.confidence,
        supervisor_notes=esc.supervisor_notes,
        conversation_id=exp.conversation_id,
        reviewed_by=esc.reviewed_by,
        assigned_to=esc.assigned_to,
    )


@router.patch("/escalations/{escalation_id}", response_model=EscalationDetailOut)
def patch_escalation(
    escalation_id: int,
    body: EscalationUpdateIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    row = (
        db.query(ExperienceEscalation, ApprenticeExperience, Apprentice)
        .join(
            ApprenticeExperience,
            ExperienceEscalation.experience_id == ApprenticeExperience.experience_id,
        )
        .join(Apprentice, ApprenticeExperience.apprentice_id == Apprentice.apprentice_id)
        .filter(ExperienceEscalation.escalation_id == escalation_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Escalation not found.")

    esc, exp, app = row
    old_status = esc.status
    update_escalation_status(
        esc,
        status=body.status,
        supervisor_notes=body.supervisor_notes,
        reviewer_user_id=current_user.user_id,
    )
    db.commit()
    db.refresh(esc)

    _safe_audit(
        db,
        "UPDATE",
        current_user.user_id,
        "ExperienceEscalation",
        escalation_id,
        request,
        {
            "event": "escalation_updated",
            "old_status": old_status,
            "new_status": esc.status,
            "notes_updated": body.supervisor_notes is not None,
        },
    )

    base = _escalation_to_list_item(esc, exp, app)
    return EscalationDetailOut(
        **base.model_dump(),
        original_message=exp.original_message,
        escalation_reason=exp.escalation_reason,
        confidence=exp.confidence,
        supervisor_notes=esc.supervisor_notes,
        conversation_id=exp.conversation_id,
        reviewed_by=esc.reviewed_by,
        assigned_to=esc.assigned_to,
    )


@router.get("/analytics", response_model=ExperienceAnalyticsOut)
def experience_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    since = datetime.utcnow() - timedelta(days=days)
    experiences = (
        db.query(ApprenticeExperience)
        .filter(ApprenticeExperience.created_at >= since)
        .all()
    )

    by_severity = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    by_classification = {"GOOD": 0, "BAD": 0, "APPRENTICE_MISCONDUCT": 0}
    positive = negative = misconduct = requiring = high = emergency = mentor = 0

    for exp in experiences:
        by_severity[exp.severity] = by_severity.get(exp.severity, 0) + 1
        by_classification[exp.classification] = (
            by_classification.get(exp.classification, 0) + 1
        )
        if exp.classification == "GOOD":
            positive += 1
        elif exp.classification == "BAD":
            negative += 1
        elif exp.classification == "APPRENTICE_MISCONDUCT":
            misconduct += 1
        if exp.requires_escalation:
            requiring += 1
        if exp.severity in ("HIGH", "CRITICAL"):
            high += 1
        if exp.is_emergency:
            emergency += 1
        if exp.mentor_related:
            mentor += 1

    pending = (
        db.query(func.count(ExperienceEscalation.escalation_id))
        .filter(ExperienceEscalation.status == "PENDING_REVIEW")
        .scalar()
        or 0
    )

    # Daily counts without exposing content
    day_map = {}
    for exp in experiences:
        key = exp.created_at.strftime("%Y-%m-%d") if exp.created_at else "unknown"
        bucket = day_map.setdefault(
            key, {"date": key, "total": 0, "escalated": 0, "emergency": 0}
        )
        bucket["total"] += 1
        if exp.requires_escalation:
            bucket["escalated"] += 1
        if exp.is_emergency:
            bucket["emergency"] += 1
    recent_days = [day_map[k] for k in sorted(day_map.keys())]

    return ExperienceAnalyticsOut(
        total_reports=len(experiences),
        positive=positive,
        negative=negative,
        apprentice_misconduct=misconduct,
        requiring_review=requiring,
        high_severity=high,
        emergency=emergency,
        mentor_related=mentor,
        pending_escalations=pending,
        by_severity=by_severity,
        by_classification=by_classification,
        recent_days=recent_days,
    )
