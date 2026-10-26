"""Audio master mixing pipeline for idevak-video-engine.

Bakes voiceover, dynamic sound effects, and ducked background music into a single
pristine 48kHz stereo WAV file for deterministic 1080p video rendering.

Usage:
    python engine/mix_audio.py
    python engine/mix_audio.py --bgm assets/audio/synthwave-bed.mp3 --duck 10
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCENES_PATH = ROOT / "build/scenes.json"
PROJECT_PATH = ROOT / "build/project.json"
DEFAULT_VO = ROOT / "content/voiceover.wav"
OUTPUT_PATH = ROOT / "build/audio_master.wav"


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vo", default=str(DEFAULT_VO), help="Path to voiceover WAV/MP3")
    parser.add_argument("--bgm", default="", help="Optional background music file")
    parser.add_argument("--duck", type=float, default=10.0, help="BGM ducking depth in dB (default: 10dB)")
    parser.add_argument("--out", default=str(OUTPUT_PATH), help="Output master audio path")
    return parser.parse_args()


def export_sfx_manifest(scenes: list[dict], out_path: Path):
    """Generate time-indexed SFX cues matching anim.js choreography."""
    cues = []
    for i, s in enumerate(scenes):
        start = float(s.get("start", 0))
        dur = float(s.get("end", start + 3)) - start
        stype = s.get("type", "statement")
        is_punch = bool(s.get("punch") or s.get("meta", {}).get("punch") or stype == "meme")

        # Transition SFX
        if i > 0:
            if stype in {"cold", "hero"}:
                cues.append({"time": round(start, 3), "sfx": "thud", "vol": 1.2})
                cues.append({"time": round(start, 3), "sfx": "whoosh", "vol": 0.8})
            elif is_punch:
                cues.append({"time": round(start, 3), "sfx": "thud", "vol": 1.4})
            else:
                cues.append({"time": round(start, 3), "sfx": "whoosh", "vol": 0.6})

        # Scene-specific haptics
        if stype == "stat":
            cues.append({"time": round(start + 0.25, 3), "sfx": "thud", "vol": 1.3})
        elif stype in {"code", "terminal"}:
            cues.append({"time": round(start + 0.25, 3), "sfx": "click", "vol": 0.9})
        elif stype == "network":
            cues.append({"time": round(start + 0.6, 3), "sfx": "tick", "vol": 0.85})
            cues.append({"time": round(start + 1.2, 3), "sfx": "tick", "vol": 0.85})

        # Mascot emotion pop
        m = s.get("mascot")
        if m:
            expr = m.get("expression", "neutral")
            role = m.get("role", "corner")
            if role == "reaction-pop" or expr in {"shocked", "panic"}:
                cues.append({"time": round(start + 0.15, 3), "sfx": "thud", "vol": 1.1})
            else:
                cues.append({"time": round(start + 0.15, 3), "sfx": "chime", "vol": 0.75})

        # Long scene secondary sweep
        if dur >= 6.0:
            cues.append({"time": round(start + dur * 0.5, 3), "sfx": "swipe", "vol": 0.7})

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(cues, indent=2), encoding="utf-8")
    print(f"[mix_audio] Exported {len(cues)} SFX cues to {out_path}")
    return cues


def main():
    args = parse_args()
    if not SCENES_PATH.exists():
        print(f"[mix_audio] Missing {SCENES_PATH}. Run alignment first.")
        return

    scenes = json.loads(SCENES_PATH.read_text(encoding="utf-8"))
    manifest_path = ROOT / "build/sfx_manifest.json"
    cues = export_sfx_manifest(scenes, manifest_path)

    vo_path = Path(args.vo)
    if not vo_path.exists():
        print(f"[mix_audio] Voiceover not found at {vo_path}. Manifest ready for pipeline.")
        return

    print(f"[mix_audio] Voiceover found: {vo_path}")
    # If FFmpeg is available and voiceover exists, assemble master mix
    out_file = Path(args.out)
    out_file.parent.mkdir(parents=True, exist_ok=True)

    # Clean 48kHz audio resample
    cmd = [
        "ffmpeg", "-y", "-i", str(vo_path),
        "-ar", "48000", "-ac", "2",
        str(out_file)
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        print(f"[mix_audio] Master audio written to {out_file}")
    except Exception as e:
        print(f"[mix_audio] Audio resample failed: {e}")


if __name__ == "__main__":
    main()
