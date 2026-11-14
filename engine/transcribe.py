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
import os
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from engine.domain_vocab import (
    build_deepgram_params,
    build_whisper_prompt,
    extract_project_vocabulary,
    normalize_transcript,
    normalize_words_array,
)

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PROJECT = ROOT / "content/video.json"
DEFAULT_OUT = ROOT / "build/vo.json"
SECRET_KEY_FILE = Path(r"C:\Users\atulk\.t3\userdata\secrets\files\3fe6af57238e20616047733bf8da4fdd")


def find_deepgram_key() -> str | None:
    if os.environ.get("DEEPGRAM_API_KEY"):
        return os.environ["DEEPGRAM_API_KEY"].strip()
    if SECRET_KEY_FILE.exists():
        try:
            return SECRET_KEY_FILE.read_text(encoding="utf-8").strip()
        except Exception:
            pass
    return None


def resolve(path: str | Path) -> Path:
    p = Path(path)
    return p if p.is_absolute() else (ROOT / p)


def project_audio(project_path: Path) -> Path:
    if not project_path.exists():
        raise SystemExit(f"missing project file: {project_path}")
    data = json.loads(project_path.read_text(encoding="utf-8"))
    audio = data.get("audio") or "content/voiceover.wav"
    return resolve(audio)


def extract_project_prompt(project_path: Path) -> str:
    """Extract technical vocabulary, brand terms, and cadence context from project JSON."""
    if not project_path.exists():
        return ""
    try:
        vocab = extract_project_vocabulary(project_path)
        prompt = build_whisper_prompt(vocab)
        if prompt:
            return prompt
        data = json.loads(project_path.read_text(encoding="utf-8"))
        parts: list[str] = []
        for k in ("ghost", "channel", "title"):
            val = data.get(k)
            if val and isinstance(val, str):
                parts.append(val.strip())
        scenes = data.get("scenes") or []
        narrations = [s.get("narration", "").strip() for s in scenes if s.get("narration")]
        if narrations:
            sample = " ".join(narrations[:2])
            parts.append(sample[:250])
        return ". ".join(p for p in parts if p)
    except Exception:
        return ""


def transcribe_deepgram(
    audio: Path,
    api_key: str,
    model: str = "nova-3",
    language: str = "en",
    project_file: Path | None = None,
    start: float | None = None,
    end: float | None = None,
) -> dict:
    """Word-level transcription via Deepgram REST API (high-precision acoustic timestamps)."""
    t0 = time.time()
    if start is not None or end is not None:
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(audio)]
        if start is not None:
            cmd += ["-ss", str(start)]
        if end is not None:
            duration = end - (start or 0)
            if duration <= 0:
                raise ValueError("trim end must be after trim start")
            cmd += ["-t", str(duration)]
        cmd += ["-f", "wav", "-"]
        audio_bytes = subprocess.run(cmd, capture_output=True, check=True).stdout
        content_type = "audio/wav"
    else:
        audio_bytes = audio.read_bytes()
        suffix = audio.suffix.lower()
        if suffix == ".wav":
            content_type = "audio/wav"
        elif suffix in (".mp3", ".mpeg"):
            content_type = "audio/mpeg"
        elif suffix in (".m4a", ".mp4", ".aac"):
            content_type = "audio/mp4"
        elif suffix == ".ogg":
            content_type = "audio/ogg"
        elif suffix == ".flac":
            content_type = "audio/flac"
        else:
            content_type = "application/octet-stream"

    vocab = extract_project_vocabulary(project_file) if project_file else []
    params = build_deepgram_params(vocab, model=model, language=language)

    url = "https://api.deepgram.com/v1/listen?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(
        url,
        data=audio_bytes,
        headers={
            "Authorization": f"Token {api_key.strip()}",
            "Content-Type": content_type,
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=120) as resp:
        if resp.status != 200:
            raise RuntimeError(f"Deepgram HTTP {resp.status}: {resp.read().decode('utf-8', 'ignore')}")
        res = json.loads(resp.read().decode("utf-8"))

    results = res.get("results", {})
    utterances = results.get("utterances", [])

    out_segments = []
    if utterances:
        for i, u in enumerate(utterances):
            words = [
                {
                    "w": (w.get("punctuated_word") or w.get("word") or "").strip(),
                    "s": round(float(w["start"]), 3),
                    "e": round(float(w["end"]), 3),
                    "p": round(float(w.get("confidence", 1.0)), 3),
                }
                for w in u.get("words", [])
                if (w.get("punctuated_word") or w.get("word") or "").strip()
            ]
            raw_text = u.get("transcript", "").strip()
            norm_text = normalize_transcript(raw_text)
            out_segments.append(
                {
                    "id": i,
                    "start": round(float(u["start"]), 3),
                    "end": round(float(u["end"]), 3),
                    "text": norm_text,
                    "words": normalize_words_array(words),
                }
            )
            print(f"[{out_segments[-1]['start']:8.2f} -> {out_segments[-1]['end']:8.2f}] {out_segments[-1]['text'][:100]}", file=sys.stderr, flush=True)
    else:
        channels = results.get("channels", [])
        alts = channels[0].get("alternatives", []) if channels else []
        raw_words = alts[0].get("words", []) if alts else []
        words = [
            {
                "w": (w.get("punctuated_word") or w.get("word") or "").strip(),
                "s": round(float(w["start"]), 3),
                "e": round(float(w["end"]), 3),
                "p": round(float(w.get("confidence", 1.0)), 3),
            }
            for w in raw_words
            if (w.get("punctuated_word") or w.get("word") or "").strip()
        ]
        if words:
            raw_text = alts[0].get("transcript", "").strip()
            norm_text = normalize_transcript(raw_text)
            out_segments.append(
                {
                    "id": 0,
                    "start": words[0]["s"],
                    "end": words[-1]["e"],
                    "text": norm_text,
                    "words": normalize_words_array(words),
                }
            )

    try:
        audio_label = str(audio.relative_to(ROOT))
    except ValueError:
        audio_label = str(audio)

    meta_duration = res.get("metadata", {}).get("duration")
    duration = float(meta_duration) if meta_duration is not None else (out_segments[-1]["end"] if out_segments else 0.0)

    return {
        "audio": audio_label,
        "model": f"deepgram/{model}",
        "language": language or "en",
        "duration": round(duration, 3),
        "elapsed": round(time.time() - t0, 2),
        "segments": out_segments,
    }


