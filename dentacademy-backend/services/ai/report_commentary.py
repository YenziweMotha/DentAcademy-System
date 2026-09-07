"""Formal AI commentary for official apprenticeship PDF reports.

Uses OpenRouter when configured; otherwise a deterministic rule-based
narrative so a report always contains professional comments.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from services.ai.classification_service import extract_json_object
from services.ai.openrouter_client import OpenRouterError, chat_completion, get_openrouter_config

logger = logging.getLogger("dentacademy.ai.report_commentary")

ORG_NAME = "DentAcademy"
PROGRAMME_NAME = "DentAcademy Apprenticeship Programme"

APPRENTICE_SYSTEM_PROMPT = f"""You are a senior training officer writing commentary for an official
apprenticeship progress report at {ORG_NAME} ({PROGRAMME_NAME}).

Write in formal South African English. Do not invent facts, names, scores, or events.
Use only the metrics supplied. Do not quote or reconstruct confidential daily
experience-chat messages; you may refer only to aggregate counts if provided.
Do not make disciplinary findings. Recommendations must be advisory.

Respond with ONLY valid JSON matching this schema:
{{
  "executive_summary": "2-4 sentences covering overall standing",
  "observations": ["neutral observation", "..."],
  "strengths": ["strength", "..."],
  "areas_of_concern": ["concern or empty if none"],
  "recommendations": ["actionable recommendation", "..."],
  "overall_comment": "one formal paragraph suitable for an official file"
}}
"""

PROGRAMME_SYSTEM_PROMPT = f"""You are a senior training officer writing the executive commentary
for an official programme summary report at {ORG_NAME} ({PROGRAMME_NAME}).

Write in formal South African English. Do not invent figures. Use only the
aggregate metrics supplied. Do not name individual apprentices unless they
appear in the supplied at-risk list. Do not make disciplinary findings.

