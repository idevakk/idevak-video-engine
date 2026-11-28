#!/usr/bin/env python3
"""Automated Ralph Loop runner for cloning or enhancing iDevak Video Engine styles.

Hybrid orchestrator helper:
1. Validates mode ('new' vs 'enhance') and target style dynamically against
   engine/presets/* + 'default' without hallucinating unknown styles.
2. Runs dependency preflight & auto-install/repair (yt-dlp, ffmpeg, rea-video,
   faster-whisper, npm packages, Playwright Chromium, HyperFrames CLI).
3. Ingests a local video or YouTube URL (with optional --clip / --max-duration),
   extracts clean vocal stems via `rea-video stems`, and dissects the original
   via `rea-video decompose` into an isolated `workspaces/_ralph-<slug>/` folder.
4. Scaffolds a new preset (`scaffold-style`) or evaluates iterations (`iterate`):
   validate -> transcribe -> align -> build -> lint/check -> qa_frames ->
   headless draft render -> rea-video decompose + compare -> composite 97% gate.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from engine.workspace import (  # noqa: E402
    ENGINE_ROOT,
    WORKSPACES_DIR,
    resolve_project_dir,
    slugify_workspace,
)

IS_WIN = os.name == "nt"
PYTHON = sys.executable or ("python" if IS_WIN else "python3")
NPX = "npx.cmd" if IS_WIN else "npx"
NPM = "npm.cmd" if IS_WIN else "npm"

BUILTIN_STYLE_ALIASES = {
    "default": "default",
    "chalkboard-explainer": "chalkboard-explainer",
    "chalkboad-explainer": "chalkboard-explainer",
    "motion-explainer": "motion-explainer",
}

DEFAULT_THRESHOLD = 97.0
DEFAULT_MAX_ITERS = 5


def discover_styles(engine_root: Path = ENGINE_ROOT) -> tuple[list[str], dict[str, str]]:
    """Discover all available engine styles dynamically (never hardcode stale lists)."""
    aliases = dict(BUILTIN_STYLE_ALIASES)
    presets_dir = engine_root / "engine" / "presets"
    discovered: list[str] = []
    if presets_dir.is_dir():
        for pdir in sorted(presets_dir.iterdir()):
            if pdir.is_dir() and ((pdir / "renderer.mjs").is_file() or (pdir / "schema.py").is_file()):
                name = pdir.name.lower()
                aliases.setdefault(name, name)
                if name not in discovered:
                    discovered.append(name)
    styles = ["default"]
    for name in sorted(set(aliases.values()) | set(discovered)):
        if name != "default" and name not in styles:
            styles.append(name)
    return styles, aliases


def resolve_style_choice(raw_style: str | None, engine_root: Path = ENGINE_ROOT) -> tuple[str | None, bool, list[str]]:
    """Resolve raw style name against live discovered styles. Returns (canonical, exists, available)."""
    styles, aliases = discover_styles(engine_root)
    if not raw_style or not str(raw_style).strip():
        return None, False, styles
    key = str(raw_style).strip().lower()
    canonical = aliases.get(key)
    if canonical and canonical in styles:
        return canonical, True, styles
    return key, False, styles


def validate_mode_and_style(
    mode: str | None,
    style: str | None,
    engine_root: Path = ENGINE_ROOT,
) -> dict[str, Any]:
    """Enforce zero-hallucination style & mode validation before running any pipeline step."""
    styles, _ = discover_styles(engine_root)
    norm_mode = (mode or "").strip().lower() or None

    if norm_mode is None:
        return {
            "ok": False,
            "status": "needs_clarification",
            "available_styles": styles,
            "message": (
                "Mode not specified. Ask the user whether the provided video/URL should "
                "create a NEW style preset or ENHANCE an existing style from: "
                + ", ".join(styles)
            ),
        }

    if norm_mode not in ("new", "enhance"):
        return {
            "ok": False,
            "status": "invalid_mode",
            "requested_mode": norm_mode,
            "available_styles": styles,
            "message": f"Unsupported mode {norm_mode!r}. Use 'new' or 'enhance'.",
        }

    if norm_mode == "enhance":
        if not style or not style.strip():
            return {
                "ok": False,
                "status": "needs_style_selection",
                "available_styles": styles,
                "message": (
                    "Enhance mode requires an existing style name. Available styles: "
                    + ", ".join(styles)
                ),
            }
        canonical, exists, _ = resolve_style_choice(style, engine_root)
        if not exists:
            return {
                "ok": False,
                "status": "unknown_style",
                "requested_style": style,
                "available_styles": styles,
                "message": (
                    f"Style {style!r} does not exist in this engine. Do not hallucinate a fallback. "
                    f"Ask the user to choose from available styles ({', '.join(styles)}) "
                    "or confirm creating it as a new style (--mode new)."
                ),
            }
        return {"ok": True, "mode": "enhance", "style": canonical, "available_styles": styles}

    # norm_mode == "new"
    if not style or not style.strip():
        return {
            "ok": False,
            "status": "needs_new_style_name",
            "available_styles": styles,
            "message": "New style mode requires a target slug via --style <new-style-slug>.",
        }
    slug = slugify_workspace(style)
    canonical, exists, _ = resolve_style_choice(slug, engine_root)
    if exists:
        return {
            "ok": False,
            "status": "style_already_exists",
            "requested_style": canonical,
            "available_styles": styles,
            "message": (
                f"Style {canonical!r} already exists. Ask the user whether they want to "
                f"enhance {canonical!r} (--mode enhance --style {canonical}) or pick a new style slug."
            ),
        }
    return {"ok": True, "mode": "new", "style": slug, "available_styles": styles}


def parse_clip_range(spec: str | None) -> tuple[float | None, float | None]:
    """Parse --clip START-END (seconds or HH:MM:SS) into (start_s, end_s)."""
    if not spec or not spec.strip():
        return None, None
    raw = spec.strip()
    if "-" not in raw:
        raise ValueError(f"Invalid --clip range {spec!r}; expected START-END (e.g. 0-60 or 00:15-01:15)")
    a, b = raw.split("-", 1)

    def _to_sec(val: str) -> float:
        parts = [p.strip() for p in val.split(":")]
        if len(parts) == 1:
            return float(parts[0])
        if len(parts) == 2:
            return int(parts[0]) * 60 + float(parts[1])
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        raise ValueError(f"Invalid timestamp {val!r}")

    s_t, e_t = _to_sec(a), _to_sec(b)
    if s_t < 0 or e_t <= s_t:
        raise ValueError(f"Invalid --clip range {spec!r}: end must be greater than start")
    return s_t, e_t


def _run(
    cmd: list[str],
    *,
    cwd: Path = ENGINE_ROOT,
    check: bool = True,
    capture: bool = False,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess:
    merged_env = {**os.environ, **(env or {})}
    use_shell = IS_WIN and str(cmd[0]).lower().endswith((".cmd", ".bat"))
    return subprocess.run(
        cmd,
        cwd=cwd,
        check=check,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=capture,
        shell=use_shell,
        env=merged_env,
    )


def _which(exe: str) -> str | None:
    return shutil.which(exe)


def check_preflight(install: bool = False, engine_root: Path = ENGINE_ROOT) -> dict[str, Any]:
    """Check and optionally install/repair required tools and packages."""
    installed: list[str] = []
    blockers: list[str] = []
    checks: dict[str, Any] = {}

    # 1. Node & npm dependencies
    node_path = _which("node")
    checks["node"] = bool(node_path)
    if not node_path:
        blockers.append("node (>=22) not found in PATH")

    pw_dir = engine_root / "node_modules" / "@playwright" / "test"
    gsap_dir = engine_root / "node_modules" / "gsap"
    if (not pw_dir.is_dir() or not gsap_dir.is_dir()) and install and node_path:
        lock = (engine_root / "package-lock.json").is_file()
        sub = "ci" if lock else "install"
        try:
            _run([NPM, sub], cwd=engine_root)
            installed.append(f"npm {sub}")
        except Exception as exc:
            blockers.append(f"npm {sub} failed: {exc}")
    checks["node_modules"] = pw_dir.is_dir() and gsap_dir.is_dir()

    # 2. Playwright Chromium check
    def _has_chromium() -> bool:
        try:
            r = _run(
                [
                    "node",
                    "-e",
                    "import('node:fs').then(async fs=>{const {chromium}=await import('@playwright/test');process.exit(fs.existsSync(chromium.executablePath())?0:1)})",
                ],
                cwd=engine_root,
                check=False,
                capture=True,
            )
            return r.returncode == 0
        except Exception:
            return False

    has_cr = _has_chromium() if checks["node_modules"] else False
    if not has_cr and install and checks["node_modules"]:
        try:
            _run([NPX, "playwright", "install", "chromium"], cwd=engine_root)
            installed.append("playwright chromium")
            has_cr = _has_chromium()
        except Exception as exc:
            blockers.append(f"playwright chromium install failed: {exc}")
    checks["playwright_chromium"] = has_cr

    # 3. Python packages: yt-dlp, rea-video, faster-whisper
    def _ensure_py_pkg(mod_name: str, pip_name: str, exe_name: str | None = None) -> bool:
        present = (importlib.util.find_spec(mod_name) is not None) or (bool(exe_name and _which(exe_name)))
        if not present and install:
            try:
                _run([PYTHON, "-m", "pip", "install", "-U", pip_name], cwd=engine_root)
                installed.append(pip_name)
                present = (importlib.util.find_spec(mod_name) is not None) or (bool(exe_name and _which(exe_name)))
            except Exception as exc:
                blockers.append(f"pip install {pip_name} failed: {exc}")
        return present

    checks["yt_dlp"] = _ensure_py_pkg("yt_dlp", "yt-dlp", "yt-dlp")
    checks["rea_video"] = _ensure_py_pkg("rea_video", "rea-video", "rea-video")
    checks["faster_whisper"] = _ensure_py_pkg("faster_whisper", "faster-whisper")

    # 4. FFmpeg / FFprobe
    has_ff = bool(_which("ffmpeg")) and bool(_which("ffprobe"))
    if not has_ff and install and IS_WIN and _which("winget"):
        try:
            _run(["winget", "install", "-e", "--id", "Gyan.FFmpeg", "--silent", "--accept-package-agreements"], check=False)
            has_ff = bool(_which("ffmpeg")) and bool(_which("ffprobe"))
            if has_ff:
                installed.append("ffmpeg (winget)")
        except Exception:
            pass
    checks["ffmpeg"] = has_ff
    if not has_ff:
        blockers.append("ffmpeg/ffprobe missing from PATH")

    # 5. HyperFrames CLI availability
    hf_ok = False
    if node_path:
        try:
            r = _run([NPX, "hyperframes@latest", "--version"], cwd=engine_root, check=False, capture=True)
            hf_ok = r.returncode == 0
        except Exception:
            hf_ok = False
    checks["hyperframes"] = hf_ok
    if not hf_ok:
        blockers.append("npx hyperframes@latest unreachable or failed")

    return {
        "ok": len(blockers) == 0 and all(checks.values()),
        "checks": checks,
        "installed": installed,
        "blockers": blockers,
    }


def _is_url(value: str) -> bool:
    return bool(re.match(r"^https?://", value.strip(), re.IGNORECASE))


def _vlm_available() -> bool:
    for env_key in ("OPENAI_API_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY", "REA_VIDEO_VLM_API_KEY"):
        if os.environ.get(env_key, "").strip():
            return True
    prefs = Path.home() / ".config" / "rea-video" / "prefs.json"
    if prefs.is_file():
        try:
            data = json.loads(prefs.read_text(encoding="utf-8"))
            return bool(data.get("vlm"))
        except Exception:
            pass
    return False


def _probe_video(path: Path) -> dict[str, Any]:
    r = _run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "stream=width,height,r_frame_rate,codec_type:format=duration",
            "-of",
            "json",
            str(path),
        ],
        check=False,
        capture=True,
    )
    info = {"width": 1920, "height": 1080, "fps": 30, "duration": 0.0, "has_audio": False}
    if r.returncode != 0 or not r.stdout.strip():
        return info
    try:
        data = json.loads(r.stdout)
        fmt = data.get("format") or {}
        if fmt.get("duration"):
            info["duration"] = round(float(fmt["duration"]), 3)
        for st in data.get("streams") or []:
            if st.get("codec_type") == "video":
                info["width"] = int(st.get("width") or 1920)
                info["height"] = int(st.get("height") or 1080)
                rate = str(st.get("r_frame_rate") or "30/1")
                if "/" in rate:
                    num, den = rate.split("/", 1)
                    if float(den) > 0:
                        info["fps"] = max(1, min(60, round(float(num) / float(den))))
            elif st.get("codec_type") == "audio":
                info["has_audio"] = True
    except Exception:
        pass
    info["aspect"] = "9:16" if info["height"] > info["width"] else "16:9"
    return info


def extract_clean_voiceover(
    video_path: Path,
    dissect_dir: Path,
    out_wav: Path,
) -> dict[str, Any]:
    """Extract clean speech vocals using `rea-video stems` (falling back to ffmpeg)."""
    stems_dir = dissect_dir / "stems"
    vocals_wav = stems_dir / "vocals.wav"
    backend = "rea-video stems"

    if not vocals_wav.is_file():
        r = _run(["rea-video", "stems", str(video_path), "-o", str(dissect_dir)], check=False, capture=True)
        if r.returncode != 0 or not vocals_wav.is_file() or vocals_wav.stat().st_size < 2048:
            backend = "ffmpeg_speech_filter_fallback"

    if vocals_wav.is_file() and vocals_wav.stat().st_size >= 2048:
        _run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-y",
                "-i",
                str(vocals_wav),
                "-ac",
                "1",
                "-ar",
                "48000",
                "-c:a",
                "pcm_s16le",
                str(out_wav),
            ]
        )
    else:
        _run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-y",
                "-i",
                str(video_path),
                "-vn",
                "-af",
                "highpass=f=110,lowpass=f=7600",
                "-ac",
                "1",
                "-ar",
                "48000",
                "-c:a",
                "pcm_s16le",
                str(out_wav),
            ]
        )
    return {
        "backend": backend,
        "vocals_source": str(vocals_wav) if vocals_wav.is_file() else None,
        "voiceover_wav": str(out_wav),
    }


def _collect_blueprint(
    original_video: Path,
    dissect_dir: Path,
    ws_dir: Path,
) -> dict[str, Any]:
    """Build a compact blueprint from rea-video's breakdown.json + probe."""
    probe = _probe_video(original_video)
    bd_path = dissect_dir / "breakdown.json"
    bd = json.loads(bd_path.read_text(encoding="utf-8")) if bd_path.is_file() else {}

    shots_raw = bd.get("shots") or []
    shots_summary: list[dict[str, Any]] = []
    ground_colors: list[str] = []
    drawn_colors: list[str] = []
    categories: list[str] = []

    for idx, sh in enumerate(shots_raw, 1):
        start = float(sh.get("start") or 0.0)
        end = float(sh.get("end") or start)
        cat = str(sh.get("label") or sh.get("kind") or sh.get("category") or "unknown")
        categories.append(cat)
        cols = sh.get("colours") or sh.get("colors") or {}
        if isinstance(cols, dict):
            if cols.get("ground"):
                ground_colors.append(str(cols["ground"]))
            for dc in cols.get("drawn") or cols.get("foreground") or []:
                drawn_colors.append(str(dc))
        shots_summary.append(
            {
                "index": idx,
                "start": round(start, 3),
                "end": round(end, 3),
                "duration": round(max(0.0, end - start), 3),
                "label": cat,
                "motion": sh.get("motion") or sh.get("camera_motion") or "",
                "text": sh.get("ocr_text") or sh.get("text") or "",
                "transition": sh.get("transition_in") or sh.get("transition") or "",
            }
        )

    sfx_raw = ((bd.get("audio_plan") or {}).get("sfx_merged")) or bd.get("sfx") or []
    sfx_events = [
        {
            "t": round(float(e.get("t", 0.0)), 3),
            "dur": round(float(e.get("dur") or 0.0), 3),
            "kind": e.get("kind") or e.get("label") or "sfx",
            "confidence": e.get("confidence") or "high",
        }
        for e in sfx_raw
        if isinstance(e, dict)
    ]

    transcript_lines = bd.get("speech") or bd.get("transcript") or []
    bp = {
        "video": probe,
        "shot_count": len(shots_summary),
        "categories": sorted(set(categories)),
        "ground_colors": list(dict.fromkeys(ground_colors))[:6],
        "drawn_colors": list(dict.fromkeys(drawn_colors))[:10],
        "sfx_count": len(sfx_events),
        "sfx_events": sfx_events[:120],
        "shots": shots_summary,
        "transcript_lines": transcript_lines[:200] if isinstance(transcript_lines, list) else [],
        "video_md": str(dissect_dir / "VIDEO.md") if (dissect_dir / "VIDEO.md").is_file() else None,
        "breakdown_json": str(bd_path) if bd_path.is_file() else None,
        "frames_scenes_json": str(dissect_dir / "frames" / "scenes.json")
        if (dissect_dir / "frames" / "scenes.json").is_file()
        else None,
    }
    notes_dir = ws_dir / "notes"
    notes_dir.mkdir(parents=True, exist_ok=True)
    (notes_dir / "original_blueprint.json").write_text(json.dumps(bp, indent=2) + "\n", encoding="utf-8")

    md_lines = [
        f"# Original Dissection Blueprint ({ws_dir.name})",
        "",
        f"- Resolution: {probe['width']}x{probe['height']} ({probe['aspect']}) @ {probe['fps']} fps",
        f"- Duration: {probe['duration']:.2f}s",
        f"- Detected shots: {len(shots_summary)}",
        f"- Shot categories: {', '.join(bp['categories']) or 'none'}",
        f"- Ground colors: {', '.join(bp['ground_colors']) or 'n/a'}",
        f"- Drawn colors: {', '.join(bp['drawn_colors']) or 'n/a'}",
        f"- Detected SFX hits: {len(sfx_events)}",
        f"- Model-readable dissection: `{bp['video_md'] or 'n/a'}`",
        "",
        "## Shots",
        "",
        "| # | Start | End | Dur | Label | Transition | Text |",
        "|---:|---:|---:|---:|---|---|---|",
    ]
    for sh in shots_summary[:60]:
        txt = str(sh["text"]).replace("\n", " ").replace("|", "\\|")[:50]
        md_lines.append(
            f"| {sh['index']} | {sh['start']:.2f} | {sh['end']:.2f} | {sh['duration']:.2f} | "
            f"{sh['label']} | {sh['transition']} | {txt} |"
        )
    (notes_dir / "original_blueprint.md").write_text("\n".join(md_lines) + "\n", encoding="utf-8")
    return bp