def pick_model(name: str, device: str = "auto"):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise SystemExit("faster-whisper is not installed. Run: pip install faster-whisper")

    combos = [("cuda", "float16"), ("cuda", "int8_float16"), ("cpu", "int8")]
    if device == "cpu":
        combos = [("cpu", "int8")]
    elif device == "cuda":
        combos = [("cuda", "float16"), ("cuda", "int8_float16")]
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

    # Decode before seeking. Input-side PCM seeking can return an empty stream
    # for otherwise valid WAVs on some FFmpeg builds.
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(path)]
    if start is not None:
        cmd += ["-ss", str(start)]
    if end is not None:
        duration = end - (start or 0)
        if duration <= 0:
            raise ValueError("trim end must be after trim start")
        cmd += ["-t", str(duration)]
    cmd += ["-ac", "1", "-ar", "16000", "-f", "f32le", "-"]
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
    ap.add_argument("--beam", type=int, default=5, help="beam size (default: 5)")
    ap.add_argument("--device", default="auto", choices=["auto", "cuda", "cpu"], help="compute device")
    ap.add_argument("--prompt", default=None, help="optional initial prompt / vocabulary to prime Whisper")
    ap.add_argument("--deepgram-key", default=find_deepgram_key(), help="Deepgram API key (default: env DEEPGRAM_API_KEY or secret)")
    ap.add_argument("--deepgram-model", default="nova-3", help="Deepgram model (default: nova-3)")
    ap.add_argument("--no-deepgram", action="store_true", help="force local faster-whisper even if DEEPGRAM_API_KEY is present")
    args = ap.parse_args()

    project_file = resolve(args.project)
    audio = resolve(args.audio) if args.audio else project_audio(project_file)
    out = resolve(args.out) if args.out else DEFAULT_OUT

    if not audio.exists():
        raise SystemExit(
            f"voiceover not found: {audio}\n"
            "Put the recording at content/voiceover.wav or set 'audio' in content/video.json."
        )

    out.parent.mkdir(parents=True, exist_ok=True)

    payload = None
    if not args.no_deepgram and args.deepgram_key:
        print(f"[transcribe] DEEPGRAM_API_KEY found; attempting Deepgram ({args.deepgram_model})...", file=sys.stderr, flush=True)
        try:
            payload = transcribe_deepgram(
                audio=audio,
                api_key=args.deepgram_key,
                model=args.deepgram_model,
                language=args.language,
                project_file=project_file,
                start=args.start,
                end=args.end,
            )
            print(f"[deepgram] Transcribed via {payload['model']} ({len(payload['segments'])} segments in {payload['elapsed']}s)", file=sys.stderr, flush=True)
        except Exception as exc:
            if args.deepgram_model != "nova-2":
                print(f"[deepgram] {args.deepgram_model} failed ({exc}); retrying with nova-2...", file=sys.stderr, flush=True)
                try:
                    payload = transcribe_deepgram(
                        audio=audio,
                        api_key=args.deepgram_key,
                        model="nova-2",
                        language=args.language,
                        project_file=project_file,
                        start=args.start,
                        end=args.end,
                    )
                    print(f"[deepgram] Transcribed via nova-2 ({len(payload['segments'])} segments in {payload['elapsed']}s)", file=sys.stderr, flush=True)
                except Exception as exc2:
                    print(f"[deepgram] Nova-2 also failed ({exc2}); falling back to local faster-whisper...", file=sys.stderr, flush=True)
                    payload = None
            else:
                print(f"[deepgram] Request failed ({exc}); falling back to local faster-whisper...", file=sys.stderr, flush=True)
                payload = None

    if payload is None:
        if not args.deepgram_key and not args.no_deepgram:
            print("[transcribe] DEEPGRAM_API_KEY not set; using local faster-whisper", file=sys.stderr, flush=True)

        model = pick_model(args.model, args.device)
        samples = load_audio(audio, args.start, args.end)
        print(f"[audio] {len(samples) / 16000:.2f}s decoded from {audio}", file=sys.stderr, flush=True)

        prompt = args.prompt if args.prompt is not None else extract_project_prompt(project_file)
        if prompt:
            preview = prompt if len(prompt) <= 120 else f"{prompt[:117]}..."
            print(f"[prompt] priming with: {preview}", file=sys.stderr, flush=True)

        t0 = time.time()
        segments, info = model.transcribe(
            samples,
            language=None if args.language == "auto" else args.language,
            beam_size=args.beam,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 300, "speech_pad_ms": 180},
            condition_on_previous_text=False,
            initial_prompt=prompt or None,
        )

        out_segments = []
        for seg in segments:
            words = [
                {"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)}
                for w in (seg.words or [])
                if w.word.strip()
            ]
            norm_text = normalize_transcript(seg.text.strip())
            out_segments.append(
                {
                    "id": seg.id,
                    "start": round(seg.start, 3),
                    "end": round(seg.end, 3),
                    "text": norm_text,
                    "words": normalize_words_array(words),
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
    print(f"[done] {len(payload['segments'])} segments in {payload['elapsed']}s -> {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
