"""Classification validation, safety overrides, and rule-based fallback."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from pydantic import ValidationError

from schemas.experience_chat import AIClassificationResult

logger = logging.getLogger("dentacademy.ai.classification")

CLASSIFICATIONS = {"GOOD", "BAD", "APPRENTICE_MISCONDUCT"}
SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}

EMERGENCY_PATTERNS = [
    r"\b(kill|killed|killing|murder)\b",
    r"\b(rape|raped|sexual\s+assault|sexually\s+assaulted)\b",
    r"\b(weapon|gun|knife|stabbed|shot)\b",
    r"\b(beat\s+me|beating\s+me|hit\s+me|hitting\s+me|assaulted\s+me|physical\s+abuse)\b",
    r"\b(threaten(ed|ing)?\s+(to\s+)?(kill|hurt|harm))\b",
    r"\b(i\s+am\s+(not\s+safe|unsafe)|currently\s+unsafe|in\s+danger\s+right\s+now)\b",
    r"\b(bleeding|broken\s+bone|unconscious|overdose)\b",
    r"\b(suicide|kill\s+myself|end\s+my\s+life)\b",
]

MENTOR_MISCONDUCT_PATTERNS = [
    r"\bmentor\b.*(shout|yell|scream|abuse|harass|threat|hit|assault|discriminat|intimidate)",
    r"(shout|yell|scream|abuse|harass|threat|hit|assault|discriminat|intimidate).*\bmentor\b",
    r"\b(sexual\s+harassment|inappropriate\s+touch|asked\s+me\s+to\s+do\s+something\s+inappropriate)\b",
    r"\b(refuses?\s+to\s+(train|teach|help)|won'?t\s+(train|teach)\s+me)\b",
]

MISCONDUCT_SELF_PATTERNS = [
    r"\b(i\s+(stole|steal|damaged|broke|harassed|refused\s+to\s+work))\b",
    r"\b(on\s+my\s+phone\s+(all|most\s+of)\s+(the\s+)?day|skipped\s+work|didn'?t\s+show\s+up)\b",
    r"\b(i\s+was\s+late|arrived\s+late).*(phone|nothing|lazy)\b",
]

POSITIVE_PATTERNS = [
    r"\b(great|good|productive|learned|helpful|proud|completed|succeed|hands[- ]on)\b",
]

NEGATIVE_PATTERNS = [
    r"\b(terrible|awful|frustrating|upset|angry|ignored|unsupported|conflict|bad\s+day)\b",
]


SYSTEM_PROMPT = """You are DentAcademy's AI Apprentice Experience Assistant.
You help apprentices privately describe their daily apprenticeship experience.

You are a classification and triage assistant — NOT an emergency service, counselor, judge, or disciplinarian.

Rules:
1. Stay calm, neutral, supportive, professional, and non-judgmental.
2. Never accuse mentors or apprentices of guilt. Use phrases like "may require human review" or "potential concern".
3. Never encourage retaliation.
4. Never claim you have resolved an emergency or that confidentiality is absolute beyond system limits.
5. If the situation may be an emergency or immediate danger, clearly say it appears serious, encourage contacting local emergency/support services, and note that authorized staff will be notified for review. Do NOT say the AI has "handled" it.
6. Distinguish what the apprentice said from what you inferred.
7. Prefer escalation when uncertain about safety or serious misconduct.

Respond with ONLY valid JSON (no markdown fences) matching this schema:
{
  "classification": "GOOD" | "BAD" | "APPRENTICE_MISCONDUCT",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "mentor_related": boolean,
  "apprentice_misconduct": boolean,
  "emergency": boolean,
  "requires_escalation": boolean,
  "summary": "short neutral summary of the report",
  "reason": "why this classification/escalation decision was made (for supervisors)",
  "reply": "natural supportive reply to the apprentice",
  "confidence": number between 0 and 1
}

Classification guidance:
- GOOD: productive learning, positive mentor guidance, completed tasks, good environment.
- BAD: frustration, poor communication, lack of work, feeling unsupported, minor conflict — concerning but not necessarily immediate escalation.
- APPRENTICE_MISCONDUCT: apprentice describes their own improper behaviour (absence, refusing work, damaging property, harassment, serious disrespect). Record objectively; do not punish or accuse.

