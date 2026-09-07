"""AI apprentice experience chat, classification records, and escalations."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    Float,
    DateTime,
    Enum,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class ChatConversation(Base):
    """Channel-agnostic conversation container (web today, WhatsApp later)."""

    __tablename__ = "chat_conversations"

    conversation_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    apprentice_id = Column(
        Integer,
        ForeignKey("apprentices.apprentice_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    channel = Column(
        Enum("WEB", "WHATSAPP", "OTHER", name="chat_channel_enum"),
        default="WEB",
        nullable=False,
    )
    status = Column(
        Enum("ACTIVE", "CLOSED", name="chat_conversation_status_enum"),
        default="ACTIVE",
        nullable=False,
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    apprentice = relationship("Apprentice", back_populates="chat_conversations")
    messages = relationship(
        "ChatMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )
    experiences = relationship("ApprenticeExperience", back_populates="conversation")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    message_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    conversation_id = Column(
        Integer,
        ForeignKey("chat_conversations.conversation_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(
        Enum("USER", "ASSISTANT", "SYSTEM", name="chat_message_role_enum"),
        nullable=False,
    )
    content = Column(Text, nullable=False)
    # Non-sensitive metadata only (e.g. experience_id, classification labels)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    conversation = relationship("ChatConversation", back_populates="messages")


class ApprenticeExperience(Base):
    __tablename__ = "apprentice_experiences"

    experience_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    apprentice_id = Column(
        Integer,
        ForeignKey("apprentices.apprentice_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    conversation_id = Column(
        Integer,
        ForeignKey("chat_conversations.conversation_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source_message_id = Column(
        Integer,
        ForeignKey("chat_messages.message_id", ondelete="SET NULL"),
        nullable=True,
    )
    original_message = Column(Text, nullable=False)
    ai_summary = Column(Text, nullable=True)
    classification = Column(
        Enum(
            "GOOD",
            "BAD",
            "APPRENTICE_MISCONDUCT",
            name="experience_classification_enum",
        ),
        nullable=False,
    )
    severity = Column(
        Enum("LOW", "MEDIUM", "HIGH", "CRITICAL", name="experience_severity_enum"),
        nullable=False,
    )
    mentor_related = Column(Boolean, default=False, nullable=False)
    apprentice_misconduct = Column(Boolean, default=False, nullable=False)
    requires_escalation = Column(Boolean, default=False, nullable=False)
    is_emergency = Column(Boolean, default=False, nullable=False)
    confidence = Column(Float, nullable=True)
    escalation_reason = Column(Text, nullable=True)
    # Sanitized AI payload used for triage (no provider secrets)
    classification_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    apprentice = relationship("Apprentice", back_populates="experiences")
    conversation = relationship("ChatConversation", back_populates="experiences")
    escalation = relationship(
        "ExperienceEscalation",
        back_populates="experience",
        uselist=False,
        cascade="all, delete-orphan",
    )


class ExperienceEscalation(Base):
    __tablename__ = "experience_escalations"

    escalation_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    experience_id = Column(
        Integer,
        ForeignKey("apprentice_experiences.experience_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    assigned_to = Column(
        Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
    reason = Column(Text, nullable=False)
    severity = Column(
        Enum("LOW", "MEDIUM", "HIGH", "CRITICAL", name="escalation_severity_enum"),
        nullable=False,
    )
    status = Column(
        Enum(
            "PENDING_REVIEW",
            "UNDER_REVIEW",
            "RESOLVED",
            "ESCALATED_FURTHER",
            name="escalation_status_enum",
        ),
        default="PENDING_REVIEW",
        nullable=False,
        index=True,
    )
    supervisor_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    reviewed_by = Column(
        Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )

    experience = relationship("ApprenticeExperience", back_populates="escalation")
    assignee = relationship("User", foreign_keys=[assigned_to])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
