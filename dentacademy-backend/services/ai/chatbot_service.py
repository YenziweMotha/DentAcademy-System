"""
Channel-agnostic chatbot orchestration.

Web UI (and future WhatsApp) should call process_incoming_message rather than
talking to OpenRouter directly.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from models.apprentice import Apprentice
from models.experience_chat import (
    ApprenticeExperience,
    ChatConversation,
    ChatMessage,
    ExperienceEscalation,
)
from schemas.experience_chat import AIClassificationResult
from services.ai.classification_service import (
    build_chat_messages,
    classify_from_ai_text,
    rule_based_classify,
)
from services.ai.escalation_service import create_escalation_if_needed
from services.ai.openrouter_client import OpenRouterError, chat_completion

logger = logging.getLogger("dentacademy.ai.chatbot")

WELCOME_MESSAGE = (
    "Hi — I'm the DentAcademy AI Apprentice Assistant. "
    "How was your apprenticeship experience today? "
    "You can describe your day in your own words. "
    "I'm here to listen and help flag anything that may need human review. "
    "Please note: I'm a reporting and triage assistant, not an emergency service."
)

EMERGENCY_NOTICE = (
    "This situation may require immediate real-world help. "
    "If you are unsafe, contact local emergency services or a trusted person now. "
    "Authorized supervisors have been notified for review. "
    "This chatbot cannot resolve emergencies."
)


def get_or_create_active_conversation(
    db: Session,
    apprentice: Apprentice,
    channel: str = "WEB",
) -> ChatConversation:
    conversation = (
        db.query(ChatConversation)
        .filter(
            ChatConversation.apprentice_id == apprentice.apprentice_id,
            ChatConversation.status == "ACTIVE",
            ChatConversation.channel == channel,
        )
        .order_by(ChatConversation.updated_at.desc())
        .first()
    )
    if conversation:
        return conversation

    conversation = ChatConversation(
        apprentice_id=apprentice.apprentice_id,
        channel=channel,
        status="ACTIVE",
    )
    db.add(conversation)
    db.flush()

    welcome = ChatMessage(
        conversation_id=conversation.conversation_id,
        role="ASSISTANT",
        content=WELCOME_MESSAGE,
        metadata_json={"type": "welcome"},
    )
    db.add(welcome)
    db.flush()
    return conversation


def _load_history_pairs(
    db: Session, conversation_id: int, *, exclude_message_id: Optional[int] = None
) -> List[Tuple[str, str]]:
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at.asc(), ChatMessage.message_id.asc())
        .all()
    )
    pairs: List[Tuple[str, str]] = []
    for msg in messages:
        if exclude_message_id and msg.message_id == exclude_message_id:
            continue
        if msg.role in ("USER", "ASSISTANT"):
            pairs.append((msg.role, msg.content))
    return pairs


def _run_classification(
    history: List[Tuple[str, str]], user_message: str
) -> Tuple[AIClassificationResult, str]:
    """
    Returns (classification, source) where source is 'openrouter' or 'fallback'.
    """
    try:
        messages = build_chat_messages(history, user_message)
        raw = chat_completion(
            messages,
            temperature=0.25,
            max_tokens=1200,
            response_format={"type": "json_object"},
        )
        result = classify_from_ai_text(raw, user_message)
        return result, "openrouter"
    except (OpenRouterError, ValueError, Exception) as exc:
        logger.warning(
            "AI classification falling back to rules (%s)", type(exc).__name__
        )
        hint = " ".join(c for _, c in history[-4:])
        return rule_based_classify(user_message, hint), "fallback"


def process_incoming_message(
    db: Session,
    *,
    apprentice: Apprentice,
    content: str,
    channel: str = "WEB",
    conversation_id: Optional[int] = None,
) -> dict:
    """
    Core entry point for any channel.

    Persists the user message, classifies, stores experience + optional escalation,
    and returns assistant reply payload.
    """
    if conversation_id:
        conversation = (
            db.query(ChatConversation)
            .filter(
                ChatConversation.conversation_id == conversation_id,
                ChatConversation.apprentice_id == apprentice.apprentice_id,
            )
            .first()
        )
        if not conversation:
            raise LookupError("Conversation not found")
        if conversation.status != "ACTIVE":
            conversation.status = "ACTIVE"
    else:
        conversation = get_or_create_active_conversation(db, apprentice, channel)

    user_msg = ChatMessage(
        conversation_id=conversation.conversation_id,
        role="USER",
        content=content,
    )
    db.add(user_msg)
    db.flush()

    prior = _load_history_pairs(
        db, conversation.conversation_id, exclude_message_id=user_msg.message_id
    )
    result, source = _run_classification(prior, content)

    experience = ApprenticeExperience(
        apprentice_id=apprentice.apprentice_id,
        conversation_id=conversation.conversation_id,
        source_message_id=user_msg.message_id,
        original_message=content,
        ai_summary=result.summary,
        classification=result.classification,
        severity=result.severity,
        mentor_related=result.mentor_related,
        apprentice_misconduct=result.apprentice_misconduct,
        requires_escalation=result.requires_escalation,
        is_emergency=result.emergency,
        confidence=result.confidence,
        escalation_reason=result.reason if result.requires_escalation else None,
        classification_payload={
            "classification": result.classification,
            "severity": result.severity,
            "mentor_related": result.mentor_related,
            "apprentice_misconduct": result.apprentice_misconduct,
            "emergency": result.emergency,
            "requires_escalation": result.requires_escalation,
            "summary": result.summary,
            "reason": result.reason,
            "confidence": result.confidence,
            "source": source,
        },
    )
    db.add(experience)
    db.flush()

    escalation = create_escalation_if_needed(db, experience, result)

    assistant_meta = {
        "experience_id": experience.experience_id,
        "classification": result.classification,
        "severity": result.severity,
        "requires_escalation": result.requires_escalation,
        "is_emergency": result.emergency,
        "source": source,
    }
    if escalation:
        assistant_meta["escalation_id"] = escalation.escalation_id

    assistant_msg = ChatMessage(
        conversation_id=conversation.conversation_id,
        role="ASSISTANT",
        content=result.reply,
        metadata_json=assistant_meta,
    )
    db.add(assistant_msg)

    conversation.updated_at = datetime.utcnow()
    db.flush()

    return {
        "conversation": conversation,
        "user_message": user_msg,
        "assistant_message": assistant_msg,
        "experience": experience,
        "escalation": escalation,
        "result": result,
        "source": source,
        "emergency_notice": EMERGENCY_NOTICE if result.emergency else None,
    }


def list_apprentice_conversations(
    db: Session, apprentice_id: int
) -> List[ChatConversation]:
    return (
        db.query(ChatConversation)
        .filter(ChatConversation.apprentice_id == apprentice_id)
        .order_by(ChatConversation.updated_at.desc())
        .all()
    )


def get_conversation_for_apprentice(
    db: Session, conversation_id: int, apprentice_id: int
) -> Optional[ChatConversation]:
    return (
        db.query(ChatConversation)
        .filter(
            ChatConversation.conversation_id == conversation_id,
            ChatConversation.apprentice_id == apprentice_id,
        )
        .first()
    )
