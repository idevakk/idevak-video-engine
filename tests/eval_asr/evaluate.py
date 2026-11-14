"""ASR Evaluation and Benchmarking Suite for @iDevak domain vocabulary.

Computes:
- Word Error Rate (WER) via dynamic programming Levenshtein alignment
- Character Error Rate (CER)
- Technical Entity Recall (TER) specifically scoring target technical edge cases
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent.parent
DATASET_PATH = Path(__file__).resolve().parent / "dataset.json"


def normalize_text_for_wer(text: str) -> list[str]:
    """Standard ASR normalization for fair WER scoring."""
    t = text.lower()
    # Normalize common symbols to words for phonetic consistency if needed
    t = t.replace("’", "'").replace("—", " ").replace("–", " ")
    # Keep alphanumeric tokens
    words = re.findall(r"[a-z0-9_#$->]+", t)
    return words


def levenshtein_distance(ref: list[Any], hyp: list[Any]) -> tuple[int, int, int, int]:
    """Dynamic programming Levenshtein distance.
    Returns (distance, substitutions, deletions, insertions).
    """
    n, m = len(ref), len(hyp)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    ops = [[(0, 0, 0)] * (m + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        dp[i][0] = i
        ops[i][0] = (0, i, 0)  # i deletions
    for j in range(1, m + 1):
        dp[0][j] = j
        ops[0][j] = (0, 0, j)  # j insertions

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if ref[i - 1] == hyp[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
                ops[i][j] = ops[i - 1][j - 1]
            else:
                sub = dp[i - 1][j - 1] + 1
                delete = dp[i - 1][j] + 1
                insert = dp[i][j - 1] + 1

                min_val = min(sub, delete, insert)
                dp[i][j] = min_val
                if min_val == sub:
                    s, d, ins = ops[i - 1][j - 1]
                    ops[i][j] = (s + 1, d, ins)
                elif min_val == delete:
                    s, d, ins = ops[i - 1][j]
                    ops[i][j] = (s, d + 1, ins)
                else:
                    s, d, ins = ops[i][j - 1]
                    ops[i][j] = (s, d, ins + 1)

    s, d, ins = ops[n][m]
    return dp[n][m], s, d, ins


def compute_wer(reference: str, hypothesis: str) -> dict[str, Any]:
    ref_words = normalize_text_for_wer(reference)
    hyp_words = normalize_text_for_wer(hypothesis)
    if not ref_words:
        return {"wer": 0.0 if not hyp_words else 1.0, "s": 0, "d": 0, "i": len(hyp_words), "ref_len": 0}

    dist, s, d, ins = levenshtein_distance(ref_words, hyp_words)
    wer = dist / len(ref_words)
    return {
        "wer": round(wer, 4),
        "distance": dist,
        "substitutions": s,
        "deletions": d,
        "insertions": ins,
        "ref_word_count": len(ref_words),
        "hyp_word_count": len(hyp_words),
    }


def compute_cer(reference: str, hypothesis: str) -> float:
    ref_chars = list(re.sub(r"\s+", " ", reference.strip().lower()))
    hyp_chars = list(re.sub(r"\s+", " ", hypothesis.strip().lower()))
    if not ref_chars:
        return 0.0 if not hyp_chars else 1.0
    dist, _, _, _ = levenshtein_distance(ref_chars, hyp_chars)
    return round(dist / len(ref_chars), 4)


def compute_entity_recall(target_entities: list[str], hypothesis: str) -> dict[str, Any]:
    hyp_lower = hypothesis.lower()
    hyp_clean = re.sub(r"[^a-z0-9]", "", hyp_lower)

    found = []
    missing = []

    for entity in target_entities:
        ent_lower = entity.lower()
        ent_clean = re.sub(r"[^a-z0-9]", "", ent_lower)

        # Check exact string match
        if entity in hypothesis:
            found.append({"entity": entity, "match_type": "exact"})
        # Case-insensitive match
        elif ent_lower in hyp_lower:
            found.append({"entity": entity, "match_type": "case_insensitive"})
        # Normalized alphanumeric match
        elif ent_clean and ent_clean in hyp_clean:
            found.append({"entity": entity, "match_type": "phonetic_normalized"})
        else:
            missing.append(entity)

    total = len(target_entities)
    recall_exact = len([f for f in found if f["match_type"] == "exact"]) / total if total > 0 else 1.0
    recall_any = len(found) / total if total > 0 else 1.0

    return {
        "total": total,
        "found_count": len(found),
        "missing_count": len(missing),
        "exact_recall": round(recall_exact, 4),
        "fuzzy_recall": round(recall_any, 4),
        "found": found,
        "missing": missing,
    }


def evaluate_sample(sample: dict[str, Any], hypothesis: str) -> dict[str, Any]:
    gt = sample["ground_truth"]
    targets = sample.get("target_edge_cases", [])
    wer_stats = compute_wer(gt, hypothesis)
    cer = compute_cer(gt, hypothesis)
    ent_stats = compute_entity_recall(targets, hypothesis)

    return {
        "id": sample["id"],
        "title": sample["title"],
        "ground_truth": gt,
        "hypothesis": hypothesis,
        "wer": wer_stats["wer"],
        "cer": cer,
        "wer_details": wer_stats,
        "entity_recall": ent_stats,
    }


def print_evaluation_summary(results: list[dict[str, Any]], title: str = "ASR Evaluation Results") -> None:
    print(f"\n{'=' * 80}")
    print(f" {title.upper()} ")
    print(f"{'=' * 80}")
    print(f"{'ID':<4} | {'Title':<35} | {'WER':<8} | {'CER':<8} | {'Exact TER':<10} | {'Fuzzy TER':<10}")
    print(f"{'-' * 4} | {'-' * 35} | {'-' * 8} | {'-' * 8} | {'-' * 10} | {'-' * 10}")

    avg_wer = sum(r["wer"] for r in results) / len(results) if results else 0
    avg_cer = sum(r["cer"] for r in results) / len(results) if results else 0
    avg_exact_ter = sum(r["entity_recall"]["exact_recall"] for r in results) / len(results) if results else 0
    avg_fuzzy_ter = sum(r["entity_recall"]["fuzzy_recall"] for r in results) / len(results) if results else 0

    for r in results:
        tit = r["title"][:33] + ".." if len(r["title"]) > 35 else r["title"]
        print(
            f"{r['id']:<4} | {tit:<35} | {r['wer'] * 100:>6.1f}% | {r['cer'] * 100:>6.1f}% | "
            f"{r['entity_recall']['exact_recall'] * 100:>8.1f}% | {r['entity_recall']['fuzzy_recall'] * 100:>8.1f}%"
        )

    print(f"{'-' * 80}")
    print(
        f"{'AVG':<4} | {'OVERALL MEAN':<35} | {avg_wer * 100:>6.1f}% | {avg_cer * 100:>6.1f}% | "
        f"{avg_exact_ter * 100:>8.1f}% | {avg_fuzzy_ter * 100:>8.1f}%"
    )
    print(f"{'=' * 80}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate ASR predictions against dataset.json")
    parser.add_argument("--predictions", type=str, help="JSON file with {id: hypothesis_text}")
    args = parser.parse_args()

    if not args.predictions:
        print("Usage: python evaluate.py --predictions <preds.json>")
        sys.exit(1)

    preds = json.loads(Path(args.predictions).read_text(encoding="utf-8"))
    dataset = json.loads(DATASET_PATH.read_text(encoding="utf-8"))

    results = []
    for item in dataset:
        sid = str(item["id"])
        if sid in preds or item["id"] in preds:
            hyp = preds.get(sid) or preds.get(item["id"])
            results.append(evaluate_sample(item, hyp))

    print_evaluation_summary(results, f"Results for {Path(args.predictions).stem}")
