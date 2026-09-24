# Completion model training (OULAD)

The file `ai/model.pkl` is a random forest trained on the cleaned Open University Learning Analytics Dataset, not on the old synthetic expert-formula labels.

It is not deployed by this change. Load it locally and run the prediction tests before pointing a host at it.

## Source

| Item | Value |
|---|---|
| Dataset | Open University Learning Analytics Dataset (OULAD) |
| Authors | Kuzilek, Hlosta, Zdrahal |
| Licence | CC BY 4.0 |
| Mirror used | UCI Machine Learning Repository, dataset 349 |
| Raw zip | `ai/data/raw/oulad.zip` (not committed; about 45 MB compressed, 454 MB of `studentVle.csv`) |
| Cleaned table | `ai/data/oulad_training.csv` (committed) |
| Cleaning report | `ai/data/cleaning_report.json` (committed) |

OULAD is anonymised UK distance-learning data from 2013–2014. It is not DentAcademy workshop data. Mentor ratings do not exist in it, so the forest does not use them. The portal still records those ratings; they affect the expert fallback only.

## What was kept

One row is one student on one module presentation (`studentInfo.csv`).

Label `completion_likelihood`:

- `100` when `final_result` is `Pass` or `Distinction`
- `0` when `final_result` is `Fail` or `Withdrawn`

Features, chosen because the live portal can still compute the same four names:

| Column | How it was built |
|---|---|
| `academic_avg_mark` | Unweighted mean of submitted assessment scores. `0` if the student submitted nothing. |
| `avg_assessment_score` | Mean of submitted scores weighted by `assessments.weight`. If every submitted weight is `0`, the unweighted mean is used. |
| `module_completion_pct` | `100 * submitted assessments / assessments in that module presentation`. |
| `attendance_rate` | Percentile of total VLE clicks inside the same module presentation, `0`–`100`. Ties share the average rank. No click rows means `0` clicks. |

Gender, region, IMD band, age, disability, prior education, and credits were not used.

## Cleaning counts

From `ai/data/cleaning_report.json` after `python ai/prepare_oulad.py`:

| Check | Result |
|---|---|
| Registrations read | 32,593 |
| Rows kept | 32,593 |
| Rows dropped | 0 |
| Blank assessment scores ignored | 173 (treated as not submitted) |
| Pass | 12,361 |
| Distinction | 3,024 |
| Fail | 7,052 |
| Withdrawn | 10,156 |
| Positive rate (Pass or Distinction) | 0.472 |

Rules that would drop a row, and did not fire on this extract:

- `final_result` outside Pass, Distinction, Fail, Withdrawn
- module presentation with no assessments
- duplicate student + module + presentation

## Fit

`python -m ai.train` from `dentacademy-backend`, seed 42, 80/20 split.

| Setting | Value |
|---|---|
| Estimator | `RandomForestRegressor` |
| Trees | 200 |
| `max_depth` | 10 |
| `min_samples_leaf` | 6 |
| Train rows | 26,074 |
| Hold-out rows | 6,519 |
| Train MAE | 8.40 points |
| Hold-out MAE | 10.05 points |
| Hold-out R² | 0.788 |
| Hold-out accuracy at 50 | 0.931 |

Feature importances in the saved pickle:

| Feature | Importance |
|---|---|
| `module_completion_pct` | 0.859 |
| `avg_assessment_score` | 0.100 |
| `attendance_rate` | 0.021 |
| `academic_avg_mark` | 0.020 |

Bundle version is `rf-oulad-v1`. `blend_with_expert` is false, so a live score is the forest output on those four features. `output_scale` is `0-100`, so a low score is not mistaken for a 0–1 probability. If the pickle fails to load, the API falls back to `expert-heuristic-v2`.

## Rebuild

```bash
cd dentacademy-backend
# raw zip must already be unzipped under ai/data/raw/extracted/
python ai/prepare_oulad.py
PYTHONPATH=. ./venv/bin/python -m ai.train
PYTHONPATH=. ./venv/bin/pytest tests/test_prediction_model.py -q
```

Do not treat this pickle as a South African apprenticeship outcome model until local Pass / Fail / Withdrawn rows exist to check it against.
