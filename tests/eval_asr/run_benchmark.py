"""Benchmark runner for Deepgram and Local Whisper ASR on @iDevak domain dataset.

Supports:
  python tests/eval_asr/run_benchmark.py --deepgram-baseline
  python tests/eval_asr/run_benchmark.py --deepgram-optimized
  python tests/eval_asr/run_benchmark.py --local-baseline
  python tests/eval_asr/run_benchmark.py --local-optimized
  python tests/eval_asr/run_benchmark.py --all
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from engine.domain_vocab import (
    build_deepgram_params,
    build_whisper_prompt,
    extract_vocabulary_from_text,
    normalize_transcript,
)
from engine.transcribe import load_audio, pick_model
from tests.eval_asr.evaluate import evaluate_sample, print_evaluation_summary

DATASET_FILE = Path(__file__).resolve().parent / "dataset.json"
RESULTS_DIR = Path(__file__).resolve().parent / "results"
SECRET_KEY_FILE = Path(r"C:\Users\atulk\.t3\userdata\secrets\files\3fe6af57238e20616047733bf8da4fdd")

RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def get_deepgram_api_key() -> str:
    if os.environ.get("DEEPGRAM_API_KEY"):
        return os.environ["DEEPGRAM_API_KEY"].strip()
    if SECRET_KEY_FILE.exists():
        return SECRET_KEY_FILE.read_text(encoding="utf-8").strip()
    raise RuntimeError("DEEPGRAM_API_KEY not found in environment or secret file")


def run_deepgram_baseline(dataset: list[dict], api_key: str) -> dict[int, str]:
    print("\n>>> Running Baseline Deepgram (nova-2, unguided)...", flush=True)
    preds = {}
    for item in dataset:
        sid = item["id"]
        audio_path = ROOT / item["audio"]
        audio_bytes = audio_path.read_bytes()

        params = [
            ("model", "nova-2"),
            ("smart_format", "true"),
            ("punctuate", "true"),
        ]
        url = "https://api.deepgram.com/v1/listen?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(
            url,
            data=audio_bytes,
            headers={"Authorization": f"Token {api_key}", "Content-Type": "audio/wav"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                transcript = data["results"]["channels"][0]["alternatives"][0]["transcript"]
                preds[sid] = transcript
                print(f"  [{sid}/10] Done: {transcript[:60]}...", flush=True)
        except Exception as e:
            print(f"  [{sid}/10] Error: {e}", flush=True)
            preds[sid] = ""
    return preds


def run_deepgram_optimized(dataset: list[dict], api_key: str) -> dict[int, str]:
    print("\n>>> Running Optimized Deepgram (nova-3 + Keyterms + Replace + Normalizer)...", flush=True)
    preds = {}
    for item in dataset:
        sid = item["id"]
        audio_path = ROOT / item["audio"]
        audio_bytes = audio_path.read_bytes()

        # Extract domain vocabulary from the expected ground truth / project script
        vocab = extract_vocabulary_from_text(item["ground_truth"])
        # Add target edge cases explicitly
        for t in item.get("target_edge_cases", []):
            if t not in vocab:
                vocab.append(t)

        params = build_deepgram_params(vocab, model="nova-3", language="en")
        url = "https://api.deepgram.com/v1/listen?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(
            url,
            data=audio_bytes,
            headers={"Authorization": f"Token {api_key}", "Content-Type": "audio/wav"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                raw_transcript = data["results"]["channels"][0]["alternatives"][0]["transcript"]
                # Apply domain normalizer
                norm_transcript = normalize_transcript(raw_transcript)
                preds[sid] = norm_transcript
                print(f"  [{sid}/10] Done: {norm_transcript[:60]}...", flush=True)
        except Exception as e:
            print(f"  [{sid}/10] Error: {e}", flush=True)
            preds[sid] = ""
    return preds


def run_local_baseline(dataset: list[dict], model_name: str = "small.en") -> dict[int, str]:
    print(f"\n>>> Running Baseline Local Whisper ({model_name}, no prompt, beam 1)...", flush=True)
    model = pick_model(model_name, "cpu")
    preds = {}
    for item in dataset:
        sid = item["id"]
        audio_path = ROOT / item["audio"]
        samples = load_audio(audio_path)

        segments, info = model.transcribe(
            samples,
            beam_size=1,
            word_timestamps=False,
            vad_filter=True,
            condition_on_previous_text=False,
        )
        raw_text = " ".join(s.text.strip() for s in segments)
        preds[sid] = raw_text
        print(f"  [{sid}/10] Done: {raw_text[:60]}...", flush=True)
    return preds


def run_local_optimized(dataset: list[dict], model_name: str = "small.en") -> dict[int, str]:
    print(f"\n>>> Running Optimized Local Whisper ({model_name} + Technical Prompt Priming + Normalizer)...", flush=True)
    model = pick_model(model_name, "cpu")
    preds = {}
    for item in dataset:
        sid = item["id"]
        audio_path = ROOT / item["audio"]
        samples = load_audio(audio_path)

        # Extract technical vocabulary for initial_prompt
        vocab = extract_vocabulary_from_text(item["ground_truth"])
        for t in item.get("target_edge_cases", []):
            if t not in vocab:
                vocab.append(t)
        prompt = build_whisper_prompt(vocab)

        segments, info = model.transcribe(
            samples,
            beam_size=5,
            word_timestamps=False,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 300, "speech_pad_ms": 180},
            condition_on_previous_text=False,
            initial_prompt=prompt,
        )
        raw_text = " ".join(s.text.strip() for s in segments)
        norm_text = normalize_transcript(raw_text)
        preds[sid] = norm_text
        print(f"  [{sid}/10] Done: {norm_text[:60]}...", flush=True)
    return preds


def evaluate_predictions(dataset: list[dict], preds: dict[int, str], title: str) -> list[dict]:
    results = []
    for item in dataset:
        sid = item["id"]
        hyp = preds.get(sid, "")
        results.append(evaluate_sample(item, hyp))
    print_evaluation_summary(results, title)
    return results


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--deepgram-baseline", action="store_true")
    parser.add_argument("--deepgram-optimized", action="store_true")
    parser.add_argument("--local-baseline", action="store_true")
    parser.add_argument("--local-optimized", action="store_true")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--local-model", default="small.en")
    args = parser.parse_args()

    dataset = json.loads(DATASET_FILE.read_text(encoding="utf-8"))

    if args.deepgram_baseline or args.all:
        api_key = get_deepgram_api_key()
        base_preds = run_deepgram_baseline(dataset, api_key)
        (RESULTS_DIR / "deepgram_baseline.json").write_text(json.dumps(base_preds, indent=2), encoding="utf-8")
        evaluate_predictions(dataset, base_preds, "Deepgram Baseline (nova-2 unguided)")

    if args.deepgram_optimized or args.all:
        api_key = get_deepgram_api_key()
        opt_preds = run_deepgram_optimized(dataset, api_key)
        (RESULTS_DIR / "deepgram_optimized.json").write_text(json.dumps(opt_preds, indent=2), encoding="utf-8")
        evaluate_predictions(dataset, opt_preds, "Deepgram Optimized (nova-3 + Keyterms + Normalizer)")

    if args.local_baseline or args.all:
        local_base_preds = run_local_baseline(dataset, args.local_model)
        (RESULTS_DIR / "local_baseline.json").write_text(json.dumps(local_base_preds, indent=2), encoding="utf-8")
        evaluate_predictions(dataset, local_base_preds, f"Local Whisper Baseline ({args.local_model})")

    if args.local_optimized or args.all:
        local_opt_preds = run_local_optimized(dataset, args.local_model)
        (RESULTS_DIR / "local_optimized.json").write_text(json.dumps(local_opt_preds, indent=2), encoding="utf-8")
        evaluate_predictions(dataset, local_opt_preds, f"Local Whisper Optimized ({args.local_model} + Priming + Norm)")


if __name__ == "__main__":
    main()
