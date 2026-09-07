import logging
import os
import statistics
from typing import Any, Dict, List, Optional

import joblib

from ai.scoring import (
    FALLBACK_VERSION,
    FEATURE_NAMES,
    MODEL_VERSION,
    clamp,
    confidence_score,
    employment_readiness_score,
    expert_completion_score,
    feature_dict_to_vector,
)

logger = logging.getLogger("dentacademy.ai.prediction")

_HERE = os.path.dirname(os.path.abspath(__file__))
_DEFAULT_MODEL_PATH = os.path.join(_HERE, "model.pkl")

_cached_model = None


def get_prediction_model() -> "PredictionModel":
    global _cached_model
    if _cached_model is None:
        _cached_model = PredictionModel()
    return _cached_model


def reset_prediction_model_cache() -> None:
    global _cached_model
    _cached_model = None


class PredictionModel:
    def __init__(self, model_path: Optional[str] = None):
        explicit_path = model_path is not None
        env_path = model_path or os.getenv("MODEL_PATH") or _DEFAULT_MODEL_PATH
        candidate_paths = (
            [model_path]
            if explicit_path
            else [
                env_path,
                "ai/models/model.pkl",
                "ai/model.pkl",
                os.path.join(_HERE, "models", "model.pkl"),
                _DEFAULT_MODEL_PATH,
            ]
        )

        self.model = None
        self.feature_names: List[str] = list(FEATURE_NAMES)
        self.version = FALLBACK_VERSION
        self.loaded_path = None

        seen = set()
        for path in candidate_paths:
            if not path or path in seen:
                continue
            seen.add(path)
            if not os.path.exists(path):
                continue
            try:
                loaded = joblib.load(path)
            except Exception:
                logger.warning("Could not load prediction model from %s", path, exc_info=True)
                continue

            if isinstance(loaded, dict) and loaded.get("estimator") is not None:
                self.model = loaded["estimator"]
                self.feature_names = list(loaded.get("feature_names") or FEATURE_NAMES)
                self.version = loaded.get("version") or MODEL_VERSION
            elif hasattr(loaded, "predict"):
                self.model = loaded
                n_in = int(getattr(loaded, "n_features_in_", len(FEATURE_NAMES)))
                if n_in == 9:
                    # Pre-v2 classifier omitted attendance, eval_count, eval_trend.
                    self.feature_names = [
                        "academic_avg_mark",
                        "module_completion_pct",
                        "avg_assessment_score",
                        "avg_discipline",
                        "avg_commitment",
                        "avg_willingness",
                        "avg_teamwork",
                        "avg_time_management",
                        "avg_professional_conduct",
                    ]
                else:
                    self.feature_names = list(FEATURE_NAMES[:n_in])
                self.version = "legacy-estimator"
            else:
                continue

            self.loaded_path = path
            logger.info("Loaded prediction model %s from %s", self.version, path)
            break

        if self.model is None:
            logger.warning("No prediction pickle found; using %s", FALLBACK_VERSION)

    def _vector(self, features: dict) -> List[float]:
        full = feature_dict_to_vector(features)
        by_name = dict(zip(FEATURE_NAMES, full))
        return [float(by_name.get(name) or 0.0) for name in self.feature_names]

    def _pack(
        self,
        completion: float,
        features: dict,
        version: str,
        tree_std: Optional[float] = None,
    ) -> Dict[str, Any]:
        completion = round(clamp(completion), 2)
        dropout = round(clamp(100.0 - completion), 2)
        return {
            "completion_likelihood": completion,
            "dropout_risk": dropout,
            "employment_readiness": employment_readiness_score(completion, features),
            "confidence_score": confidence_score(completion, features, tree_std=tree_std),
            "model_version": version,
        }

    def _rule_based_predict(self, features: dict) -> dict:
        completion = expert_completion_score(features)
        return self._pack(completion, features, FALLBACK_VERSION)

    def _tree_std(self, vector: List[float]) -> Optional[float]:
        estimators = getattr(self.model, "estimators_", None)
        if not estimators:
            return None
        preds = [float(est.predict([vector])[0]) for est in estimators]
        if len(preds) < 2:
            return 0.0
        std = statistics.pstdev(preds)
        # Legacy classifiers emit class labels 0/1; scale to the 0-100 score space.
        if max(preds) <= 1.5 and min(preds) >= -0.1:
            std *= 100.0
        return std

    def _completion_from_estimator(self, vector: List[float]) -> float:
        if hasattr(self.model, "predict_proba"):
            proba = self.model.predict_proba([vector])[0]
            classes = list(getattr(self.model, "classes_", [0, 1]))
            if 1 in classes:
                return float(proba[classes.index(1)]) * 100.0
            return float(max(proba)) * 100.0

        raw = float(self.model.predict([vector])[0])
        if raw <= 1.5:
            return raw * 100.0
        return raw

    def predict(self, features: dict) -> dict:
        if not self.model:
            return self._rule_based_predict(features)

        try:
            vector = self._vector(features)
            expected = int(getattr(self.model, "n_features_in_", len(vector)))
            if len(vector) != expected:
                raise ValueError(
                    f"Feature length {len(vector)} does not match model ({expected})"
                )
            completion = self._completion_from_estimator(vector)
            expert = expert_completion_score(features)
            # Blend so extreme profiles are not shrunk all the way to the mean.
            completion = 0.75 * completion + 0.25 * expert
            return self._pack(
                completion,
                features,
                self.version,
                tree_std=self._tree_std(vector),
            )
        except Exception:
            logger.warning(
                "Prediction estimator failed; falling back to %s",
                FALLBACK_VERSION,
                exc_info=True,
            )
            return self._rule_based_predict(features)
