"""Clean the Open University Learning Analytics dataset into a training table.

Source: OULAD (Kuzilek, Hlosta, Zdrahal), CC BY 4.0, via the UCI mirror.
Raw files stay in ai/data/raw/ (not committed). This script writes the
cleaned table the trainer actually fits:

    ai/data/oulad_training.csv
    ai/data/cleaning_report.json

One row is one student on one module presentation. The label is a real
outcome, not the expert formula: 100 if final_result is Pass or
Distinction, otherwise 0 (Fail or Withdrawn).

Only features the live portal can still compute are kept. Demographics
are dropped on purpose.
"""

import csv
import json
import os
import zipfile
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(HERE, "data", "raw", "extracted")
ZIP_PATH = os.path.join(HERE, "data", "raw", "oulad.zip")
OUT_CSV = os.path.join(HERE, "data", "oulad_training.csv")
OUT_REPORT = os.path.join(HERE, "data", "cleaning_report.json")

COMPLETED = {"Pass", "Distinction"}
KNOWN_RESULTS = COMPLETED | {"Fail", "Withdrawn"}
FEATURE_COLUMNS = [
    "academic_avg_mark",
    "module_completion_pct",
    "avg_assessment_score",
    "attendance_rate",
]


def _open_csv(name):
    path = os.path.join(RAW_DIR, name)
    if os.path.exists(path):
        return open(path, newline="")
    if not os.path.exists(ZIP_PATH):
        raise FileNotFoundError(
            f"Missing {path}. Download the UCI OULAD zip to {ZIP_PATH} and unzip it."
        )
    zf = zipfile.ZipFile(ZIP_PATH)
    return zf.open(name)


def _as_float(value):
    if value is None:
        return None
    text = str(value).strip()
    if text == "" or text == "?":
        return None
    try:
        return float(text)
    except ValueError:
        return None


