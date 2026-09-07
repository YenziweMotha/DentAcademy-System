"""Unit tests for experience-chat classification validation and fallbacks."""

from services.ai.classification_service import (
    detect_emergency_signals,
    extract_json_object,
    rule_based_classify,
    validate_classification_payload,
)


def test_extract_json_with_fence():
    raw = '```json\n{"classification":"GOOD","severity":"LOW","summary":"ok","reason":"r","reply":"hi"}\n```'
    data = extract_json_object(raw)
    assert data["classification"] == "GOOD"


def test_validate_forces_emergency_escalation():
    payload = {
        "classification": "BAD",
        "severity": "LOW",
        "mentor_related": True,
        "apprentice_misconduct": False,
        "emergency": False,
        "requires_escalation": False,
        "summary": "Possible violence",
        "reason": "Test",
        "reply": "Thanks for telling me.",
        "confidence": 0.9,
    }
    result = validate_classification_payload(
        payload, "My mentor hit me and I am currently unsafe"
    )
    assert result.emergency is True
    assert result.severity == "CRITICAL"
    assert result.requires_escalation is True
    assert "emergency" in result.reply.lower() or "unsafe" in result.reply.lower() or "serious" in result.reply.lower()


def test_rule_based_positive():
    result = rule_based_classify(
        "Today was great. My mentor showed me how to configure the network and I completed the task."
    )
    assert result.classification == "GOOD"
    assert result.requires_escalation is False


def test_rule_based_mentor_abuse():
    result = rule_based_classify(
        "Today was terrible. My mentor shouted at me in front of everyone and told me I'm useless."
    )
    assert result.mentor_related is True
    assert result.requires_escalation is True
    assert result.classification == "BAD"


def test_rule_based_misconduct():
    result = rule_based_classify(
        "I didn't do much today. I arrived late and then spent most of the day on my phone."
    )
    assert result.classification == "APPRENTICE_MISCONDUCT"
    assert result.apprentice_misconduct is True


def test_detect_emergency():
    assert detect_emergency_signals("Someone threatened to kill me with a weapon")
    assert not detect_emergency_signals("I felt a bit tired after training")
