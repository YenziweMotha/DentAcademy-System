"""
Train the DentAcademy dropout/completion prediction model.

Production (`ai/model.py`) loads a joblib bundle from MODEL_PATH
(default `ai/model.pkl`):

    {
        "version": "rf-completion-v2",
        "feature_names": [...],
        "estimator": RandomForestRegressor,  # predicts completion 0-100
    }

There are no historically labelled completed-vs-dropped outcomes yet, so
this script builds a synthetic set whose target is the domain heuristic in
`ai/scoring.py` (attendance + completion + ratings + academics). The forest
smooths that relationship instead of applying a hard pass/fail cutoff.

When real outcomes exist, replace `generate_synthetic_data` with a loader
that labels apprentices by actual completion/dropout; the fit/save step
below stays the same.
"""

import os
from datetime import datetime, timezone

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

from ai.scoring import (
    FEATURE_NAMES,
    MODEL_VERSION,
    RATING_MAX,
    RATING_MIN,
    expert_completion_score,
)

HERE = os.path.dirname(os.path.abspath(__file__))


def generate_synthetic_data(n: int = 4000, seed: int = 42):
    rng = np.random.default_rng(seed)
    n_weak = max(80, n // 8)
    n_main = n - n_weak

    def _block(
        size,
        academic_mean,
        academic_std,
        completion_mean,
        completion_std,
        attendance_mean,
        attendance_std,
        rating_base,
        rating_spread,
    ):
        academic = np.clip(rng.normal(academic_mean, academic_std, size), 20, 100)
        completion = np.clip(rng.normal(completion_mean, completion_std, size), 0, 100)
        assessment = np.clip(academic * 0.55 + rng.normal(22, 16, size), 0, 100)
        attendance = np.clip(
            rng.normal(attendance_mean, attendance_std, size)
            + 0.15 * (completion - 50),
            0,
            100,
        )
        base = np.clip(rating_base + (academic / 100.0) * 1.2, RATING_MIN, RATING_MAX)
        ratings = np.clip(
            rng.normal(base[:, None], rating_spread, (size, 6)), RATING_MIN, RATING_MAX
        )
        rating_mean = ratings.mean(axis=1)
        eval_count = rng.integers(2, 9, size).astype(float)
        eval_trend = np.clip(
            rng.normal((rating_mean - 3.0) * 0.18, 0.22, size), -1.2, 1.2
        )
        return np.column_stack(
            [academic, completion, assessment, attendance, ratings, eval_count, eval_trend]
        )

    X_main = _block(n_main, 72, 14, 62, 24, 82, 10, 2.4, 0.7)
    X_weak = _block(n_weak, 42, 9, 18, 12, 48, 11, 1.6, 0.55)
    X = np.vstack([X_main, X_weak])

    y = np.array(
        [
            expert_completion_score(dict(zip(FEATURE_NAMES, row)))
            for row in X
        ],
        dtype=float,
    )
    y = np.clip(y + rng.normal(0, 3.0, len(y)), 0, 100)
    return X, y


def train(
    output_path: str = None,
    n_samples: int = 4000,
    n_estimators: int = 200,
    seed: int = 42,
) -> str:
    if output_path is None:
        output_path = os.path.join(HERE, "model.pkl")

    X, y = generate_synthetic_data(n=n_samples, seed=seed)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=seed
    )

    estimator = RandomForestRegressor(
        n_estimators=n_estimators,
        max_depth=10,
        min_samples_leaf=6,
        random_state=seed,
        n_jobs=-1,
    )
    estimator.fit(X_train, y_train)

    if int(getattr(estimator, "n_features_in_", 0)) != len(FEATURE_NAMES):
        raise RuntimeError(
            f"Model expects {estimator.n_features_in_} features; "
            f"FEATURE_NAMES has {len(FEATURE_NAMES)}."
        )

    train_mae = mean_absolute_error(y_train, estimator.predict(X_train))
    test_pred = estimator.predict(X_test)
    test_mae = mean_absolute_error(y_test, test_pred)
    test_r2 = r2_score(y_test, test_pred)

    bundle = {
        "version": MODEL_VERSION,
        "model_type": "RandomForestRegressor",
        "feature_names": list(FEATURE_NAMES),
        "estimator": estimator,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "metrics": {
            "n_samples": n_samples,
            "train_mae": round(float(train_mae), 3),
            "test_mae": round(float(test_mae), 3),
            "test_r2": round(float(test_r2), 3),
        },
    }

    directory = os.path.dirname(output_path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    joblib.dump(bundle, output_path)

    print(f"Trained RandomForestRegressor on {len(X_train)} samples "
          f"({len(X_test)} hold-out).")
    print(f"Train MAE: {train_mae:.2f}  Hold-out MAE: {test_mae:.2f}  "
          f"Hold-out R2: {test_r2:.3f}")
    print("Feature importances:")
    for name, importance in sorted(
        zip(FEATURE_NAMES, estimator.feature_importances_),
        key=lambda item: -item[1],
    ):
        print(f"  {name:28s} {importance:.4f}")
    print(f"Saved model -> {output_path}")
    return output_path


if __name__ == "__main__":
    train()
