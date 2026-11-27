"""Schema validation for the dedicated 'motion-explainer' preset."""
from __future__ import annotations

import re
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[3]


def _check_asset_exists(val: str | None, where: str, errors: list[str], project_dir: Path | None) -> None:
    if not val or val.startswith(("http://", "https://", "data:")):
        return
    clean = val.lstrip("/\\")
    candidates = [_REPO_ROOT / clean]
    if project_dir is not None:
        candidates.insert(0, project_dir / clean)
    if not any(c.is_file() for c in candidates):
        errors.append(f"{where}: local asset not found: {val}")


def _validate_logos(meta: dict, where: str, errors: list[str], project_dir: Path | None) -> None:
    if "logoBackground" in meta and meta["logoBackground"] is not None:
        _s(meta, "logoBackground", where, errors)
    for k, lg in enumerate(_list(meta, "logos", where, errors, hi=6)):
        lw = f"{where}.logos[{k}]"
        if isinstance(lg, dict):
            src = _s(lg, "src", lw, errors, required=True)
            _s(lg, "name", lw, errors)
            _s(lg, "background", lw, errors)
            _check_asset_exists(src, f"{lw}.src", errors, project_dir)
        elif isinstance(lg, str):
            _check_asset_exists(lg, lw, errors, project_dir)
        else:
            errors.append(f"{lw}: must be string or object")

ME_TYPES = {
    "me_title",
    "me_core_orbit",
    "me_bar_compare",
    "me_line_chart",
    "me_stat_split",
    "me_evidence_card",
    "me_pipeline_flow",
    "me_schema_card",
    "me_editor_window",
    "me_decision_gate",
    "me_timeline",
    "me_token_grid",
    "me_outro",
}

ME_COLORS = {"emerald", "orange", "blue", "red", "amber", "violet", "slate"}
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
    if not isinstance(val, str) or (val not in ME_COLORS and not HEX_RE.match(val)):
        errors.append(f"{where}.{key}: must be a motion color ({', '.join(sorted(ME_COLORS))}) or #rrggbb")


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