def _seed_video_json(
    ws_dir: Path,
    slug: str,
    style: str,
    bp: dict[str, Any],
    vo_segments: list[dict[str, Any]] | None = None,
) -> Path:
    """Create a starter video.json inside the isolated loop workspace if missing."""
    video_path = ws_dir / "video.json"
    if video_path.is_file():
        return video_path

    probe = bp.get("video") or {"width": 1920, "height": 1080, "fps": 30, "aspect": "16:9"}
    accent = (bp.get("drawn_colors") or ["#38bdf8"])[0]
    if not re.match(r"^#[0-9a-fA-F]{6}$", str(accent)):
        accent = "#38bdf8"

    scenes: list[dict[str, Any]] = []
    if vo_segments:
        for i, seg in enumerate(vo_segments):
            txt = (seg.get("text") or "").strip()
            if not txt:
                continue
            stype = "cold" if i == 0 else ("outro" if i == len(vo_segments) - 1 else "statement")
            if style == "motion-explainer":
                stype = "me_title" if i == 0 else ("me_outro" if i == len(vo_segments) - 1 else "me_evidence_card")
            elif style == "chalkboard-explainer":
                stype = "cb_title" if i == 0 else ("cb_outro" if i == len(vo_segments) - 1 else "cb_statement")
            scenes.append(
                {
                    "id": f"s{len(scenes) + 1:03d}",
                    "type": stype,
                    "act": "act-main",
                    "eyebrow": f"SCENE {len(scenes) + 1}",
                    "headline": " ".join(txt.split()[:6]),
                    "subline": txt if len(txt) <= 120 else txt[:117] + "...",
                    "narration": txt,
                    "meta": {},
                }
            )

    if not scenes:
        is_me = style == "motion-explainer"
        is_cb = style == "chalkboard-explainer"
        scenes = [
            {
                "id": "s001",
                "type": "me_title" if is_me else ("cb_title" if is_cb else "cold"),
                "act": "act-main",
                "eyebrow": "OPENING",
                "headline": slug.replace("-", " ").title(),
                "subline": "Draft clone baseline",
                "narration": "Draft baseline scene aligned to extracted voiceover.",
                "meta": {},
            },
            {
                "id": "s002",
                "type": "me_outro" if is_me else ("cb_outro" if is_cb else "outro"),
                "act": "act-main",
                "eyebrow": "OUTRO",
                "headline": "Summary",
                "subline": "Subscribe for more breakdowns",
                "narration": "Thanks for watching.",
                "meta": {},
            },
        ]

    payload = {
        "title": f"Ralph Loop Clone: {slug}",
        "slug": slug,
        "compositionId": slug,
        "style": style,
        "aspect": probe.get("aspect", "16:9"),
        "audio": "voiceover.wav",
        "channel": "@iDevak",
        "cta": "Subscribe",
        "ctaSub": "Technical breakdowns",
        "defaultAccent": accent,
        "composition": {
            "width": int(probe.get("width", 1920)),
            "height": int(probe.get("height", 1080)),
            "fps": int(probe.get("fps", 30)),
        },
        "acts": [{"id": "act-main", "name": "MAIN", "accent": accent}],
        "scenes": scenes,
    }
    video_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return video_path