def prepare(raw_dir: str = None, out_csv: str = None, out_report: str = None):
    global RAW_DIR
    if raw_dir:
        RAW_DIR = raw_dir
    out_csv = out_csv or OUT_CSV
    out_report = out_report or OUT_REPORT

    report = {
        "source": "Open University Learning Analytics Dataset (OULAD)",
        "licence": "CC BY 4.0",
        "grain": "one row per student-module-presentation",
        "label": "100 if final_result in {Pass, Distinction}, else 0",
        "features": FEATURE_COLUMNS,
        "dropped": {},
    }

    assessments = defaultdict(list)
    assessment_key = {}
    with _open_csv("assessments.csv") as handle:
        for row in csv.DictReader(handle):
            weight = _as_float(row["weight"]) or 0.0
            item = {
                "id": row["id_assessment"],
                "weight": weight,
                "type": row["assessment_type"],
            }
            key = (row["code_module"], row["code_presentation"])
            assessments[key].append(item)
            assessment_key[row["id_assessment"]] = key

    scores = {}
    blank_scores = 0
    with _open_csv("studentAssessment.csv") as handle:
        for row in csv.DictReader(handle):
            score = _as_float(row["score"])
            if score is None:
                blank_scores += 1
                continue
            scores[(row["id_assessment"], row["id_student"])] = score
    report["blank_assessment_scores_ignored"] = blank_scores

    clicks = defaultdict(float)
    with _open_csv("studentVle.csv") as handle:
        for row in csv.DictReader(handle):
            click = _as_float(row["sum_click"]) or 0.0
            key = (row["code_module"], row["code_presentation"], row["id_student"])
            clicks[key] += click

    kept = []
    seen = set()
    dropped = defaultdict(int)
    with _open_csv("studentInfo.csv") as handle:
        for row in csv.DictReader(handle):
            result = (row.get("final_result") or "").strip()
            if result not in KNOWN_RESULTS:
                dropped["unknown_final_result"] += 1
                continue
            module_key = (row["code_module"], row["code_presentation"])
            bank = assessments.get(module_key) or []
            if not bank:
                dropped["module_presentation_without_assessments"] += 1
                continue
            identity = (row["code_module"], row["code_presentation"], row["id_student"])
            if identity in seen:
                dropped["duplicate_registration"] += 1
                continue
            seen.add(identity)

            submitted_scores = []
            submitted_weights = []
            for item in bank:
                score = scores.get((item["id"], row["id_student"]))
                if score is None:
                    continue
                submitted_scores.append(score)
                submitted_weights.append(item["weight"])

            if submitted_scores:
                academic = sum(submitted_scores) / len(submitted_scores)
                weight_total = sum(submitted_weights)
                if weight_total > 0:
                    assessment = sum(
                        score * weight
                        for score, weight in zip(submitted_scores, submitted_weights)
                    ) / weight_total
                else:
                    assessment = academic
            else:
                academic = 0.0
                assessment = 0.0

            kept.append(
                {
                    "code_module": row["code_module"],
                    "code_presentation": row["code_presentation"],
                    "id_student": row["id_student"],
                    "final_result": result,
                    "academic_avg_mark": academic,
                    "module_completion_pct": 100.0 * len(submitted_scores) / len(bank),
                    "avg_assessment_score": assessment,
                    "clicks": clicks.get(identity, 0.0),
                    "completion_likelihood": 100.0 if result in COMPLETED else 0.0,
                }
            )

    by_cohort = defaultdict(list)
    for row in kept:
        by_cohort[(row["code_module"], row["code_presentation"])].append(row)

    for cohort_rows in by_cohort.values():
        ordered = sorted(cohort_rows, key=lambda item: (item["clicks"], item["id_student"]))
        n = len(ordered)
        index = 0
        while index < n:
            end = index
            while end + 1 < n and ordered[end + 1]["clicks"] == ordered[index]["clicks"]:
                end += 1
            if n == 1:
                rank_pct = 0.0 if ordered[index]["clicks"] <= 0 else 100.0
            else:
                avg_rank = (index + end) / 2.0
                rank_pct = 100.0 * avg_rank / (n - 1)
            for item in ordered[index : end + 1]:
                item["attendance_rate"] = rank_pct
            index = end + 1

    os.makedirs(os.path.dirname(out_csv), exist_ok=True)
    fieldnames = [
        "code_module",
        "code_presentation",
        "id_student",
        "final_result",
        *FEATURE_COLUMNS,
        "completion_likelihood",
    ]
    with open(out_csv, "w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in kept:
            writer.writerow(
                {
                    "code_module": row["code_module"],
                    "code_presentation": row["code_presentation"],
                    "id_student": row["id_student"],
                    "final_result": row["final_result"],
                    "academic_avg_mark": round(row["academic_avg_mark"], 4),
                    "module_completion_pct": round(row["module_completion_pct"], 4),
                    "avg_assessment_score": round(row["avg_assessment_score"], 4),
                    "attendance_rate": round(row["attendance_rate"], 4),
                    "completion_likelihood": row["completion_likelihood"],
                }
            )

    labels = [row["completion_likelihood"] for row in kept]
    results = defaultdict(int)
    for row in kept:
        results[row["final_result"]] += 1
    report["rows_in"] = dropped_total_hint(dropped, len(kept))
    report["rows_kept"] = len(kept)
    report["dropped"] = dict(dropped)
    report["final_result_counts"] = dict(results)
    report["positive_rate"] = round(sum(1 for value in labels if value == 100.0) / len(labels), 4) if labels else 0
    report["cleaning_steps"] = [
        "Read assessments.csv and attach each assessment to its module presentation.",
        "Ignore studentAssessment rows whose score is blank; a missing row means the assessment was not submitted.",
        "Sum studentVle sum_click per student-module-presentation. No click rows means 0 clicks.",
        "Drop registrations whose final_result is not Pass, Distinction, Fail, or Withdrawn.",
        "Drop module presentations that have no assessments, because completion cannot be defined.",
        "Drop duplicate registrations for the same student, module, and presentation.",
        "academic_avg_mark is the unweighted mean of submitted scores, or 0 when nothing was submitted.",
        "avg_assessment_score is the weight-weighted mean of submitted scores. If every submitted weight is 0, it falls back to the unweighted mean.",
        "module_completion_pct is 100 * submitted assessments / assessments in that presentation.",
        "attendance_rate is the percentile of total clicks inside the same module presentation, from 0 to 100. Ties share the average rank.",
        "Label is 100 for Pass and Distinction, and 0 for Fail and Withdrawn.",
        "Gender, region, IMD band, age, disability, education, and credits are not used.",
    ]

    with open(out_report, "w") as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")
    print(json.dumps({k: report[k] for k in ("rows_kept", "dropped", "final_result_counts", "positive_rate")}, indent=2))
    print(f"Wrote {out_csv}")
    return out_csv


def dropped_total_hint(dropped, kept_count):
    return kept_count + sum(dropped.values())


if __name__ == "__main__":
    prepare()