def validate_motion_explainer_scene(scene: dict, i: int, acts: dict, errors: list[str], warnings: list[str], *, project_dir: Path | None = None) -> bool:
    """Validate a dedicated me_* motion-explainer scene. Returns True if handled."""
    stype = scene.get("type")
    if stype not in ME_TYPES:
        return False

    where = f"scene {i + 1} ({stype})"
    _s(scene, "headline", where, errors, required=True, max_len=140)
    _s(scene, "narration", where, errors, required=True)
    _s(scene, "subline", where, errors, max_len=200)
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

    def _validate_cue(obj: dict, w: str) -> None:
        if "revealOn" in obj and obj["revealOn"] is not None:
            if isinstance(obj["revealOn"], bool) or not isinstance(obj["revealOn"], (str, int, float)):
                errors.append(f"{w}.revealOn: must be a string or number")
        if "cue" in obj and obj["cue"] is not None:
            if isinstance(obj["cue"], bool) or not isinstance(obj["cue"], (str, int, float)):
                errors.append(f"{w}.cue: must be a string or number")

    _validate_cue(meta, f"{where}.meta")

    if stype == "me_title":
        _s(meta, "badge", f"{where}.meta", errors)
        _s(meta, "highlight", f"{where}.meta", errors)
        _check_asset_exists(_s(meta, "logo", f"{where}.meta", errors), f"{where}.meta.logo", errors, project_dir)
        _check_asset_exists(_s(meta, "image", f"{where}.meta", errors), f"{where}.meta.image", errors, project_dir)
        _validate_logos(meta, f"{where}.meta", errors, project_dir)
        _color(meta, "color", f"{where}.meta", errors)
        _bool(meta, "showCore", f"{where}.meta", errors)
        _s(meta, "watermark", f"{where}.meta", errors)
        for k, p in enumerate(_list(meta, "pills", f"{where}.meta", errors, hi=6)):
            if isinstance(p, dict):
                _s(p, "text", f"{where}.meta.pills[{k}]", errors, required=True)
                _color(p, "color", f"{where}.meta.pills[{k}]", errors)
                _validate_cue(p, f"{where}.meta.pills[{k}]")
            elif not isinstance(p, str):
                errors.append(f"{where}.meta.pills[{k}]: must be string or object")

    elif stype == "me_core_orbit":
        _s(meta, "topPill", f"{where}.meta", errors)
        _s(meta, "topLabel", f"{where}.meta", errors)
        _s(meta, "bottomPill", f"{where}.meta", errors)
        _s(meta, "coreLabel", f"{where}.meta", errors)
        _s(meta, "coreIcon", f"{where}.meta", errors)
        _check_asset_exists(_s(meta, "logo", f"{where}.meta", errors), f"{where}.meta.logo", errors, project_dir)
        _check_asset_exists(_s(meta, "coreLogo", f"{where}.meta", errors), f"{where}.meta.coreLogo", errors, project_dir)
        _s(meta, "coreBackground", f"{where}.meta", errors)
        _check_asset_exists(_s(meta, "targetLogo", f"{where}.meta", errors), f"{where}.meta.targetLogo", errors, project_dir)
        _s(meta, "targetBackground", f"{where}.meta", errors)
        _check_asset_exists(_s(meta, "image", f"{where}.meta", errors), f"{where}.meta.image", errors, project_dir)
        _check_asset_exists(_s(meta, "targetImage", f"{where}.meta", errors), f"{where}.meta.targetImage", errors, project_dir)
        _validate_logos(meta, f"{where}.meta", errors, project_dir)
        _bool(meta, "showCube", f"{where}.meta", errors)
        _bool(meta, "showTargetCube", f"{where}.meta", errors)
        _s(meta, "watermark", f"{where}.meta", errors)
        _color(meta, "color", f"{where}.meta", errors)
        _s(meta, "targetLabel", f"{where}.meta", errors)
        _s(meta, "targetSub", f"{where}.meta", errors)
        _s(meta, "targetIcon", f"{where}.meta", errors)
        _s(meta, "arrowLabel", f"{where}.meta", errors)
        _color(meta, "arrowColor", f"{where}.meta", errors)
        for k, node in enumerate(_list(meta, "orbitNodes", f"{where}.meta", errors, hi=8)):
            nw = f"{where}.meta.orbitNodes[{k}]"
            if isinstance(node, dict):
                _s(node, "label", nw, errors)
                _s(node, "icon", nw, errors)
                _color(node, "color", nw, errors)
                _validate_cue(node, nw)
            elif not isinstance(node, str):
                errors.append(f"{nw}: must be string or object")
        for k, deck in enumerate(_list(meta, "memoryDeck", f"{where}.meta", errors, hi=6)):
            if isinstance(deck, dict):
                _s(deck, "tag", f"{where}.meta.memoryDeck[{k}]", errors)
                _s(deck, "label", f"{where}.meta.memoryDeck[{k}]", errors)
        if "modal" in meta and meta["modal"] is not None:
            mw = f"{where}.meta.modal"
            if not isinstance(meta["modal"], dict):
                errors.append(f"{mw}: must be an object")
            else:
                _s(meta["modal"], "title", mw, errors)
                _s(meta["modal"], "body", mw, errors)
                _color(meta["modal"], "color", mw, errors)
                _validate_cue(meta["modal"], mw)
        if "targetBar" in meta and meta["targetBar"] is not None:
            tb = f"{where}.meta.targetBar"
            if isinstance(meta["targetBar"], dict):
                _s(meta["targetBar"], "label", tb, errors, required=True)
                _s(meta["targetBar"], "value", tb, errors, required=True)
                _num(meta["targetBar"], "pct", tb, errors)
                _s(meta["targetBar"], "delta", tb, errors)
                _color(meta["targetBar"], "color", tb, errors)

    elif stype == "me_bar_compare":
        _s(meta, "header", f"{where}.meta", errors)
        _s(meta, "logo", f"{where}.meta", errors)
        _s(meta, "badge", f"{where}.meta", errors)
        _s(meta, "deltaLabel", f"{where}.meta", errors)
        _s(meta, "orientation", f"{where}.meta", errors)
        _s(meta, "heroDelta", f"{where}.meta", errors)
        _s(meta, "heroUnit", f"{where}.meta", errors)
        _color(meta, "deltaColor", f"{where}.meta", errors)
        _num(meta, "thresholdPct", f"{where}.meta", errors)
        _s(meta, "thresholdLabel", f"{where}.meta", errors)
        _s(meta, "bracketLabel", f"{where}.meta", errors)
        _s(meta, "bottomPill", f"{where}.meta", errors)
        if "paperTable" in meta and meta["paperTable"] is not None:
            ptw = f"{where}.meta.paperTable"
            if isinstance(meta["paperTable"], dict):
                _s(meta["paperTable"], "title", ptw, errors)
                _list(meta["paperTable"], "cols", ptw, errors, hi=4)
                for rk, row in enumerate(_list(meta["paperTable"], "rows", ptw, errors, hi=6)):
                    if isinstance(row, dict):
                        _s(row, "step", f"{ptw}.rows[{rk}]", errors, required=True)
                        _s(row, "time", f"{ptw}.rows[{rk}]", errors, required=True)
                        _bool(row, "hot", f"{ptw}.rows[{rk}]", errors)
        bars = _list(meta, "bars", f"{where}.meta", errors, hi=8)
        for k, b in enumerate(bars):
            bw = f"{where}.meta.bars[{k}]"
            if not isinstance(b, dict):
                errors.append(f"{bw}: must be an object")
                continue
            _s(b, "label", bw, errors, required=True)
            _s(b, "value", bw, errors, required=True)
            _num(b, "pct", bw, errors, required=True)
            _s(b, "delta", bw, errors)
            _s(b, "logo", bw, errors)
            _color(b, "color", bw, errors)
            _bool(b, "dashedCap", bw, errors)
            _bool(b, "dashedTail", bw, errors)
            _bool(b, "check", bw, errors)
            for sk, sg in enumerate(_list(b, "segments", bw, errors, hi=4)):
                if isinstance(sg, dict):
                    _s(sg, "value", f"{bw}.segments[{sk}]", errors)
                    _num(sg, "pct", f"{bw}.segments[{sk}]", errors)
                    _color(sg, "color", f"{bw}.segments[{sk}]", errors)
            _validate_cue(b, bw)
        groups = _list(meta, "groups", f"{where}.meta", errors, hi=5)
        for k, g in enumerate(groups):
            gw = f"{where}.meta.groups[{k}]"
            if not isinstance(g, dict):
                errors.append(f"{gw}: must be an object")
                continue
            _s(g, "title", gw, errors, required=True)
            _bool(g, "active", gw, errors)
            _bool(g, "check", gw, errors)
            _s(g, "badge", gw, errors)
            _color(g, "color", gw, errors)
            _validate_cue(g, gw)
            for j, gb in enumerate(_list(g, "bars", gw, errors, lo=1, hi=4)):
                if isinstance(gb, dict):
                    _s(gb, "label", f"{gw}.bars[{j}]", errors, required=True)
                    _s(gb, "value", f"{gw}.bars[{j}]", errors, required=True)
                    _num(gb, "pct", f"{gw}.bars[{j}]", errors, required=True)
                    _color(gb, "color", f"{gw}.bars[{j}]", errors)
        score_rows = _list(meta, "scoreRows", f"{where}.meta", errors, hi=6)
        for k, sr in enumerate(score_rows):
            srw = f"{where}.meta.scoreRows[{k}]"
            if isinstance(sr, dict):
                _s(sr, "label", srw, errors, required=True)
                _s(sr, "score", srw, errors)
                _bool(sr, "active", srw, errors)
                _color(sr, "color", srw, errors)
                _validate_cue(sr, srw)
        if "contextMeter" in meta and meta["contextMeter"] is not None:
            cmw = f"{where}.meta.contextMeter"
            if isinstance(meta["contextMeter"], dict):
                _s(meta["contextMeter"], "label", cmw, errors)
                _s(meta["contextMeter"], "logo", cmw, errors)
                _num(meta["contextMeter"], "total", cmw, errors)
                _num(meta["contextMeter"], "filled", cmw, errors)
                _s(meta["contextMeter"], "badge", cmw, errors)
                _color(meta["contextMeter"], "color", cmw, errors)
        if not bars and not groups and not score_rows:
            errors.append(f"{where}.meta: require 'bars', 'groups', or 'scoreRows'")

    elif stype == "me_line_chart":
        _s(meta, "header", f"{where}.meta", errors)
        _s(meta, "yLabel", f"{where}.meta", errors)
        _s(meta, "badge", f"{where}.meta", errors)
        _s(meta, "bottomPill", f"{where}.meta", errors)
        _num(meta, "yMin", f"{where}.meta", errors)
        _num(meta, "yMax", f"{where}.meta", errors)
        series = _list(meta, "series", f"{where}.meta", errors, required=True, lo=1, hi=4)
        for k, sr in enumerate(series):
            sw = f"{where}.meta.series[{k}]"
            if not isinstance(sr, dict):
                errors.append(f"{sw}: must be an object")
                continue
            _s(sr, "label", sw, errors, required=True)
            _color(sr, "color", sw, errors)
            _bool(sr, "active", sw, errors)
            _validate_cue(sr, sw)
            pts = _list(sr, "points", sw, errors, required=True, lo=2, hi=12)
            for j, pt in enumerate(pts):
                if isinstance(pt, dict):
                    _num(pt, "y", f"{sw}.points[{j}]", errors, required=True)
                    _s(pt, "label", f"{sw}.points[{j}]", errors)
                elif isinstance(pt, bool) or not isinstance(pt, (int, float)):
                    errors.append(f"{sw}.points[{j}]: must be number or object")

    elif stype == "me_stat_split":
        _s(meta, "mode", f"{where}.meta", errors)
        _s(meta, "model", f"{where}.meta", errors)
        _s(meta, "logo", f"{where}.meta", errors)
        _s(meta, "benchmark", f"{where}.meta", errors)
        is_dial = meta.get("mode") == "dial"
        _s(meta, "value", f"{where}.meta", errors, required=not is_dial)
        _s(meta, "baseline", f"{where}.meta", errors)
        _s(meta, "delta", f"{where}.meta", errors)
        _num(meta, "pct", f"{where}.meta", errors)
        _num(meta, "dialSeconds", f"{where}.meta", errors, required=is_dial)
        _num(meta, "dialMax", f"{where}.meta", errors)
        _s(meta, "dialSplitText", f"{where}.meta", errors)
        _s(meta, "queueTitle", f"{where}.meta", errors)
        _s(meta, "queueBadge", f"{where}.meta", errors)
        _num(meta, "queueCount", f"{where}.meta", errors)
        _bool(meta, "miniTerminal", f"{where}.meta", errors)
        _color(meta, "color", f"{where}.meta", errors)
        _s(meta, "sideTitle", f"{where}.meta", errors)
        _s(meta, "sideBadge", f"{where}.meta", errors)
        for k, bdg in enumerate(_list(meta, "badges", f"{where}.meta", errors, hi=4)):
            if isinstance(bdg, dict):
                _s(bdg, "text", f"{where}.meta.badges[{k}]", errors, required=True)
                _s(bdg, "logo", f"{where}.meta.badges[{k}]", errors)
                _s(bdg, "icon", f"{where}.meta.badges[{k}]", errors)
                _color(bdg, "color", f"{where}.meta.badges[{k}]", errors)
        for k, sb in enumerate(_list(meta, "sideBars", f"{where}.meta", errors, hi=4)):
            sbw = f"{where}.meta.sideBars[{k}]"
            if isinstance(sb, dict):
                _s(sb, "label", sbw, errors, required=True)
                _s(sb, "value", sbw, errors, required=True)
                _num(sb, "pct", sbw, errors, required=True)
                _s(sb, "prefix", sbw, errors)
                _color(sb, "color", sbw, errors)
                _validate_cue(sb, sbw)

    elif stype == "me_evidence_card":
        _s(meta, "mode", f"{where}.meta", errors)
        src_val = _s(meta, "source", f"{where}.meta", errors)
        _s(meta, "handle", f"{where}.meta", errors)
        _s(meta, "date", f"{where}.meta", errors)
        _s(meta, "title", f"{where}.meta", errors)
        _s(meta, "body", f"{where}.meta", errors)
        _s(meta, "highlight", f"{where}.meta", errors)
        _s(meta, "callout", f"{where}.meta", errors)
        _s(meta, "badge", f"{where}.meta", errors)
        _check_asset_exists(_s(meta, "logo", f"{where}.meta", errors), f"{where}.meta.logo", errors, project_dir)
        img_val = _s(meta, "image", f"{where}.meta", errors)
        _check_asset_exists(img_val, f"{where}.meta.image", errors, project_dir)
        _validate_logos(meta, f"{where}.meta", errors, project_dir)
        b_url = _s(meta, "browserUrl", f"{where}.meta", errors)
        _s(meta, "browserTab", f"{where}.meta", errors)
        _color(meta, "color", f"{where}.meta", errors)
        if not img_val and ((b_url or "") or re.search(r"arxiv|github\.com|https?://|\.(org|com|io|ai)\b", src_val or "", re.I)):
            warnings.append(f"{where}.meta.image: cites external page/repo without real screenshot (capture via scripts/capture_webref.mjs)")
        if "claim" in meta and meta["claim"] is not None:
            cw = f"{where}.meta.claim"
            if isinstance(meta["claim"], dict):
                _s(meta["claim"], "eyebrow", cw, errors)
                _s(meta["claim"], "pill", cw, errors)
                _s(meta["claim"], "statement", cw, errors)
                _num(meta["claim"], "checks", cw, errors)
                _s(meta["claim"], "footLabel", cw, errors)
                _color(meta["claim"], "color", cw, errors)
        if "speaker" in meta and meta["speaker"] is not None:
            spw = f"{where}.meta.speaker"
            if isinstance(meta["speaker"], dict):
                _s(meta["speaker"], "name", spw, errors, required=True)
                _s(meta["speaker"], "avatar", spw, errors)
                _s(meta["speaker"], "quote", spw, errors, required=True)
                _s(meta["speaker"], "attribution", spw, errors)
                _num(meta["speaker"], "dotsFrom", spw, errors)
                _num(meta["speaker"], "dotsTo", spw, errors)
                _color(meta["speaker"], "color", spw, errors)
        for k, pt in enumerate(_list(meta, "points", f"{where}.meta", errors, hi=5)):
            if isinstance(pt, dict):
                _s(pt, "text", f"{where}.meta.points[{k}]", errors, required=True)
                _color(pt, "color", f"{where}.meta.points[{k}]", errors)
                _validate_cue(pt, f"{where}.meta.points[{k}]")
            elif not isinstance(pt, str):
                errors.append(f"{where}.meta.points[{k}]: must be string or object")

    elif stype == "me_pipeline_flow":
        _s(meta, "mode", f"{where}.meta", errors)
        _check_asset_exists(_s(meta, "logo", f"{where}.meta", errors), f"{where}.meta.logo", errors, project_dir)
        _check_asset_exists(_s(meta, "centerLogo", f"{where}.meta", errors), f"{where}.meta.centerLogo", errors, project_dir)
        _check_asset_exists(_s(meta, "image", f"{where}.meta", errors), f"{where}.meta.image", errors, project_dir)
        _validate_logos(meta, f"{where}.meta", errors, project_dir)
        _s(meta, "centerTitle", f"{where}.meta", errors)
        _s(meta, "centerBadge", f"{where}.meta", errors)
        _s(meta, "rightTitle", f"{where}.meta", errors)
        _s(meta, "bottomPill", f"{where}.meta", errors)
        _s(meta, "roundLabel", f"{where}.meta", errors)
        _color(meta, "color", f"{where}.meta", errors)
        for k, st in enumerate(_list(meta, "steps", f"{where}.meta", errors, hi=6)):
            sw = f"{where}.meta.steps[{k}]"
            if isinstance(st, dict):
                _s(st, "label", sw, errors, required=True)
                _bool(st, "active", sw, errors)
                _color(st, "color", sw, errors)
                _validate_cue(st, sw)
            elif not isinstance(st, str):
                errors.append(f"{sw}: must be string or object")
        for k, nd in enumerate(_list(meta, "nodes", f"{where}.meta", errors, hi=6)):
            nw = f"{where}.meta.nodes[{k}]"
            if isinstance(nd, dict):
                _s(nd, "title", nw, errors, required=True)
                _s(nd, "sub", nw, errors)
                _s(nd, "icon", nw, errors)
                _check_asset_exists(_s(nd, "logo", nw, errors), f"{nw}.logo", errors, project_dir)
                _check_asset_exists(_s(nd, "image", nw, errors), f"{nw}.image", errors, project_dir)
                _s(nd, "logoBackground", nw, errors)
                _color(nd, "color", nw, errors)
                _bool(nd, "active", nw, errors)
                _validate_cue(nd, nw)
        for k, row in enumerate(_list(meta, "rightRows", f"{where}.meta", errors, hi=6)):
            if isinstance(row, dict):
                _s(row, "label", f"{where}.meta.rightRows[{k}]", errors)
                _color(row, "color", f"{where}.meta.rightRows[{k}]", errors)

    elif stype == "me_schema_card":
        _s(meta, "statusPill", f"{where}.meta", errors)
        _s(meta, "eyebrow", f"{where}.meta", errors)
        _s(meta, "title", f"{where}.meta", errors, required=True)
        _check_asset_exists(_s(meta, "logo", f"{where}.meta", errors), f"{where}.meta.logo", errors, project_dir)
        _check_asset_exists(_s(meta, "image", f"{where}.meta", errors), f"{where}.meta.image", errors, project_dir)
        _validate_logos(meta, f"{where}.meta", errors, project_dir)
        _s(meta, "deckTag", f"{where}.meta", errors)
        _s(meta, "deckLabel", f"{where}.meta", errors)
        _s(meta, "compareLabel", f"{where}.meta", errors)
        _s(meta, "compareTitle", f"{where}.meta", errors)
        _color(meta, "color", f"{where}.meta", errors)
        rows = _list(meta, "fields", f"{where}.meta", errors, lo=1, hi=7)
        for k, f in enumerate(rows):
            fw = f"{where}.meta.fields[{k}]"
            if not isinstance(f, dict):
                errors.append(f"{fw}: must be an object")
                continue
            _s(f, "key", fw, errors, required=True)
            _s(f, "val", fw, errors)
            _s(f, "icon", fw, errors)
            _s(f, "status", fw, errors)
            _bool(f, "skeleton", fw, errors)
            _bool(f, "highlight", fw, errors)
            _color(f, "color", fw, errors)
            _validate_cue(f, fw)
        if "attempt" in meta and meta["attempt"] is not None:
            aw = f"{where}.meta.attempt"
            if isinstance(meta["attempt"], dict):
                _s(meta["attempt"], "index", aw, errors)
                _s(meta["attempt"], "label", aw, errors)
                _s(meta["attempt"], "value", aw, errors)
                _color(meta["attempt"], "color", aw, errors)
                _validate_cue(meta["attempt"], aw)

    elif stype == "me_editor_window":
        _s(meta, "filename", f"{where}.meta", errors, required=True)
        _s(meta, "branch", f"{where}.meta", errors)
        _s(meta, "statusRight", f"{where}.meta", errors)
        _s(meta, "footerLabel", f"{where}.meta", errors)
        _s(meta, "stamp", f"{where}.meta", errors)
        _color(meta, "stampColor", f"{where}.meta", errors)
        _bool(meta, "showCore", f"{where}.meta", errors)
        _color(meta, "color", f"{where}.meta", errors)
        lines = _list(meta, "lines", f"{where}.meta", errors, lo=1, hi=12)
        for k, ln in enumerate(lines):
            lw = f"{where}.meta.lines[{k}]"
            if isinstance(ln, dict):
                _s(ln, "text", lw, errors, required=True)
                _s(ln, "kind", lw, errors)
                _bool(ln, "cursor", lw, errors)
                _validate_cue(ln, lw)
            elif not isinstance(ln, str):
                errors.append(f"{lw}: must be string or object")
        if "summaryCard" in meta and meta["summaryCard"] is not None:
            scw = f"{where}.meta.summaryCard"
            if isinstance(meta["summaryCard"], dict):
                _s(meta["summaryCard"], "tag", scw, errors)
                _s(meta["summaryCard"], "badge", scw, errors)
                _color(meta["summaryCard"], "color", scw, errors)
        if "timeline" in meta and meta["timeline"] is not None:
            tlw = f"{where}.meta.timeline"
            if isinstance(meta["timeline"], dict):
                _s(meta["timeline"], "startLabel", tlw, errors)
                _s(meta["timeline"], "endLabel", tlw, errors)

    elif stype == "me_decision_gate":
        _s(meta, "statusPill", f"{where}.meta", errors)
        _s(meta, "counterBadge", f"{where}.meta", errors)
        _s(meta, "rolloutLabel", f"{where}.meta", errors)
        _num(meta, "rolloutCount", f"{where}.meta", errors)
        _num(meta, "rolloutActive", f"{where}.meta", errors)
        _bool(meta, "showCore", f"{where}.meta", errors)
        _check_asset_exists(_s(meta, "logo", f"{where}.meta", errors), f"{where}.meta.logo", errors, project_dir)
        _check_asset_exists(_s(meta, "image", f"{where}.meta", errors), f"{where}.meta.image", errors, project_dir)
        _validate_logos(meta, f"{where}.meta", errors, project_dir)
        if "rollouts" in meta and meta["rollouts"] is not None:
            rw = f"{where}.meta.rollouts"
            if isinstance(meta["rollouts"], dict):
                _num(meta["rollouts"], "total", rw, errors)
                _num(meta["rollouts"], "active", rw, errors)
        has_tiers = isinstance(meta.get("tiers"), list) and len(meta.get("tiers")) > 0
        _s(meta, "question", f"{where}.meta", errors, required=not has_tiers)
        _s(meta, "flowLabel", f"{where}.meta", errors)
        _s(meta, "resultPill", f"{where}.meta", errors)
        _s(meta, "bottomPill", f"{where}.meta", errors)
        _color(meta, "color", f"{where}.meta", errors)
        for k, t in enumerate(_list(meta, "tiers", f"{where}.meta", errors, hi=5)):
            tw = f"{where}.meta.tiers[{k}]"
            if isinstance(t, dict):
                _s(t, "label", tw, errors, required=True)
                _s(t, "visual", tw, errors)
                _s(t, "detail", tw, errors)
                _bool(t, "active", tw, errors)
                _bool(t, "dashed", tw, errors)
                _color(t, "color", tw, errors)
                _validate_cue(t, tw)
        for k, ch in enumerate(_list(meta, "choices", f"{where}.meta", errors, hi=5)):
            cw = f"{where}.meta.choices[{k}]"
            if isinstance(ch, dict):
                _s(ch, "text", cw, errors, required=True)
                _bool(ch, "active", cw, errors)
                _color(ch, "color", cw, errors)
                _validate_cue(ch, cw)
            elif not isinstance(ch, str):
                errors.append(f"{cw}: must be string or object")
        for k, gt in enumerate(_list(meta, "gates", f"{where}.meta", errors, hi=4)):
            gw = f"{where}.meta.gates[{k}]"
            if isinstance(gt, dict):
                _s(gt, "label", gw, errors, required=True)
                _bool(gt, "ok", gw, errors)
                _s(gt, "badge", gw, errors)
                _validate_cue(gt, gw)

    elif stype == "me_token_grid":
        _s(meta, "mode", f"{where}.meta", errors)
        _s(meta, "sourceLabel", f"{where}.meta", errors)
        _num(meta, "sourceCount", f"{where}.meta", errors)
        _s(meta, "targetLabel", f"{where}.meta", errors)
        _num(meta, "targetCount", f"{where}.meta", errors)
        _s(meta, "logo", f"{where}.meta", errors)
        _s(meta, "avatar", f"{where}.meta", errors)
        _s(meta, "speaker", f"{where}.meta", errors)
        _s(meta, "boxTitle", f"{where}.meta", errors)
        _bool(meta, "locked", f"{where}.meta", errors)
        _s(meta, "frozenBadge", f"{where}.meta", errors)
        _num(meta, "tokenCount", f"{where}.meta", errors)
        _s(meta, "bracketLabel", f"{where}.meta", errors)
        _s(meta, "bottomPill", f"{where}.meta", errors)
        _color(meta, "color", f"{where}.meta", errors)
        for k, st in enumerate(_list(meta, "stats", f"{where}.meta", errors, hi=4)):
            if isinstance(st, dict):
                _s(st, "value", f"{where}.meta.stats[{k}]", errors, required=True)
                _s(st, "label", f"{where}.meta.stats[{k}]", errors, required=True)
                _color(st, "color", f"{where}.meta.stats[{k}]", errors)
        if "callout" in meta and meta["callout"] is not None:
            cw = f"{where}.meta.callout"
            if isinstance(meta["callout"], dict):
                _s(meta["callout"], "title", cw, errors)
                _s(meta["callout"], "input", cw, errors)
                _s(meta["callout"], "output", cw, errors, required=True)
                _color(meta["callout"], "color", cw, errors)
        for k, ly in enumerate(_list(meta, "layers", f"{where}.meta", errors, hi=10)):
            if isinstance(ly, dict):
                _s(ly, "label", f"{where}.meta.layers[{k}]", errors)
                _bool(ly, "ok", f"{where}.meta.layers[{k}]", errors)
                _color(ly, "color", f"{where}.meta.layers[{k}]", errors)

    elif stype == "me_timeline":
        _color(meta, "color", f"{where}.meta", errors)
        _s(meta, "bottomPill", f"{where}.meta", errors)
        events = _list(meta, "events", f"{where}.meta", errors, lo=2, hi=7)
        for k, ev in enumerate(events):
            ew = f"{where}.meta.events[{k}]"
            if not isinstance(ev, dict):
                errors.append(f"{ew}: must be an object")
                continue
            _s(ev, "label", ew, errors, required=True)
            _s(ev, "value", ew, errors)
            _s(ev, "sub", ew, errors)
            _color(ev, "color", ew, errors)
            _bool(ev, "active", ew, errors)
            _validate_cue(ev, ew)

    elif stype == "me_outro":
        _s(meta, "channel", f"{where}.meta", errors)
        _s(meta, "cta", f"{where}.meta", errors)
        _s(meta, "ctaSub", f"{where}.meta", errors)
        _color(meta, "color", f"{where}.meta", errors)

    return True


