"""Offline lifecycle/transfer tests. These never create sandboxes or encode video."""
import argparse
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import types
import unittest
from unittest.mock import Mock, patch

SPEC = importlib.util.spec_from_file_location(
    "daytona_video", Path(__file__).resolve().parents[1] / "scripts/daytona_video.py")
helper = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(helper)


class NotFound(Exception):
    pass


class DaytonaVideoTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.events = []
        self.remote = {helper.LOG: b"remote job output\n"}
        self.sandbox = Mock(id="owned-sandbox")
        self.sandbox.process.execute_session_command.return_value = types.SimpleNamespace(cmd_id="command")
        self.sandbox.process.get_session_command.return_value = types.SimpleNamespace(exit_code=0)
        self.sandbox.process.exec.side_effect = self.exec_remote
        self.sandbox.fs.download_file.side_effect = self.download
        self.uploaded = {}
        self.sandbox.fs.upload_file.side_effect = self.upload
        self.sandbox.delete.side_effect = lambda **kw: self.events.append(("delete", kw))
        self.client = Mock()
        self.client.create.return_value = self.sandbox
        modules = {
            "daytona": types.SimpleNamespace(
                CreateSandboxFromImageParams=types.SimpleNamespace,
                Resources=types.SimpleNamespace, SessionExecuteRequest=types.SimpleNamespace),
            "daytona.common.errors": types.SimpleNamespace(DaytonaNotFoundError=NotFound),
        }
        patcher = patch.dict("sys.modules", modules)
        patcher.start()
        self.addCleanup(patcher.stop)

    def args(self, job="check", **extra):
        values = dict(job=job, include=[], timeout_minutes=120, idle_minutes=15,
                      cpu=4, memory=8, disk=10, model="large-v3-turbo", language="en",
                      quality="delivery", workers=2, qa_format="jpg")
        return argparse.Namespace(**(values | extra))

    def put(self, name, value):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(value if isinstance(value, bytes) else value.encode())
        return path

    def exec_remote(self, command, timeout=None):
        self.events.append(("exec", command))
        if command.startswith("rm -rf "):
            for path in command.removeprefix("rm -rf ").split("\n"):
                self.uploaded = {name: value for name, value in self.uploaded.items()
                                 if not name.startswith(path)}
            return types.SimpleNamespace(exit_code=0, result="")
        if command.startswith("cat ") and " > " in command:
            parts, remote = command.split("\n")[0].removeprefix("cat ").split(" > ")
            parts = parts.removesuffix("/part-*")
            data = b"".join(value for name, value in sorted(self.uploaded.items())
                           if name.startswith(parts))
            self.remote[remote] = data
            return types.SimpleNamespace(
                exit_code=0, result=f"{hashlib.sha256(data).hexdigest()}  {remote}\n")
        if command.startswith("ls ") and command.endswith(".parts"):
            data = self.remote[command.split()[1][: -len(".parts")]]
            count = -(-len(data) // helper.CHUNK)
            return types.SimpleNamespace(
                exit_code=0, result="\n".join(f"part-{index:04d}" for index in range(count)) + "\n")
        if command.startswith("sha256sum "):
            digest = hashlib.sha256(self.remote[command.split()[1]]).hexdigest()
            return types.SimpleNamespace(exit_code=0, result=f"{digest}  remote\n")
        return types.SimpleNamespace(exit_code=0, result="")

    def upload(self, source, destination):
        self.events.append(("upload", destination))
        self.uploaded[destination] = bytes(source)

    def download(self, remote, destination=None):
        self.events.append(("download", remote))
        source, _, part = remote.partition(".parts/part-")
        if part:
            start = int(part) * helper.CHUNK
            data = self.remote[source][start:start + helper.CHUNK]
        else:
            data = self.remote[remote]
        if destination:
            Path(destination).write_bytes(data)
        else:
            return data

    def audio_fixture(self):
        self.put("content/video.json", json.dumps({"audio": "content/my voice.wav"}))
        self.put("content/my voice.wav", b"exact recording bytes")
        self.put("engine/transcribe.py", "# original transcriber")

    def render_fixture(self):
        self.audio_fixture()
        for name in ("package.json", "package-lock.json", "index.html", "hyperframes.json",
                     "build/vo.json", "build/scenes.json", "build/sfx_track.json"):
            self.put(name, "{}")
        self.put("build/project.json", json.dumps({"width": 1920, "height": 1080, "duration": 12}))
        self.put("build/report.md", "# Video (ALIGNMENT)")
        self.put("build/sfx_track.wav", b"mixed SFX")
        self.put("assets/source.png", b"image")
        self.put("scripts/daytona_video.py", "# helper")
        self.put("tests/test_sample.py", "# test suite")
        self.write_receipt()

    def write_receipt(self):
        files = helper.project_inputs(self.root, "prepare")
        artifacts = [self.root / name for name in helper.PREPARED]
        self.put(helper.RECEIPT, json.dumps({"sources": helper.hashes(self.root, files),
                 "artifacts": helper.hashes(self.root, artifacts), "include": []}))

    def preparation_bundle(self, extra=None):
        payload = io.BytesIO()
        with tarfile.open(fileobj=payload, mode="w:gz") as archive:
            for name in (*helper.PREPARED, "build/qa-report.json", "build/qa/review-phone.jpg"):
                data = (self.root / name).read_bytes() if (self.root / name).exists() else b"QA output"
                entry = tarfile.TarInfo(name)
                entry.size = len(data)
                archive.addfile(entry, io.BytesIO(data))
            if extra:
                entry = tarfile.TarInfo(extra)
                entry.size = 3
                archive.addfile(entry, io.BytesIO(b"bad"))
        self.remote["/tmp/video-results.tar.gz"] = payload.getvalue()

    def test_success_downloads_before_confirmed_deletion_with_idle_failsafe(self):
        helper.execute(self.args(), self.root, self.client)
        params = self.client.create.call_args.args[0]
        self.assertEqual(params.auto_stop_interval, 15)
        self.assertEqual(params.auto_delete_interval, 0)
        self.assertFalse(params.public)
        self.assertEqual(self.events[-1], ("delete", {"timeout": 60, "wait": True}))
        self.assertTrue(list((self.root / "build/daytona").glob("check-*.log")))

    def test_command_failure_still_downloads_logs_and_deletes(self):
        self.sandbox.process.get_session_command.return_value.exit_code = 3
        with self.assertRaisesRegex(RuntimeError, "exited 3"):
            helper.execute(self.args(), self.root, self.client)
        self.sandbox.delete.assert_called_once()
        self.assertEqual(self.events[0], ("download", helper.LOG))

    def test_ctrl_c_still_deletes(self):
        self.sandbox.process.get_session_command.side_effect = KeyboardInterrupt
        with self.assertRaises(KeyboardInterrupt):
            helper.execute(self.args(), self.root, self.client)
        self.sandbox.delete.assert_called_once()

    def test_timed_out_creation_recovers_only_its_unique_sandbox(self):
        self.client.create.side_effect = TimeoutError("create timeout")
        self.client.get.return_value = self.sandbox
        with self.assertRaisesRegex(TimeoutError, "create timeout"):
            helper.execute(self.args(), self.root, self.client)
        self.assertEqual(self.client.get.call_args.args[0], self.client.create.call_args.args[0].name)
        self.sandbox.delete.assert_called_once()

    def test_creation_failure_with_no_allocated_sandbox(self):
        self.client.create.side_effect = RuntimeError("quota")
        self.client.get.side_effect = NotFound
        with self.assertRaisesRegex(RuntimeError, "quota"):
            helper.execute(self.args(), self.root, self.client)
        self.sandbox.delete.assert_not_called()

    def test_cleanup_failure_identifies_the_owned_sandbox(self):
        self.sandbox.delete.side_effect = RuntimeError("network failure")
        with self.assertRaisesRegex(RuntimeError, "Cleanup failed.*owned-sandbox"):
            helper.execute(self.args(), self.root, self.client)

    def test_transcription_uploads_exact_audio_and_downloads_word_timings(self):
        self.audio_fixture()
        payload = json.dumps({"audio": "content/my voice.wav", "segments": [{"words": [
            {"w": "Hello", "s": 0.1, "e": 0.5}]}]}).encode()
        self.remote[f"{helper.REMOTE}/build/vo.json"] = payload
        helper.execute(self.args("transcribe"), self.root, self.client)
        with tarfile.open(fileobj=io.BytesIO(self.remote["/tmp/video-inputs.tar.gz"])) as archive:
            archive_members = {entry.name: archive.extractfile(entry).read() for entry in archive}
        self.assertEqual(archive_members["content/my voice.wav"], b"exact recording bytes")
        self.assertEqual(set(archive_members), {"content/my voice.wav", "engine/transcribe.py"})
        self.assertEqual((self.root / "build/vo.json").read_bytes(), payload)
        self.assertEqual(self.events[-1][0], "delete")

    def test_empty_transcript_keeps_existing_output_and_deletes(self):
        self.audio_fixture()
        self.put("build/vo.json", "previous valid transcript")
        self.remote[f"{helper.REMOTE}/build/vo.json"] = b'{"segments":[]}'
        with self.assertRaisesRegex(RuntimeError, "no word timings"):
            helper.execute(self.args("transcribe"), self.root, self.client)
        self.assertEqual((self.root / "build/vo.json").read_text(), "previous valid transcript")
        self.sandbox.delete.assert_called_once()

    def test_failed_download_removes_partial_and_deletes(self):
        self.render_fixture()
        probe = {"streams": [{"codec_type": "video", "width": 1920, "height": 1080},
                             {"codec_type": "audio"}], "format": {"duration": "12"}}
        self.remote[f"{helper.REMOTE}/renders/probe.json"] = json.dumps(probe).encode()
        self.put("renders/video.mp4", b"previous complete export")
        self.remote[f"{helper.REMOTE}/renders/video.mp4"] = b"complete test artifact"
        download = self.download

        def failing_download(remote, destination=None):
            if ".parts/" in remote and remote.startswith(f"{helper.REMOTE}/renders/video.mp4"):
                raise OSError("connection lost")
            return download(remote, destination)
        self.sandbox.fs.download_file.side_effect = failing_download
        with patch.object(helper.time, "sleep"), \
                self.assertRaisesRegex(RuntimeError, "connection lost"):
            helper.execute(self.args("render"), self.root, self.client)
        self.assertFalse((self.root / "renders/video.mp4.partial").exists())
        self.assertEqual((self.root / "renders/video.mp4").read_bytes(), b"previous complete export")
        self.sandbox.delete.assert_called_once()

    def test_successful_render_retrieves_verified_export_before_deletion(self):
        self.render_fixture()
        probe = {"streams": [{"codec_type": "video", "width": 1920, "height": 1080},
                             {"codec_type": "audio"}], "format": {"duration": "12"}}
        self.remote[f"{helper.REMOTE}/renders/probe.json"] = json.dumps(probe).encode()
        self.remote[f"{helper.REMOTE}/renders/video.mp4"] = b"complete test artifact"
        helper.execute(self.args("render"), self.root, self.client)
        self.assertEqual((self.root / "renders/video.mp4").read_bytes(), b"complete test artifact")
        self.assertLess(self.events.index(("download", f"{helper.REMOTE}/renders/video.mp4.parts/part-0000")),
                        len(self.events) - 1)
        self.assertEqual(self.events[-1][0], "delete")

    def test_large_download_batches_parts_and_writes_them_in_order(self):
        payload = b"".join(bytes([value]) * helper.CHUNK for value in range(5))
        self.remote["/tmp/artifact.bin"] = payload
        batches = []

        class RecordingPool(helper.ThreadPoolExecutor):
            def map(self, fn, iterable):
                batch = list(iterable)
                batches.append(batch)
                return super().map(fn, batch)

        destination = self.root / "renders/artifact.bin"
        with patch.object(helper, "ThreadPoolExecutor", RecordingPool):
            helper.download_large(self.sandbox, "/tmp/artifact.bin", destination, workers=2)
        self.assertEqual(destination.read_bytes(), payload)
        self.assertEqual([name for batch in batches for name in batch],
                         [f"part-{index:04d}" for index in range(5)])
        self.assertEqual([len(batch) for batch in batches], [4, 1])

    def test_invalid_export_is_rejected_and_sandbox_deleted(self):
        self.render_fixture()
        for probe, error in [
            ({"streams": [{"codec_type": "video"}]}, "both video and audio"),
            ({"streams": [{"codec_type": "video", "width": 1280, "height": 720},
                          {"codec_type": "audio"}]}, "dimensions"),
            ({"streams": [{"codec_type": "video", "width": 1920, "height": 1080},
                          {"codec_type": "audio"}], "format": {"duration": "2"}}, "duration"),
        ]:
            with self.subTest(error=error):
                self.remote[f"{helper.REMOTE}/renders/probe.json"] = json.dumps(probe).encode()
                with self.assertRaisesRegex(RuntimeError, error):
                    helper.execute(self.args("render"), self.root, self.client)
                self.assertFalse((self.root / "renders/video.mp4").exists())
        self.assertEqual(self.sandbox.delete.call_count, 3)

    def test_missing_audio_or_draft_timing_never_allocates_compute(self):
        with self.assertRaises(ValueError):
            helper.execute(self.args("transcribe"), self.root, self.client)
        self.render_fixture()
        self.put("build/report.md", "# Video (DRAFT ESTIMATE)")
        with self.assertRaisesRegex(ValueError, "draft timing"):
            helper.execute(self.args("render"), self.root, self.client)
        self.client.create.assert_not_called()

    def test_prepare_needs_source_and_transcript_but_no_local_build(self):
        self.render_fixture()
        self.preparation_bundle()
        for name in helper.PREPARED:
            (self.root / name).unlink()
        helper.execute(self.args("prepare"), self.root, self.client)
        for name in helper.PREPARED:
            self.assertTrue((self.root / name).is_file(), name)
        self.assertTrue((self.root / "build/qa/review-phone.jpg").is_file())
        self.assertTrue((self.root / helper.RECEIPT).is_file())
        helper.verify_prepared(self.root, helper.project_inputs(self.root, "render"))
        self.assertEqual(self.events[-1][0], "delete")

    def test_failed_prepare_retrieves_reports_but_cannot_authorize_render(self):
        self.render_fixture()
        self.preparation_bundle()
        self.sandbox.process.get_session_command.return_value.exit_code = 1
        with self.assertRaisesRegex(RuntimeError, "exited 1"):
            helper.execute(self.args("prepare"), self.root, self.client)
        self.assertTrue((self.root / "build/qa-report.json").is_file())
        self.assertFalse((self.root / helper.RECEIPT).exists())
        self.sandbox.delete.assert_called_once()

    def test_render_refuses_source_and_build_changes_before_allocating(self):
        self.render_fixture()
        self.put("content/my voice.wav", b"changed source audio")
        with self.assertRaisesRegex(ValueError, "changed"):
            helper.execute(self.args("render"), self.root, self.client)
        self.write_receipt()
        self.put("index.html", "changed composition")
        with self.assertRaisesRegex(ValueError, "changed"):
            helper.execute(self.args("render"), self.root, self.client)
        self.client.create.assert_not_called()

    def test_unsafe_downloaded_bundle_cannot_escape_repo(self):
        self.render_fixture()
        self.preparation_bundle(extra="../outside.txt")
        with self.assertRaisesRegex(ValueError, "Unexpected preparation output"):
            helper.retrieve_preparation(self.sandbox, self.root)
        self.assertFalse((self.root.parent / "outside.txt").exists())

    def test_returned_qa_replaces_stale_frames_from_previous_preparation(self):
        self.render_fixture()
        self.preparation_bundle()
        self.put("build/qa/previous-scene.png", b"stale review image")
        helper.retrieve_preparation(self.sandbox, self.root)
        self.assertFalse((self.root / "build/qa/previous-scene.png").exists())
        self.assertTrue((self.root / "build/qa/review-phone.jpg").is_file())

    def test_prepare_commands_execute_qa_in_sandbox_without_encoding(self):
        command = helper.commands(self.args("prepare"), "")
        self.assertIn("python3 engine/align.py", command)
        self.assertIn("npm test", command)
        self.assertIn("npm run lint", command)
        self.assertIn("npm run check", command)
        self.assertIn("snapshot --review", command)
        self.assertNotIn("--quality", command)
        self.assertNotIn("npm run preview", command)
        render = helper.commands(self.args("render"), "")
        self.assertNotIn("npm run build", render)
        self.assertNotIn("engine/align.py", render)

    def test_archive_excludes_secrets_and_caches_and_can_include_other_media(self):
        self.render_fixture()
        self.put("assets/.env", "secret")
        self.put("assets/nested/token.key", "private key")
        self.put("assets/node_modules/cache", "dependency")
        self.put("content/evidence/page.png", "custom media")
        files = helper.project_inputs(self.root, "render", ["content/evidence"])
        archive = self.root / "inputs.tar.gz"
        helper.archive_inputs(self.root, files, archive)
        with tarfile.open(archive) as contents:
            names = contents.getnames()
        self.assertIn("content/evidence/page.png", names)
        self.assertIn("assets/source.png", names)
        self.assertNotIn("assets/.env", names)
        self.assertNotIn("assets/nested/token.key", names)
        self.assertNotIn("assets/node_modules/cache", names)
        for value in ("../outside.wav", "/tmp/outside.wav", "C:/outside.wav", "assets/.env"):
            with self.assertRaises(ValueError):
                helper.repo_file(self.root, value)

    def test_active_work_refreshes_activity_and_deadline_is_enforced(self):
        self.sandbox.process.get_session_command.side_effect = [
            types.SimpleNamespace(exit_code=None), types.SimpleNamespace(exit_code=0)]
        with patch.object(helper.time, "sleep"):
            helper.run_remote(self.sandbox, "sleep 10", helper.time.monotonic() + 60)
        self.sandbox.refresh_activity.assert_called_once()
        with self.assertRaises(TimeoutError):
            helper.run_remote(self.sandbox, "sleep 10", helper.time.monotonic() - 1)


if __name__ == "__main__":
    unittest.main()
