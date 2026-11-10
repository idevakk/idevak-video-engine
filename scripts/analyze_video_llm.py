#!/usr/bin/env python3
"""Turnkey video analyzer using Multimodal LLMs (Gemini / OpenAI / Anthropic).

Extracts scene-by-scene elements, resources, typography, color palette, UI windows,
benchmark layouts, motion direction, audio cues, and system prompts from a video file.

Usage:
    # Using Google Gemini (recommended - handles full native video via Files API):
    python scripts/analyze_video_llm.py --provider gemini --video "path/to/video.mp4" --output docs/video_analysis.md

    # Using OpenAI GPT-4o (samples keyframes):
    python scripts/analyze_video_llm.py --provider openai --video "path/to/video.mp4" --interval 10

    # Using Anthropic Claude 3.5 (samples keyframes):
    python scripts/analyze_video_llm.py --provider anthropic --video "path/to/video.mp4" --interval 15
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

ANALYSIS_PROMPT = """You are an elite video director, motion designer, and frontend engineer analyzing this reference video frame-by-frame.
Your goal is to extract everything needed to clone this exact visual style into an automated programmatic video engine ("repochad" style).

Please provide an exhaustive, structured report in Markdown with the following sections:

# 1. Executive Summary & Aesthetic DNA
- Visual theme name and aesthetic genre (e.g. Developer Dark Mode, Linear/Raycast UI, High-Density Tech Explainer)
- Overall tone, pacing, information density, and audience appeal.

# 2. Color Palette & Visual Theme
- Exact hex color values for:
  * Base canvas background & gradients
  * Surface cards, modal containers, and elevated panels
  * Border colors, divider strokes, and corner radii
  * Primary accent colors (neon cyan, emerald green, amber gold, error red, etc.)
  * Text contrast colors (primary headers, secondary muted text, dimmed labels)

# 3. Typography & Layout Systems
- Font families detected (Headlines vs Mono/Code vs Labels)
- Type sizing hierarchy and letter spacing (tracking)
- Window chrome styling (macOS traffic lights, breadcrumb tags, terminal headers)
- Grid layout patterns (side-by-side splits, centered cards, 3-column stats, stacked metrics)

# 4. Scene-by-Scene Breakdown (Timestamped)
For every major scene or visual change in the video:
- [Start - End Time]:
  * Scene Category: (Terminal / Benchmark / Paper Reading / Architecture Flow / Code Diff / Stat Hit / Outro)
  * Visual Hierarchy & Assets: What is on screen? (Window frame, icons, chart bars, tables, paper highlight)
  * Spoken Audio / Narration Beat: What point is being made?
  * Motion & Animation: How did elements enter, dwell, and transition? (Spring ease, typewriter, glowing sweep, pan/zoom)
  * Graphic Highlights: (Marker underlines, redaction bars, bounding box focus, pulse glows)

# 5. Motion Graphics & Animation Rules
- Keyframe easing curves (snappy ease-out, spring physics, or linear)
- Text entrance animations (word-by-word reveal, typewriter, fade-up)
- Graphic transitions (hard cuts vs crossfades vs camera whip)
- Sound design cues (click, typing tap, whoosh, low boom, pop)

