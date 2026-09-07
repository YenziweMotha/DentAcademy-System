"""Unit tests for dropout/completion scoring and the Random Forest wrapper."""

from ai.model import PredictionModel
from ai.scoring import (
    FALLBACK_VERSION,
    FEATURE_NAMES,
    MODEL_VERSION,
    employment_readiness_score,
    expert_completion_score,
    feature_dict_to_vector,
)
from ai.train import train


def _features(**overrides):
    base = {
        "academic_avg_mark": 70,
        "module_completion_pct": 60,
        "avg_assessment_score": 65,
        "attendance_rate": 80,
        "avg_discipline": 3.5,
        "avg_commitment": 3.5,
        "avg_willingness": 3.5,
        "avg_teamwork": 3.5,
        "avg_time_management": 3.5,
        "avg_professional_conduct": 3.5,
        "eval_count": 3,
        "eval_trend": 0.1,
    }
    base.update(overrides)
    return base


def test_feature_vector_order_and_length():
    vector = feature_dict_to_vector(_features())
    assert len(vector) == 12
    assert len(vector) == len(FEATURE_NAMES)
    assert vector[0] == 70
    assert vector[3] == 80


def test_expert_score_is_monotonic_with_attendance():
    low = expert_completion_score(_features(attendance_rate=40))
    high = expert_completion_score(_features(attendance_rate=95))
    assert 0 <= low < high <= 100


def test_missing_ratings_do_not_collapse_to_zero():
    scored = expert_completion_score(
        _features(
            avg_discipline=0,
            avg_commitment=0,
            avg_willingness=0,
            avg_teamwork=0,
            avg_time_management=0,
            avg_professional_conduct=0,
        )
    )
    assert scored > 40


def test_employment_readiness_stays_on_0_100_scale():
    completion = 85.0
    ready = employment_readiness_score(
        completion,
        _features(module_completion_pct=90, attendance_rate=92),
    )
    assert 70 <= ready <= 100


def test_rule_fallback_when_pickle_missing(tmp_path, monkeypatch):
    missing = tmp_path / "does-not-exist.pkl"
    monkeypatch.setenv("MODEL_PATH", str(missing))
    model = PredictionModel(model_path=str(missing))
    result = model.predict(_features())
    assert result["model_version"] == FALLBACK_VERSION
    assert result["dropout_risk"] == round(100 - result["completion_likelihood"], 2)
    assert 0 <= result["employment_readiness"] <= 100


def test_trained_regressor_scores_profiles_sensibly(tmp_path):
    path = tmp_path / "model.pkl"
    train(output_path=str(path), n_samples=1600, n_estimators=80, seed=0)
    model = PredictionModel(model_path=str(path))
    assert model.model is not None
    assert model.version == MODEL_VERSION

    strong = model.predict(
        _features(
            academic_avg_mark=88,
            module_completion_pct=92,
            avg_assessment_score=85,
            attendance_rate=96,
            avg_discipline=4.6,
            avg_commitment=4.6,
            avg_willingness=4.5,
            avg_teamwork=4.5,
            avg_time_management=4.4,
            avg_professional_conduct=4.7,
            eval_count=5,
            eval_trend=0.3,
        )
    )
    weak = model.predict(
        _features(
            academic_avg_mark=38,
            module_completion_pct=12,
            avg_assessment_score=30,
            attendance_rate=42,
            avg_discipline=2.0,
            avg_commitment=2.1,
            avg_willingness=1.9,
            avg_teamwork=2.2,
            avg_time_management=2.0,
            avg_professional_conduct=2.1,
            eval_count=2,
            eval_trend=-0.4,
        )
    )
    average = model.predict(_features())

    assert strong["completion_likelihood"] > average["completion_likelihood"] > weak["completion_likelihood"]
    assert strong["employment_readiness"] >= 70
    assert weak["dropout_risk"] > 50
    assert 25 <= average["dropout_risk"] <= 65
    assert 40 <= average["employment_readiness"] <= 85
    assert strong["model_version"] == MODEL_VERSION
