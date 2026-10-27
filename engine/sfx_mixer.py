"""Compatibility entry point: rebuild the composition and its exported SFX track.

SFX now comes from the actual animation schedule during every build. The source
voiceover and generated alignment metadata are never overwritten by mixing.
"""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

if __name__ == "__main__":
    raise SystemExit(subprocess.call(["node", str(ROOT / "engine/build.mjs")], cwd=ROOT))
