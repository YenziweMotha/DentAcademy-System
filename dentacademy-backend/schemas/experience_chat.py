from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator


ClassificationLiteral = Literal["GOOD", "BAD", "APPRENTICE_MISCONDUCT"]
SeverityLiteral = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
EscalationStatusLiteral = Literal[
    "PENDING_REVIEW", "UNDER_REVIEW", "RESOLVED", "ESCALATED_FURTHER"
]
ChannelLiteral = Literal["WEB", "WHATSAPP", "OTHER"]
MessageRoleLiteral = Literal["USER", "ASSISTANT", "SYSTEM"]


class AIClassificationResult(BaseModel):
    """Validated structured output from the AI classification step."""

    classification: ClassificationLiteral
    severity: SeverityLiteral
    mentor_related: bool = False
    apprentice_misconduct: bool = False
    emergency: bool = False
    requires_escalation: bool = False
    summary: str = Field(..., min_length=1, max_length=2000)
    reason: str = Field(..., min_length=1, max_length=2000)
    reply: str = Field(..., min_length=1, max_length=4000)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)

    @field_validator("summary", "reason", "reply")
    @classmethod
    def strip_text(cls, v: str) -> str:
        return (v or "").strip()


class SendMessageIn(BaseModel):
    content: str = Field(..., min_length=1, max_length=8000)
    channel: ChannelLiteral = "WEB"

    @field_validator("content")
    @classmethod
    def strip_content(cls, v: str) -> str:
        cleaned = (v or "").strip()
        if not cleaned:
            raise ValueError("Message cannot be empty")
        return cleaned


class CreateConversationIn(BaseModel):
    channel: ChannelLiteral = "WEB"


class ChatMessageOut(BaseModel):
    message_id: int
    conversation_id: int
    role: MessageRoleLiteral
    content: str
    metadata_json: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    conversation_id: int
    apprentice_id: int
    channel: ChannelLiteral
    status: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageOut] = []

    model_config = {"from_attributes": True}


class ConversationSummaryOut(BaseModel):
    conversation_id: int
    channel: ChannelLiteral
    status: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    last_message_preview: Optional[str] = None

    model_config = {"from_attributes": True}


class ExperienceApprenticeOut(BaseModel):
    """Limited view for the reporting apprentice (no supervisor notes)."""

    experience_id: int
    classification: ClassificationLiteral
    severity: SeverityLiteral
    requires_escalation: bool
    is_emergency: bool
    ai_summary: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SendMessageOut(BaseModel):
    conversation_id: int
    user_message: ChatMessageOut
    assistant_message: ChatMessageOut
    experience: Optional[ExperienceApprenticeOut] = None
    emergency_notice: Optional[str] = None


class EscalationUpdateIn(BaseModel):
    status: Optional[EscalationStatusLiteral] = None
    supervisor_notes: Optional[str] = Field(default=None, max_length=5000)

    @field_validator("supervisor_notes")
    @classmethod
    def strip_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return v.strip()


class EscalationListItemOut(BaseModel):
    escalation_id: int
    experience_id: int
    apprentice_id: int
    apprentice_name: Optional[str] = None
    reason: str
    severity: SeverityLiteral
    status: EscalationStatusLiteral
    classification: ClassificationLiteral
    mentor_related: bool
    apprentice_misconduct: bool
    is_emergency: bool
    ai_summary: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None


class EscalationDetailOut(EscalationListItemOut):
    original_message: str
    escalation_reason: Optional[str] = None
    confidence: Optional[float] = None
    supervisor_notes: Optional[str] = None
    conversation_id: Optional[int] = None
    reviewed_by: Optional[int] = None
    assigned_to: Optional[int] = None


class ExperienceAnalyticsOut(BaseModel):
    total_reports: int = 0
    positive: int = 0
    negative: int = 0
    apprentice_misconduct: int = 0
    requiring_review: int = 0
    high_severity: int = 0
    emergency: int = 0
    mentor_related: int = 0
    pending_escalations: int = 0
    by_severity: dict = Field(default_factory=dict)
    by_classification: dict = Field(default_factory=dict)
    recent_days: List[dict] = Field(default_factory=list)
