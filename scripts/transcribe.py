"""Local word-level transcription for voiceover.wav (faster-whisper, offline)."""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path


def pick_model(name: str, device: str = "auto"):
    from faster_whisper import WhisperModel

    combos = [("cuda", "float16"), ("cpu", "int8")]
    if device == "cpu":
        combos = [("cpu", "int8")]
    for dev, compute in combos:
        try:
            model = WhisperModel(name, device=dev, compute_type=compute)
            print(f"[model] {name} on {dev}/{compute}", file=sys.stderr, flush=True)
            return model
        except Exception as exc:  # pragma: no cover - hardware dependent
            print(f"[model] {dev}/{compute} unavailable: {exc}", file=sys.stderr, flush=True)
    raise SystemExit("no usable device")


def load_audio(path: str, start: float | None = None, end: float | None = None):
    """Decode to 16 kHz mono float32 via ffmpeg (bypasses the broken PyAV path)."""
    import subprocess

    import numpy as np

    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error"]
    if start is not None:
        cmd += ["-ss", str(start)]
    if end is not None:
        cmd += ["-to", str(end)]
    cmd += ["-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("out")
    ap.add_argument("--model", default="small.en")
    ap.add_argument("--start", type=float, default=None)
    ap.add_argument("--end", type=float, default=None)
    ap.add_argument("--beam", type=int, default=5)
    ap.add_argument("--device", default="auto")
    args = ap.parse_args()

    model = pick_model(args.model, args.device)
    audio = load_audio(args.audio, args.start, args.end)
    print(f"[audio] {len(audio) / 16000:.2f}s decoded", file=sys.stderr, flush=True)
    t0 = time.time()
    segments, info = model.transcribe(
        audio,
        language="en",
        beam_size=args.beam,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 350, "speech_pad_ms": 80},
        condition_on_previous_text=False,
    )

    out_segments = []
    for seg in segments:
        words = [
            {"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)}
            for w in (seg.words or [])
            if w.word.strip()
        ]
        out_segments.append(
            {
                "id": seg.id,
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": seg.text.strip(),
                "words": words,
            }
        )
        print(f"[{seg.start:8.2f} -> {seg.end:8.2f}] {seg.text.strip()[:100]}", file=sys.stderr, flush=True)

    payload = {
        "audio": str(Path(args.audio).name),
        "model": args.model,
        "language": info.language,
        "duration": info.duration,
        "elapsed": round(time.time() - t0, 1),
        "segments": out_segments,
    }
    Path(args.out).write_text(json.dumps(payload, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"[done] {len(out_segments)} segments in {payload['elapsed']}s -> {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
