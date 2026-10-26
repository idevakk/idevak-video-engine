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
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
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
    "network",
    "cve",
    "tweet",
    "github",
}
CODE_KINDS = {"code", "hot", "dim", "str", "com", "fn", "kw", "key", "err", "out"}
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
) -> None:
    where = f"scene {i + 1}"
    scene_type = scene.get("type")
    if scene_type not in TYPES:
        errors.append(f"{where}.type: {scene_type!r} (allowed: {', '.join(sorted(TYPES))})")
        return
    where = f"{where} ({scene_type})"

    headline_max = 180 if scene_type in {"quote", "code", "webref", "mascot", "tweet", "github", "cve"} else 96
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
            role = m.get("role")
            if role is not None and role not in {"corner", "inspector", "reaction-pop", "operator", "presenter"}:
                warnings.append(f"{where}.mascot.role: unknown {role!r} (expected: corner, inspector, reaction-pop, operator, presenter)")
            pos = m.get("position")
            valid_pos = {"bottom-right", "bottom-left", "inspector-right", "inspector-left", "center-pop"}
            if pos is not None and pos not in valid_pos:
                warnings.append(f"{where}.mascot.position: unknown {pos!r} (expected: {", ".join(sorted(valid_pos))})")

    if headline:
        soft = 120 if scene_type in {"quote", "webref", "tweet", "github", "cve"} else 64
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

    if scene_type in {"cold", "outro"} and not (scene.get("ghost") or meta.get("ghost") or top_ghost):
        warnings.append(f"{where}: no ghost word; the builder will fall back to the title")

    if scene_type == "cold":
        chips = listfield(meta, "chips", where, errors, lo=1, hi=5)
        check_str_array(chips, f"{where}.meta.chips", errors)
        sfield(meta, "ghost", where, errors, max_len=12)

    elif scene_type == "hero":
        mark = sfield(meta, "mark", where, errors, max_len=8)
        if not mark:
            warnings.append(f"{where}.meta.mark: missing; hero will use the first word of the headline")
        if "rule" in meta and not isinstance(meta["rule"], bool):
            errors.append(f"{where}.meta.rule: must be a boolean")

    elif scene_type == "statement":
        sfield(meta, "ghost", where, errors, max_len=24)

    elif scene_type == "stat":
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

    elif scene_type == "code":
        lines = listfield(meta, "lines", where, errors, required=True, lo=1, hi=10)
        items = check_items(lines, f"{where}.meta.lines", errors, ("t",), ("k",))
        for k, item in enumerate(items):
            kind = item.get("k")
            if kind is not None and kind not in CODE_KINDS:
                warnings.append(f"{where}.meta.lines[{k}].k: unknown kind {kind!r}")
            if "key" in item and not isinstance(item["key"], bool):
                errors.append(f"{where}.meta.lines[{k}].key: must be a boolean")
        for key in ("file", "tag", "announce"):
            sfield(meta, key, where, errors)

    elif scene_type == "diff":
        lines = listfield(meta, "lines", where, errors, required=True, lo=1, hi=12)
        items = check_items(lines, f"{where}.meta.lines", errors, ("k", "t"))
        for k, item in enumerate(items):
            if item.get("k") not in DIFF_KINDS:
                errors.append(f"{where}.meta.lines[{k}].k: must be ctx, add, or del")
        for key in ("file", "ver", "announce"):
            sfield(meta, key, where, errors)

    elif scene_type == "flow":
        nodes = listfield(meta, "nodes", where, errors, required=True, lo=2, hi=4)
        items = check_items(nodes, f"{where}.meta.nodes", errors, ("t",), ("k", "s"))
        for k, item in enumerate(items):
            if "hot" in item and not isinstance(item["hot"], bool):
                errors.append(f"{where}.meta.nodes[{k}].hot: must be a boolean")

    elif scene_type == "ledger":
        rows = listfield(meta, "rows", where, errors, required=True, lo=1, hi=6)
        items = check_items(rows, f"{where}.meta.rows", errors, ("k", "v"))
        for k, item in enumerate(items):
            if "bad" in item and not isinstance(item["bad"], bool):
                errors.append(f"{where}.meta.rows[{k}].bad: must be a boolean")
        sfield(meta, "head", where, errors)
        sfield(meta, "stamp", where, errors)
        if "live" in meta and not isinstance(meta["live"], (str, bool)):
            errors.append(f"{where}.meta.live: must be a string or false")
        points = listfield(meta, "points", where, errors, hi=4)
        check_str_array(points, f"{where}.meta.points", errors)

    elif scene_type == "memory":
        cells = ifield(meta, "cells", where, errors, lo=4, hi=16)
        n = ifield(meta, "n", where, errors, lo=1, hi=cells or 24)
        if n is not None and cells is not None and n > cells:
            errors.append(f"{where}.meta.n: cannot exceed cells")
        if "ptr" in meta and not isinstance(meta["ptr"], (str, bool)):
            errors.append(f"{where}.meta.ptr: must be a string or false")
        for key in ("name", "unit", "legendOk", "legendBad"):
            sfield(meta, key, where, errors)

    elif scene_type == "timeline":
        events = listfield(meta, "events", where, errors, required=True, lo=2, hi=6)
        items = check_items(events, f"{where}.meta.events", errors, ("t",), ("s",))
        for k, item in enumerate(items):
            if "hot" in item and not isinstance(item["hot"], bool):
                errors.append(f"{where}.meta.events[{k}].hot: must be a boolean")

    elif scene_type == "terminal":
        lines = listfield(meta, "lines", where, errors, required=True, lo=1, hi=8)
        items = check_items(lines, f"{where}.meta.lines", errors, ("t",), ("k",))
        for k, item in enumerate(items):
            if item.get("k") is not None and item["k"] not in TERM_KINDS:
                errors.append(f"{where}.meta.lines[{k}].k: must be cmd, out, or err")
        sfield(meta, "host", where, errors)

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

    elif scene_type == "stack":
        layers = listfield(meta, "layers", where, errors, required=True, lo=2, hi=6)
        items = check_items(layers, f"{where}.meta.layers", errors, ("t",), ("s",))
        for k, item in enumerate(items):
            if "hot" in item and not isinstance(item["hot"], bool):
                errors.append(f"{where}.meta.layers[{k}].hot: must be a boolean")

    elif scene_type == "quote":
        if not subline:
            warnings.append(f"{where}.subline: add an attribution for the quote")

    elif scene_type == "matrix":
        ifield(meta, "cells", where, errors, lo=40, hi=400)
        for key in ("legendOk", "legendBad", "count"):
            sfield(meta, key, where, errors)

    elif scene_type == "outro":
        channel = sfield(meta, "channel", where, errors)
        if not channel and not top_channel:
            warnings.append(f"{where}.meta.channel: missing; outro will have no channel line")
        for key in ("cta", "ctaSub", "ghost"):
            sfield(meta, key, where, errors)

    elif scene_type == "webref":
        sfield(meta, "url", where, errors, required=True)
        sfield(meta, "badge", where, errors)
        sfield(meta, "title", where, errors)
        sfield(meta, "highlight", where, errors)
        sfield(meta, "callout", where, errors)
        sfield(meta, "calloutType", where, errors)
        sfield(meta, "image", where, errors)
        if "snippet" in meta and not isinstance(meta["snippet"], (str, list)):
            errors.append(f"{where}.meta.snippet: must be a string or list of strings")

    elif scene_type == "meme":
        sfield(meta, "text", where, errors)
        sfield(meta, "subtext", where, errors)
        sfield(meta, "reaction", where, errors)
        expr = sfield(meta, "expression", where, errors)
        if expr and expr not in MASCOT_EXPRESSIONS:
            warnings.append(f"{where}.meta.expression: {expr!r} (expected: {', '.join(sorted(MASCOT_EXPRESSIONS))})")
        sfield(meta, "image", where, errors)
        if "punch" in meta and not isinstance(meta["punch"], bool):
            errors.append(f"{where}.meta.punch: must be a boolean")

    elif scene_type == "cloud":
        nodes = listfield(meta, "nodes", where, errors, required=True, lo=2, hi=6)
        items = check_items(nodes, f"{where}.meta.nodes", errors, ("t",), ("k", "s", "status", "icon"))
        for k, item in enumerate(items):
            for bkey in ("hot", "bad"):
                if bkey in item and not isinstance(item[bkey], bool):
                    errors.append(f"{where}.meta.nodes[{k}].{bkey}: must be a boolean")
        sfield(meta, "flow", where, errors)
        sfield(meta, "topology", where, errors)

    elif scene_type == "network":
        tiers = listfield(meta, "tiers", where, errors, required=True, lo=1, hi=6)
        if tiers:
            for t_idx, tier in enumerate(tiers):
                t_where = f"{where}.meta.tiers[{t_idx}]"
                if not isinstance(tier, dict):
                    errors.append(f"{t_where}: must be an object")
                    continue
                sfield(tier, "name", t_where, errors)
                nodes = listfield(tier, "nodes", t_where, errors, required=True, lo=1, hi=6)
                if nodes:
                    for n_idx, node in enumerate(nodes):
                        n_where = f"{t_where}.nodes[{n_idx}]"
                        if not isinstance(node, dict):
                            errors.append(f"{n_where}: must be an object")
                            continue
                        sfield(node, "id", n_where, errors, required=True)
                        sfield(node, "title", n_where, errors, required=True)
                        sfield(node, "sub", n_where, errors)
                        sfield(node, "icon", n_where, errors)
                        for bkey in ("hot", "bad"):
                            if bkey in node and not isinstance(node[bkey], bool):
                                errors.append(f"{n_where}.{bkey}: must be a boolean")
        if "packets" in meta:
            packets = listfield(meta, "packets", where, errors, hi=12)
            if packets:
                for p_idx, packet in enumerate(packets):
                    p_where = f"{where}.meta.packets[{p_idx}]"
                    if not isinstance(packet, dict):
                        errors.append(f"{p_where}: must be an object")
                    else:
                        sfield(packet, "from", p_where, errors, required=True)
                        sfield(packet, "to", p_where, errors, required=True)

    elif scene_type == "cve":
        sfield(meta, "cveId", where, errors, required=True)
        sfield(meta, "severity", where, errors)
        sfield(meta, "score", where, errors)
        sfield(meta, "vector", where, errors)
        sfield(meta, "affected", where, errors)
        sfield(meta, "patch", where, errors)

    elif scene_type == "tweet":
        sfield(meta, "author", where, errors, required=True)
        sfield(meta, "handle", where, errors, required=True)
        sfield(meta, "text", where, errors, required=True)
        sfield(meta, "avatar", where, errors)
        sfield(meta, "date", where, errors)
        sfield(meta, "likes", where, errors)
        sfield(meta, "retweets", where, errors)

    elif scene_type == "github":
        sfield(meta, "repo", where, errors, required=True)
        sfield(meta, "prNumber", where, errors)
        sfield(meta, "title", where, errors, required=True)
        sfield(meta, "author", where, errors)
        sfield(meta, "branch", where, errors)
        sfield(meta, "additions", where, errors)
        sfield(meta, "deletions", where, errors)
        lines = listfield(meta, "diff", where, errors, hi=10)

    elif scene_type == "mascot":
        expr = sfield(meta, "expression", where, errors)
        if expr and expr not in MASCOT_EXPRESSIONS:
            warnings.append(f"{where}.meta.expression: {expr!r} (expected: {', '.join(sorted(MASCOT_EXPRESSIONS))})")
        sfield(meta, "bubble", where, errors)
        sfield(meta, "badge", where, errors)
        sfield(meta, "image", where, errors)
        if "stats" in meta:
            st_list = listfield(meta, "stats", where, errors, hi=4)
            items = check_items(st_list, f"{where}.meta.stats", errors, ("label", "val"))
            for k, item in enumerate(items):
                if "hot" in item and not isinstance(item["hot"], (bool, str)):
                    errors.append(f"{where}.meta.stats[{k}].hot: must be boolean or string")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("project", nargs="?", default=str(DEFAULT_PROJECT))
    ap.add_argument("--strict", action="store_true", help="treat warnings as errors")
    args = ap.parse_args()

    path = resolve(args.project)
    data = load_json(path)
    errors: list[str] = []
    warnings: list[str] = []

    if not isinstance(data, dict):
        raise SystemExit("content/video.json must be an object")

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

    audio = data.get("audio") or "content/voiceover.wav"
    if not isinstance(audio, str):
        errors.append("video.audio: must be a string")
        audio = "content/voiceover.wav"
    if Path(audio).is_absolute():
        warnings.append("video.audio: use a path relative to the repo root")
    audio_path = resolve(audio)
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
        validate_scene(scene, i, acts, top_channel, top_ghost, errors, warnings)

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
