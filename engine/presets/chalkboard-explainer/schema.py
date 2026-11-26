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
    "cb_sandbox",
    "cb_log",
    "cb_issue",
    "cb_timeline",
    "cb_stamp_card",
    "cb_prompt_card",
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

    if "revealOn" in meta and meta["revealOn"] is not None:
        if isinstance(meta["revealOn"], bool) or not isinstance(meta["revealOn"], (str, int, float)):
            errors.append(f"{where}.meta.revealOn: must be a string or number")

    def _validate_cue(obj: dict, w: str) -> None:
        if "revealOn" in obj and obj["revealOn"] is not None:
            if isinstance(obj["revealOn"], bool) or not isinstance(obj["revealOn"], (str, int, float)):
                errors.append(f"{w}.revealOn: must be a string or number")
        if "cue" in obj and obj["cue"] is not None:
            if isinstance(obj["cue"], bool) or not isinstance(obj["cue"], (str, int, float)):
                errors.append(f"{w}.cue: must be a string or number")

    _validate_cue(meta, f"{where}.meta")

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

    elif stype == "cb_sandbox":
        mode = _s(meta, "mode", f"{where}.meta", errors)
        if mode and mode not in {"capture", "chain"}:
            errors.append(f"{where}.meta.mode: must be 'capture' or 'chain'")
        _s(meta, "hostLabel", f"{where}.meta", errors)
        _color(meta, "hostColor", f"{where}.meta", errors)
        if mode == "chain":
            steps = _list(meta, "steps", f"{where}.meta", errors, required=True, lo=2, hi=5)
            for k, st in enumerate(steps):
                sw = f"{where}.meta.steps[{k}]"
                if not isinstance(st, dict):
                    errors.append(f"{sw}: must be an object")
                    continue
                _s(st, "title", sw, errors, required=True)
                _s(st, "sub", sw, errors)
                _s(st, "icon", sw, errors)
                _s(st, "logo", sw, errors)
                _color(st, "color", sw, errors)
                _bool(st, "lasso", sw, errors)
                _s(st, "subCallout", sw, errors)
                _s(st, "status", sw, errors)
        else:
            sources = _list(meta, "sources", f"{where}.meta", errors, required=True, lo=1, hi=4)
            for k, src in enumerate(sources):
                sw = f"{where}.meta.sources[{k}]"
                if not isinstance(src, dict):
                    errors.append(f"{sw}: must be an object")
                    continue
                _s(src, "title", sw, errors, required=True)
                _s(src, "sub", sw, errors)
                _s(src, "icon", sw, errors)
                _s(src, "logo", sw, errors)
                _color(src, "color", sw, errors)
                _bool(src, "lasso", sw, errors)
                _bool(src, "blocked", sw, errors)
            targets = _list(meta, "targets", f"{where}.meta", errors, lo=0, hi=3)
            for k, tgt in enumerate(targets):
                tw = f"{where}.meta.targets[{k}]"
                if not isinstance(tgt, dict):
                    errors.append(f"{tw}: must be an object")
                    continue
                _s(tgt, "title", tw, errors, required=True)
                _s(tgt, "sub", tw, errors)
                _s(tgt, "icon", tw, errors)
                _s(tgt, "logo", tw, errors)
                _color(tgt, "color", tw, errors)
                _bool(tgt, "lasso", tw, errors)
                _bool(tgt, "funnel", tw, errors)
                _s(tgt, "recLabel", tw, errors)
                _s(tgt, "recSub", tw, errors)
        if "packets" in meta and meta["packets"] is not None:
            if isinstance(meta["packets"], list):
                for k, pk in enumerate(meta["packets"]):
                    pw = f"{where}.meta.packets[{k}]"
                    if not isinstance(pk, dict):
                        errors.append(f"{pw}: must be an object")
                        continue
                    _bool(pk, "blocked", pw, errors)
                    _s(pk, "label", pw, errors)
            elif isinstance(meta["packets"], bool) or not isinstance(meta["packets"], (int, float)):
                errors.append(f"{where}.meta.packets: must be a number or array")
        if "meter" in meta and meta["meter"] is not None:
            mt = meta["meter"]
            if not isinstance(mt, dict):
                errors.append(f"{where}.meta.meter: must be an object")
            else:
                _s(mt, "label", f"{where}.meta.meter", errors)
                _s(mt, "value", f"{where}.meta.meter", errors)
                _s(mt, "targetValue", f"{where}.meta.meter", errors)
                _num(mt, "pct", f"{where}.meta.meter", errors)
                _color(mt, "color", f"{where}.meta.meter", errors)
                _bool(mt, "hatched", f"{where}.meta.meter", errors)
        if "shield" in meta and meta["shield"] is not None:
            sh = meta["shield"]
            if not isinstance(sh, dict):
                errors.append(f"{where}.meta.shield: must be an object")
            else:
                _s(sh, "label", f"{where}.meta.shield", errors, required=True)
                _color(sh, "color", f"{where}.meta.shield", errors)
        _s(meta, "bottomPill", f"{where}.meta", errors)
        _color(meta, "bottomColor", f"{where}.meta", errors)

    elif stype == "cb_log":
        mode = _s(meta, "mode", f"{where}.meta", errors)
        if mode and mode not in {"log", "env", "permissions"}:
            errors.append(f"{where}.meta.mode: must be 'log', 'env', or 'permissions'")
        _s(meta, "filename", f"{where}.meta", errors)
        _s(meta, "title", f"{where}.meta", errors)
        _s(meta, "permBits", f"{where}.meta", errors)
        _s(meta, "envPill", f"{where}.meta", errors)
        _color(meta, "envPillColor", f"{where}.meta", errors)
        _bool(meta, "thumbsUp", f"{where}.meta", errors)
        lines = _list(meta, "lines", f"{where}.meta", errors, required=True, lo=1, hi=10)
        for k, ln in enumerate(lines):
            lw = f"{where}.meta.lines[{k}]"
            if not isinstance(ln, dict):
                errors.append(f"{lw}: must be an object")
                continue
            _s(ln, "text", lw, errors, required=True)
            _s(ln, "level", lw, errors)
            _color(ln, "color", lw, errors)
            _color(ln, "highlightColor", lw, errors)
            _s(ln, "circle", lw, errors)
            _bool(ln, "dim", lw, errors)
            if "highlight" in ln and ln["highlight"] is not None:
                if not isinstance(ln["highlight"], (str, list)):
                    errors.append(f"{lw}.highlight: must be a string or array")
        notes = _list(meta, "notes", f"{where}.meta", errors, lo=0, hi=3)
        for k, nt in enumerate(notes):
            nw = f"{where}.meta.notes[{k}]"
            if not isinstance(nt, dict):
                errors.append(f"{nw}: must be an object")
                continue
            _s(nt, "text", nw, errors, required=True)
            _color(nt, "color", nw, errors)
            _s(nt, "side", nw, errors)
        _s(meta, "bottomPill", f"{where}.meta", errors)
        _color(meta, "bottomColor", f"{where}.meta", errors)

    elif stype == "cb_issue":
        _s(meta, "repo", f"{where}.meta", errors)
        _s(meta, "issueTitle", f"{where}.meta", errors)
        _s(meta, "title", f"{where}.meta", errors)
        if not (meta.get("issueTitle") or meta.get("title")):
            errors.append(f"{where}.meta.issueTitle: required (or title)")
        _s(meta, "number", f"{where}.meta", errors)
        _s(meta, "status", f"{where}.meta", errors)
        _color(meta, "statusColor", f"{where}.meta", errors)
        _s(meta, "dateLabel", f"{where}.meta", errors)
        _s(meta, "author", f"{where}.meta", errors)
        _s(meta, "body", f"{where}.meta", errors)
        _color(meta, "color", f"{where}.meta", errors)
        if "toggle" in meta and meta["toggle"] is not None:
            tg = meta["toggle"]
            if not isinstance(tg, dict):
                errors.append(f"{where}.meta.toggle: must be an object")
            else:
                _s(tg, "label", f"{where}.meta.toggle", errors, required=True)
                _s(tg, "sub", f"{where}.meta.toggle", errors)
                _bool(tg, "on", f"{where}.meta.toggle", errors)
                _bool(tg, "flipTo", f"{where}.meta.toggle", errors)
                _color(tg, "onColor", f"{where}.meta.toggle", errors)
                _color(tg, "offColor", f"{where}.meta.toggle", errors)
                _s(tg, "badge", f"{where}.meta.toggle", errors)
        _s(meta, "sideNote", f"{where}.meta", errors)
        _s(meta, "bottomPill", f"{where}.meta", errors)
        _color(meta, "bottomColor", f"{where}.meta", errors)

    elif stype == "cb_timeline":
        _color(meta, "axisColor", f"{where}.meta", errors)
        events = _list(meta, "events", f"{where}.meta", errors, required=True, lo=2, hi=7)
        for k, ev in enumerate(events):
            ew = f"{where}.meta.events[{k}]"
            if not isinstance(ev, dict):
                errors.append(f"{ew}: must be an object")
                continue
            _s(ev, "label", ew, errors, required=True)
            _s(ev, "sub", ew, errors)
            side = _s(ev, "side", ew, errors)
            if side and side not in {"above", "below"}:
                errors.append(f"{ew}.side: must be 'above' or 'below'")
            _color(ev, "color", ew, errors)
            _bool(ev, "xOut", ew, errors)
            _bool(ev, "lasso", ew, errors)
            _s(ev, "badge", ew, errors)
        notes = _list(meta, "notes", f"{where}.meta", errors, lo=0, hi=3)
        for k, nt in enumerate(notes):
            nw = f"{where}.meta.notes[{k}]"
            if not isinstance(nt, dict):
                errors.append(f"{nw}: must be an object")
                continue
            _s(nt, "text", nw, errors, required=True)
            _s(nt, "sub", nw, errors)
            _color(nt, "color", nw, errors)
        if "calendar" in meta and meta["calendar"] is not None:
            cal = meta["calendar"]
            if not isinstance(cal, dict):
                errors.append(f"{where}.meta.calendar: must be an object")
            else:
                _s(cal, "topLabel", f"{where}.meta.calendar", errors)
                _s(cal, "mainLabel", f"{where}.meta.calendar", errors, required=True)
                _color(cal, "color", f"{where}.meta.calendar", errors)
        _s(meta, "bottomPill", f"{where}.meta", errors)
        _color(meta, "bottomColor", f"{where}.meta", errors)

    elif stype == "cb_stamp_card":
        has_card = isinstance(meta.get("card"), dict)
        has_rows = isinstance(meta.get("rows"), list) and len(meta.get("rows") or []) > 0
        if not has_card and not has_rows:
            errors.append(f"{where}.meta: requires 'card' and/or 'rows'")
        if "card" in meta and meta["card"] is not None:
            cd = meta["card"]
            if not isinstance(cd, dict):
                errors.append(f"{where}.meta.card: must be an object")
            else:
                _s(cd, "title", f"{where}.meta.card", errors, required=True)
                _s(cd, "sub", f"{where}.meta.card", errors)
                _s(cd, "icon", f"{where}.meta.card", errors)
                _s(cd, "logo", f"{where}.meta.card", errors)
                _color(cd, "color", f"{where}.meta.card", errors)
        if "stamp" in meta and meta["stamp"] is not None:
            st = meta["stamp"]
            if not isinstance(st, dict):
                errors.append(f"{where}.meta.stamp: must be an object")
            else:
                _s(st, "text", f"{where}.meta.stamp", errors, required=True)
                _color(st, "color", f"{where}.meta.stamp", errors)
                _num(st, "angle", f"{where}.meta.stamp", errors)
        if "calendar" in meta and meta["calendar"] is not None:
            cal = meta["calendar"]
            if not isinstance(cal, dict):
                errors.append(f"{where}.meta.calendar: must be an object")
            else:
                _s(cal, "topLabel", f"{where}.meta.calendar", errors)
                _s(cal, "mainLabel", f"{where}.meta.calendar", errors, required=True)
                _color(cal, "color", f"{where}.meta.calendar", errors)
        rows = _list(meta, "rows", f"{where}.meta", errors, lo=0, hi=5)
        for k, rw in enumerate(rows):
            rwhere = f"{where}.meta.rows[{k}]"
            if not isinstance(rw, dict):
                errors.append(f"{rwhere}: must be an object")
                continue
            _s(rw, "tag", rwhere, errors)
            _color(rw, "tagColor", rwhere, errors)
            _s(rw, "left", rwhere, errors, required=True)
            _s(rw, "leftSub", rwhere, errors)
            _s(rw, "right", rwhere, errors, required=True)
            _s(rw, "rightSub", rwhere, errors)
            _s(rw, "rightLogo", rwhere, errors)
            _bool(rw, "eye", rwhere, errors)
            _s(rw, "edgeLabel", rwhere, errors)
            _color(rw, "color", rwhere, errors)
        _s(meta, "bottomPill", f"{where}.meta", errors)
        _color(meta, "bottomColor", f"{where}.meta", errors)

    elif stype == "cb_prompt_card":
        mode = _s(meta, "mode", f"{where}.meta", errors)
        if mode and mode not in {"prompt", "media"}:
            errors.append(f"{where}.meta.mode: must be 'prompt' or 'media'")
        if mode == "media":
            _s(meta, "platform", f"{where}.meta", errors)
            _s(meta, "badge", f"{where}.meta", errors)
            _s(meta, "title", f"{where}.meta", errors, required=True)
            _s(meta, "viewsStart", f"{where}.meta", errors)
            _s(meta, "viewsEnd", f"{where}.meta", errors)
            _num(meta, "scrubPct", f"{where}.meta", errors)
            _s(meta, "thumbnail", f"{where}.meta", errors)
            _bool(meta, "lasso", f"{where}.meta", errors)
            _bool(meta, "eye", f"{where}.meta", errors)
            _s(meta, "chatPill", f"{where}.meta", errors)
            _color(meta, "color", f"{where}.meta", errors)
        else:
            _s(meta, "question", f"{where}.meta", errors, required=True)
            _s(meta, "codeToken", f"{where}.meta", errors)
            _s(meta, "subNote", f"{where}.meta", errors)
            _s(meta, "icon", f"{where}.meta", errors)
            _color(meta, "color", f"{where}.meta", errors)
            choices = _list(meta, "choices", f"{where}.meta", errors, lo=0, hi=4)
            for k, ch in enumerate(choices):
                cw = f"{where}.meta.choices[{k}]"
                if not isinstance(ch, (str, dict)):
                    errors.append(f"{cw}: must be a string or object")
                elif isinstance(ch, dict):
                    _s(ch, "text", cw, errors, required=True)
                    _bool(ch, "active", cw, errors)
                    _color(ch, "color", cw, errors)
            _s(meta, "avatar", f"{where}.meta", errors)
            _s(meta, "avatarLabel", f"{where}.meta", errors)
            _s(meta, "badge", f"{where}.meta", errors)
        _s(meta, "bottomPill", f"{where}.meta", errors)
        _color(meta, "bottomColor", f"{where}.meta", errors)

    if i == 0 and stype not in {"cb_title", "cold"}:
        warnings.append("video.scenes[0]: chalkboard videos usually start with 'cb_title'")
    return True
