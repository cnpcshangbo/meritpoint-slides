#!/usr/bin/env python3
"""Reproduce the open-data segment of the 20 August Agent Arcade workshop.

The script downloads the CC BY 4.0 SkillCraft1 dataset from UCI, defines a
high-skill classification task, and compares a deliberately small four-sensor
model with a 15-sensor model under the same cross-validation folds.

Only aggregate results and a chart are written to the public workshop folder;
the raw player-level table is kept in a temporary directory and discarded.
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import tempfile
import urllib.request
import zipfile
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "ai-toolbox" / "workshop-2026-08-20" / "open-data"
URL = "https://archive.ics.uci.edu/static/public/272/skillcraft1+master+table+dataset.zip"
DOI = "https://doi.org/10.24432/C5161N"

FOUR_SENSORS = ["APM", "SelectByHotkeys", "ActionLatency", "NumberOfPACs"]
ALL_SENSORS = [
    "APM",
    "SelectByHotkeys",
    "AssignToHotkeys",
    "UniqueHotkeys",
    "MinimapAttacks",
    "MinimapRightClicks",
    "NumberOfPACs",
    "GapBetweenPACs",
    "ActionLatency",
    "ActionsInPAC",
    "TotalMapExplored",
    "WorkersMade",
    "UniqueUnitsMade",
    "ComplexUnitsMade",
    "ComplexAbilitiesUsed",
]


def download() -> tuple[pd.DataFrame, str]:
    request = urllib.request.Request(URL, headers={"User-Agent": "MeritPoint-workshop/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = response.read()
    sha256 = hashlib.sha256(payload).hexdigest()
    with tempfile.TemporaryDirectory() as tmp:
        archive = Path(tmp) / "skillcraft.zip"
        archive.write_bytes(payload)
        with zipfile.ZipFile(archive) as bundle:
            csv_bytes = bundle.read("SkillCraft1_Dataset.csv")
    return pd.read_csv(io.BytesIO(csv_bytes), na_values="?"), sha256


def evaluate(df: pd.DataFrame, features: list[str], cv: StratifiedKFold) -> dict:
    # LeagueIndex 5–8 corresponds to Diamond, Master, GrandMaster, or Professional.
    y = (df["LeagueIndex"] >= 5).astype(int)
    model = Pipeline(
        [
            ("scale", StandardScaler()),
            (
                "model",
                LogisticRegression(
                    max_iter=2000,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    )
    scored = cross_validate(
        model,
        df[features],
        y,
        cv=cv,
        scoring=["accuracy", "balanced_accuracy", "roc_auc"],
    )
    folds = []
    for i in range(cv.n_splits):
        folds.append(
            {
                "fold": i + 1,
                "accuracy": round(float(scored["test_accuracy"][i]), 6),
                "balanced_accuracy": round(float(scored["test_balanced_accuracy"][i]), 6),
                "roc_auc": round(float(scored["test_roc_auc"][i]), 6),
            }
        )
    summary = {}
    for metric in ("accuracy", "balanced_accuracy", "roc_auc"):
        values = np.asarray(scored[f"test_{metric}"])
        summary[metric] = {
            "mean": round(float(values.mean()), 6),
            "sd": round(float(values.std(ddof=1)), 6),
        }
    return {"features": features, "folds": folds, "summary": summary}


def chart(results: dict) -> None:
    labels = ["4-sensor\nbaseline", "15-sensor\nextension"]
    keys = ["four_sensor", "fifteen_sensor"]
    means = [results["models"][key]["summary"]["roc_auc"]["mean"] for key in keys]
    errors = [results["models"][key]["summary"]["roc_auc"]["sd"] for key in keys]

    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 16})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=150)
    fig.patch.set_facecolor("#071426")
    ax.set_facecolor("#0c2640")
    bars = ax.bar(labels, means, yerr=errors, capsize=8, width=0.54,
                  color=["#53edf4", "#ffc857"], edgecolor="#effbff", linewidth=1.5)
    ax.set_ylim(0.78, 0.92)
    ax.set_ylabel("5-fold ROC AUC (mean ± SD)", color="#d9e9f5")
    ax.set_title("More telemetry helped modestly — under the same five folds",
                 color="#f5fbff", fontsize=22, weight="bold", pad=20)
    ax.grid(axis="y", color="#33536c", alpha=0.65, linewidth=1)
    ax.tick_params(colors="#d9e9f5")
    for spine in ax.spines.values():
        spine.set_color("#33536c")
    for bar, value, error in zip(bars, means, errors):
        ax.text(bar.get_x() + bar.get_width() / 2, value + error + 0.006,
                f"{value:.3f} ± {error:.3f}", ha="center", va="bottom",
                color="#f5fbff", weight="bold", fontsize=17)
    ax.text(0.5, 0.02,
            "n = 3,395 players · target: LeagueIndex ≥ 5 · logistic regression · random_state = 42",
            transform=ax.transAxes, ha="center", va="bottom", color="#9cb7ca", fontsize=12)
    fig.tight_layout()
    fig.savefig(OUT / "sensor-budget.png", bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    df, sha256 = download()
    if len(df) != 3395:
        raise RuntimeError(f"Expected 3,395 SkillCraft rows; received {len(df):,}")
    if df[ALL_SENSORS].isna().any().any():
        raise RuntimeError("Selected telemetry features unexpectedly contain missing values")

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    models = {
        "four_sensor": evaluate(df, FOUR_SENSORS, cv),
        "fifteen_sensor": evaluate(df, ALL_SENSORS, cv),
    }
    target = (df["LeagueIndex"] >= 5).astype(int)
    results = {
        "source": {
            "name": "SkillCraft1 Master Table Dataset",
            "creators": "Blair, Thompson, Henrey, and Chen (2013)",
            "url": URL,
            "doi": DOI,
            "license": "CC BY 4.0",
            "download_sha256": sha256,
        },
        "research_question": (
            "How much predictive performance is lost when a high-skill player classifier "
            "uses four interpretable telemetry sensors instead of all 15 available sensors?"
        ),
        "target": "LeagueIndex >= 5 (Diamond through Professional)",
        "n_rows": int(len(df)),
        "class_counts": {
            "lower_skill_1_to_4": int((target == 0).sum()),
            "high_skill_5_to_8": int((target == 1).sum()),
        },
        "method": (
            "Class-balanced logistic regression with z-scored features; five-fold stratified "
            "cross-validation with shuffle=True and random_state=42."
        ),
        "models": models,
    }
    four_auc = models["four_sensor"]["summary"]["roc_auc"]["mean"]
    full_auc = models["fifteen_sensor"]["summary"]["roc_auc"]["mean"]
    results["observed_delta_roc_auc"] = round(full_auc - four_auc, 6)

    (OUT / "results.json").write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    with (OUT / "fold-results.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["model", "fold", "accuracy", "balanced_accuracy", "roc_auc"])
        writer.writeheader()
        for model_name, model_result in models.items():
            for fold in model_result["folds"]:
                writer.writerow({"model": model_name, **fold})
    chart(results)
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
