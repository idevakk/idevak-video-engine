"""Schema validation for the dedicated 'chalkboard-explainer' preset."""
from __future__ import annotations

import re

CB_TYPES = {
    "cb_title",
    "cb_cards",
    "cb_formula",
    "cb_stat_bar",
    "cb_vram_stack",
    "cb_layer_grid",
    "cb_wiring",
    "cb_gpu_spec",
    "cb_timeline_split",
    "cb_checklist",
    "cb_outro",
}

CHALK_COLORS = {"green", "cyan", "ochre", "coral", "violet", "amber", "slate"}
HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


def _s(obj: dict, key: str, where: str, errors: list[str], *, required: bool = False, max_len: int | None = None) -> str | None:
    if key not in obj or obj[key] is None:
        if required:
            errors.append(f"{where}.{key}: required")
        return None
    val = obj[key]
    if not isinstance(val, str):
        errors.append(f"{where}.{key}: must be a string")
        return None
    if required and not val.strip():
        errors.append(f"{where}.{key}: must not be empty")
    if max_len is not None and len(val) > max_len:
        errors.append(f"{where}.{key}: {len(val)} chars (max {max_len})")
    return val


def _color(obj: dict, key: str, where: str, errors: list[str]) -> None:
    val = obj.get(key)
    if val is None:
        return
    if not isinstance(val, str) or (val not in CHALK_COLORS and not HEX_RE.match(val)):
        errors.append(f"{where}.{key}: must be a chalk color ({', '.join(sorted(CHALK_COLORS))}) or #rrggbb")


def _bool(obj: dict, key: str, where: str, errors: list[str]) -> None:
    if key in obj and obj[key] is not None and not isinstance(obj[key], bool):
        errors.append(f"{where}.{key}: must be a boolean")


def _num(obj: dict, key: str, where: str, errors: list[str], *, required: bool = False) -> float | None:
    if key not in obj or obj[key] is None:
        if required:
            errors.append(f"{where}.{key}: required")
        return None
    val = obj[key]
    if isinstance(val, bool) or not isinstance(val, (int, float)):
        errors.append(f"{where}.{key}: must be a number")
        return None
    return float(val)


def _list(obj: dict, key: str, where: str, errors: list[str], *, required: bool = False, lo: int | None = None, hi: int | None = None) -> list:
    if key not in obj or obj[key] is None:
        if required:
            errors.append(f"{where}.{key}: required")
        return []
    val = obj[key]
    if not isinstance(val, list):
        errors.append(f"{where}.{key}: must be an array")
        return []
    if lo is not None and len(val) < lo:
        errors.append(f"{where}.{key}: {len(val)} items (min {lo})")
    if hi is not None and len(val) > hi:
        errors.append(f"{where}.{key}: {len(val)} items (max {hi})")
    return val


