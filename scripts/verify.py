"""Sanity report for build/scenes.json: timing, coverage, and outliers."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
scenes = json.loads((ROOT / "build/scenes.json").read_text(encoding="utf-8"))

durs = [s["end"] - s["start"] for s in scenes]
total = scenes[-1]["end"]


def pct(xs, p):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(len(xs) * p))]


print(f"scenes {len(scenes)}  total {total:.1f}s  min {min(durs):.1f}  p50 {pct(durs, .5):.1f}  p90 {pct(durs, .9):.1f}  max {max(durs):.1f}")
print("types:", {t: sum(1 for s in scenes if s["type"] == t) for t in sorted({s["type"] for s in scenes})})

print("\nlong scenes:")
for s in scenes:
    d = s["end"] - s["start"]
    if d > 13:
        print(f"  {s['index']:3d} {s['start']:7.1f} {d:5.1f}s {s['type']:10s} {s['headline'][:58]}")

print("\nshort scenes:")
for s in scenes:
    d = s["end"] - s["start"]
    if d < 3.2:
        print(f"  {s['index']:3d} {s['start']:7.1f} {d:5.1f}s {s['type']:10s} {s['headline'][:58]}")

print("\nact boundaries:")
prev = None
for s in scenes:
    if prev is not None:
        gap = s["start"] - prev
        if abs(gap) > 0.01:
            print(f"  {s['index']:3d} gap {gap:+.2f}")
    prev = s["end"]

print("\nfirst 8 scenes:")
for s in scenes[:8]:
    print(f"  {s['index']:3d} {s['start']:7.2f}-{s['end']:7.2f} {s['type']:10s} {s['headline'][:64]}")

print("\nlast 6 scenes:")
for s in scenes[-6:]:
    print(f"  {s['index']:3d} {s['start']:7.2f}-{s['end']:7.2f} {s['type']:10s} {s['headline'][:64]}")