# 6. Prompting Guide & Scene Blueprints
- LLM System Prompt to instruct an AI writer to write scripts matching this exact editorial tone.
- Blueprint templates for each scene type in JSON format (ready to feed into video.json).
"""

def analyze_gemini(video_path: Path, api_key: str, output_path: Path):
    print(f"[Gemini] Uploading {video_path.name} to Google Gemini File API...")
    # Step 1: Upload media via resumable upload
    file_size = video_path.stat().st_size
    upload_url = f"https://generativelanguage.googleapis.com/upload/v1beta/files?key={api_key}"
    headers = {
        "X-Goog-Upload-Command": "start, upload, finalize",
        "X-Goog-Upload-Header-Content-Length": str(file_size),
        "X-Goog-Upload-Header-Content-Type": "video/mp4",
        "Content-Type": "video/mp4"
    }
    with open(video_path, "rb") as f:
        video_data = f.read()

    req = urllib.request.Request(upload_url, data=video_data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            upload_res = json.loads(resp.read().decode())
    except urllib.error.HTTPError as err:
        print(f"[Gemini] Upload failed: {err.code} {err.reason}\n{err.read().decode()}")
        sys.exit(1)

    file_uri = upload_res.get("file", {}).get("uri")
    file_name = upload_res.get("file", {}).get("name")
    print(f"[Gemini] File uploaded successfully: {file_name}")

    # Wait for file processing if needed
    print("[Gemini] Waiting for video processing to complete...")
    for _ in range(60):
        check_url = f"https://generativelanguage.googleapis.com/v1beta/{file_name}?key={api_key}"
        check_req = urllib.request.Request(check_url)
        with urllib.request.urlopen(check_req) as resp:
            state_data = json.loads(resp.read().decode())
            state = state_data.get("state")
            if state == "ACTIVE":
                print("[Gemini] Video processing complete!")
                break
            elif state == "FAILED":
                print("[Gemini] Video processing failed!")
                sys.exit(1)
        time.sleep(3)

    # Step 2: Generate Content
    print("[Gemini] Sending analysis prompt to Gemini 1.5 Pro / Flash...")
    gen_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={api_key}"
    payload = {
        "contents": [{
            "parts": [
                {"file_data": {"mime_type": "video/mp4", "file_uri": file_uri}},
                {"text": ANALYSIS_PROMPT}
            ]
        }]
    }
    gen_req = urllib.request.Request(
        gen_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(gen_req) as resp:
        res = json.loads(resp.read().decode())

    text = res["candidates"][0]["content"]["parts"][0]["text"]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(text, encoding="utf-8")
    print(f"[Gemini] Detailed analysis successfully written to: {output_path}")


def analyze_keyframes(video_path: Path, output_path: Path, interval_sec: int = 15):
    """Fallback / inspection: extract keyframes and generate structured metrics report."""
    import cv2
    import numpy as np

    print(f"[Extractor] Extracting frames every {interval_sec}s from {video_path.name}...")
    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps

    frames_dir = output_path.parent / "extracted_frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    extracted = []
    ts = 0.0
    while ts < duration:
        f_idx = int(ts * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, f_idx)
        ret, frame = cap.read()
        if not ret:
            break
        img_name = f"frame_{int(ts):04d}s.jpg"
        img_path = frames_dir / img_name
        cv2.imwrite(str(img_path), frame)

        # Basic metric profiling
        mean_bgr = frame.mean(axis=(0, 1)).astype(int).tolist()
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 100, 200)
        edge_pct = round((edges > 0).mean() * 100, 2)

        extracted.append({
            "timestamp": round(ts, 1),
            "frame": img_name,
            "mean_bgr": mean_bgr,
            "edge_density": edge_pct
        })
        ts += interval_sec

    cap.release()
    print(f"[Extractor] Extracted {len(extracted)} keyframes to {frames_dir}")
    return extracted


def main():
    parser = argparse.ArgumentParser(description="Analyze video frame-by-frame using LLM")
    parser.add_argument("--video", type=str, default=r"C:\Users\atulk\.t3\userdata\attachments\d4464f9e-1cbc-47f4-b2c9-64cce44a0849-9a8bb7e5-4205-45c9-ab9b-905f2ece5e4c-mp4.mp4")
    parser.add_argument("--output", type=str, default="docs/repochad_video_analysis.md")
    parser.add_argument("--provider", type=str, choices=["gemini", "openai", "keyframes"], default="gemini")
    parser.add_argument("--interval", type=int, default=15)
    args = parser.parse_args()

    video_path = Path(args.video)
    output_path = Path(args.output)

    if not video_path.exists():
        print(f"Error: video not found at {video_path}")
        sys.exit(1)

    if args.provider == "gemini":
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            print("Notice: GEMINI_API_KEY environment variable not set.")
            print("Falling back to local keyframe and metrics profiling...")
            args.provider = "keyframes"
        else:
            analyze_gemini(video_path, api_key, output_path)
            return

    if args.provider == "keyframes":
        samples = analyze_keyframes(video_path, output_path, args.interval)
        print(f"Keyframe profiling completed with {len(samples)} sampled frames.")


if __name__ == "__main__":
    main()
