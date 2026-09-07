"""Shared feature contract and domain scoring for dropout/completion predictions.

The Random Forest is trained to approximate `expert_completion_score`.
When real completed/dropped-out labels exist, keep FEATURE_NAMES and retrain.
"""

from typing import Any, Dict, List, Optional

MODEL_VERSION = "rf-completion-v2"
FALLBACK_VERSION = "expert-heuristic-v2"

FEATURE_NAMES = [
    "academic_avg_mark",
    "module_completion_pct",
    "avg_assessment_score",
    "attendance_rate",
    "avg_discipline",
    "avg_commitment",
    "avg_willingness",
    "avg_teamwork",
    "avg_time_management",
    "avg_professional_conduct",
    "eval_count",
    "eval_trend",
]

RATING_KEYS = [
    "avg_discipline",
    "avg_commitment",
    "avg_willingness",
    "avg_teamwork",
    "avg_time_management",
    "avg_professional_conduct",
]

RATING_MIN, RATING_MAX = 1.0, 5.0


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def as_pct(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        return clamp(float(value))
    except (TypeError, ValueError):
        return default


def feature_dict_to_vector(feature_dict: Dict[str, Any]) -> List[float]:
    """Ordered vector matching FEATURE_NAMES / the pickled estimator."""
    return [float(feature_dict.get(name) or 0.0) for name in FEATURE_NAMES]


def _rating_pct(features: Dict[str, Any]) -> float:
    """Mean mentor rating on a 0-100 scale. Missing/zero ratings are skipped."""
    scores = []
    for key in RATING_KEYS:
        raw = features.get(key)
        if raw is None:
            continue
        try:
            value = float(raw)
        except (TypeError, ValueError):
            continue
        if value <= 0:
            continue
        scores.append(clamp(value, RATING_MIN, RATING_MAX) / RATING_MAX * 100.0)
    if not scores:
        return 50.0
    return sum(scores) / len(scores)


def _trend_pct(features: Dict[str, Any]) -> float:
    """Map overall-score slope to 0-100 (0.5 ≈ flat, >0.5 improving)."""
    try:
        trend = float(features.get("eval_trend") or 0.0)
    except (TypeError, ValueError):
        trend = 0.0
    return clamp(trend, -1.0, 1.0) * 50.0 + 50.0


def expert_completion_score(features: Dict[str, Any]) -> float:
    """Domain heuristic completion likelihood (0-100).

    Attendance and module completion carry the most weight; mentor ratings
    and academics follow. Used to label synthetic training data and as the
    fallback when the pickled model cannot run.
    """
    attendance = as_pct(features.get("attendance_rate"))
    completion = as_pct(features.get("module_completion_pct"))
    academic = as_pct(features.get("academic_avg_mark"))
    assessment = as_pct(features.get("avg_assessment_score"))
    ratings = _rating_pct(features)
    trend = _trend_pct(features)

    score = (
        0.22 * attendance
        + 0.20 * completion
        + 0.14 * academic
        + 0.12 * assessment
        + 0.24 * ratings
        + 0.08 * trend
    )
    return round(clamp(score), 2)


def employment_readiness_score(
    completion: float, features: Dict[str, Any]
) -> float:
    """Employment readiness on the same 0-100 scale as completion."""
    module_pct = as_pct(features.get("module_completion_pct"))
    attendance = as_pct(features.get("attendance_rate"))
    return round(
        clamp(0.55 * completion + 0.25 * module_pct + 0.20 * attendance),
        2,
    )


def confidence_score(
    completion: float,
    features: Dict[str, Any],
    tree_std: Optional[float] = None,
) -> float:
    """Higher when trees agree, scores are decisive, and more evaluations exist."""
    try:
        eval_count = float(features.get("eval_count") or 0.0)
    except (TypeError, ValueError):
        eval_count = 0.0
    data_factor = min(1.0, 0.50 + 0.10 * eval_count)
    extremity = abs(completion - 50.0) / 50.0

    if tree_std is not None:
        agreement = max(0.0, 1.0 - (tree_std / 12.0))
        raw = 58.0 + 22.0 * agreement + 10.0 * extremity + 8.0 * data_factor
    else:
        raw = 62.0 + 20.0 * extremity + 12.0 * data_factor
    return round(clamp(raw, 55.0, 96.0), 2)
