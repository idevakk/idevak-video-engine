"""Word-level transcription for a project voiceover (faster-whisper, offline).

Usage:
    python engine/transcribe.py
    python engine/transcribe.py content/voiceover.wav build/vo.json
    python engine/transcribe.py --model small.en --beam 5

With no positional arguments this reads ``audio`` from ``content/video.json``
and writes ``build/vo.json``. The audio is the timing master for the whole
pipeline, so always transcribe the exact file that will be attached to the
composition.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PROJECT = ROOT / "content/video.json"
DEFAULT_OUT = ROOT / "build/vo.json"


def resolve(path: str | Path) -> Path:
    p = Path(path)
    return p if p.is_absolute() else (ROOT / p)


def project_audio(project_path: Path) -> Path:
    if not project_path.exists():
        raise SystemExit(f"missing project file: {project_path}")
    data = json.loads(project_path.read_text(encoding="utf-8"))
    audio = data.get("audio") or "content/voiceover.wav"
    return resolve(audio)


def pick_model(name: str, device: str = "auto"):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise SystemExit("faster-whisper is not installed. Run: pip install faster-whisper")

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
    raise SystemExit("no usable transcription device")


def load_audio(path: Path, start: float | None = None, end: float | None = None):
    """Decode to 16 kHz mono float32 via ffmpeg (bypasses the broken PyAV path)."""
    import numpy as np

    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg was not found on PATH. Install it and try again.")

    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error"]
    if start is not None:
        cmd += ["-ss", str(start)]
    if end is not None:
        cmd += ["-to", str(end)]
    cmd += ["-i", str(path), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("audio", nargs="?", default=None, help="voiceover file (default: project audio)")
    ap.add_argument("out", nargs="?", default=None, help="output JSON (default: build/vo.json)")
    ap.add_argument("--project", default=str(DEFAULT_PROJECT), help="project JSON used to resolve audio")
    ap.add_argument("--model", default="large-v3-turbo", help="faster-whisper model (default: large-v3-turbo)")
    ap.add_argument("--language", default="en", help="language code, or 'auto' (default: en)")
    ap.add_argument("--start", type=float, default=None, help="optional trim start in seconds")
    ap.add_argument("--end", type=float, default=None, help="optional trim end in seconds")
    ap.add_argument("--beam", type=int, default=1, help="beam size (default: 1)")
    ap.add_argument("--device", default="auto", choices=["auto", "cuda", "cpu"], help="compute device")
    args = ap.parse_args()

    audio = resolve(args.audio) if args.audio else project_audio(resolve(args.project))
    out = resolve(args.out) if args.out else DEFAULT_OUT

    if not audio.exists():
        raise SystemExit(
            f"voiceover not found: {audio}\n"
            "Put the recording at content/voiceover.wav or set 'audio' in content/video.json."
        )

    out.parent.mkdir(parents=True, exist_ok=True)
    model = pick_model(args.model, args.device)
    samples = load_audio(audio, args.start, args.end)
    print(f"[audio] {len(samples) / 16000:.2f}s decoded from {audio}", file=sys.stderr, flush=True)

    t0 = time.time()
    segments, info = model.transcribe(
        samples,
        language=None if args.language == "auto" else args.language,
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

    try:
        audio_label = str(audio.relative_to(ROOT))
    except ValueError:
        audio_label = str(audio)

    payload = {
        "audio": audio_label,
        "model": args.model,
        "language": info.language,
        "duration": info.duration,
        "elapsed": round(time.time() - t0, 1),
        "segments": out_segments,
    }
    out.write_text(json.dumps(payload, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"[done] {len(out_segments)} segments in {payload['elapsed']}s -> {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