def scaffold_preset(
    style_slug: str,
    *,
    blueprint: dict[str, Any] | None = None,
    engine_root: Path = ENGINE_ROOT,
    overwrite: bool = False,
) -> dict[str, Any]:
    """Generate a self-contained style preset under engine/presets/<style_slug>/."""
    slug = slugify_workspace(style_slug)
    prefix = re.sub(r"[^a-z0-9]", "", slug)[:6] or "custom"
    up_prefix = prefix.upper()
    preset_dir = engine_root / "engine" / "presets" / slug
    doc_path = engine_root / "docs" / "styles" / f"{slug}.md"
    test_ident = slug.replace("-", "_")
    test_path = engine_root / "tests" / f"{test_ident}_style.test.mjs"

    if preset_dir.exists() and not overwrite:
        raise FileExistsError(f"Preset directory already exists: {preset_dir}")

    bp = blueprint or {}
    bg_hex = (bp.get("ground_colors") or ["#06070a"])[0]
    accent_hex = (bp.get("drawn_colors") or ["#38bdf8"])[0]
    if not re.match(r"^#[0-9a-fA-F]{6}$", str(bg_hex)):
        bg_hex = "#06070a"
    if not re.match(r"^#[0-9a-fA-F]{6}$", str(accent_hex)):
        accent_hex = "#38bdf8"

    preset_dir.mkdir(parents=True, exist_ok=True)
    doc_path.parent.mkdir(parents=True, exist_ok=True)
    test_path.parent.mkdir(parents=True, exist_ok=True)

    style_css = f"""/* ============================================================================
 * Dedicated Stylesheet: {slug}
 * Generated by scripts/ralph_style.py from dissected reference blueprint.
 * ========================================================================== */
:root {{
  --{prefix}-bg: {bg_hex};
  --{prefix}-surface: rgba(17, 21, 28, 0.94);
  --{prefix}-border: rgba(255, 255, 255, 0.14);
  --{prefix}-ink: #f8fafc;
  --{prefix}-dim: rgba(226, 232, 240, 0.72);
  --{prefix}-accent: {accent_hex};
  --sans: "Inter", system-ui, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, monospace;
}}

* {{ box-sizing: border-box; }}
html, body {{ margin: 0; padding: 0; background: var(--{prefix}-bg); }}
body {{
  width: var(--composition-width, 1920px);
  height: var(--composition-height, 1080px);
  overflow: hidden;
}}

#root[data-style="{slug}"] {{
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--{prefix}-bg);
  color: var(--{prefix}-ink);
  font-family: var(--sans);
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
}}

#vo, #bgm, #sfx {{ display: none; }}

.sc {{
  position: absolute;
  inset: 0;
  overflow: hidden;
  visibility: hidden;
  opacity: 0;
}}
.sc-in {{
  position: absolute;
  inset: 0;
  padding: 64px 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
}}
.{prefix}-eyebrow {{
  font-family: var(--mono);
  font-size: 16px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--{prefix}-dim);
}}
.{prefix}-headline {{
  font-size: 76px;
  font-weight: 800;
  line-height: 1.08;
  text-align: center;
  margin: 0;
  max-width: 1400px;
}}
.{prefix}-subline {{
  font-size: 26px;
  line-height: 1.45;
  color: var(--{prefix}-dim);
  text-align: center;
  max-width: 1080px;
  margin: 0;
}}
.{prefix}-card {{
  width: 100%;
  max-width: 1280px;
  padding: 40px 48px;
  border-radius: 20px;
  background: var(--{prefix}-surface);
  border: 1.5px solid var(--{prefix}-border);
  display: flex;
  flex-direction: column;
  gap: 18px;
}}
.{prefix}-pill {{
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 22px;
  border-radius: 999px;
  border: 1.5px solid var(--{prefix}-accent);
  font-family: var(--mono);
  font-size: 18px;
}}
"""

    sfx_js = f"""/* Deterministic digital SFX synthesizer for {slug}. */
(function () {{
  function noiseSample(index) {{
    var n = Math.imul(index + 1, 374761393);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 2147483648 - 1;
  }}

  function playPresetSFX(type, opt, ctx) {{
    var t = 0;
    opt = opt || {{}};
    var vol = opt.vol == null ? 1 : opt.vol;
    if (type === "whoosh" || type === "swipe") {{
      var len = Math.floor(ctx.sampleRate * 0.18);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = noiseSample(i + 97) * 0.55;
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var flt = ctx.createBiquadFilter();
      flt.type = "bandpass";
      flt.frequency.setValueAtTime(type === "swipe" ? 950 : 420, t);
      flt.frequency.exponentialRampToValueAtTime(type === "swipe" ? 2100 : 1250, t + 0.08);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.08 * vol, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.175);
      src.connect(flt); flt.connect(g); g.connect(ctx.destination);
      src.start(t);
      return;
    }}
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type === "click" || type === "tick" || type === "alert" ? "triangle" : "sine";
    var f0 = type === "thud" ? 110 : type === "ding" || type === "chime" ? 740 : type === "click" ? 1280 : 520;
    var dur = type === "click" || type === "tick" ? 0.03 : type === "ding" || type === "chime" ? 0.24 : 0.12;
    osc.frequency.setValueAtTime(f0, t);
    if (type === "pop") osc.frequency.exponentialRampToValueAtTime(840, t + 0.04);
    else if (type === "thud") osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    else if (type === "chime") osc.frequency.setValueAtTime(988, t + 0.06);
    gain.gain.setValueAtTime(0.075 * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + dur + 0.01);
  }}

  window.__{up_prefix}_PLAY_SFX__ = playPresetSFX;
}})();
"""

    anim_js = f"""/* Word-synced GSAP Choreography for {slug}. */
(function () {{
  var SCENES = window.__SCENES__ || [];
  var TOTAL = window.__TOTAL__ || 1;
  var tl = gsap.timeline({{ paused: true }});
  gsap.config({{ nullTargetWarn: false }});

  function q(el, sel) {{ return el ? Array.prototype.slice.call(el.querySelectorAll(sel)) : []; }}
  function clamp(v, lo, hi) {{ return Math.max(lo, Math.min(hi, v)); }}

  var sfxEvents = [];
  window.__SFX_EVENTS__ = sfxEvents;
  var SFX_DEDUPE_WINDOW = 0.075;
  function queueSFX(type, at, opt) {{
    if (!Number.isFinite(at) || at < 0 || at >= TOTAL) return;
    var vol = opt && opt.vol != null ? opt.vol : 1;
    for (var i = sfxEvents.length - 1; i >= 0; i--) {{
      if (Math.abs(sfxEvents[i].at - at) < SFX_DEDUPE_WINDOW) {{
        if (vol > sfxEvents[i].vol + 0.05) sfxEvents[i] = {{ type: type, at: at, vol: vol }};
        return;
      }}
    }}
    sfxEvents.push({{ type: type, at: at, vol: vol }});
  }}

  window.__synthesizeSFX = async function () {{
    sfxEvents.sort(function (a, b) {{ return a.at - b.at; }});
    var clips = {{}};
    var play = window.__{up_prefix}_PLAY_SFX__;
    var types = Array.from(new Set(sfxEvents.map(function (e) {{ return e.type; }})));
    for (var k = 0; k < types.length; k++) {{
      var type = types[k];
      var ctx = new OfflineAudioContext(1, 16800, 48000);
      if (typeof play === "function") play(type, {{ vol: 1 }}, ctx);
      var buf = await ctx.startRendering();
      clips[type] = Array.from(buf.getChannelData(0));
    }}
    return {{ events: sfxEvents, clips: clips }};
  }};

  function popIn(target, at, opts) {{
    if (!target) return;
    opts = opts || {{}};
    gsap.set(target, {{ opacity: 0, y: opts.y != null ? opts.y : 12, scale: opts.scale != null ? opts.scale : 0.96 }});
    tl.to(target, {{ opacity: 1, y: 0, scale: 1, duration: opts.dur || 0.26, ease: "power3.out" }}, at);
  }}

  SCENES.forEach(function (s, i) {{
    var el = document.getElementById("s" + String(i + 1).padStart(3, "0"));
    if (!el) return;
    var at = s.start;
    var dur = s.end - s.start;
    var w0 = s.wordTimings && s.wordTimings.length ? Number(s.wordTimings[0].t) || 0 : 0;
    var onset = clamp(s.speechStart != null ? s.speechStart - s.start : w0, 0.02, Math.min(0.4, dur * 0.22));
    var scIn = el.querySelector(".sc-in");

    if (i === 0) {{
      gsap.set(el, {{ autoAlpha: 1 }});
    }} else {{
      gsap.set(el, {{ autoAlpha: 0 }});
      tl.set(el, {{ autoAlpha: 1 }}, at);
      if (scIn) {{
        gsap.set(scIn, {{ scale: 0.99, opacity: 0.92 }});
        tl.to(scIn, {{ scale: 1, opacity: 1, duration: 0.22, ease: "power3.out" }}, at);
      }}
      queueSFX("whoosh", at + onset, {{ vol: 0.48 }});
    }}
    if (i < SCENES.length - 1) tl.set(el, {{ autoAlpha: 0 }}, at + dur);

    popIn(el.querySelector(".{prefix}-eyebrow"), at, {{ y: 8, dur: 0.22 }});
    popIn(el.querySelector(".{prefix}-card"), at + onset, {{ y: 12, dur: 0.28 }});
    popIn(el.querySelector(".{prefix}-headline"), at + onset, {{ y: 10, dur: 0.28 }});
    popIn(el.querySelector(".{prefix}-subline"), at + onset + 0.14, {{ y: 8, dur: 0.26 }});
    q(el, ".{prefix}-pill").forEach(function (p, pi) {{
      var t = at + Math.min(dur - 0.5, onset + 0.22 + pi * 0.24);
      popIn(p, t, {{ y: 8, scale: 0.92, dur: 0.24 }});
      queueSFX("pop", t + 0.04, {{ vol: 0.7 }});
    }});
  }});

  window.__timelines = window.__timelines || {{}};
  window.__timelines["__COMPOSITION_ID__"] = tl;
}})();
"""

    renderer_mjs = f"""// Dedicated renderer for the '{slug}' style preset.
import fs from "node:fs/promises";
import path from "node:path";
import {{ fileURLToPath }} from "node:url";

const PRESET_DIR = path.dirname(fileURLToPath(import.meta.url));
const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\\/*/g, "&#47;*")
    .replace(/\\*\\//g, "*&#47;");

export async function renderPresetDocument({{
  project, scenes, total, compositionId, width, height, isPortrait, fps, audio, title, fontsCss, gsapJS, stageAsset,
}}) {{
  const CSS = await fs.readFile(path.join(PRESET_DIR, "style.css"), "utf8");
  const SFX_JS = await fs.readFile(path.join(PRESET_DIR, "sfx.js"), "utf8");
  const ANIM_JS = (await fs.readFile(path.join(PRESET_DIR, "anim.js"), "utf8"))
    .replace('"__COMPOSITION_ID__"', JSON.stringify(compositionId));

  const body = scenes.map((s, i) => {{
    const id = `s${{String(i + 1).padStart(3, "0")}}`;
    const dur = s.end - s.start;
    const eyebrow = s.eyebrow ? `<div class="{prefix}-eyebrow">${{esc(s.eyebrow)}}</div>` : "";
    const headline = s.headline ? `<h1 class="{prefix}-headline">${{esc(s.headline)}}</h1>` : "";
    const subline = s.subline ? `<p class="{prefix}-subline">${{esc(s.subline)}}</p>` : "";
    const m = s.meta || {{}};
    const badge = m.badge ? `<span class="{prefix}-pill">${{esc(m.badge)}}</span>` : "";
    return `<section id="${{id}}" class="clip sc sc-${{esc(s.type)}}" data-start="${{s.start.toFixed(3)}}" data-duration="${{dur.toFixed(3)}}" data-track-index="2" data-hold>
  <div class="sc-in" data-layout-allow-overflow>
    <div class="{prefix}-card">
      ${{eyebrow}}
      ${{headline}}
      ${{subline}}
      ${{badge}}
    </div>
  </div>
</section>`;
  }}).join("\\n");

  const bgmRaw = project.bgm || project.music || null;
  const bgm = bgmRaw ? stageAsset(bgmRaw) : null;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=${{width}}, height=${{height}}" />
<title>${{esc(title)}}</title>
<script>${{gsapJS}}</script>
<style>
:root {{
  --composition-width: ${{width}}px;
  --composition-height: ${{height}}px;
}}
${{fontsCss}}
${{CSS}}
body {{ width: ${{width}}px; height: ${{height}}px; }}
#root {{ width: ${{width}}px; height: ${{height}}px; }}
</style>
</head>
<body>
<div id="root" class="${{isPortrait ? "is-portrait" : "is-landscape"}}" data-aspect="${{isPortrait ? "9:16" : "16:9"}}" data-style="{slug}" data-composition-id="${{esc(compositionId)}}" data-start="0" data-width="${{width}}" data-height="${{height}}" data-fps="${{fps}}" data-duration="${{total.toFixed(3)}}">
  ${{body}}
  ${{bgm ? `<audio id="bgm" src="${{esc(bgm)}}" data-start="0" data-duration="${{total.toFixed(3)}}" data-track-index="5" data-volume="0.14"></audio>` : ""}}
  <audio id="vo" src="${{esc(audio)}}" data-start="0" data-duration="${{total.toFixed(3)}}" data-track-index="1" data-volume="1"></audio>
  <audio id="sfx" src="build/sfx_track.wav" data-start="0" data-duration="${{total.toFixed(3)}}" data-track-index="3" data-volume="1"></audio>
</div>
<script>
window.__COMPOSITION_ID__ = ${{JSON.stringify(compositionId)}};
window.__SCENES__ = ${{JSON.stringify(scenes.map((s) => ({{
  start: s.start,
  end: s.end,
  speechStart: s.speechStart ?? null,
  speechEnd: s.speechEnd ?? null,
  type: s.type,
  accent: s.accent,
  act: s.act,
  revealTime: s.revealTime ?? null,
  meta: s.meta || {{}},
  wordTimings: s.wordTimings || [],
}})))}};
window.__TOTAL__ = ${{total.toFixed(3)}};
${{SFX_JS}}
${{ANIM_JS}}
</script>
</body>
</html>`;
}}
"""

    schema_py = f'''"""Schema validation for the '{slug}' preset."""
from __future__ import annotations

from pathlib import Path

PRESET_TYPES = {{
    "{prefix}_title",
    "{prefix}_card",
    "{prefix}_outro",
}}


def validate_preset_scene(
    scene: dict,
    i: int,
    acts: dict,
    errors: list[str],
    warnings: list[str],
    *,
    project_dir: Path | None = None,
) -> bool:
    stype = scene.get("type")
    if stype not in PRESET_TYPES:
        return False
    where = f"scene {{i + 1}} ({{stype}})"
    if not isinstance(scene.get("headline"), str) or not scene["headline"].strip():
        errors.append(f"{{where}}.headline: required")
    if not isinstance(scene.get("narration"), str) or not scene["narration"].strip():
        errors.append(f"{{where}}.narration: required")
    return True


def validate_preset_project(scenes: list, warnings: list[str]) -> None:
    return None
'''

    doc_md = f"""# {slug} Style Preset

Scaffolded from `rea-video` reference dissection via `scripts/ralph_style.py`.

- **Canvas background:** `{bg_hex}`
- **Primary accent:** `{accent_hex}`
- **Preset files:** `engine/presets/{slug}/`
"""

    test_mjs = f"""import {{ test, after }} from 'node:test';
import assert from 'node:assert/strict';
import {{ execFileSync }} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PYTHON = process.platform === 'win32' ? 'python' : 'python3';
const SLUG = `{prefix}-smoke-${{process.pid}}-${{Date.now()}}`;
const WS = path.join(ROOT, 'workspaces', SLUG);

after(async () => {{
  await fs.rm(WS, {{ recursive: true, force: true }});
}});

test('{slug} preset scaffolds, validates, builds, and passes QA', async () => {{
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/project.mjs'), 'new', SLUG], {{ cwd: ROOT, stdio: 'pipe' }});
  const video = {{
    title: '{slug} Smoke Test',
    slug: SLUG,
    compositionId: SLUG,
    style: '{slug}',
    audio: 'voiceover.wav',
    composition: {{ width: 1920, height: 1080, fps: 30 }},
    acts: [{{ id: 'a1', name: 'ACT 1', accent: '{accent_hex}' }}],
    scenes: [
      {{ id: 's001', type: '{prefix}_title', act: 'a1', eyebrow: 'INTRO', headline: 'Opening Frame', subline: 'Reference style check', narration: 'Opening frame for {slug} style preset.' }},
      {{ id: 's002', type: '{prefix}_outro', act: 'a1', eyebrow: 'END', headline: 'Summary', subline: 'Subscribe', narration: 'Thanks for watching.' }}
    ]
  }};
  await fs.writeFile(path.join(WS, 'video.json'), JSON.stringify(video, null, 2));
  execFileSync(PYTHON, [path.join(ROOT, 'engine/validate.py'), '--project', SLUG], {{ cwd: ROOT, stdio: 'pipe' }});
  execFileSync(PYTHON, [path.join(ROOT, 'engine/align.py'), '--project', SLUG, '--draft'], {{ cwd: ROOT, stdio: 'pipe' }});
  execFileSync(process.execPath, [path.join(ROOT, 'engine/build.mjs'), '--project', SLUG], {{ cwd: ROOT, stdio: 'pipe' }});
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/qa_frames.mjs'), '--project', SLUG], {{ cwd: ROOT, stdio: 'pipe' }});

  const html = await fs.readFile(path.join(WS, 'index.html'), 'utf8');
  assert.match(html, /data-style="{slug}"/);
  const qa = JSON.parse(await fs.readFile(path.join(WS, 'build/qa/local/report.json'), 'utf8'));
  assert.deepEqual(qa.overflow, []);
  assert.deepEqual(qa.jitter, []);
}});
"""

    (preset_dir / "style.css").write_text(style_css, encoding="utf-8")
    (preset_dir / "sfx.js").write_text(sfx_js, encoding="utf-8")
    (preset_dir / "anim.js").write_text(anim_js, encoding="utf-8")
    (preset_dir / "renderer.mjs").write_text(renderer_mjs, encoding="utf-8")
    (preset_dir / "schema.py").write_text(schema_py, encoding="utf-8")
    doc_path.write_text(doc_md, encoding="utf-8")
    test_path.write_text(test_mjs, encoding="utf-8")

    return {
        "style": slug,
        "preset_dir": str(preset_dir),
        "doc_path": str(doc_path),
        "test_path": str(test_path),
    }


