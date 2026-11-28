"""Tests for optional Gemini AI Studio TTS voiceover generator."""
from __future__ import annotations

import io
import json
import os
import struct
import sys
import tempfile
import types
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts import generate_tts  # noqa: E402


class TestGeminiTts(unittest.TestCase):
    def test_parse_audio_mime_type(self) -> None:
        self.assertEqual(
            generate_tts.parse_audio_mime_type("audio/L16;rate=24000"),
            {"bits_per_sample": 16, "rate": 24000},
        )
        self.assertEqual(
            generate_tts.parse_audio_mime_type("audio/L24; rate=48000"),
            {"bits_per_sample": 24, "rate": 48000},
        )
        self.assertEqual(
            generate_tts.parse_audio_mime_type("audio/wav"),
            {"bits_per_sample": 16, "rate": 24000},
        )

    def test_convert_to_wav_header(self) -> None:
        pcm = b"\x01\x02\x03\x04"
        wav = generate_tts.convert_to_wav(pcm, "audio/L16;rate=24000")
        self.assertEqual(wav[:4], b"RIFF")
        self.assertEqual(wav[8:12], b"WAVE")
        self.assertEqual(wav[12:16], b"fmt ")
        self.assertEqual(wav[36:40], b"data")
        chunk_size, = struct.unpack("<I", wav[4:8])
        sample_rate, = struct.unpack("<I", wav[24:28])
        bits_per_sample, = struct.unpack("<H", wav[34:36])
        data_size, = struct.unpack("<I", wav[40:44])
        self.assertEqual(chunk_size, 36 + len(pcm))
        self.assertEqual(sample_rate, 24000)
        self.assertEqual(bits_per_sample, 16)
        self.assertEqual(data_size, len(pcm))
        self.assertEqual(wav[44:], pcm)

    def test_missing_api_key_reports_private_secret_instruction(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            ws = Path(tmp)
            notes = ws / "notes"
            notes.mkdir()
            (notes / "phonetic_tts_script.txt").write_text("C-V-E twenty twenty-six.", encoding="utf-8")
            (ws / "video.json").write_text(json.dumps({"audio": "voiceover.wav"}), encoding="utf-8")

            stderr = io.StringIO()
            with mock.patch.dict(os.environ, {"GEMINI_API_KEY": ""}, clear=False):
                with redirect_stderr(stderr):
                    rc = generate_tts.main(["--project", str(ws)])
            self.assertEqual(rc, 1)
            err_text = stderr.getvalue()
            self.assertIn("GEMINI_API_KEY", err_text)
            self.assertIn("request_secret", err_text)

    def test_dry_run_resolves_workspace_and_script(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            ws = Path(tmp)
            notes = ws / "notes"
            notes.mkdir()
            (notes / "phonetic_tts_script.txt").write_text("E-B-P-F crashed.", encoding="utf-8")
            (ws / "video.json").write_text(json.dumps({"audio": "custom-vo.wav"}), encoding="utf-8")

            stdout = io.StringIO()
            with mock.patch.dict(os.environ, {"GEMINI_API_KEY": ""}, clear=False):
                with redirect_stdout(stdout):
                    rc = generate_tts.main(["--project", str(ws), "--dry-run"])
            self.assertEqual(rc, 0)
            out = stdout.getvalue()
            self.assertIn("Dry run OK", out)
            self.assertIn("custom-vo.wav", out)

    def test_generate_voiceover_writes_wav_with_mock_genai(self) -> None:
        captured: dict[str, object] = {}

        class FakePart:
            def __init__(self, text: str | None = None, inline_data=None) -> None:
                self.text = text
                self.inline_data = inline_data

            @classmethod
            def from_text(cls, text: str):
                return cls(text=text)

        class FakeContent:
            def __init__(self, role: str, parts: list) -> None:
                self.role = role
                self.parts = parts

        class FakeModels:
            def generate_content_stream(self, *, model, contents, config):
                captured["model"] = model
                captured["text"] = contents[0].parts[0].text
                captured["voice"] = config.speech_config.voice_config.prebuilt_voice_config.voice_name
                chunk1 = types.SimpleNamespace(
                    parts=[types.SimpleNamespace(inline_data=types.SimpleNamespace(data=b"\x00\x01", mime_type="audio/L16;rate=24000"), text=None)]
                )
                chunk2 = types.SimpleNamespace(
                    parts=[types.SimpleNamespace(inline_data=types.SimpleNamespace(data=b"\x02\x03", mime_type="audio/L16;rate=24000"), text=None)]
                )
                return [chunk1, chunk2]

        class FakeClient:
            def __init__(self, *, api_key: str, http_options=None) -> None:
                captured["api_key"] = api_key
                self.models = FakeModels()

        fake_types = types.ModuleType("google.genai.types")
        fake_types.HttpOptions = lambda **kw: kw
        fake_types.Content = FakeContent
        fake_types.Part = FakePart
        fake_types.GenerateContentConfig = lambda **kw: types.SimpleNamespace(**kw)
        fake_types.SpeechConfig = lambda **kw: types.SimpleNamespace(**kw)
        fake_types.VoiceConfig = lambda **kw: types.SimpleNamespace(**kw)
        fake_types.PrebuiltVoiceConfig = lambda **kw: types.SimpleNamespace(**kw)

        fake_genai = types.ModuleType("google.genai")
        fake_genai.Client = FakeClient
        fake_genai.types = fake_types

        fake_google = types.ModuleType("google")
        fake_google.genai = fake_genai

        with tempfile.TemporaryDirectory() as tmp:
            ws = Path(tmp)
            notes = ws / "notes"
            notes.mkdir()
            (notes / "phonetic_tts_script.txt").write_text("S-three outage... zero-X nine-C.", encoding="utf-8")
            (ws / "video.json").write_text(json.dumps({"audio": "voiceover.wav"}), encoding="utf-8")

            stdout = io.StringIO()
            with mock.patch.dict(sys.modules, {"google": fake_google, "google.genai": fake_genai, "google.genai.types": fake_types}):
                with mock.patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}, clear=False):
                    with redirect_stdout(stdout):
                        rc = generate_tts.main(["--project", str(ws)])

            self.assertEqual(rc, 0)
            out_wav = ws / "voiceover.wav"
            self.assertTrue(out_wav.is_file())
            raw = out_wav.read_bytes()
            self.assertEqual(raw[:4], b"RIFF")
            self.assertEqual(raw[44:], b"\x00\x01\x02\x03")
            self.assertEqual(captured["api_key"], "test-key")
            self.assertEqual(captured["model"], "gemini-3.8-flash-tts")
            self.assertEqual(captured["voice"], "Sadaltager")
            self.assertEqual(captured["text"], "## Transcript:\nS-three outage... zero-X nine-C.")

    def test_voice_defaults_by_aspect_and_strict_allowlist(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            ws = Path(tmp)
            notes = ws / "notes"
            notes.mkdir()
            (notes / "phonetic_tts_script.txt").write_text("Test line.", encoding="utf-8")

            # 16:9 landscape -> Sadaltager
            (ws / "video.json").write_text(json.dumps({"aspect": "16:9"}), encoding="utf-8")
            self.assertEqual(generate_tts.resolve_voice(None, ws), "Sadaltager")

            # 9:16 portrait via aspect -> Aoede
            (ws / "video.json").write_text(json.dumps({"aspect": "9:16"}), encoding="utf-8")
            self.assertEqual(generate_tts.resolve_voice(None, ws), "Aoede")

            # 9:16 portrait via composition dimensions -> Aoede
            (ws / "video.json").write_text(
                json.dumps({"composition": {"width": 1080, "height": 1920}}),
                encoding="utf-8",
            )
            self.assertEqual(generate_tts.resolve_voice(None, ws), "Aoede")

            # Explicit aliases
            self.assertEqual(generate_tts.resolve_voice("male", ws), "Sadaltager")
            self.assertEqual(generate_tts.resolve_voice("female", ws), "Aoede")
            self.assertEqual(generate_tts.resolve_voice("Aoede", ws), "Aoede")
            self.assertEqual(generate_tts.resolve_voice("Sadaltager", ws), "Sadaltager")

            # Unapproved persona rejected
            with self.assertRaises(SystemExit) as ctx:
                generate_tts.resolve_voice("Puck", ws)
            self.assertIn("Only 'Sadaltager' (male) and 'Aoede' (female) are allowed", str(ctx.exception))

    def test_rate_limit_reports_clearly_without_random_fallback(self) -> None:
        class FailingModels:
            def generate_content_stream(self, **kwargs):
                raise RuntimeError("429 RESOURCE_EXHAUSTED: Quota exceeded")

        class FailingClient:
            def __init__(self, *, api_key: str, http_options=None) -> None:
                self.models = FailingModels()

        fake_types = types.ModuleType("google.genai.types")
        fake_types.HttpOptions = lambda **kw: kw
        fake_types.Content = lambda **kw: types.SimpleNamespace(**kw)
        fake_types.Part = types.SimpleNamespace(from_text=lambda text: types.SimpleNamespace(text=text))
        fake_types.GenerateContentConfig = lambda **kw: types.SimpleNamespace(**kw)
        fake_types.SpeechConfig = lambda **kw: types.SimpleNamespace(**kw)
        fake_types.VoiceConfig = lambda **kw: types.SimpleNamespace(**kw)
        fake_types.PrebuiltVoiceConfig = lambda **kw: types.SimpleNamespace(**kw)

        fake_genai = types.ModuleType("google.genai")
        fake_genai.Client = FailingClient
        fake_genai.types = fake_types

        fake_google = types.ModuleType("google")
        fake_google.genai = fake_genai

        with tempfile.TemporaryDirectory() as tmp:
            out_wav = Path(tmp) / "voiceover.wav"
            with mock.patch.dict(sys.modules, {"google": fake_google, "google.genai": fake_genai, "google.genai.types": fake_types}):
                with self.assertRaises(SystemExit) as ctx:
                    generate_tts.generate_voiceover(
                        "Test script",
                        out_wav,
                        api_key="test-key",
                        voice_name="Aoede",
                    )
            msg = str(ctx.exception)
            self.assertIn("rate limit or quota hit", msg)
            self.assertIn("Aoede", msg)
            self.assertIn("Ask the user how to proceed", msg)


if __name__ == "__main__":
    unittest.main()