Respond with ONLY valid JSON matching this schema:
{{
  "executive_summary": "3-5 sentences covering programme health",
  "observations": ["observation", "..."],
  "strengths": ["strength", "..."],
  "areas_of_concern": ["concern", "..."],
  "recommendations": ["recommendation for management", "..."],
  "overall_comment": "one formal closing paragraph"
}}
"""


def _as_str_list(value: Any, limit: int = 8) -> List[str]:
    if not isinstance(value, list):
        return []
    items: List[str] = []
    for item in value:
        text = str(item).strip() if item is not None else ""
        if text:
            items.append(text)
        if len(items) >= limit:
            break
    return items


def _clean_commentary(payload: Dict[str, Any], fallback: Dict[str, Any]) -> Dict[str, Any]:
    def pick(key: str) -> str:
        raw = payload.get(key)
        text = str(raw).strip() if raw is not None else ""
        return text or fallback.get(key, "")

    result = {
        "executive_summary": pick("executive_summary"),
        "observations": _as_str_list(payload.get("observations")) or fallback.get("observations", []),
        "strengths": _as_str_list(payload.get("strengths")) or fallback.get("strengths", []),
        "areas_of_concern": _as_str_list(payload.get("areas_of_concern")),
        "recommendations": _as_str_list(payload.get("recommendations")) or fallback.get("recommendations", []),
        "overall_comment": pick("overall_comment"),
    }
    if not result["areas_of_concern"]:
        result["areas_of_concern"] = fallback.get("areas_of_concern") or [
            "No material concerns are indicated by the available metrics."
        ]
    return result


def _pct(value: Optional[float]) -> str:
    if value is None:
        return "not available"
    return f"{value:.1f}%"


def _num(value: Optional[float], digits: int = 2) -> str:
    if value is None:
        return "not available"
    return f"{value:.{digits}f}"


def fallback_apprentice_commentary(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Deterministic formal comments from the same metrics sent to the model."""
    name = metrics.get("full_name") or "The apprentice"
    status = metrics.get("status") or "unspecified"
    completion = metrics.get("completion_pct")
    avg_eval = metrics.get("avg_evaluation")
    avg_module = metrics.get("avg_module_score")
    attendance = metrics.get("avg_attendance")
    dropout = metrics.get("dropout_risk")
    readiness = metrics.get("employment_readiness")
    eval_count = metrics.get("evaluation_count") or 0
    pending_evals = metrics.get("pending_evaluations") or 0
    risk_label = metrics.get("risk_label") or "Not assessed"

    observations: List[str] = [
        f"{name} is recorded as {status} on the programme register.",
        f"Module completion currently stands at {_pct(completion)}.",
    ]
    if attendance is not None:
        observations.append(f"Average recorded attendance is {_pct(attendance)}.")
    if eval_count:
        observations.append(
            f"{eval_count} workplace evaluation(s) are on file, with an approved average of {_num(avg_eval)} out of 5.00."
        )
    else:
        observations.append("No approved workplace evaluations are on file for this reporting period.")
    if pending_evals:
        observations.append(f"{pending_evals} evaluation(s) remain pending supervisor approval.")

    strengths: List[str] = []
    concerns: List[str] = []
    recommendations: List[str] = []

    if completion is not None and completion >= 75:
        strengths.append("Training-module progress is well advanced relative to the programme catalogue.")
    elif completion is not None and completion < 40:
        concerns.append("Module completion is low and may indicate delayed progress through the curriculum.")
        recommendations.append("The mentor and supervisor should agree a catch-up plan for outstanding modules.")

    if avg_eval is not None and avg_eval >= 4.0:
        strengths.append("Workplace evaluation scores indicate consistently strong professional conduct.")
    elif avg_eval is not None and avg_eval < 3.0:
        concerns.append("Approved evaluation scores are below a satisfactory average and require attention.")
        recommendations.append("A structured mentoring review should address the lowest-scoring evaluation dimensions.")

    if avg_module is not None and avg_module >= 70:
        strengths.append("Assessment scores on completed modules are at a sound academic standard.")
    elif avg_module is not None and avg_module < 50:
        concerns.append("Average module assessment scores are below the typical pass threshold.")
        recommendations.append("Additional practical coaching should be provided on modules scored below the pass mark.")

    if attendance is not None and attendance >= 90:
        strengths.append("Attendance is regular and supports continuity of workplace learning.")
    elif attendance is not None and attendance < 75:
        concerns.append("Attendance is below an acceptable workplace standard.")
        recommendations.append("Attendance should be monitored weekly and reasons for absence recorded.")

    if dropout is not None and dropout > 60:
        concerns.append(
            f"The AI risk model places dropout risk at {_pct(dropout)} ({risk_label}); this is an estimate only."
        )
        recommendations.append(
            "A documented support intervention should be considered, interpreted together with human judgement."
        )
    elif dropout is not None and dropout > 30:
        observations.append(f"The AI risk model currently classifies this apprentice as {risk_label}.")
        recommendations.append("Progress should be reviewed at the next scheduled mentoring session.")

    if readiness is not None and readiness >= 70:
        strengths.append("Employment-readiness indicators are favourable on the latest AI assessment.")

    if not strengths:
        strengths.append("Continued participation on the programme provides a basis for further development.")
    if not recommendations:
        recommendations.append("Maintain the current training plan and record the next workplace evaluation on schedule.")
    if not concerns:
        concerns.append("No material concerns are indicated by the available metrics.")

    summary = (
        f"This report summarises the official training record of {name}. "
        f"Module completion is {_pct(completion)}, the latest AI risk classification is {risk_label}, "
        f"and the approved evaluation average is {_num(avg_eval)} out of 5.00. "
        "Figures must be read with professional judgement and do not constitute a disciplinary finding."
    )
    overall = (
        f"On the evidence currently held on the DentAcademy register, {name} is {status.lower()}. "
        f"Attendance averages {_pct(attendance)} and module assessments average {_num(avg_module)}. "
        "The comments in this section are generated to assist supervisors and do not replace mentor or "
        "supervisor assessment of workplace competence."
    )
    return {
        "executive_summary": summary,
        "observations": observations,
        "strengths": strengths,
        "areas_of_concern": concerns,
        "recommendations": recommendations,
        "overall_comment": overall,
        "source": "system",
    }


