"""Validate content/video.json before transcribing, aligning, or building.

Errors are structural problems that will break the composition. Warnings are
editorial or portability issues worth fixing before a render.

Usage:
    python engine/validate.py
    python engine/validate.py content/video.json --strict
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from engine.workspace import (  # noqa: E402
    default_audio_rel,
    project_json_path,
    resolve_project_dir,
    resolve_project_path,
)

DEFAULT_PROJECT = ROOT / "content/video.json"

TYPES = {
    "cold",
    "hero",
    "statement",
    "stat",
    "dateline",
    "code",
    "diff",
    "flow",
    "ledger",
    "memory",
    "timeline",
    "terminal",
    "compare",
    "stack",
    "quote",
    "matrix",
    "outro",
    "webref",
    "meme",
    "cloud",
    "mascot",
    "split",
}
CODE_KINDS = {"code", "hot", "dim", "str", "com", "fn", "kw", "key", "err", "bad", "out"}
DIFF_KINDS = {"ctx", "add", "del"}
TERM_KINDS = {"cmd", "out", "err"}
MASCOT_EXPRESSIONS = {"neutral", "talking", "thinking", "shocked", "cool", "happy", "angry", "sad", "facepalm", "pointing", "panic", "skeptical", "solved"}
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def resolve(path: str | Path) -> Path:
    p = Path(path)
    return p if p.is_absolute() else (ROOT / p)


def load_json(path: Path):
    if not path.exists():
        raise SystemExit(f"missing file: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"invalid JSON in {path}: {exc}")


def sfield(obj: dict, key: str, where: str, errors: list[str], *, required=False, max_len=None):
    if key not in obj or obj[key] is None:
        if required:
            errors.append(f"{where}.{key}: required")
        return None
    value = obj[key]
    if not isinstance(value, str):
        errors.append(f"{where}.{key}: must be a string")
        return None
    if required and not value.strip():
        errors.append(f"{where}.{key}: must not be empty")
    if max_len and len(value) > max_len:
        errors.append(f"{where}.{key}: {len(value)} chars (max {max_len})")
    return value


def ifield(obj: dict, key: str, where: str, errors: list[str], *, required=False, lo=None, hi=None):
    if key not in obj or obj[key] is None:
        if required:
            errors.append(f"{where}.{key}: required")
        return None
    value = obj[key]
    if not isinstance(value, int) or isinstance(value, bool):
        errors.append(f"{where}.{key}: must be an integer")
        return None
    if lo is not None and value < lo:
        errors.append(f"{where}.{key}: {value} (min {lo})")
    if hi is not None and value > hi:
        errors.append(f"{where}.{key}: {value} (max {hi})")
    return value


def listfield(obj: dict, key: str, where: str, errors: list[str], *, required=False, lo=None, hi=None):
    if key not in obj or obj[key] is None:
        if required:
            errors.append(f"{where}.{key}: required")
        return []
    value = obj[key]
    if not isinstance(value, list):
        errors.append(f"{where}.{key}: must be an array")
        return []
    if lo is not None and len(value) < lo:
        errors.append(f"{where}.{key}: {len(value)} items (min {lo})")
    if hi is not None and len(value) > hi:
        errors.append(f"{where}.{key}: {len(value)} items (max {hi})")
    return value


def objectfield(obj: dict, key: str, where: str, errors: list[str], *, required=False):
    if key not in obj or obj[key] is None:
        if required:
            errors.append(f"{where}.{key}: required")
        return {}
    value = obj[key]
    if not isinstance(value, dict):
        errors.append(f"{where}.{key}: must be an object")
        return {}
    return value


def check_items(items: list, where: str, errors: list[str], required: tuple[str, ...], optional: tuple[str, ...] = ()) -> list[dict]:
    out = []
    for k, item in enumerate(items):
        if not isinstance(item, dict):
            errors.append(f"{where}[{k}]: must be an object")
            continue
        out.append(item)
        for key in required:
            sfield(item, key, f"{where}[{k}]", errors, required=True)
        for key in optional:
            sfield(item, key, f"{where}[{k}]", errors)
    return out


def check_str_array(items: list, where: str, errors: list[str]) -> None:
    for k, item in enumerate(items):
        if not isinstance(item, str) or not item.strip():
            errors.append(f"{where}[{k}]: must be a non-empty string")


def validate_scene(
    scene: dict,
    i: int,
    acts: dict,
    top_channel: str,
    top_ghost: str,
    errors: list[str],
    warnings: list[str],
    project_dir: Path = ROOT,
) -> None:
    where = f"scene {i + 1}"
    scene_type = scene.get("type")
    if scene_type not in TYPES:
        errors.append(f"{where}.type: {scene_type!r} (allowed: {', '.join(sorted(TYPES))})")
        return
    where = f"{where} ({scene_type})"

    headline_max = 180 if scene_type in {"quote", "code", "webref", "mascot"} else 96
    headline = sfield(scene, "headline", where, errors, required=True, max_len=headline_max)
    narration = sfield(scene, "narration", where, errors, required=True)
    subline = sfield(scene, "subline", where, errors, max_len=180)
    eyebrow = sfield(scene, "eyebrow", where, errors, max_len=60)
    sfield(scene, "id", where, errors)

    if "accent" in scene:
        accent = scene["accent"]
        if not isinstance(accent, str) or not HEX.match(accent):
            errors.append(f"{where}.accent: must be a #rrggbb string")

    act_id = scene.get("act")
    if act_id:
        if not isinstance(act_id, str):
            errors.append(f"{where}.act: must be a string")
        elif act_id not in acts:
            errors.append(f"{where}.act: unknown act {act_id!r}")

    if "variant" in scene and scene["variant"] is not None:
        variant = scene["variant"]
        if not isinstance(variant, int) or isinstance(variant, bool) or variant not in (0, 1, 2):
            errors.append(f"{where}.variant: must be 0, 1, or 2")

    sfield(scene, "ghost", where, errors)

    # Universal Mascot overlay on any scene
    if "mascot" in scene and scene["mascot"] is not None:
        m = scene["mascot"]
        if not isinstance(m, dict):
            errors.append(f"{where}.mascot: must be an object")
        else:
            expr = m.get("expression")
            if expr is not None and expr not in MASCOT_EXPRESSIONS:
                warnings.append(f"{where}.mascot.expression: unknown {expr!r} (expected: {', '.join(sorted(MASCOT_EXPRESSIONS))})")
            sfield(m, "bubble", f"{where}.mascot", errors, max_len=180)
            sfield(m, "hud", f"{where}.mascot", errors, max_len=80)
            pos = m.get("position")
            if pos is not None and pos not in {"bottom-right", "bottom-left"}:
                warnings.append(f"{where}.mascot.position: unknown {pos!r} (expected bottom-right or bottom-left)")
            tl = m.get("timeline")
            if tl is not None:
                if not isinstance(tl, list):
                    errors.append(f"{where}.mascot.timeline: must be a list of steps")
                else:
                    for idx, step in enumerate(tl):
                        if not isinstance(step, dict):
                            errors.append(f"{where}.mascot.timeline[{idx}]: must be an object")
                        else:
                            st_expr = step.get("expression")
                            if st_expr is not None and st_expr not in MASCOT_EXPRESSIONS:
                                warnings.append(f"{where}.mascot.timeline[{idx}].expression: unknown {st_expr!r}")
                            sfield(step, "bubble", f"{where}.mascot.timeline[{idx}]", errors, max_len=180)

    if headline:
        soft = 120 if scene_type in {"quote", "webref"} else 64
        if len(headline) > soft:
            warnings.append(f"{where}.headline: {len(headline)} chars; shorter reads better at 1920x1080")
    if subline and len(subline) > 120:
        warnings.append(f"{where}.subline: {len(subline)} chars; keep it under 120")
    if eyebrow and len(eyebrow) > 40:
        warnings.append(f"{where}.eyebrow: {len(eyebrow)} chars; keep it under 40")
    if narration:
        words = len(re.findall(r"\S+", narration))
        if words < 3:
            warnings.append(f"{where}.narration: only {words} words; the scene may be too short")
        if words > 45:
            warnings.append(f"{where}.narration: {words} words; the visual will hold too long, split the scene")

    meta = scene.get("meta")
    if meta is not None and not isinstance(meta, dict):
        errors.append(f"{where}.meta: must be an object")
        meta = {}
    meta = meta or {}
    sfield(meta, "source", where, errors, max_len=220)

    if scene_type in {"cold", "outro"} and not (scene.get("ghost") or meta.get("ghost") or top_ghost):
        warnings.append(f"{where}: no ghost word; the builder will fall back to the title")

    if scene_type == "cold":
        chips = listfield(meta, "chips", where, errors, lo=1, hi=5)
        check_str_array(chips, f"{where}.meta.chips", errors)
        sfield(meta, "ghost", where, errors, max_len=12)

    elif scene_type == "hero":
        mark = sfield(meta, "mark", where, errors, max_len=8)
        if not mark and not any(meta.get(k) for k in ("image", "video", "logos")):
            warnings.append(f"{where}.meta.mark: missing; hero will use the first word of the headline")
        for key in ("image", "video", "poster", "alt", "label", "caption", "position"):
            sfield(meta, key, where, errors)
        for key in ("image", "video", "poster"):
            asset = meta.get(key)
            if isinstance(asset, str) and asset and not asset.startswith(("http://", "https://", "data:")) and not resolve_project_path(asset, project_dir, ROOT).is_file():
                errors.append(f"{where}.meta.{key}: local media not found: {asset}")
        if meta.get("video") and not (meta.get("image") or meta.get("poster")):
            errors.append(f"{where}.meta.video: requires an image or poster")
        if "mediaStart" in meta and (isinstance(meta["mediaStart"], bool) or not isinstance(meta["mediaStart"], (int, float)) or meta["mediaStart"] < 0):
            errors.append(f"{where}.meta.mediaStart: must be a non-negative number")
        if "logos" in meta:
            logos = listfield(meta, "logos", where, errors, lo=1, hi=6)
            check_items(logos, f"{where}.meta.logos", errors, required=("src", "name"))
            for logo in logos:
                if isinstance(logo, dict) and isinstance(logo.get("src"), str) and not logo["src"].startswith(("http://", "https://", "data:")) and not resolve_project_path(logo["src"], project_dir, ROOT).is_file():
                    errors.append(f"{where}.meta.logos: local logo not found: {logo['src']}")
                if isinstance(logo, dict) and "background" in logo and not re.fullmatch(r"#[0-9a-fA-F]{6}", str(logo["background"])):
                    errors.append(f"{where}.meta.logos.background: must be a #rrggbb color")
        if "rule" in meta and not isinstance(meta["rule"], bool):
            errors.append(f"{where}.meta.rule: must be a boolean")

    elif scene_type == "statement":
        sfield(meta, "ghost", where, errors, max_len=24)

    elif scene_type == "stat":
        sfield(meta, "revealOn", where, errors, max_len=100)
        sfield(meta, "delta", where, errors, max_len=60)
        sfield(meta, "deltaDir", where, errors)
        for key in ("trend", "direction", "status"):
            sfield(meta, key, where, errors)
        for key in ("alert", "bad", "good", "invert"):
            if key in meta and not isinstance(meta[key], bool):
                errors.append(f"{where}.meta.{key}: must be a boolean")
        if not any(key in meta for key in ("value", "display", "stat")):
            errors.append(f"{where}.meta: needs value, display, or stat")
        if "value" in meta and not isinstance(meta["value"], (int, float, str)):
            errors.append(f"{where}.meta.value: must be a number or string")
        if "display" in meta and not isinstance(meta["display"], str):
            errors.append(f"{where}.meta.display: must be a string")
        st = objectfield(meta, "stat", where, errors)
        if st:
            if "to" not in st:
                errors.append(f"{where}.meta.stat.to: required")
            elif not isinstance(st["to"], (int, float, str)):
                errors.append(f"{where}.meta.stat.to: must be a number or numeric string")
            if "dec" in st:
                ifield(st, "dec", f"{where}.meta.stat", errors, lo=0, hi=3)
            for key in ("sep", "nocount"):
                if key in st and not isinstance(st[key], bool):
                    errors.append(f"{where}.meta.stat.{key}: must be a boolean")
        for key in ("dec", "sep", "nocount", "from"):
            if key in meta and key != "stat":
                if key == "dec":
                    ifield(meta, "dec", where, errors, lo=0, hi=3)
                elif key == "from":
                    if not isinstance(meta[key], (int, float)):
                        errors.append(f"{where}.meta.from: must be a number")
                elif not isinstance(meta[key], bool):
                    errors.append(f"{where}.meta.{key}: must be a boolean")
        for key in ("suffix", "prefix"):
            sfield(meta, key, where, errors)

    elif scene_type == "dateline":
        sfield(meta, "day", where, errors, required=True, max_len=8)
        sfield(meta, "mon", where, errors, required=True, max_len=40)
        sfield(meta, "yr", where, errors, required=True, max_len=60)
        sfield(meta, "ghost", where, errors, max_len=24)

    elif scene_type == "code":
        lines = listfield(meta, "lines", where, errors, required=True, lo=1, hi=10)
        items = check_items(lines, f"{where}.meta.lines", errors, ("t",), ("k",))
        for k, item in enumerate(items):
            kind = item.get("k")
            if kind is not None and kind not in CODE_KINDS:
                warnings.append(f"{where}.meta.lines[{k}].k: unknown kind {kind!r}")
            for bkey in ("key", "bad"):
                if bkey in item and not isinstance(item[bkey], bool):
                    errors.append(f"{where}.meta.lines[{k}].{bkey}: must be a boolean")
        sfield(meta, "file", where, errors)
        sfield(meta, "tag", where, errors)
        sfield(meta, "announce", where, errors)
        sfield(meta, "ghost", where, errors, max_len=24)

    elif scene_type == "diff":
        lines = listfield(meta, "lines", where, errors, required=True, lo=1, hi=12)
        items = check_items(lines, f"{where}.meta.lines", errors, ("k", "t"))
        for k, item in enumerate(items):
            if item.get("k") not in DIFF_KINDS:
                errors.append(f"{where}.meta.lines[{k}].k: must be ctx, add, or del")
        sfield(meta, "file", where, errors)
        sfield(meta, "ver", where, errors)
        sfield(meta, "announce", where, errors)
        sfield(meta, "ghost", where, errors, max_len=24)

    elif scene_type == "flow":
        nodes = listfield(meta, "nodes", where, errors, required=True, lo=2, hi=4)
        items = check_items(nodes, f"{where}.meta.nodes", errors, ("t",), ("k", "s"))
        for k, item in enumerate(items):
            for bkey in ("hot", "bad"):
                if bkey in item and not isinstance(item[bkey], bool):
                    errors.append(f"{where}.meta.nodes[{k}].{bkey}: must be a boolean")

    elif scene_type == "ledger":
        rows = listfield(meta, "rows", where, errors, required=True, lo=1, hi=6)
        items = check_items(rows, f"{where}.meta.rows", errors, ("k", "v"))
        for k, item in enumerate(items):
            if "bad" in item and not isinstance(item["bad"], bool):
                errors.append(f"{where}.meta.rows[{k}].bad: must be a boolean")
        sfield(meta, "head", where, errors)
        sfield(meta, "label", where, errors)
        sfield(meta, "status", where, errors)
        sfield(meta, "stamp", where, errors)
        if "live" in meta and not isinstance(meta["live"], (str, bool)):
            errors.append(f"{where}.meta.live: must be a string or false")
        points = listfield(meta, "points", where, errors, hi=4)
        check_str_array(points, f"{where}.meta.points", errors)

    elif scene_type == "memory":
        cells = listfield(meta, "cells", where, errors, required=True, lo=4, hi=16)
        items = check_items(cells, f"{where}.meta.cells", errors, ("addr",))
        for k, item in enumerate(items):
            for flag in ("live", "bad"):
                if flag in item and not isinstance(item[flag], bool):
                    errors.append(f"{where}.meta.cells[{k}].{flag}: must be a boolean")
            if "state" in item and item["state"] not in ("live", "bad"):
                errors.append(f"{where}.meta.cells[{k}].state: must be live or bad")
        count = meta.get("liveCount")
        count_key = "liveCount"
        if count is None:
            count = meta.get("allocated")
            count_key = "allocated"
        limit = len(cells) or 16
        if count is not None and (not isinstance(count, int) or isinstance(count, bool)):
            errors.append(f"{where}.meta.{count_key}: must be an integer")
        elif count is not None and not 0 <= count <= limit:
            errors.append(f"{where}.meta.{count_key}: {count} (max {limit})")
        sfield(meta, "segment", where, errors)
        sfield(meta, "pointer", where, errors)
        sfield(meta, "legendOk", where, errors)
        sfield(meta, "legendBad", where, errors)

    elif scene_type == "timeline":
        events = listfield(meta, "events", where, errors, required=True, lo=2, hi=6)
        items = check_items(events, f"{where}.meta.events", errors, ("t",), ("s",))
        for k, item in enumerate(items):
            if "hot" in item and not isinstance(item["hot"], bool):
                errors.append(f"{where}.meta.events[{k}].hot: must be a boolean")
        sfield(meta, "ghost", where, errors, max_len=24)

    elif scene_type == "terminal":
        lines = listfield(meta, "lines", where, errors, required=True, lo=1, hi=8)
        items = check_items(lines, f"{where}.meta.lines", errors, ("t",), ("k",))
        for k, item in enumerate(items):
            if item.get("k") is not None and item["k"] not in TERM_KINDS:
                errors.append(f"{where}.meta.lines[{k}].k: must be cmd, out, or err")
        sfield(meta, "host", where, errors)
        sfield(meta, "tag", where, errors)
        sfield(meta, "announce", where, errors)
        sfield(meta, "ghost", where, errors, max_len=24)

    elif scene_type == "compare":
        left = objectfield(meta, "left", where, errors, required=True)
        right = objectfield(meta, "right", where, errors, required=True)
        for side_name, side in (("left", left), ("right", right)):
            if side:
                sfield(side, "k", f"{where}.meta.{side_name}", errors, required=True)
                sfield(side, "t", f"{where}.meta.{side_name}", errors, required=True)
                pts = listfield(side, "pts", f"{where}.meta.{side_name}", errors, hi=4)
                check_str_array(pts, f"{where}.meta.{side_name}.pts", errors)
        sfield(meta, "vs", where, errors)
        sfield(meta, "mid", where, errors)

    elif scene_type == "stack":
        layers = listfield(meta, "layers", where, errors, required=True, lo=2, hi=6)
        items = check_items(layers, f"{where}.meta.layers", errors, ("t",), ("s",))
        for k, item in enumerate(items):
            for bkey in ("hot", "bad"):
                if bkey in item and not isinstance(item[bkey], bool):
                    errors.append(f"{where}.meta.layers[{k}].{bkey}: must be a boolean")

    elif scene_type == "quote":
        if not subline:
            warnings.append(f"{where}.subline: add an attribution for the quote")
        sfield(meta, "initials", where, errors, max_len=6)
        sfield(meta, "avatar", where, errors)

    elif scene_type == "matrix":
        ifield(meta, "cells", where, errors, lo=40, hi=400)
        ifield(meta, "badCount", where, errors)
        for key in ("legendOk", "legendBad", "count"):
            sfield(meta, key, where, errors)

    elif scene_type == "outro":
        channel = sfield(meta, "channel", where, errors)
        if not channel and not top_channel:
            warnings.append(f"{where}.meta.channel: missing; outro will have no channel line")
        sfield(meta, "cta", where, errors)
        sfield(meta, "ctaSub", where, errors)
        sfield(meta, "twitter", where, errors)
        sfield(meta, "ghost", where, errors, max_len=24)

    elif scene_type == "webref":
        sfield(meta, "url", where, errors, required=True)
        sfield(meta, "badge", where, errors)
        sfield(meta, "title", where, errors)
        sfield(meta, "highlight", where, errors)
        sfield(meta, "callout", where, errors)
        sfield(meta, "calloutType", where, errors)
        sfield(meta, "crumb", where, errors)
        sfield(meta, "formula", where, errors)
        sfield(meta, "formulaBadge", where, errors)
        sfield(meta, "formulaLabel", where, errors)
        img = sfield(meta, "image", where, errors)
        if isinstance(img, str) and img and not img.startswith(("http://", "https://", "data:")) and not resolve_project_path(img, project_dir, ROOT).is_file():
            errors.append(f"{where}.meta.image: local media not found: {img}")
        sfield(meta, "alt", where, errors)
        sfield(meta, "position", where, errors)
        sfield(meta, "ghost", where, errors, max_len=24)
        if "snippet" in meta and not isinstance(meta["snippet"], (str, list)):
            errors.append(f"{where}.meta.snippet: must be a string or list of strings")
        if "highlightRects" in meta:
            rects = listfield(meta, "highlightRects", where, errors, lo=1, hi=12)
            for k, rect in enumerate(rects):
                rwhere = f"{where}.meta.highlightRects[{k}]"
                if not isinstance(rect, dict):
                    errors.append(f"{rwhere}: must be an object")
                    continue
                for coord in ("x", "y", "w", "h"):
                    val = rect.get(coord)
                    if isinstance(val, bool) or not isinstance(val, (int, float)):
                        errors.append(f"{rwhere}.{coord}: must be a number (0-100)")
                    elif val < 0 or val > 100:
                        errors.append(f"{rwhere}.{coord}: {val} out of 0..100 range")
                if "label" in rect and rect["label"] is not None:
                    sfield(rect, "label", rwhere, errors, max_len=60)

    elif scene_type == "meme":
        sfield(meta, "text", where, errors)
        sfield(meta, "caption", where, errors)
        sfield(meta, "subtext", where, errors)
        sfield(meta, "sub", where, errors)
        sfield(meta, "reaction", where, errors)
        sfield(meta, "badge", where, errors)
        sfield(meta, "tag", where, errors)
        sfield(meta, "category", where, errors)
        sfield(meta, "file", where, errors)
        sfield(meta, "timestamp", where, errors)
        sfield(meta, "time", where, errors)
        sfield(meta, "bubble", where, errors)
        sfield(meta, "thought", where, errors)
        sfield(meta, "stamp", where, errors)
        sfield(meta, "reactionTag", where, errors)
        sfield(meta, "ghost", where, errors, max_len=24)
        expr = sfield(meta, "expression", where, errors)
        if expr and expr not in MASCOT_EXPRESSIONS:
            warnings.append(f"{where}.meta.expression: {expr!r} (expected: {', '.join(sorted(MASCOT_EXPRESSIONS))})")
        sfield(meta, "image", where, errors)
        if "punch" in meta and not isinstance(meta["punch"], bool):
            errors.append(f"{where}.meta.punch: must be a boolean")

    elif scene_type == "cloud":
        nodes = listfield(meta, "nodes", where, errors, required=True, lo=2, hi=6)
        items = check_items(nodes, f"{where}.meta.nodes", errors, ("t",), ("k", "s", "status", "icon", "latency", "rate", "drop"))
        for k, item in enumerate(items):
            for bkey in ("hot", "bad"):
                if bkey in item and not isinstance(item[bkey], bool):
                    errors.append(f"{where}.meta.nodes[{k}].{bkey}: must be a boolean")
        if "edges" in meta:
            listfield(meta, "edges", where, errors, hi=6)
        sfield(meta, "flow", where, errors)
        sfield(meta, "tag", where, errors)
        sfield(meta, "matrixLabel", where, errors)
        sfield(meta, "label", where, errors)
        sfield(meta, "ghost", where, errors, max_len=24)

    elif scene_type == "mascot":
        expr = sfield(meta, "expression", where, errors)
        if expr and expr not in MASCOT_EXPRESSIONS:
            warnings.append(f"{where}.meta.expression: {expr!r} (expected: {', '.join(sorted(MASCOT_EXPRESSIONS))})")
        sfield(meta, "bubble", where, errors)
        sfield(meta, "badge", where, errors)
        sfield(meta, "image", where, errors)
        sfield(meta, "ghost", where, errors, max_len=24)
        sfield(meta, "telemetry", where, errors)
        if "stats" in meta:
            st_list = listfield(meta, "stats", where, errors, hi=4)
            items = check_items(st_list, f"{where}.meta.stats", errors, ("label", "val"))
            for k, item in enumerate(items):
                if "hot" in item and not isinstance(item["hot"], (bool, str)):
                    errors.append(f"{where}.meta.stats[{k}].hot: must be boolean or string")

    elif scene_type == "split":
        left = objectfield(meta, "left", where, errors, required=True)
        right = objectfield(meta, "right", where, errors, required=True)
        sfield(meta, "tag", where, errors)
        sfield(meta, "label", where, errors)
        sfield(meta, "connector", where, errors)
        sfield(meta, "connLabel", where, errors)
        sfield(meta, "ghost", where, errors)
        if left:
            sfield(left, "title", f"{where}.meta.left", errors)
            sfield(left, "badge", f"{where}.meta.left", errors)
            lines = listfield(left, "lines", f"{where}.meta.left", errors, lo=1, hi=8)
            check_items(lines, f"{where}.meta.left.lines", errors, ("t",), ("k", "cmd"))
        if right:
            sfield(right, "title", f"{where}.meta.right", errors)
            sfield(right, "status", f"{where}.meta.right", errors)
            pts = listfield(right, "pts", f"{where}.meta.right", errors, hi=4)
            check_str_array(pts, f"{where}.meta.right.pts", errors)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("project", nargs="?", default=None)
    ap.add_argument("--project", "--workspace", dest="workspace", default=None, help="isolated project workspace slug or directory")
    ap.add_argument("--strict", action="store_true", help="treat warnings as errors")
    args = ap.parse_args()

    if args.project:
        if args.workspace:
            project_dir = resolve_project_dir(args.workspace, engine_root=ROOT)
            path = resolve_project_path(args.project, project_dir, ROOT)
        else:
            candidate = Path(args.project)
            if candidate.is_dir() or (ROOT / candidate).is_dir() or ("/" not in args.project and "\\" not in args.project and not args.project.endswith(".json")):
                project_dir = resolve_project_dir(args.project, engine_root=ROOT)
                path = project_json_path(project_dir, ROOT)
            else:
                path = resolve(args.project)
                resolved_dir = path.resolve().parent
                project_dir = resolved_dir.parent if resolved_dir.name == "content" and (resolved_dir.parent / "engine").is_dir() else resolved_dir
    else:
        project_dir = resolve_project_dir(args.workspace, engine_root=ROOT)
        path = project_json_path(project_dir, ROOT)

    data = load_json(path)
    errors: list[str] = []
    warnings: list[str] = []

    if not isinstance(data, dict):
        raise SystemExit("video.json must be an object")

    title = sfield(data, "title", "video", errors, required=True, max_len=120)
    sfield(data, "slug", "video", errors)
    if "compositionId" in data:
        cid = sfield(data, "compositionId", "video", errors)
        if cid and not re.match(r"^[A-Za-z0-9_-]+$", cid):
            warnings.append("video.compositionId: use letters, numbers, underscores, or hyphens")
    sfield(data, "channel", "video", errors)
    sfield(data, "ghost", "video", errors)
    sfield(data, "defaultAccent", "video", errors)
    if "defaultAccent" in data:
        accent = data["defaultAccent"]
        if not isinstance(accent, str) or not HEX.match(accent):
            errors.append("video.defaultAccent: must be a #rrggbb string")

    audio = data.get("audio") or default_audio_rel(project_dir, ROOT)
    if not isinstance(audio, str):
        errors.append("video.audio: must be a string")
        audio = default_audio_rel(project_dir, ROOT)
    if Path(audio).is_absolute():
        warnings.append("video.audio: use a path relative to the project directory")
    audio_path = resolve_project_path(audio, project_dir, ROOT)
    if not audio_path.exists():
        warnings.append(f"video.audio: file not found: {audio} (add it before transcribing)")

    composition = data.get("composition")
    if composition is not None and not isinstance(composition, dict):
        errors.append("video.composition: must be an object")
        composition = {}
    composition = composition or {}
    aspect = data.get("aspect") or data.get("aspectRatio") or composition.get("aspect") or composition.get("aspectRatio")
    if aspect is not None and aspect not in ("16:9", "9:16"):
        warnings.append(f"video.aspect: unknown '{aspect}'; supported values are '16:9' (landscape) and '9:16' (portrait)")

    default_w = 1080 if aspect == "9:16" else 1920
    default_h = 1920 if aspect == "9:16" else 1080
    raw_w = composition.get("width")
    raw_h = composition.get("height")

    if aspect == "9:16" and (raw_w, raw_h) == (1920, 1080):
        width, height = 1080, 1920
    elif aspect == "16:9" and (raw_w, raw_h) == (1080, 1920):
        width, height = 1920, 1080
    else:
        width = raw_w if raw_w is not None else default_w
        height = raw_h if raw_h is not None else default_h

    fps = composition.get("fps", 30)
    if not isinstance(width, int) or width <= 0:
        errors.append("video.composition.width: must be a positive integer")
    if not isinstance(height, int) or height <= 0:
        errors.append("video.composition.height: must be a positive integer")
    if not isinstance(fps, int) or fps <= 0:
        errors.append("video.composition.fps: must be a positive integer")
    if (width, height) not in ((1920, 1080), (1080, 1920)):
        warnings.append("video.composition: standard presets are 1920x1080 (16:9) and 1080x1920 (9:16 portrait)")

    acts_raw = data.get("acts") or []
    if not isinstance(acts_raw, list):
        errors.append("video.acts: must be an array")
        acts_raw = []
    acts: dict[str, dict] = {}
    for k, act in enumerate(acts_raw):
        where = f"acts[{k}]"
        if not isinstance(act, dict):
            errors.append(f"{where}: must be an object")
            continue
        act_id = sfield(act, "id", where, errors, required=True)
        sfield(act, "name", where, errors)
        if "accent" in act:
            accent = act["accent"]
            if not isinstance(accent, str) or not HEX.match(accent):
                errors.append(f"{where}.accent: must be a #rrggbb string")
        if act_id:
            if act_id in acts:
                errors.append(f"{where}.id: duplicate act id {act_id!r}")
            acts[act_id] = act

    scenes = data.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        errors.append("video.scenes: required non-empty array")
        scenes = []

    type_counts: Counter[str] = Counter()
    total_words = 0
    top_channel = data.get("channel") or ""
    top_ghost = data.get("ghost") or ""

    for i, scene in enumerate(scenes):
        if not isinstance(scene, dict):
            errors.append(f"scenes[{i}]: must be an object")
            continue
        stype = scene.get("type")
        if stype in TYPES:
            type_counts[stype] += 1
        narr = scene.get("narration") or ""
        total_words += len(re.findall(r"\S+", narr))
        validate_scene(scene, i, acts, top_channel, top_ghost, errors, warnings, project_dir=project_dir)

    if scenes:
        first = scenes[0]
        if isinstance(first, dict) and first.get("type") != "cold":
            warnings.append("video.scenes[0]: the first scene is usually 'cold'")
        last = scenes[-1]
        if isinstance(last, dict) and last.get("type") != "outro":
            warnings.append(f"video.scenes[{len(scenes) - 1}]: the last scene is usually 'outro'")

    print(f"[validate] {path}")
    print(f"[validate] {len(scenes)} scenes, {len(acts)} acts, {total_words} narration words")
    if type_counts:
        print("[validate] " + ", ".join(f"{name} {count}" for name, count in sorted(type_counts.items())))
    for warning in warnings:
        print(f"[warn] {warning}")
    for error in errors:
        print(f"[error] {error}")
    print(f"[validate] {len(errors)} errors, {len(warnings)} warnings")

    if errors or (args.strict and warnings):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