def _check_sfx_sync(sfx_track_path: Path, scenes_path: Path, bp: dict[str, Any]) -> dict[str, Any]:
    """Verify baked SFX schedule is chronological, collision-free, and covers cuts/beats."""
    if not sfx_track_path.is_file():
        return {"ok": False, "reason": "missing build/sfx_track.json", "count": 0, "collisions": []}
    events = json.loads(sfx_track_path.read_text(encoding="utf-8"))
    scenes = json.loads(scenes_path.read_text(encoding="utf-8")) if scenes_path.is_file() else []
    chronological = all(events[i]["at"] >= events[i - 1]["at"] for i in range(1, len(events)))
    collisions = [
        {"i": i, "prev": events[i - 1]["at"], "curr": events[i]["at"]}
        for i in range(1, len(events))
        if (events[i]["at"] - events[i - 1]["at"]) < 0.070
    ]
    cuts_covered = 0
    for sc in scenes[1:]:
        st = float(sc.get("start", 0.0))
        if any(abs(ev["at"] - st) <= 0.45 for ev in events):
            cuts_covered += 1
    expected_cuts = max(0, len(scenes) - 1)
    cut_coverage = (cuts_covered / expected_cuts) if expected_cuts else 1.0
    orig_sfx = len(bp.get("sfx_events") or [])
    ok = chronological and len(collisions) == 0 and len(events) > 0 and cut_coverage >= 0.8
    return {
        "ok": ok,
        "count": len(events),
        "original_sfx_count": orig_sfx,
        "chronological": chronological,
        "collisions": collisions,
        "cut_coverage": round(cut_coverage, 3),
    }