def validate_motion_explainer_project(scenes: list, warnings: list[str]) -> None:
    """Emit editorial warnings if a multi-scene project omits real logos or screenshots."""
    if len(scenes) < 4:
        return
    has_logo = False
    has_image = False
    for sc in scenes:
        if not isinstance(sc, dict):
            continue
        meta = sc.get("meta") if isinstance(sc.get("meta"), dict) else {}
        if any(meta.get(k) for k in ("logo", "coreLogo", "targetLogo", "centerLogo", "logos")):
            has_logo = True
        if any(meta.get(k) for k in ("image", "targetImage")):
            has_image = True
        for nd in (meta.get("nodes") or []):
            if isinstance(nd, dict) and (nd.get("logo") or nd.get("image")):
                has_logo = has_logo or bool(nd.get("logo"))
                has_image = has_image or bool(nd.get("image"))
        for bdg in (meta.get("badges") or []):
            if isinstance(bdg, dict) and bdg.get("logo"):
                has_logo = True
        for bar in (meta.get("bars") or []):
            if isinstance(bar, dict) and bar.get("logo"):
                has_logo = True
    if not has_logo:
        warnings.append("motion-explainer project uses zero authentic brand/model logos; fetch official logos via scripts/fetch_logo.py")
    if not has_image:
        warnings.append("motion-explainer project uses zero real website/evidence screenshots; capture proof via scripts/capture_webref.mjs")