Mentor-related: true when the report concerns mentor behaviour. Mentors must NOT automatically receive these complaints. Serious mentor allegations (abuse, harassment, threats, discrimination, unsafe conditions caused by mentor) require escalation.

Emergency/CRITICAL: physical violence, immediate threat, serious injury, sexual assault, weapons, currently unsafe, medical emergency. Set emergency=true, severity=CRITICAL, requires_escalation=true.

Escalation: set requires_escalation=true for emergencies, HIGH/CRITICAL severity, serious mentor misconduct allegations, or clear apprentice misconduct that needs supervisor awareness. When uncertain about safety, escalate.
"""


def _matches_any(text: str, patterns: List[str]) -> bool:
    return any(re.search(p, text, re.IGNORECASE) for p in patterns)


def detect_emergency_signals(text: str) -> bool:
    return _matches_any(text, EMERGENCY_PATTERNS)


def extract_json_object(raw: str) -> Dict[str, Any]:
    """Parse JSON from model output, tolerating optional markdown fences."""
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError("No JSON object found in AI response")
    data = json.loads(match.group(0))
    if not isinstance(data, dict):
        raise ValueError("AI JSON root must be an object")
    return data


def apply_safety_overrides(
    result: AIClassificationResult, user_message: str
) -> AIClassificationResult:
    """Enforce conservative safety rules after AI or fallback classification."""
    data = result.model_dump()
    emergency_hit = detect_emergency_signals(user_message) or result.emergency

    if emergency_hit:
        data["emergency"] = True
        data["severity"] = "CRITICAL"
        data["requires_escalation"] = True
        if "emergency" not in (data.get("reply") or "").lower():
            data["reply"] = (
                f"{data['reply'].rstrip()} "
                "What you've described may involve immediate danger. "
                "This chatbot is only an initial reporting tool — not an emergency service. "
                "Please contact local emergency services or trusted support right away if you are unsafe. "
                "I've also flagged this for authorized human review."
            ).strip()

    if data["severity"] in ("HIGH", "CRITICAL"):
        data["requires_escalation"] = True

    if data["mentor_related"] and data["severity"] in ("MEDIUM", "HIGH", "CRITICAL"):
        data["requires_escalation"] = True

    if data["apprentice_misconduct"] or data["classification"] == "APPRENTICE_MISCONDUCT":
        data["apprentice_misconduct"] = True
        if data["classification"] != "APPRENTICE_MISCONDUCT":
            data["classification"] = "APPRENTICE_MISCONDUCT"
        if data["severity"] in ("MEDIUM", "HIGH", "CRITICAL"):
            data["requires_escalation"] = True

    # Never present definitive guilt language in the apprentice-facing reply
    guilty_phrases = [
        "mentor is guilty",
        "you are guilty",
        "you are bad",
        "mentor is bad",
    ]
    reply_lower = data["reply"].lower()
    if any(p in reply_lower for p in guilty_phrases):
        data["reply"] = (
            "Thank you for sharing this. I've recorded your report so authorized staff "
            "can review it. Would you like to share any other details about what happened?"
        )

    return AIClassificationResult.model_validate(data)


def validate_classification_payload(
    payload: Dict[str, Any], user_message: str
) -> AIClassificationResult:
    normalized = dict(payload)
    # Accept alternate keys from imperfect models
    if "is_emergency" in normalized and "emergency" not in normalized:
        normalized["emergency"] = normalized.pop("is_emergency")
    if "category" in normalized and "classification" not in normalized:
        normalized["classification"] = normalized.pop("category")

    cls = str(normalized.get("classification", "")).upper().strip()
    if cls not in CLASSIFICATIONS:
        raise ValueError(f"Invalid classification: {cls}")
    normalized["classification"] = cls

    sev = str(normalized.get("severity", "")).upper().strip()
    if sev not in SEVERITIES:
        raise ValueError(f"Invalid severity: {sev}")
    normalized["severity"] = sev

    for key in (
        "mentor_related",
        "apprentice_misconduct",
        "emergency",
        "requires_escalation",
    ):
        if key in normalized:
            normalized[key] = bool(normalized[key])

    conf = normalized.get("confidence", 0.5)
    try:
        conf = float(conf)
    except (TypeError, ValueError):
        conf = 0.5
    normalized["confidence"] = max(0.0, min(1.0, conf))

    result = AIClassificationResult.model_validate(normalized)
    return apply_safety_overrides(result, user_message)


def rule_based_classify(user_message: str, history_hint: str = "") -> AIClassificationResult:
    """Conservative fallback when the AI provider fails or returns invalid JSON."""
    text = f"{history_hint}\n{user_message}".strip()
    emergency = detect_emergency_signals(text)
    mentor_related = _matches_any(text, MENTOR_MISCONDUCT_PATTERNS) or (
        "mentor" in text.lower()
        and _matches_any(text, NEGATIVE_PATTERNS + EMERGENCY_PATTERNS)
    )
    misconduct = _matches_any(text, MISCONDUCT_SELF_PATTERNS)
    positive = _matches_any(text, POSITIVE_PATTERNS)
    negative = _matches_any(text, NEGATIVE_PATTERNS) or mentor_related

    if emergency:
        classification = "BAD"
        severity = "CRITICAL"
        requires_escalation = True
        summary = "Potential emergency or immediate-safety concern reported."
        reason = "Keyword/safety heuristics detected possible immediate danger. Human review required."
        reply = (
            "Thank you for telling me. What you've described may be serious. "
            "This assistant is an initial reporting and triage tool, not an emergency service. "
            "If you are in danger now, please contact local emergency services or trusted support immediately. "
            "I've flagged this for authorized human review."
        )
        confidence = 0.55
    elif misconduct and not mentor_related:
        classification = "APPRENTICE_MISCONDUCT"
        severity = "MEDIUM"
        requires_escalation = True
        summary = "Report may describe apprentice behaviour that needs supervisor awareness."
        reason = "Possible apprenticeship-rule concern inferred from the report. Supervisor review recommended."
        reply = (
            "Thank you for being honest about your day. I've noted what you shared so "
            "authorized staff can review it if needed. Would you like to add any context?"
        )
        confidence = 0.5
    elif mentor_related:
        classification = "BAD"
        severity = "HIGH" if _matches_any(text, MENTOR_MISCONDUCT_PATTERNS) else "MEDIUM"
        requires_escalation = True
        summary = "Apprentice reported a mentor-related concern."
        reason = "Potential mentor-related concern detected. Human review required."
        reply = (
            "Thank you for telling me. What you've described may be serious, so I've flagged it "
            "for appropriate review by authorized staff. You're not alone in this — would you like "
            "to share any additional details about what happened?"
        )
        confidence = 0.55
    elif positive and not negative:
        classification = "GOOD"
        severity = "LOW"
        requires_escalation = False
        summary = "Apprentice described a productive or positive day."
        reason = "Positive language about learning or progress."
        reply = (
            "That sounds like a productive day. It's great when you get hands-on experience "
            "and useful guidance. Anything else you'd like to capture from today?"
        )
        confidence = 0.45
    else:
        classification = "BAD" if negative else "BAD"
        severity = "MEDIUM" if negative else "LOW"
        requires_escalation = negative and mentor_related
        summary = "Apprentice described a difficult or mixed day."
        reason = "Negative or ambiguous experience; triage used conservative fallback."
        reply = (
            "I'm sorry the day was difficult. Thank you for sharing it with me. "
            "Would you like to tell me more about what happened?"
        )
        confidence = 0.4

    result = AIClassificationResult(
        classification=classification,
        severity=severity,
        mentor_related=mentor_related,
        apprentice_misconduct=misconduct or classification == "APPRENTICE_MISCONDUCT",
        emergency=emergency,
        requires_escalation=requires_escalation or emergency,
        summary=summary,
        reason=reason,
        reply=reply,
        confidence=confidence,
    )
    return apply_safety_overrides(result, user_message)


def build_chat_messages(
    history: List[Tuple[str, str]], user_message: str
) -> List[Dict[str, str]]:
    """Build OpenRouter messages from (role, content) history. Roles: user|assistant."""
    messages: List[Dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for role, content in history[-12:]:
        mapped = "user" if role == "USER" else "assistant"
        messages.append({"role": mapped, "content": content})
    messages.append({"role": "user", "content": user_message})
    return messages


def classify_from_ai_text(
    raw: str, user_message: str
) -> AIClassificationResult:
    try:
        payload = extract_json_object(raw)
        return validate_classification_payload(payload, user_message)
    except (ValueError, ValidationError, json.JSONDecodeError) as exc:
        logger.warning("Invalid AI classification output: %s", type(exc).__name__)
        raise
