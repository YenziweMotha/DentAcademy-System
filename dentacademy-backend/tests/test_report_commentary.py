"""Unit tests for formal PDF report commentary (no database required)."""

from services.ai.report_commentary import (
    fallback_apprentice_commentary,
    fallback_programme_commentary,
    _clean_commentary,
)


def test_fallback_apprentice_commentary_includes_recommendations():
    comments = fallback_apprentice_commentary(
        {
            "full_name": "Test Student",
            "status": "ACTIVE",
            "completion_pct": 20,
            "avg_evaluation": 2.1,
            "avg_module_score": 40,
            "avg_attendance": 60,
            "dropout_risk": 72,
            "evaluation_count": 1,
            "pending_evaluations": 0,
            "risk_label": "High risk",
        }
    )
    assert comments["source"] == "system"
    assert "Test Student" in comments["executive_summary"]
    assert comments["recommendations"]
    assert comments["areas_of_concern"]
    assert comments["overall_comment"]


def test_fallback_programme_commentary_covers_aggregates():
    comments = fallback_programme_commentary(
        {
            "total_apprentices": 12,
            "active_apprentices": 10,
            "at_risk_count": 2,
            "avg_completion_pct": 48,
            "pending_evaluations": 3,
            "avg_attendance": 91,
            "approved_evaluations": 20,
        }
    )
    assert "12" in comments["executive_summary"]
    assert comments["observations"]
    assert comments["recommendations"]


def test_clean_commentary_fills_empty_concerns():
    cleaned = _clean_commentary(
        {
            "executive_summary": "Summary",
            "observations": ["One"],
            "strengths": ["Strong"],
            "areas_of_concern": [],
            "recommendations": ["Review"],
            "overall_comment": "Overall",
        },
        fallback_apprentice_commentary({"full_name": "X", "status": "ACTIVE"}),
    )
    assert cleaned["areas_of_concern"]
    assert cleaned["executive_summary"] == "Summary"