def fallback_programme_commentary(metrics: Dict[str, Any]) -> Dict[str, Any]:
    total = metrics.get("total_apprentices") or 0
    active = metrics.get("active_apprentices") or 0
    at_risk = metrics.get("at_risk_count") or 0
    avg_completion = metrics.get("avg_completion_pct")
    pending = metrics.get("pending_evaluations") or 0
    avg_attendance = metrics.get("avg_attendance")
    approved = metrics.get("approved_evaluations") or 0

    observations = [
        f"The register currently lists {total} apprentice(s), of whom {active} are recorded as ACTIVE.",
        f"Average module completion across apprentices with progress records is {_pct(avg_completion)}.",
        f"{at_risk} apprentice(s) currently exceed the configured dropout-risk threshold.",
        f"{approved} workplace evaluation(s) have been approved; {pending} remain pending.",
    ]
    if avg_attendance is not None:
        observations.append(f"Programme-wide average attendance is {_pct(avg_attendance)}.")

    strengths: List[str] = []
    concerns: List[str] = []
    recommendations: List[str] = []

    if total and active == total:
        strengths.append("All registered apprentices are recorded as active.")
    if avg_completion is not None and avg_completion >= 70:
        strengths.append("Average curriculum progress across the intake is strong.")
    elif avg_completion is not None and avg_completion < 40:
        concerns.append("Average module completion is low across the programme.")
        recommendations.append("Supervisors should review module scheduling and workplace release time.")

    if at_risk:
        concerns.append(
            f"{at_risk} apprentice(s) are flagged at elevated dropout risk by the AI model (estimate only)."
        )
        recommendations.append(
            "At-risk records should be reviewed individually by a supervisor, together with attendance and evaluations."
        )
    else:
        strengths.append("No apprentices currently exceed the configured AI dropout-risk threshold.")

    if pending:
        concerns.append("A backlog of unapproved evaluations may delay a complete view of workplace performance.")
        recommendations.append("Pending evaluations should be processed within the configured review period.")

    if avg_attendance is not None and avg_attendance < 80:
        concerns.append("Average attendance is below a typical workplace expectation.")
        recommendations.append("Attendance recording should be verified and follow-up action taken where rates are low.")
    elif avg_attendance is not None and avg_attendance >= 90:
        strengths.append("Programme attendance is at a sound workplace standard.")

    if not strengths:
        strengths.append("The programme register is operational and supports ongoing monitoring.")
    if not concerns:
        concerns.append("No material programme-level concerns are indicated by the available aggregates.")
    if not recommendations:
        recommendations.append("Continue scheduled evaluations, attendance capture, and AI risk reviews.")

    summary = (
        f"This programme summary covers {total} apprentice(s) at {ORG_NAME}. "
        f"{active} are active, average module completion is {_pct(avg_completion)}, "
        f"and {at_risk} are flagged above the dropout-risk threshold. "
        "AI figures are estimates and must be interpreted by authorised staff."
    )
    overall = (
        "This document is issued for internal management use. It consolidates register, training, "
        "attendance, evaluation and AI-risk information held on the DentAcademy portal. "
        "It does not replace workplace assessment or a formal disciplinary process."
    )
    return {
        "executive_summary": summary,
        "observations": observations,
        "strengths": strengths,
        "areas_of_concern": concerns,
        "recommendations": recommendations,
        "overall_comment": overall,
        "source": "system",
    }


def _call_model(system_prompt: str, metrics: Dict[str, Any], fallback: Dict[str, Any]) -> Dict[str, Any]:
    cfg = get_openrouter_config()
    if not cfg.get("api_key"):
        return fallback

    import json

    try:
        raw = chat_completion(
            [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        "Prepare formal report commentary from these metrics JSON:\n"
                        + json.dumps(metrics, default=str)
                    ),
                },
            ],
            temperature=0.2,
            max_tokens=900,
            response_format={"type": "json_object"},
        )
        payload = extract_json_object(raw)
        cleaned = _clean_commentary(payload, fallback)
        cleaned["source"] = "ai"
        return cleaned
    except (OpenRouterError, ValueError, TypeError) as exc:
        logger.warning("Report commentary fell back to system narrative: %s", type(exc).__name__)
        return fallback


def generate_apprentice_commentary(metrics: Dict[str, Any]) -> Dict[str, Any]:
    fallback = fallback_apprentice_commentary(metrics)
    return _call_model(APPRENTICE_SYSTEM_PROMPT, metrics, fallback)


def generate_programme_commentary(metrics: Dict[str, Any]) -> Dict[str, Any]:
    fallback = fallback_programme_commentary(metrics)
    return _call_model(PROGRAMME_SYSTEM_PROMPT, metrics, fallback)
