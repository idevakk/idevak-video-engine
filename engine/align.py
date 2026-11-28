"""Align a content project to a word-level transcript and emit build data.

The audio is the timing master. Every scene's ``narration`` must match the
words actually spoken in the voiceover. This script maps the script to the
transcript with a monotonic dynamic program, then gives every scene a
contiguous visual window.

Usage:
    python engine/align.py
    python engine/align.py --draft
    python engine/align.py content/video.json build/vo.json

Outputs:
    build/scenes.json   scenes with start/end timings, ready for the builder
    build/project.json  title, audio path, composition settings, duration
    build/report.md     human-readable timing and alignment report
"""
from __future__ import annotations

import argparse
import json
import re
import sys
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
DEFAULT_VO = ROOT / "build/vo.json"
DEFAULT_OUT = ROOT / "build"
GAP = 0.85


def resolve(path: str | Path, base: Path = ROOT) -> Path:
    p = Path(path)
    return p if p.is_absolute() else (base / p)


def load_json(path: Path):
    if not path.exists():
        raise SystemExit(f"missing file: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def norm(tok: str) -> str:
    t = tok.lower()
    t = re.sub(r"[^a-z0-9$]+", "", t)
    t = t.replace("percent", "%")
    return t


def norm_words(text: str) -> list[str]:
    # ASR can emit a printed compound as several timestamped pieces. Use the
    # same lexical units on both sides, preserving each piece's original time.
    return re.findall(r"[a-z0-9]+", (text or "").lower().replace("%", " percent "))


def sim(a: str, b: str) -> float:
    if a == b:
        return 0.0
    if not a or not b:
        return 1.2
    if a in b or b in a:
        return 0.25
    k = 0
    for x, y in zip(a, b):
        if x != y:
            break
        k += 1
    if k >= 4:
        return 0.45
    return 1.15


def align_words(designed: list[str], transcript: list[str]) -> tuple[dict[int, int], float]:
    """Monotonic word alignment. Returns designed-index -> transcript-index and cost."""
    n, m = len(designed), len(transcript)
    INF = float("inf")
    prev = [j * GAP for j in range(m + 1)]
    bt = bytearray((n + 1) * (m + 1))
    for i in range(1, n + 1):
        cur = [i * GAP] + [INF] * m
        di = designed[i - 1]
        for j in range(1, m + 1):
            c_sub = prev[j - 1] + sim(di, transcript[j - 1])
            c_del = prev[j] + GAP
            c_ins = cur[j - 1] + GAP
            best, code = c_sub, 0
            if c_del < best:
                best, code = c_del, 1
            if c_ins < best:
                best, code = c_ins, 2
            cur[j] = best
            bt[i * (m + 1) + j] = code
        prev = cur

    i, j = n, m
    mapping: dict[int, int] = {}
    while i > 0 or j > 0:
        code = bt[i * (m + 1) + j] if i > 0 and j > 0 else (1 if i > 0 else 2)
        if i > 0 and j > 0 and code == 0:
            mapping[i - 1] = j - 1
            i -= 1
            j -= 1
        elif i > 0 and (j == 0 or code == 1):
            i -= 1
        else:
            j -= 1
    return mapping, prev[m]


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", str(text).lower()).strip("-")
    return s or "video"


def normalize_meta(scene: dict) -> dict:
    meta = dict(scene.get("meta") or {})
    if scene.get("type") != "stat":
        return meta

    if "stat" not in meta:
        raw = meta.get("value", scene.get("headline", ""))
        raw_s = str(raw).replace(",", "")
        m = re.search(r"-?\d+(?:\.\d+)?", raw_s)
        to = float(m.group()) if m else 0.0
        if "dec" in meta:
            dec = int(meta["dec"])
        else:
            dm = re.search(r"\.(\d+)", raw_s)
            dec = len(dm.group(1)) if dm else 0
        meta["stat"] = {
            "to": to,
            "dec": dec,
            "sep": bool(meta.get("sep", "," in str(raw))),
            "from": meta.get("from", 0),
            "nocount": bool(meta.get("nocount")),
        }

    if "display" not in meta:
        st = meta["stat"]
        to = float(st.get("to", 0))
        dec = int(st.get("dec", 0))
        sep = bool(st.get("sep"))
        if dec:
            meta["display"] = f"{to:.{dec}f}"
        else:
            meta["display"] = f"{to:,.0f}" if sep else f"{int(round(to))}"
    return meta


def apply_timing(
    rows: list[dict],
    tw: list[dict],
    audio_end: float,
    lead_in: float,
    min_gap: float,
    min_duration: float,
) -> float:
    designed_tokens: list[str] = []
    token_to_scene: list[int] = []
    for k, row in enumerate(rows):
        words = norm_words(row["narration"])
        row["_nw"] = len(words)
        for w in words:
            designed_tokens.append(w)
            token_to_scene.append(k)

    transcript_tokens: list[str] = []
    transcript_owners: list[int] = []
    for i, word in enumerate(tw):
        for token in norm_words(word.get("w", "")):
            transcript_tokens.append(token)
            transcript_owners.append(i)
    mapping, cost = align_words(designed_tokens, transcript_tokens)

    scene_indices: dict[int, set[int]] = {k: set() for k in range(len(rows))}
    matched_tokens = [0] * len(rows)
    for d_idx, t_idx in mapping.items():
        if t_idx < len(transcript_tokens) and sim(designed_tokens[d_idx], transcript_tokens[t_idx]) <= 0.45:
            s_idx = token_to_scene[d_idx]
            scene_indices[s_idx].add(transcript_owners[t_idx])
            matched_tokens[s_idx] += 1

    for k, row in enumerate(rows):
        hits = [tw[i] for i in sorted(scene_indices[k])]
        row["_matched"] = matched_tokens[k]
        row["_hits"] = hits
        if hits:
            row["_start"] = min(h.get("s", 0.0) for h in hits)
            row["_end"] = max(h.get("e", 0.0) for h in hits)
        else:
            row["_start"] = None
            row["_end"] = None

    for k, row in enumerate(rows):
        if row["_start"] is None:
            prev_end = 0.0
            for j in range(k - 1, -1, -1):
                if rows[j]["_end"] is not None:
                    prev_end = rows[j]["_end"]
                    break
            next_start = audio_end
            for j in range(k + 1, len(rows)):
                if rows[j]["_start"] is not None:
                    next_start = rows[j]["_start"]
                    break
            row["_start"] = prev_end + 0.05
            row["_end"] = max(prev_end + 0.4, next_start)

    for k, row in enumerate(rows):
        row["_start"] = max(0.0, float(row["_start"]))
        row["_end"] = max(float(row["_end"]), row["_start"])

    starts: list[float] = []
    prev = 0.0
    for k, row in enumerate(rows):
        # A cut must never remove the preceding scene's final spoken word.
        # Optional anticipation is restricted to the silence between sentences.
        preferred = min(row["_start"], max(prev + min_gap, row["_start"] - lead_in))
        st = 0.0 if k == 0 else max(rows[k - 1]["_end"], preferred)
        starts.append(st)
        prev = st

    for k, row in enumerate(rows):
        row["start"] = starts[k]
        row["end"] = starts[k + 1] if k + 1 < len(rows) else max(starts[k] + min_duration, audio_end)
    return cost


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("project", nargs="?", default=None)
    ap.add_argument("vo", nargs="?", default=None)
    ap.add_argument("--project", "--workspace", dest="workspace", default=None, help="isolated project workspace slug or directory")
    ap.add_argument("--draft", action="store_true", help="estimate timings from script word counts for fast preview")
    ap.add_argument("--out-dir", default=None)
    ap.add_argument("--lead-in", type=float, default=0.0, help="optional visual anticipation in inter-scene silence; default 0 follows speech")
    ap.add_argument("--min-gap", type=float, default=0.6, help="minimum time between scene starts")
    ap.add_argument("--min-duration", type=float, default=0.35, help="minimum scene duration")
    args = ap.parse_args()

    if args.workspace is not None:
        project_dir = resolve_project_dir(args.workspace, engine_root=ROOT)
    elif args.project is not None:
        p = Path(args.project)
        if p.is_dir() or (ROOT / p).is_dir() or ("/" not in args.project and "\\" not in args.project and not args.project.endswith(".json")):
            project_dir = resolve_project_dir(args.project, engine_root=ROOT)
        else:
            resolved_proj = resolve(args.project, ROOT).resolve()
            parent = resolved_proj.parent
            project_dir = parent.parent if parent.name == "content" and (parent.parent / "engine").is_dir() else parent
    else:
        # When explicit vo or --out-dir is passed without --project, keep legacy ROOT default so tests stay isolated.
        use_active = args.vo is None and args.out_dir is None
        project_dir = resolve_project_dir(None, engine_root=ROOT, use_active=use_active)

    if args.project is not None and str(args.project).lower().endswith(".json"):
        project_path = resolve_project_path(args.project, project_dir, ROOT)
    else:
        project_path = project_json_path(project_dir, ROOT)

    vo_path = resolve(args.vo, project_dir) if args.vo is not None else (project_dir / "build/vo.json")
    out_dir = resolve(args.out_dir, project_dir) if args.out_dir is not None else (project_dir / "build")
    video = load_json(project_path)

    scenes = video.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        raise SystemExit("content/video.json needs a non-empty 'scenes' array")

    acts = {}
    for act in video.get("acts") or []:
        if isinstance(act, dict) and act.get("id"):
            acts[act["id"]] = act

    rows = []
    for i, scene in enumerate(scenes):
        scene_type = scene.get("type") or "statement"
        act = acts.get(scene.get("act"), {})
        meta = normalize_meta(scene)
        if "variant" in scene and scene["variant"] is not None:
            variant = int(scene["variant"])
        elif scene_type == "statement":
            variant = i % 3
        else:
            variant = 0
        rows.append(
            {
                "index": i + 1,
                "id": scene.get("id") or f"s{i + 1:03d}",
                "type": scene_type,
                "act": scene.get("act") or "",
                "eyebrow": scene.get("eyebrow") or act.get("name") or "",
                "headline": scene.get("headline") or "",
                "subline": scene.get("subline") or "",
                "accent": scene.get("accent") or act.get("accent") or video.get("defaultAccent") or "#38bdf8",
                "variant": variant,
                "ghost": scene.get("ghost") or meta.get("ghost") or "",
                "meta": meta,
                "narration": scene.get("narration") or "",
                "mascot": scene.get("mascot"),
            }
        )

    # Draft / Synthetic timing mode
    is_draft = args.draft
    if is_draft:
        curr_t = 0.0
        for row in rows:
            raw_tokens = re.findall(r"\S+", row["narration"] or "")
            nw = len(norm_words(row["narration"]))
            row["_nw"] = nw
            row["_matched"] = nw
            dur = max(2.2, 0.4 + (nw * 0.38))
            row["start"] = round(curr_t, 3)
            curr_t += dur
            row["end"] = round(curr_t, 3)
            if raw_tokens:
                sp_start = row["start"] + 0.18
                sp_end = max(sp_start + 0.2, row["end"] - 0.25)
                step = (sp_end - sp_start) / len(raw_tokens)
                hits = []
                for idx, tok in enumerate(raw_tokens):
                    ws = sp_start + idx * step
                    we = ws + min(0.32, step * 0.9)
                    hits.append({"w": tok, "s": round(ws, 3), "e": round(we, 3)})
                row["_hits"] = hits
                row["_start"] = hits[0]["s"]
                row["_end"] = hits[-1]["e"]
        audio_end = curr_t
        cost = 0.0
        total = curr_t
        matched = sum(r["_matched"] for r in rows)
        designed = matched
        pct = 100.0
    else:
        vo = load_json(vo_path)
        tw = [w for seg in vo.get("segments", []) for w in seg.get("words", [])]
        tw.sort(key=lambda w: w.get("s", 0))
        if not tw:
            raise SystemExit("build/vo.json has no word timings. Run engine/transcribe.py first.")

        audio_end = float(vo.get("duration") or tw[-1].get("e", 0.0))
        if audio_end <= 0:
            raise SystemExit("could not determine the voiceover duration from build/vo.json")

        cost = apply_timing(rows, tw, audio_end, args.lead_in, args.min_gap, args.min_duration)
        total = rows[-1]["end"]
        matched = sum(r.get("_matched", 0) for r in rows)
        designed = sum(r.get("_nw", 0) for r in rows)
        pct = (100.0 * matched / designed) if designed else 0.0

    out_scenes = []
    for row in rows:
        # Extract word timestamps relative to scene start
        scene_st = float(row["start"])
        word_hits = []
        if "_hits" in row and row["_hits"]:
            for h in row["_hits"]:
                word_hits.append({
                    "w": h.get("w", "").strip(),
                    "t": round(max(0.0, float(h.get("s", scene_st)) - scene_st), 3),
                    "d": round(max(0.0, float(h.get("e", 0.0)) - float(h.get("s", 0.0))), 3)
                })

        reveal_time = None
        cue = row["meta"].get("revealOn")
        if isinstance(cue, (int, float)) and not isinstance(cue, bool):
            reveal_time = round(max(0.0, float(cue)), 3)
        elif isinstance(cue, str) and cue.strip():
            cue_tokens = norm_words(cue)
            spoken_tokens = []
            spoken_times = []
            for hit in row.get("_hits", []):
                for token in norm_words(hit.get("w", "")):
                    spoken_tokens.append(token)
                    spoken_times.append(float(hit["s"]))
            for i in range(len(spoken_tokens) - len(cue_tokens) + 1):
                if spoken_tokens[i:i + len(cue_tokens)] == cue_tokens:
                    reveal_time = round(max(0.0, spoken_times[i] - scene_st), 3)
                    break
            if reveal_time is None and not is_draft:
                raise SystemExit(f"scene {row['index']}: revealOn phrase not found in its spoken words: {cue!r}")

        out_scenes.append(
            {
                "index": row["index"],
                "id": row["id"],
                "start": round(row["start"], 3),
                "end": round(row["end"], 3),
                "duration": round(row["end"] - row["start"], 3),
                "speechStart": round(row["_start"], 3) if row.get("_start") is not None else None,
                "speechEnd": round(row["_end"], 3) if row.get("_end") is not None else None,
                "revealTime": reveal_time,
                "type": row["type"],
                "act": row["act"],
                "accent": row["accent"],
                "eyebrow": row["eyebrow"],
                "headline": row["headline"],
                "subline": row["subline"],
                "variant": row["variant"],
                "ghost": row["ghost"],
                "meta": row["meta"],
                "narration": row["narration"],
                "mascot": row["mascot"],
                "wordTimings": word_hits,
            }
        )

    composition = video.get("composition") or {}
    slug = slugify(video.get("slug") or video.get("title") or "video")
    aspect = video.get("aspect") or video.get("aspectRatio") or composition.get("aspect") or composition.get("aspectRatio")
    comp_w = composition.get("width")
    comp_h = composition.get("height")
    if not aspect:
        if comp_w and comp_h and int(comp_h) > int(comp_w):
            aspect = "9:16"
        else:
            aspect = "16:9"

    if aspect == "9:16" and comp_w == 1920 and comp_h == 1080:
        comp_w, comp_h = 1080, 1920
    elif aspect == "16:9" and comp_w == 1080 and comp_h == 1920:
        comp_w, comp_h = 1920, 1080

    default_w = 1080 if aspect == "9:16" else 1920
    default_h = 1920 if aspect == "9:16" else 1080
    w = int(comp_w or default_w)
    h = int(comp_h or default_h)
    is_portrait = (h > w) or (aspect == "9:16")

    style_aliases = {
        "default": "default",
        "chalkboard-explainer": "chalkboard-explainer",
        "chalkboad-explainer": "chalkboard-explainer",
        "motion-explainer": "motion-explainer",
    }
    presets_dir = ROOT / "engine/presets"
    if presets_dir.is_dir():
        for pdir in sorted(presets_dir.iterdir()):
            if pdir.is_dir() and ((pdir / "renderer.mjs").is_file() or (pdir / "schema.py").is_file()):
                style_aliases.setdefault(pdir.name.lower(), pdir.name.lower())
    raw_style = str(video.get("style") or "").strip().lower()
    norm_style = style_aliases.get(raw_style, raw_style) if raw_style else ""

    project = {
        "title": video.get("title") or "Untitled video",
        "slug": slug,
        "compositionId": video.get("compositionId") or slug,
        "audio": video.get("audio") or default_audio_rel(project_dir, ROOT),
        "channel": video.get("channel") or "",
        "cta": video.get("cta") or "",
        "ctaSub": video.get("ctaSub") or "",
        "ghost": video.get("ghost") or "",
        "aspect": "9:16" if is_portrait else "16:9",
        "isPortrait": is_portrait,
        "width": w,
        "height": h,
        "fps": int(composition.get("fps", 30)),
        "duration": round(total, 3),
    }
    if norm_style:
        project["style"] = norm_style
    if "enableMascot" in video:
        project["enableMascot"] = bool(video.get("enableMascot"))

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "scenes.json").write_text(json.dumps(out_scenes, indent=1, ensure_ascii=False), encoding="utf-8")
    (out_dir / "project.json").write_text(json.dumps(project, indent=1, ensure_ascii=False), encoding="utf-8")

    no_match = [r for r in rows if r.get("_matched", 0) == 0]
    short = [r for r in rows if r["end"] - r["start"] < 2.0]
    long = [r for r in rows if r["end"] - r["start"] > 15.0]
    weak = [r for r in rows if r.get("_nw", 0) >= 4 and r.get("_matched", 0) / max(1, r["_nw"]) < 0.5]

    def cell(value) -> str:
        return str(value).replace("|", "\\|").replace("\n", " ")

    mode_label = "DRAFT ESTIMATE" if is_draft else "ALIGNMENT"
    report = [
        f"# {project['title']} ({mode_label})",
        "",
        f"- Audio: `{project['audio']}`",
        f"- Audio duration: {audio_end:.1f}s",
        f"- Scenes: {len(out_scenes)}",
        f"- Video duration: {total:.1f}s",
        f"- Mean scene: {total / max(1, len(out_scenes)):.1f}s",
        f"- Alignment cost: {cost:.1f}",
        f"- Script words matched: {matched}/{designed} ({pct:.1f}%)",
        "- Match percentage measures transcript token coverage, not acoustic timestamp accuracy.",
        f"- Visual anticipation: {args.lead_in:.3f}s, limited to silence after the previous scene's speech.",
        "",
        "| # | Start | End | Speech start | Speech end | Dur | Type | Headline | Words | Matched |",
        "|---:|---:|---:|---:|---:|---:|---|---|---:|---:|",
    ]
    for row in rows:
        report.append(
            f"| {row['index']} | {row['start']:.2f} | {row['end']:.2f} | {row.get('_start', row['start']):.2f} | {row.get('_end', row['end']):.2f} | {row['end'] - row['start']:.1f} | "
            f"{row['type']} | {cell(row['headline'])} | {row.get('_nw', 0)} | {row.get('_matched', 0)} |"
        )

    warnings = []
    if no_match:
        warnings.append("No matched words: " + ", ".join(str(r["index"]) for r in no_match))
    if weak:
        warnings.append("Weak narration match: " + ", ".join(str(r["index"]) for r in weak))
    if short:
        warnings.append("Shorter than 2s: " + ", ".join(str(r["index"]) for r in short))
    if long:
        warnings.append("Longer than 15s: " + ", ".join(str(r["index"]) for r in long))

    report.append("")
    if warnings:
        report.append("## Warnings")
        report.append("")
        report.extend(f"- {w}" for w in warnings)
    else:
        report.append("## Warnings")
        report.append("")
        report.append("- None")
    (out_dir / "report.md").write_text("\n".join(report) + "\n", encoding="utf-8")

    print(f"[align] {len(out_scenes)} scenes, audio {audio_end:.1f}s, video {total:.1f}s ({mode_label})")
    print(f"[align] matched {matched}/{designed} script words ({pct:.1f}%), cost {cost:.1f}")
    if no_match:
        print(f"[align] WARNING: no matched words in scenes {', '.join(str(r['index']) for r in no_match)}")
    print(f"[write] {out_dir / 'scenes.json'}")
    print(f"[write] {out_dir / 'project.json'}")
    print(f"[write] {out_dir / 'report.md'}")


if __name__ == "__main__":
    main()