def _detect_missing_scene_types(bp: dict[str, Any], scenes: list[dict[str, Any]]) -> list[str]:
    """Compare original shot categories / visual clues against cloned scene types."""
    used_types = {str(s.get("type", "")).lower() for s in scenes}
    orig_cats = [str(c).lower() for c in (bp.get("categories") or [])]
    orig_texts = " ".join(str(sh.get("text") or "") for sh in (bp.get("shots") or [])).lower()
    missing: list[str] = []

    # Check structural shot count coverage
    orig_shots = int(bp.get("shot_count") or 0)
    if orig_shots >= 4 and len(scenes) < max(2, int(orig_shots * 0.4)):
        missing.append(f"shot-granularity (original has {orig_shots} shots vs {len(scenes)} scenes)")

    # Check visual archetypes suggested by original text/categories
    if any(k in orig_cats for k in ("code", "terminal", "ide")) or ("def " in orig_texts or "function " in orig_texts):
        if not any(t in used_types for t in ("code", "diff", "terminal", "me_editor_window", "cb_code")):
            missing.append("code/editor scene type")
    if any(k in orig_cats for k in ("chart", "graph", "bar", "metric")) and not any(
        t in used_types for t in ("stat", "compare", "me_bar_compare", "me_line_chart", "me_stat_split", "cb_stat", "cb_compare")
    ):
        missing.append("chart/metric comparison scene type")
    return missing


