"""Optional Gemini AI Studio TTS voiceover generator. See docs/GEMINI_TTS.md."""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from engine.workspace import (  # noqa: E402
    default_audio_rel,
    pop_project_arg,
    project_json_path,
    resolve_project_dir,
)

DEFAULT_MODEL = "gemini-3.8-flash-tts"
DEFAULT_VOICE = "Sadaltager"
DEFAULT_TEMPERATURE = 1.0


def parse_audio_mime_type(mime_type: str) -> dict[str, int]:
    """Parse bits per sample and sample rate from an audio MIME type string."""
    bits_per_sample = 16
    rate = 24000

    for raw_param in (mime_type or "").split(";"):
        param = raw_param.strip()
        if param.lower().startswith("rate="):
            try:
                rate = int(param.split("=", 1)[1])
            except (ValueError, IndexError):
                pass
        elif param.lower().startswith("audio/l"):
            try:
                bits_per_sample = int(param[7:])
            except (ValueError, IndexError):
                pass

    return {"bits_per_sample": bits_per_sample, "rate": rate}


def convert_to_wav(audio_data: bytes, mime_type: str) -> bytes:
    """Generate a WAV file header for raw PCM audio data."""
    parameters = parse_audio_mime_type(mime_type)
    bits_per_sample = parameters["bits_per_sample"]
    sample_rate = parameters["rate"]
    num_channels = 1
    data_size = len(audio_data)
    bytes_per_sample = bits_per_sample // 8
    block_align = num_channels * bytes_per_sample
    byte_rate = sample_rate * block_align
    chunk_size = 36 + data_size

    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        chunk_size,
        b"WAVE",
        b"fmt ",
        16,
        1,
        num_channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b"data",
        data_size,
    )
    return header + audio_data


def _resolve_output_path(project_dir: Path, out_arg: str | None) -> Path:
    if out_arg:
        p = Path(out_arg)
        return p if p.is_absolute() else (project_dir / p)

    vjson = project_json_path(project_dir, ROOT)
    audio_rel = default_audio_rel(project_dir, ROOT)
    if vjson.is_file():
        try:
            data = json.loads(vjson.read_text(encoding="utf-8"))
            if isinstance(data.get("audio"), str) and data["audio"].strip():
                audio_rel = data["audio"].strip()
        except (OSError, json.JSONDecodeError):
            pass

    p = Path(audio_rel)
    return p if p.is_absolute() else (project_dir / p)


def _resolve_script_text(project_dir: Path, script_arg: str | None, text_arg: str | None) -> tuple[str, str]:
    if text_arg is not None:
        cleaned = text_arg.strip()
        if not cleaned:
            raise SystemExit("Error: --text is empty.")
        return cleaned, "<inline --text>"

    if script_arg == "-":
        cleaned = sys.stdin.read().strip()
        if not cleaned:
            raise SystemExit("Error: stdin TTS script is empty.")
        return cleaned, "<stdin>"

    candidates: list[Path] = []
    if script_arg:
        p = Path(script_arg)
        if p.is_absolute() or p.is_file():
            candidates.append(p)
        else:
            candidates.append(project_dir / p)
            candidates.append(ROOT / p)
    else:
        candidates.extend([
            project_dir / "notes" / "phonetic_tts_script.txt",
            project_dir / "notes" / "tts_script.txt",
        ])

    for candidate in candidates:
        if candidate.is_file():
            cleaned = candidate.read_text(encoding="utf-8").strip()
            if not cleaned:
                raise SystemExit(f"Error: TTS script file is empty: {candidate}")
            return cleaned, str(candidate)

    searched = ", ".join(str(c) for c in candidates)
    raise SystemExit(f"Error: TTS script file not found (searched: {searched}).")