def validate_chalkboard_scene(scene: dict, i: int, acts: dict, errors: list[str], warnings: list[str]) -> bool:
    """Validate a dedicated cb_* chalkboard scene. Returns True if handled."""
    stype = scene.get("type")
    if stype not in CB_TYPES:
        return False

    where = f"scene {i + 1} ({stype})"
    _s(scene, "headline", where, errors, required=True, max_len=120)
    _s(scene, "narration", where, errors, required=True)
    _s(scene, "subline", where, errors, max_len=180)
    _s(scene, "eyebrow", where, errors, max_len=72)
    _s(scene, "id", where, errors)

    if "accent" in scene and scene["accent"] is not None:
        if not isinstance(scene["accent"], str) or not HEX_RE.match(scene["accent"]):
            errors.append(f"{where}.accent: must be a #rrggbb string")

    act_id = scene.get("act")
    if act_id:
        if not isinstance(act_id, str):
            errors.append(f"{where}.act: must be a string")
        elif act_id not in acts:
            errors.append(f"{where}.act: unknown act {act_id!r}")

    meta = scene.get("meta")
    if meta is None:
        meta = {}
    elif not isinstance(meta, dict):
        errors.append(f"{where}.meta: must be an object")
        meta = {}

    if stype == "cb_title":
        _s(meta, "logo", f"{where}.meta", errors)
        _s(meta, "title", f"{where}.meta", errors)
        _s(meta, "barLabel", f"{where}.meta", errors)
        _s(meta, "barValue", f"{where}.meta", errors)
        _num(meta, "barPct", f"{where}.meta", errors)
        _color(meta, "barColor", f"{where}.meta", errors)
        _s(meta, "pill", f"{where}.meta", errors)
        _s(meta, "pillIcon", f"{where}.meta", errors)
        _s(meta, "stat", f"{where}.meta", errors)
        _s(meta, "statUnit", f"{where}.meta", errors)
        _s(meta, "statLabel", f"{where}.meta", errors)
        _color(meta, "statColor", f"{where}.meta", errors)
        _bool(meta, "trend", f"{where}.meta", errors)

    elif stype == "cb_cards":
        cards = _list(meta, "cards", f"{where}.meta", errors, required=True, lo=2, hi=4)
        for k, c in enumerate(cards):
            cw = f"{where}.meta.cards[{k}]"
            if not isinstance(c, dict):
                errors.append(f"{cw}: must be an object")
                continue
            _s(c, "title", cw, errors, required=True)
            _s(c, "sub", cw, errors)
            _s(c, "icon", cw, errors)
            _color(c, "color", cw, errors)
            _bool(c, "xOut", cw, errors)
            _bool(c, "active", cw, errors)
        _s(meta, "bottomPill", f"{where}.meta", errors)
        _color(meta, "bottomColor", f"{where}.meta", errors)

    elif stype == "cb_formula":
        factors = _list(meta, "factors", f"{where}.meta", errors, required=True, lo=2, hi=5)
        for k, f in enumerate(factors):
            fw = f"{where}.meta.factors[{k}]"
            if not isinstance(f, dict):
                errors.append(f"{fw}: must be an object")
                continue
            _s(f, "val", fw, errors, required=True)
            _s(f, "label", fw, errors)
            _s(f, "op", fw, errors)
            _color(f, "color", fw, errors)
        _s(meta, "result", f"{where}.meta", errors, required=True)
        _s(meta, "resultLabel", f"{where}.meta", errors)
        _color(meta, "resultColor", f"{where}.meta", errors)

    elif stype == "cb_stat_bar":
        mode = _s(meta, "mode", f"{where}.meta", errors)
        if mode and mode not in {"conversion", "metric_bar", "bars"}:
            errors.append(f"{where}.meta.mode: must be 'conversion', 'metric_bar', or 'bars'")
        _s(meta, "value", f"{where}.meta", errors)
        _s(meta, "unit", f"{where}.meta", errors)
        _s(meta, "label", f"{where}.meta", errors)
        _color(meta, "color", f"{where}.meta", errors)
        _bool(meta, "xOut", f"{where}.meta", errors)
        _s(meta, "barLabel", f"{where}.meta", errors)
        _s(meta, "barValue", f"{where}.meta", errors)
        _num(meta, "barPct", f"{where}.meta", errors)
        _color(meta, "barColor", f"{where}.meta", errors)
        _s(meta, "bottomPill", f"{where}.meta", errors)
        if mode == "bars":
            bars = _list(meta, "bars", f"{where}.meta", errors, required=True, lo=2, hi=5)
            for k, b in enumerate(bars):
                bw = f"{where}.meta.bars[{k}]"
                if not isinstance(b, dict):
                    errors.append(f"{bw}: must be an object")
                    continue
                _s(b, "label", bw, errors, required=True)
                _s(b, "value", bw, errors, required=True)
                _num(b, "pct", bw, errors, required=True)
                _color(b, "color", bw, errors)
                _s(b, "status", bw, errors)

    elif stype == "cb_vram_stack":
        _s(meta, "ceiling", f"{where}.meta", errors)
        _color(meta, "ceilingColor", f"{where}.meta", errors)
        layers = _list(meta, "layers", f"{where}.meta", errors, required=True, lo=2, hi=6)
        for k, ly in enumerate(layers):
            lw = f"{where}.meta.layers[{k}]"
            if not isinstance(ly, dict):
                errors.append(f"{lw}: must be an object")
                continue
            _s(ly, "size", lw, errors, required=True)
            _s(ly, "title", lw, errors, required=True)
            _num(ly, "pct", lw, errors, required=True)
            _color(ly, "color", lw, errors)

    elif stype == "cb_layer_grid":
        _num(meta, "cols", f"{where}.meta", errors)
        _num(meta, "rows", f"{where}.meta", errors)
        _color(meta, "color", f"{where}.meta", errors)
        specs = _list(meta, "specs", f"{where}.meta", errors, lo=1, hi=5)
        for k, sp in enumerate(specs):
            sw = f"{where}.meta.specs[{k}]"
            if not isinstance(sp, dict):
                errors.append(f"{sw}: must be an object")
                continue
            _s(sp, "label", sw, errors, required=True)
            _s(sp, "value", sw, errors, required=True)
            _color(sp, "color", sw, errors)

    elif stype == "cb_wiring":
        _list(meta, "nodes", f"{where}.meta", errors, required=True, lo=2, hi=6)
        _list(meta, "edges", f"{where}.meta", errors, required=True, lo=1, hi=6)
        if "pills" in meta:
            _list(meta, "pills", f"{where}.meta", errors, hi=3)

    elif stype == "cb_gpu_spec":
        mode = _s(meta, "mode", f"{where}.meta", errors)
        if mode and mode not in {"blueprint", "compare"}:
            errors.append(f"{where}.meta.mode: must be 'blueprint' or 'compare'")
        if mode == "compare":
            cards = _list(meta, "cards", f"{where}.meta", errors, required=True, lo=2, hi=2)
            for k, c in enumerate(cards):
                cw = f"{where}.meta.cards[{k}]"
                if not isinstance(c, dict):
                    errors.append(f"{cw}: must be an object")
                    continue
                _s(c, "brand", cw, errors)
                _s(c, "tagline", cw, errors)
                _s(c, "title", cw, errors, required=True)
                _s(c, "price", cw, errors, required=True)
                _color(c, "color", cw, errors)
        else:
            _s(meta, "model", f"{where}.meta", errors, required=True)
            _s(meta, "sub", f"{where}.meta", errors)
            _s(meta, "price", f"{where}.meta", errors)
            _s(meta, "badge", f"{where}.meta", errors)
            _color(meta, "color", f"{where}.meta", errors)
            _bool(meta, "xOut", f"{where}.meta", errors)

    elif stype == "cb_timeline_split":
        mode = _s(meta, "mode", f"{where}.meta", errors)
        if mode and mode not in {"prefill_decode", "attention_triangle"}:
            errors.append(f"{where}.meta.mode: must be 'prefill_decode' or 'attention_triangle'")
        _s(meta, "bottomPill", f"{where}.meta", errors)

    elif stype == "cb_checklist":
        _s(meta, "headerTitle", f"{where}.meta", errors)
        _s(meta, "headerIcon", f"{where}.meta", errors)
        items = _list(meta, "items", f"{where}.meta", errors, required=True, lo=1, hi=6)
        for k, it in enumerate(items):
            iw = f"{where}.meta.items[{k}]"
            if not isinstance(it, dict):
                errors.append(f"{iw}: must be an object")
                continue
            _s(it, "text", iw, errors, required=True)
            _bool(it, "ok", iw, errors)
        _s(meta, "bottomPill", f"{where}.meta", errors)

    elif stype == "cb_outro":
        _s(meta, "channel", f"{where}.meta", errors)
        _s(meta, "cta", f"{where}.meta", errors)
        _s(meta, "ctaSub", f"{where}.meta", errors)

    if i == 0 and stype not in {"cb_title", "cold"}:
        warnings.append("video.scenes[0]: chalkboard videos usually start with 'cb_title'")
    return True