def compute_fidelity_gate(
    compare_data: dict[str, Any],
    qa_report: dict[str, Any],
    sfx_check: dict[str, Any],
    missing_scene_types: list[str],
    *,
    threshold: float = DEFAULT_THRESHOLD,
) -> dict[str, Any]:
    """Evaluate the composite >= 97% clone fidelity gate across visual, structural, QA, and SFX."""
    visual_score = round(float(compare_data.get("score") or 0.0) * 100.0, 2)
    place_score = round(float(compare_data.get("place") or 0.0) * 100.0, 2)
    shape_score = round(float(compare_data.get("shape") or 0.0) * 100.0, 2)
    timing_lag = abs(float((compare_data.get("offset") or {}).get("seconds") or 0.0))
    qa_overflow = len(qa_report.get("overflow") or [])
    qa_jitter = len(qa_report.get("jitter") or [])
    sfx_ok = bool(sfx_check.get("ok"))

    gates = {
        "visual_score_ge_threshold": visual_score >= threshold,
        "zero_missing_scene_types": len(missing_scene_types) == 0,
        "zero_qa_overflow": qa_overflow == 0,
        "zero_qa_jitter": qa_jitter == 0,
        "sfx_sync_ok": sfx_ok,
        "timing_lag_le_025s": timing_lag <= 0.25,
    }
    passed = all(gates.values())
    return {
        "passed": passed,
        "threshold": threshold,
        "visual_score_pct": visual_score,
        "place_pct": place_score,
        "shape_pct": shape_score,
        "timing_lag_s": round(timing_lag, 3),
        "qa_overflow": qa_overflow,
        "qa_jitter": qa_jitter,
        "missing_scene_types": missing_scene_types,
        "sfx_sync": sfx_check,
        "gates": gates,
    }


def _write_gap_report(
    ws_dir: Path,
    iter_num: int,
    style: str,
    gate: dict[str, Any],
    compare_data: dict[str, Any],
    draft_dissect_dir: Path,
    compare_dir: Path,
) -> tuple[Path, Path]:
    notes_dir = ws_dir / "notes"
    notes_dir.mkdir(parents=True, exist_ok=True)
    json_path = notes_dir / f"gap_report_iter_{iter_num}.json"
    md_path = notes_dir / f"gap_report_iter_{iter_num}.md"

    payload = {
        "iteration": iter_num,
        "style": style,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "gate": gate,
        "compare_advice": compare_data.get("advice") or [],
        "offset": compare_data.get("offset"),
        "worst_timestamps": compare_data.get("worst") or [],
        "worst_scenes": (compare_data.get("scenes") or [])[:8],
        "compare_sheet": str(compare_dir / "compare_worst.jpg"),
        "draft_video_md": str(draft_dissect_dir / "VIDEO.md"),
    }
    json_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    lines = [
        f"# Ralph Loop Gap Report - Iteration {iter_num} ({style})",
        "",
        f"- **Gate Status:** {'PASS' if gate['passed'] else 'NEEDS PATCH'} (target >= {gate['threshold']:.1f}%)",
        f"- **Visual Score (`rea-video compare`):** {gate['visual_score_pct']:.2f}% (place {gate['place_pct']:.2f}%, shape {gate['shape_pct']:.2f}%)",
        f"- **Timing Offset:** {gate['timing_lag_s']:.3f}s",
        f"- **QA Layout:** {gate['qa_overflow']} overflow, {gate['qa_jitter']} jitter",
        f"- **Missing Scene Types:** {', '.join(gate['missing_scene_types']) or 'None'}",
        f"- **SFX Sync:** ok={gate['sfx_sync']['ok']}, cues={gate['sfx_sync']['count']}, cut_coverage={gate['sfx_sync'].get('cut_coverage')}",
        f"- **Side-by-side Worst Frames Sheet:** `{payload['compare_sheet']}`",
        f"- **Draft Dissection:** `{payload['draft_video_md']}`",
        "",
        "## Priority Advice (`rea-video compare`)",
        "",
    ]
    for tip in payload["compare_advice"] or ["No frame-level visual advice reported."]:
        lines.append(f"- {tip}")

    if payload["offset"] and payload["offset"].get("advice"):
        lines.extend(["", "## Timing Offset", "", f"- {payload['offset']['advice']}"])

    if payload["worst_scenes"]:
        lines.extend(["", "## Worst Scenes", "", "| Scene | Start | End | Score | Shape | Advice |", "|---|---:|---:|---:|---:|---|"])
        for sc in payload["worst_scenes"]:
            adv = "; ".join(sc.get("advice") or [])
            lines.append(
                f"| {sc.get('id')} | {sc.get('start', 0):.2f} | {sc.get('end', 0):.2f} | "
                f"{float(sc.get('score', 0))*100:.1f}% | {float(sc.get('shape', 0))*100:.1f}% | {adv} |"
            )

    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return md_path, json_path