def _write_audio_output(out_path: Path, audio_bytes: bytes, mime_type: str) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    ext = mimetypes.guess_extension(mime_type.split(";", 1)[0].strip()) if mime_type else None

    # Raw PCM (e.g. audio/L16;rate=24000) has no standard extension in mimetypes.
    if ext is None or mime_type.lower().startswith("audio/l"):
        wav_bytes = convert_to_wav(audio_bytes, mime_type)
        final_path = out_path if out_path.suffix.lower() == ".wav" else out_path.with_suffix(".wav")
        final_path.write_bytes(wav_bytes)
        return final_path

    if ext.lower() == ".wav" and out_path.suffix.lower() == ".wav":
        out_path.write_bytes(audio_bytes)
        return out_path

    if out_path.suffix.lower() == ".wav" and shutil.which("ffmpeg"):
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = Path(tmp.name)
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", str(tmp_path), str(out_path)],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return out_path
        finally:
            tmp_path.unlink(missing_ok=True)

    final_path = out_path.with_suffix(ext) if out_path.suffix.lower() != ext.lower() else out_path
    final_path.write_bytes(audio_bytes)
    return final_path


def generate_voiceover(
    script_text: str,
    out_path: Path,
    *,
    api_key: str,
    model: str = DEFAULT_MODEL,
    voice_name: str = DEFAULT_VOICE,
    temperature: float = DEFAULT_TEMPERATURE,
) -> Path:
    """Synthesize voiceover audio from a phonetic TTS script via Gemini TTS."""
    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise SystemExit(
            "Missing dependency: google-genai. Install with:\n"
            "  python -m pip install google-genai"
        ) from exc

    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(api_version="v1beta"),
    )

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=f"## Transcript:\n{script_text}"),
            ],
        ),
    ]
    config = types.GenerateContentConfig(
        temperature=temperature,
        response_modalities=["audio"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name=voice_name,
                )
            )
        ),
    )

    audio_data = bytearray()
    mime_type = ""
    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=config,
    ):
        if not getattr(chunk, "parts", None):
            continue
        first_part = chunk.parts[0]
        inline_data = getattr(first_part, "inline_data", None)
        if inline_data and getattr(inline_data, "data", None):
            audio_data.extend(inline_data.data)
            mime_type = inline_data.mime_type or mime_type
        elif getattr(chunk, "text", None):
            print(chunk.text)

    if not audio_data:
        raise SystemExit("Error: Gemini TTS returned no audio data.")

    return _write_audio_output(out_path, bytes(audio_data), mime_type)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Optional Gemini AI Studio TTS voiceover generator for iDevak Video Engine."
    )
    parser.add_argument(
        "script_pos",
        nargs="?",
        help="Optional path to the phonetic TTS script file (or '-' for stdin).",
    )
    parser.add_argument(
        "--script",
        "-s",
        dest="script",
        help="Path to the phonetic TTS script file (or '-' for stdin).",
    )
    parser.add_argument(
        "--text",
        "-t",
        help="Inline phonetic TTS script text.",
    )
    parser.add_argument(
        "--out",
        "-o",
        help="Output audio path (defaults to the project's configured audio path, e.g. voiceover.wav).",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Gemini TTS model (default: {DEFAULT_MODEL}).",
    )
    parser.add_argument(
        "--voice",
        default=DEFAULT_VOICE,
        help=f"Prebuilt voice name (default: {DEFAULT_VOICE}).",
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=DEFAULT_TEMPERATURE,
        help=f"Sampling temperature (default: {DEFAULT_TEMPERATURE}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate script and output path without calling the Gemini API.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    raw_argv = list(sys.argv[1:] if argv is None else argv)
    project_spec, rest = pop_project_arg(raw_argv)
    args = build_parser().parse_args(rest)

    project_dir = resolve_project_dir(project_spec)
    script_arg = args.script or args.script_pos
    script_text, script_source = _resolve_script_text(project_dir, script_arg, args.text)
    out_path = _resolve_output_path(project_dir, args.out)

    if args.dry_run:
        print(f"[tts] Dry run OK: project={project_dir}")
        print(f"[tts] Script source: {script_source} ({len(script_text)} chars)")
        print(f"[tts] Output target: {out_path}")
        print(f"[tts] Model={args.model} Voice={args.voice} Temperature={args.temperature}")
        return 0

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print(
            "Error: GEMINI_API_KEY is not set in the environment.\n"
            "Ask the user for GEMINI_API_KEY via private secret input (request_secret) "
            "and do not store it in files or ordinary chat.",
            file=sys.stderr,
        )
        return 1

    saved_path = generate_voiceover(
        script_text,
        out_path,
        api_key=api_key,
        model=args.model,
        voice_name=args.voice,
        temperature=args.temperature,
    )
    print(f"[tts] Voiceover saved to: {saved_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
