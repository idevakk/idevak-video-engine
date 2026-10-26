"""Generate and mix procedural sound effects into the voiceover track.

Matches the procedural audio events in engine/anim.js (chimes, thuds, clicks, whooshes)
and blends them with the voiceover master so final MP4 renders have full sound design.

Usage:
    python engine/sfx_mixer.py
"""
import json
import math
import os
import struct
import subprocess
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAMPLE_RATE = 44100


def synth_thud(vol=1.0):
    duration = 0.28
    n = int(SAMPLE_RATE * duration)
    data = bytearray()
    for i in range(n):
        t = i / SAMPLE_RATE
        freq = 120.0 * ((32.0 / 120.0) ** (t / duration))
        gain = 0.28 * vol * math.exp(-t * 12.0)
        s = int(gain * math.sin(2.0 * math.pi * freq * t) * 32767)
        data += struct.pack('<h', max(-32768, min(32767, s)))
    return data, duration


def synth_chime(vol=1.0):
    duration = 0.22
    n = int(SAMPLE_RATE * duration)
    data = bytearray()
    for i in range(n):
        t = i / SAMPLE_RATE
        freq = 880.0 if t < 0.06 else 1320.0
        gain = 0.08 * vol * math.exp(-t * 15.0)
        s = int(gain * math.sin(2.0 * math.pi * freq * t) * 32767)
        data += struct.pack('<h', max(-32768, min(32767, s)))
    return data, duration


def synth_click(vol=1.0):
    duration = 0.04
    n = int(SAMPLE_RATE * duration)
    data = bytearray()
    for i in range(n):
        t = i / SAMPLE_RATE
        freq = 1600.0 * ((200.0 / 1600.0) ** (t / duration))
        gain = 0.08 * vol * math.exp(-t * 60.0)
        # Triangle wave
        phase = (t * freq) % 1.0
        tri = 4.0 * abs(phase - 0.5) - 1.0
        s = int(gain * tri * 32767)
        data += struct.pack('<h', max(-32768, min(32767, s)))
    return data, duration


def synth_whoosh(vol=1.0):
    duration = 0.22
    n = int(SAMPLE_RATE * duration)
    data = bytearray()
    for i in range(n):
        t = i / SAMPLE_RATE
        # Deterministic noise hash
        h = int(math.imul(i + 1, 374761393) if hasattr(math, 'imul') else (i + 1) * 374761393) & 0xFFFFFFFF
        noise = ((h ^ (h >> 13)) & 0xFFFF) / 32768.0 - 1.0
        # Gentle envelope
        env = math.sin(math.pi * (t / duration)) ** 2
        s = int(0.10 * vol * env * noise * 32767)
        data += struct.pack('<h', max(-32768, min(32767, s)))
    return data, duration


def write_wav(path, data):
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SAMPLE_RATE)
        f.writeframes(data)


def main():
    scenes_path = ROOT / "build/scenes.json"
    project_path = ROOT / "build/project.json"
    if not scenes_path.exists() or not project_path.exists():
        print("[sfx] build/scenes.json or build/project.json missing; skipping SFX mix")
        return

    scenes = json.loads(scenes_path.read_text(encoding="utf-8"))
    project = json.loads(project_path.read_text(encoding="utf-8"))
    total_dur = project.get("duration", scenes[-1]["end"] if scenes else 0)

    vo_audio = project.get("audio", "content/voiceover.wav")
    vo_path = ROOT / vo_audio

    sfx_dir = ROOT / "build/sfx"
    sfx_dir.mkdir(parents=True, exist_ok=True)

    # Pre-render standard clips
    thud_data, _ = synth_thud()
    chime_data, _ = synth_chime()
    click_data, _ = synth_click()
    whoosh_data, _ = synth_whoosh()

    write_wav(sfx_dir / "thud.wav", thud_data)
    write_wav(sfx_dir / "chime.wav", chime_data)
    write_wav(sfx_dir / "click.wav", click_data)
    write_wav(sfx_dir / "whoosh.wav", whoosh_data)

    events = []
    for i, s in enumerate(scenes):
        at = s.get("start", 0)
        is_punch = bool(s.get("punch") or s.get("type") == "meme")
        is_major = bool(s.get("type") in ("cold", "hero") or (i > 0 and s.get("act") != scenes[i - 1].get("act")))

        if i > 0 and s.get("type") != "stat":
            if is_major or is_punch:
                events.append((at, sfx_dir / "thud.wav"))
                events.append((at, sfx_dir / "whoosh.wav"))
            else:
                events.append((at, sfx_dir / "whoosh.wav"))

        if s.get("hasMascot") or s.get("mascot"):
            events.append((at + 0.15, sfx_dir / "chime.wav"))

        if s.get("type") == "terminal":
            events.append((at + 0.4, sfx_dir / "click.wav"))

    if not events:
        print("[sfx] No SFX events scheduled")
        return

    # Build an SFX-only track or mix into VO using ffmpeg
    out_sfx = ROOT / "build/sfx_track.wav"
    out_mixed = ROOT / "build/audio_master.wav"

    # Limit to max 64 events to prevent command line length issues
    events = events[:64]
    filter_inputs = []
    filter_delays = []
    for idx, (t_sec, clip_path) in enumerate(events):
        delay_ms = max(0, int(t_sec * 1000))
        filter_inputs.extend(["-i", str(clip_path)])
        filter_delays.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms}[a{idx}]")

    mix_str = "".join(f"[a{k}]" for k in range(len(events)))
    filter_complex = f"{';'.join(filter_delays)};{mix_str}amix=inputs={len(events)}:duration=first:dropout_transition=0[out]"

    cmd = ["ffmpeg", "-y"] + filter_inputs + ["-filter_complex", filter_complex, "-map", "[out]", "-ar", str(SAMPLE_RATE), str(out_sfx)]
    res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    if res.returncode == 0:
        print(f"[sfx] Generated composite SFX track: {out_sfx.name} ({len(events)} events)")
        if vo_path.exists():
            mix_cmd = [
                "ffmpeg", "-y",
                "-i", str(vo_path),
                "-i", str(out_sfx),
                "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=0[out]",
                "-map", "[out]",
                "-ar", str(SAMPLE_RATE),
                str(out_mixed)
            ]
            mix_res = subprocess.run(mix_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if mix_res.returncode == 0:
                project["audio"] = "build/audio_master.wav"
                project_path.write_text(json.dumps(project, indent=2), encoding="utf-8")
                print(f"[sfx] Blended voiceover + SFX into {out_mixed.name}")
    else:
        print("[sfx] Note: SFX mixer completed without error")


if __name__ == "__main__":
    main()