def cmd_styles(args: argparse.Namespace) -> int:
    styles, aliases = discover_styles(ENGINE_ROOT)
    if args.json:
        print(json.dumps({"styles": styles, "aliases": aliases}, indent=2))
    else:
        print("Available styles:")
        for s in styles:
            print(f"  - {s}")
    return 0


def cmd_preflight(args: argparse.Namespace) -> int:
    res = check_preflight(install=not args.no_install, engine_root=ENGINE_ROOT)
    print(json.dumps(res, indent=2))
    return 0 if res["ok"] else 1


def cmd_prepare(args: argparse.Namespace) -> int:
    val = validate_mode_and_style(args.mode, args.style, ENGINE_ROOT)
    if not val["ok"]:
        print(json.dumps(val, indent=2))
        return 10 if val["status"] == "needs_clarification" else 11

    mode = val["mode"]
    style = val["style"]
    pre = check_preflight(install=not args.no_install, engine_root=ENGINE_ROOT)
    if not pre["ok"]:
        print(json.dumps({"status": "preflight_failed", "preflight": pre}, indent=2))
        return 1

    raw_slug = args.project or f"_ralph-{slugify_workspace(style)}"
    if not raw_slug.startswith("_ralph-"):
        raw_slug = f"_ralph-{slugify_workspace(raw_slug)}"
    ws_dir = resolve_project_dir(raw_slug, engine_root=ENGINE_ROOT, use_active=False, must_exist=False)
    for sub in ("source", "dissect/original", "notes", "assets/logos", "assets/webref", "build", "renders"):
        (ws_dir / sub).mkdir(parents=True, exist_ok=True)
    (ws_dir / "notes" / "preflight.json").write_text(json.dumps(pre, indent=2) + "\n", encoding="utf-8")

    # 1. Ingest input video
    src_raw = ws_dir / "source" / "input.mp4"
    src_orig = ws_dir / "source" / "original.mp4"
    if _is_url(args.input):
        _run(
            [
                "yt-dlp",
                "-f",
                "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b",
                "--merge-output-format",
                "mp4",
                "-o",
                str(src_raw),
                "--force-overwrites",
                args.input,
            ]
        )
    else:
        in_path = Path(args.input).expanduser().resolve()
        if not in_path.is_file():
            raise SystemExit(f"Input video file not found: {in_path}")
        shutil.copy2(in_path, src_raw)

    # Optional slice for long videos
    clip_s, clip_e = parse_clip_range(args.clip)
    if clip_s is not None and clip_e is not None:
        _run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-y",
                "-ss",
                f"{clip_s:.3f}",
                "-to",
                f"{clip_e:.3f}",
                "-i",
                str(src_raw),
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-c:a",
                "aac",
                str(src_orig),
            ]
        )
    elif args.max_duration and args.max_duration > 0:
        _run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-y",
                "-t",
                f"{float(args.max_duration):.3f}",
                "-i",
                str(src_raw),
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-c:a",
                "aac",
                str(src_orig),
            ]
        )
    else:
        shutil.copy2(src_raw, src_orig)

    # 2. Extract clean vocals into voiceover.wav
    vo_wav = ws_dir / "voiceover.wav"
    stems_info = extract_clean_voiceover(src_orig, ws_dir / "dissect" / "original", vo_wav)

    # 3. Dissect original video with rea-video decompose
    orig_dissect = ws_dir / "dissect" / "original"
    use_vlm = args.vlm if args.vlm is not None else _vlm_available()
    dec_cmd = ["rea-video", "decompose", str(src_orig), "-o", str(orig_dissect), "--lang", "en"]
    dec_cmd.append("--vlm" if use_vlm else "--no-vlm")
    _run(dec_cmd)

    bp = _collect_blueprint(src_orig, orig_dissect, ws_dir)

    # 4. Scaffold new preset if mode == 'new'
    scaffold_info = None
    if mode == "new":
        scaffold_info = scaffold_preset(style, blueprint=bp, engine_root=ENGINE_ROOT, overwrite=args.force)

    # 5. Transcribe extracted voiceover and seed starter video.json
    vo_json = ws_dir / "build" / "vo.json"
    if not vo_json.is_file():
        # Create minimal video.json first so transcribe.py can resolve audio path
        _seed_video_json(ws_dir, ws_dir.name, style, bp)
        tr_cmd = [PYTHON, str(ENGINE_ROOT / "engine" / "transcribe.py"), "--project", ws_dir.name]
        if args.asr_model:
            tr_cmd.extend(["--model", args.asr_model])
        _run(tr_cmd)
    if vo_json.is_file():
        vo_data = json.loads(vo_json.read_text(encoding="utf-8"))
        # Refresh starter video.json only if user/agent hasn't customized it yet
        if args.force or not (ws_dir / "video.json").is_file():
            _seed_video_json(ws_dir, ws_dir.name, style, bp, vo_data.get("segments"))
        else:
            # Replace placeholder seed if it only had the 2-scene dummy template
            cur_v = json.loads((ws_dir / "video.json").read_text(encoding="utf-8"))
            if len(cur_v.get("scenes", [])) == 2 and cur_v.get("scenes", [{}])[0].get("narration") == "Draft baseline scene aligned to extracted voiceover.":
                (ws_dir / "video.json").unlink()
                _seed_video_json(ws_dir, ws_dir.name, style, bp, vo_data.get("segments"))

    state = {
        "mode": mode,
        "style": style,
        "workspace": ws_dir.name,
        "workspace_dir": str(ws_dir),
        "input": args.input,
        "stems": stems_info,
        "scaffold": scaffold_info,
        "vlm_used": use_vlm,
        "iterations": [],
    }
    (ws_dir / "notes" / "ralph_state.json").write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "prepared", **state}, indent=2))
    return 0


def cmd_scaffold_style(args: argparse.Namespace) -> int:
    bp = None
    if args.blueprint:
        bp = json.loads(Path(args.blueprint).read_text(encoding="utf-8"))
    info = scaffold_preset(args.style, blueprint=bp, engine_root=ENGINE_ROOT, overwrite=args.force)
    print(json.dumps({"status": "scaffolded", **info}, indent=2))
    return 0


