"""
Train the DentAcademy completion model on the cleaned OULAD table.

Production (`ai/model.py`) loads a joblib bundle from MODEL_PATH
(default `ai/model.pkl`). The table is built by `ai/prepare_oulad.py`:

    ai/data/oulad_training.csv

The forest predicts completion likelihood on a 0-100 scale. The label is
the real module result (100 = Pass or Distinction, 0 = Fail or Withdrawn).
Mentor ratings are not in this dataset, so they are not model inputs.
The expert formula remains the fallback when the pickle cannot run.
"""

import csv
import os
from datetime import datetime, timezone

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

from ai.scoring import MODEL_VERSION

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CSV = os.path.join(HERE, "data", "oulad_training.csv")
TRAIN_FEATURES = [
    "academic_avg_mark",
    "module_completion_pct",
    "avg_assessment_score",
    "attendance_rate",
]
TARGET = "completion_likelihood"


def load_training_table(csv_path: str = None, n_samples: int = None, seed: int = 42):
    csv_path = csv_path or DEFAULT_CSV
    if not os.path.exists(csv_path):
        raise FileNotFoundError(
            f"Cleaned training table not found at {csv_path}. "
            "Run: python ai/prepare_oulad.py"
        )

    rows = []
    with open(csv_path, newline="") as handle:
        for row in csv.DictReader(handle):
            rows.append(
                [float(row[name]) for name in TRAIN_FEATURES]
                + [float(row[TARGET])]
            )
    data = np.asarray(rows, dtype=float)
    if n_samples is not None and n_samples < len(data):
        rng = np.random.default_rng(seed)
        picked = rng.choice(len(data), size=n_samples, replace=False)
        data = data[picked]
    return data[:, :-1], data[:, -1]


def train(
    output_path: str = None,
    csv_path: str = None,
    n_samples: int = None,
    n_estimators: int = 200,
    seed: int = 42,
) -> str:
    if output_path is None:
        output_path = os.path.join(HERE, "model.pkl")

    X, y = load_training_table(csv_path=csv_path, n_samples=n_samples, seed=seed)
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

    if int(getattr(estimator, "n_features_in_", 0)) != len(TRAIN_FEATURES):
        raise RuntimeError(
            f"Model expects {estimator.n_features_in_} features; "
            f"training columns are {len(TRAIN_FEATURES)}."
        )

    train_pred = estimator.predict(X_train)
    test_pred = estimator.predict(X_test)
    train_mae = mean_absolute_error(y_train, train_pred)
    test_mae = mean_absolute_error(y_test, test_pred)
    test_r2 = r2_score(y_test, test_pred)
    test_accuracy = float(np.mean((test_pred >= 50) == (y_test >= 50)))

    bundle = {
        "version": MODEL_VERSION,
        "model_type": "RandomForestRegressor",
        "feature_names": list(TRAIN_FEATURES),
        "estimator": estimator,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset": "oulad-cleaned-v1",
        "blend_with_expert": False,
        "output_scale": "0-100",
        "metrics": {
            "n_samples": int(len(y)),
            "train_rows": int(len(y_train)),
            "test_rows": int(len(y_test)),
            "positive_rate": round(float(np.mean(y >= 50)), 4),
            "train_mae": round(float(train_mae), 3),
            "test_mae": round(float(test_mae), 3),
            "test_r2": round(float(test_r2), 3),
            "test_accuracy_at_50": round(test_accuracy, 3),
        },
    }

    directory = os.path.dirname(output_path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    joblib.dump(bundle, output_path)

    print(f"Trained RandomForestRegressor on {len(X_train)} samples "
          f"({len(X_test)} hold-out).")
    print(f"Train MAE: {train_mae:.2f}  Hold-out MAE: {test_mae:.2f}  "
          f"Hold-out R2: {test_r2:.3f}  Hold-out accuracy@50: {test_accuracy:.3f}")
    print("Feature importances:")
    for name, importance in sorted(
        zip(TRAIN_FEATURES, estimator.feature_importances_),
        key=lambda item: -item[1],
    ):
        print(f"  {name:28s} {importance:.4f}")
    print(f"Saved model -> {output_path}")
    return output_path


if __name__ == "__main__":
    train()