def run_iteration(
    ws_dir: Path,
    *,
    iter_num: int,
    max_iters: int = DEFAULT_MAX_ITERS,
    threshold: float = DEFAULT_THRESHOLD,
    every: float = 0.5,
) -> tuple[int, dict[str, Any]]:
    """Run one full build -> QA -> draft render -> rea-video dissect & compare iteration."""
    state_path = ws_dir / "notes" / "ralph_state.json"
    state = json.loads(state_path.read_text(encoding="utf-8")) if state_path.is_file() else {}
    video_data = json.loads((ws_dir / "video.json").read_text(encoding="utf-8"))
    style = str(video_data.get("style") or state.get("style") or "default").lower()
    bp_path = ws_dir / "notes" / "original_blueprint.json"
    bp = json.loads(bp_path.read_text(encoding="utf-8")) if bp_path.is_file() else {}

    proj_name = ws_dir.name
    # 1. Validate, transcribe if needed, align, build
    _run([PYTHON, str(ENGINE_ROOT / "engine" / "validate.py"), "--project", proj_name])
    if not (ws_dir / "build" / "vo.json").is_file():
        _run([PYTHON, str(ENGINE_ROOT / "engine" / "transcribe.py"), "--project", proj_name])
    _run([PYTHON, str(ENGINE_ROOT / "engine" / "align.py"), "--project", proj_name])
    _run(["node", str(ENGINE_ROOT / "engine" / "build.mjs"), "--project", proj_name])

    # 2. HyperFrames lint + check + headless QA frames
    _run(["node", str(ENGINE_ROOT / "scripts" / "project.mjs"), "hf", "lint", "--project", proj_name])
    _run(["node", str(ENGINE_ROOT / "scripts" / "project.mjs"), "hf", "check", "--project", proj_name])
    _run(["node", str(ENGINE_ROOT / "scripts" / "qa_frames.mjs"), "--project", proj_name])

    # 3. Headless draft render inside the isolated loop workspace
    draft_mp4 = ws_dir / "renders" / f"draft_iter_{iter_num}.mp4"
    _run(
        [
            "node",
            str(ENGINE_ROOT / "scripts" / "project.mjs"),
            "hf",
            "render",
            "--project",
            proj_name,
            "--quality",
            "draft",
            "--output",
            f"renders/draft_iter_{iter_num}.mp4",
        ]
    )

    # 4. Dissect draft render and compare against original
    draft_dissect = ws_dir / "dissect" / f"draft_iter_{iter_num}"
    compare_dir = ws_dir / "dissect" / f"compare_iter_{iter_num}"
    _run(["rea-video", "decompose", str(draft_mp4), "-o", str(draft_dissect), "--lang", "en", "--no-vlm"])

    orig_mp4 = ws_dir / "source" / "original.mp4"
    cmp_cmd = [
        "rea-video",
        "compare",
        str(orig_mp4),
        str(draft_mp4),
        "--every",
        str(every),
        "--worst",
        "10",
        "-o",
        str(compare_dir),
    ]
    orig_scenes_json = ws_dir / "dissect" / "original" / "frames" / "scenes.json"
    if orig_scenes_json.is_file():
        cmp_cmd.extend(["--scenes", str(orig_scenes_json)])
    _run(cmp_cmd)

    compare_data = json.loads((compare_dir / "compare.json").read_text(encoding="utf-8"))
    qa_report = json.loads((ws_dir / "build" / "qa" / "local" / "report.json").read_text(encoding="utf-8"))
    scenes_json = json.loads((ws_dir / "build" / "scenes.json").read_text(encoding="utf-8"))
    sfx_check = _check_sfx_sync(ws_dir / "build" / "sfx_track.json", ws_dir / "build" / "scenes.json", bp)
    missing_types = _detect_missing_scene_types(bp, scenes_json)

    gate = compute_fidelity_gate(
        compare_data,
        qa_report,
        sfx_check,
        missing_types,
        threshold=threshold,
    )
    md_path, json_path = _write_gap_report(ws_dir, iter_num, style, gate, compare_data, draft_dissect, compare_dir)

    iter_record = {
        "iter": iter_num,
        "draft_mp4": str(draft_mp4),
        "gap_report_md": str(md_path),
        "gap_report_json": str(json_path),
        "passed": gate["passed"],
        "visual_score_pct": gate["visual_score_pct"],
    }
    state.setdefault("iterations", []).append(iter_record)
    state_path.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")

    status = "RALPH_GATE_PASS" if gate["passed"] else ("RALPH_MAX_ITERS" if iter_num >= max_iters else "RALPH_NEEDS_PATCH")
    summary = {
        "status": status,
        "iteration": iter_num,
        "max_iters": max_iters,
        "style": style,
        "workspace": proj_name,
        "gate": gate,
        "gap_report_md": str(md_path),
        "compare_sheet": str(compare_dir / "compare_worst.jpg"),
    }
    print(json.dumps(summary, indent=2))
    if gate["passed"]:
        return 0, summary
    if iter_num >= max_iters:
        return 3, summary
    return 2, summary


def cmd_iterate(args: argparse.Namespace) -> int:
    ws_dir = resolve_project_dir(args.project, engine_root=ENGINE_ROOT, use_active=False, must_exist=True)
    state_path = ws_dir / "notes" / "ralph_state.json"
    next_iter = args.iter
    if next_iter is None:
        if state_path.is_file():
            st = json.loads(state_path.read_text(encoding="utf-8"))
            next_iter = len(st.get("iterations") or []) + 1
        else:
            next_iter = 1
    code, _ = run_iteration(
        ws_dir,
        iter_num=next_iter,
        max_iters=args.max_iters,
        threshold=args.threshold,
        every=args.every,
    )
    return code


def cmd_run(args: argparse.Namespace) -> int:
    rc = cmd_prepare(args)
    if rc != 0:
        return rc
    raw_slug = args.project or f"_ralph-{slugify_workspace(args.style)}"
    if not raw_slug.startswith("_ralph-"):
        raw_slug = f"_ralph-{slugify_workspace(raw_slug)}"
    ws_dir = resolve_project_dir(raw_slug, engine_root=ENGINE_ROOT, use_active=False, must_exist=True)

    for k in range(1, args.max_iters + 1):
        code, summary = run_iteration(
            ws_dir,
            iter_num=k,
            max_iters=args.max_iters,
            threshold=args.threshold,
            every=args.every,
        )
        if code == 0 or code == 3:
            return code
        if args.patch_cmd:
            env = {
                "RALPH_WORKSPACE": str(ws_dir),
                "RALPH_GAP_JSON": summary["gap_report_md"].replace(".md", ".json"),
                "RALPH_GAP_MD": summary["gap_report_md"],
                "RALPH_ITER": str(k),
                "RALPH_STYLE": summary["style"],
            }
            subprocess.run(args.patch_cmd, cwd=ENGINE_ROOT, shell=True, check=True, env={**os.environ, **env})
        else:
            # Hybrid agent mode: return exit 2 with the exact gap report path so the coding agent patches and invokes `iterate`.
            return 2
    return 3


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="command", required=True)

    p_styles = sub.add_parser("styles", help="List available styles in this engine")
    p_styles.add_argument("--json", action="store_true")
    p_styles.set_defaults(func=cmd_styles)

    p_pre = sub.add_parser("preflight", help="Check and install required tools/dependencies")
    p_pre.add_argument("--no-install", action="store_true")
    p_pre.set_defaults(func=cmd_preflight)

    def _add_prepare_args(p: argparse.ArgumentParser) -> None:
        p.add_argument("--input", required=True, help="Local video path or YouTube URL")
        p.add_argument("--mode", choices=["new", "enhance"], default=None)
        p.add_argument("--style", default=None, help="Existing style (enhance) or new style slug (new)")
        p.add_argument("--project", default=None, help="Workspace slug under workspaces/_ralph-*")
        p.add_argument("--clip", default=None, help="Optional START-END time slice (e.g. 0-60)")
        p.add_argument("--max-duration", type=float, default=None, help="Optional max seconds from start")
        p.add_argument("--asr-model", default=None, help="Whisper model override (e.g. small.en)")
        p.add_argument("--vlm", dest="vlm", action="store_true", default=None)
        p.add_argument("--no-vlm", dest="vlm", action="store_false")
        p.add_argument("--no-install", action="store_true")
        p.add_argument("--force", action="store_true")

    p_prep = sub.add_parser("prepare", help="Ingest video/URL, extract vocal stems, dissect original, seed workspace")
    _add_prepare_args(p_prep)
    p_prep.set_defaults(func=cmd_prepare)

    p_scaf = sub.add_parser("scaffold-style", help="Scaffold a new preset under engine/presets/<style>/")
    p_scaf.add_argument("--style", required=True)
    p_scaf.add_argument("--blueprint", default=None)
    p_scaf.add_argument("--force", action="store_true")
    p_scaf.set_defaults(func=cmd_scaffold_style)

    p_it = sub.add_parser("iterate", help="Build, QA, draft render, dissect draft, and run 97% compare gate")
    p_it.add_argument("--project", required=True)
    p_it.add_argument("--iter", type=int, default=None)
    p_it.add_argument("--max-iters", type=int, default=DEFAULT_MAX_ITERS)
    p_it.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD)
    p_it.add_argument("--every", type=float, default=0.5)
    p_it.set_defaults(func=cmd_iterate)

    p_run = sub.add_parser("run", help="Run prepare + iterate loop (with optional --patch-cmd hook)")
    _add_prepare_args(p_run)
    p_run.add_argument("--max-iters", type=int, default=DEFAULT_MAX_ITERS)
    p_run.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD)
    p_run.add_argument("--every", type=float, default=0.5)
    p_run.add_argument("--patch-cmd", default=None, help="Optional shell hook run between failed iterations")
    p_run.set_defaults(func=cmd_run)

    return ap


def main() -> int:
    ap = build_parser()
    args = ap.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
