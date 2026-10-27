"""Opt-in Daytona transcription, preparation, and rendering. See docs/DAYTONA.md."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shlex
import shutil
import signal
import sys
import tarfile
import tempfile
import threading
import time
import uuid

ROOT = Path(__file__).resolve().parent.parent
REMOTE = "/root/video-engine"
LOG = "/tmp/video-engine-job.log"
EXCLUDED = {".git", "node_modules", "__pycache__", ".venv", "venv", ".hyperframes"}
PREPARED = ("index.html", "hyperframes.json", "build/project.json", "build/scenes.json",
            "build/report.md", "build/sfx_track.wav", "build/sfx_track.json")
RECEIPT = "build/daytona/prepared.json"


def repo_file(root: Path, value: str, allow_directory: bool = False) -> Path:
    """Only portable repo-local regular files may be sent to the sandbox."""
    relative = PurePosixPath(value)
    if "\\" in value or ":" in value or relative.is_absolute() or ".." in relative.parts:
        raise ValueError(f"Use a repo-relative POSIX path: {value}")
    path = root / value
    for part in relative.parts:
        if part in EXCLUDED or part.startswith(".env") or part.endswith((".pem", ".key")):
            raise ValueError(f"Excluded private/cache path: {value}")
    if any(parent.is_symlink() or getattr(parent, "is_junction", lambda: False)()
           for parent in [path, *path.parents] if parent.is_relative_to(root)):
        raise ValueError(f"Symlinks are not uploaded: {value}")
    if not path.resolve().is_relative_to(root.resolve()) or not (
            path.is_file() or (allow_directory and path.is_dir())):
        raise ValueError(f"Missing repo-local file: {value}")
    return path


def project_inputs(root: Path, job: str, includes=()) -> list[Path]:
    if job == "check":
        return []
    video = json.loads(repo_file(root, "content/video.json").read_text(encoding="utf-8"))
    audio = repo_file(root, video.get("audio") or "content/voiceover.wav")
    if job == "transcribe":
        return [repo_file(root, "engine/transcribe.py"), audio]
    # Preparation requires source plus the sandbox transcript, not a local build.
    files = [repo_file(root, name) for name in (
        "package.json", "package-lock.json", "content/video.json", "build/vo.json",
    )]
    files.append(audio)
    for directory in ("engine", "assets", "scripts", "tests", *includes):
        source = repo_file(root, directory, allow_directory=True)
        if source.is_file():
            files.append(source)
            continue
        for path in sorted(source.rglob("*")):
            rel = path.relative_to(root).as_posix()
            if any(part in EXCLUDED or part.startswith(".env") or part.endswith((".pem", ".key"))
                   for part in path.relative_to(root).parts):
                continue
            if path.is_file() or path.is_symlink():
                files.append(repo_file(root, rel))
    return list(dict.fromkeys(files))


def hashes(root: Path, files: list[Path]) -> dict[str, str]:
    result = {}
    for path in files:
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        result[path.relative_to(root).as_posix()] = digest.hexdigest()
    return result


def verify_prepared(root: Path, files: list[Path]) -> list[Path]:
    receipt = json.loads(repo_file(root, RECEIPT).read_text(encoding="utf-8"))
    artifacts = [repo_file(root, name) for name in PREPARED]
    if "DRAFT ESTIMATE" in (root / "build/report.md").read_text(encoding="utf-8"):
        raise ValueError("Final rendering requires real voiceover alignment, not draft timing")
    if receipt.get("sources") != hashes(root, files) or receipt.get("artifacts") != hashes(root, artifacts):
        raise ValueError("Source or prepared files changed. Run the Daytona prepare command and review QA again")
    return artifacts + [root / RECEIPT]


def archive_inputs(root: Path, files: list[Path], destination: Path) -> None:
    with tarfile.open(destination, "w:gz") as archive:
        for path in files:
            archive.add(path, arcname=path.relative_to(root).as_posix(), recursive=False)


def run_remote(sandbox, command: str, deadline: float) -> None:
    """Monitor actual work and refresh activity, leaving the idle failsafe enabled."""
    from daytona import SessionExecuteRequest

    session = "job-" + uuid.uuid4().hex[:12]
    sandbox.process.create_session(session, request_timeout=30)
    wrapped = f"set -euo pipefail\n{{\n{command}\n}} >> {LOG} 2>&1"
    response = sandbox.process.execute_session_command(
        session, SessionExecuteRequest(command=shlex.join(["bash", "-lc", wrapped]), run_async=True),
        timeout=30,
    )
    last_notice = time.monotonic()
    while True:
        if time.monotonic() >= deadline:
            raise TimeoutError("Daytona job exceeded --timeout-minutes")
        status = sandbox.process.get_session_command(session, response.cmd_id, request_timeout=30)
        if status.exit_code is not None:
            if status.exit_code != 0:
                raise RuntimeError(f"Sandbox command exited {status.exit_code}; see downloaded job log")
            return
        sandbox.refresh_activity(request_timeout=30)
        if time.monotonic() - last_notice >= 30:
            print("[daytona] Job still running", flush=True)
            last_notice = time.monotonic()
        time.sleep(5)


def download_atomic(sandbox, remote: str, local: Path) -> None:
    local.parent.mkdir(parents=True, exist_ok=True)
    temporary = local.with_name(local.name + ".partial")
    try:
        sandbox.fs.download_file(remote, str(temporary))
        if not temporary.is_file() or temporary.stat().st_size == 0:
            raise RuntimeError(f"Empty download: {remote}")
        temporary.replace(local)
    finally:
        temporary.unlink(missing_ok=True)


def retrieve_preparation(sandbox, root: Path, qa_format: str = "jpg") -> None:
    """Return generated artifacts/reports, including diagnostics from failed QA."""
    package = (
        "import pathlib,subprocess,tarfile\n"
        f"root=pathlib.Path({REMOTE!r})\n"
        f"if {qa_format!r} == 'jpg':\n"
        " report=root/'build/qa-report.json'\n"
        " text=report.read_text() if report.exists() else ''\n"
        " for image in (root/'build/qa').glob('*.png'):\n"
        "  jpeg=image.with_suffix('.jpg')\n"
        "  subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(image),'-q:v','2',str(jpeg)],check=True)\n"
        "  text=text.replace(str(image),str(jpeg))\n"
        "  image.unlink()\n"
        " if report.exists(): report.write_text(text)\n"
        "with tarfile.open('/tmp/video-results.tar.gz','w:gz') as out:\n"
        " for name in ('build','index.html','hyperframes.json'):\n"
        "  if (root/name).exists(): out.add(root/name,arcname=name)\n"
        " checks=root/'.hyperframes/artifacts/checks'\n"
        " if checks.exists(): out.add(checks,arcname='build/qa/checks')\n"
    )
    result = sandbox.process.exec(shlex.join(["python3", "-c", package]), timeout=600)
    if result.exit_code != 0:
        raise RuntimeError(f"Could not package preparation reports: {result.result}")
    with tempfile.TemporaryDirectory(prefix="video-results-") as temp:
        archive = Path(temp) / "results.tar.gz"
        download_atomic(sandbox, "/tmp/video-results.tar.gz", archive)
        with tarfile.open(archive, "r:gz") as contents:
            # No extractall: accept regular output files only, never links/traversal.
            members = []
            for member in contents:
                name = PurePosixPath(member.name)
                if (name.is_absolute() or ".." in name.parts or "\\" in member.name
                        or ":" in member.name or not name.parts
                        or not (name.parts[0] == "build" or member.name in ("index.html", "hyperframes.json"))
                        or not (member.isdir() or member.isfile())):
                    raise ValueError(f"Unexpected preparation output: {member.name}")
                target = root / member.name
                if not target.resolve().is_relative_to(root.resolve()):
                    raise ValueError(f"Output escapes project: {member.name}")
                members.append(member)
            qa = root / "build/qa"
            if qa.exists():
                if qa.is_symlink() or getattr(qa, "is_junction", lambda: False)() or not qa.resolve().is_relative_to(root.resolve()):
                    raise ValueError("QA output directory must stay inside the project")
                shutil.rmtree(qa)
            for member in members:
                if member.isdir():
                    continue
                target = root / member.name
                target.parent.mkdir(parents=True, exist_ok=True)
                temporary = target.with_name(target.name + ".partial")
                try:
                    with contents.extractfile(member) as source, temporary.open("wb") as destination:
                        shutil.copyfileobj(source, destination)
                    temporary.replace(target)
                finally:
                    temporary.unlink(missing_ok=True)


def commands(args, audio: str) -> str:
    setup = """export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends python3 python3-venv ffmpeg
"""
    if args.job == "transcribe":
        return setup + "\n" + "\n".join([
            "python3 -m venv /tmp/transcribe-env",
            "/tmp/transcribe-env/bin/python -m pip install faster-whisper",
            f"cd {REMOTE}",
            shlex.join(["/tmp/transcribe-env/bin/python", "engine/transcribe.py", audio,
                        "build/vo.json", "--model", args.model, "--language", args.language,
                        "--device", "cpu"]),
        ])
    if args.job == "check":
        return setup + "\n" + "\n".join([
            "node --version", "python3 --version", "ffmpeg -version",
            "mkdir -p /tmp/browser-check", "cd /tmp/browser-check",
            "npm install --no-audit --no-fund @playwright/test@1.64.1",
            "npx playwright install --with-deps chromium",
            "node -e " + shlex.quote("const {chromium}=require('@playwright/test'); "
                "(async()=>{const b=await chromium.launch({args:['--no-sandbox']}); "
                "console.log('Headless Chromium launched: '+b.version());await b.close()})()"
                ".catch(e=>{console.error(e);process.exit(1)})"),
        ])
    dependencies = setup + "\n" + "\n".join([
        f"cd {REMOTE}", "npm ci --no-audit --no-fund",
        "npx playwright install --with-deps chromium",
    ]) + "\n"
    if args.job == "prepare":
        endpoints = (
            "import json,subprocess\n"
            "p=json.load(open('build/project.json'))\n"
            "end=max(0,p['duration']-1/p['fps'])\n"
            "subprocess.run(['npx','--yes','hyperframes@latest','snapshot','--at',f'0,{end:.6f}',"
            "'--no-end','--keep','--output','build/qa'],check=True)"
        )
        return dependencies + "\n".join([
            "python3 engine/validate.py", "python3 engine/align.py", "npm run build",
            "npm test 2>&1 | tee build/test.log",
            "npm run lint 2>&1 | tee build/lint.log",
            "npm run check 2>&1 | tee build/check.log",
            "npx --yes hyperframes@latest snapshot --review --output build/qa --json > build/qa-report.json",
            shlex.join(["python3", "-c", endpoints]),
        ])
    return dependencies + "\n".join([
        # Preserve the reviewed HTML/SFX instead of rebuilding a different artifact.
        "npm run lint", "npm run check", "mkdir -p renders",
        shlex.join(["npx", "--yes", "hyperframes@latest", "render", "--quality", args.quality,
                    "--output", "renders/video.mp4", "--workers", str(args.workers)]),
        "ffprobe -v error -show_format -show_streams -of json renders/video.mp4 > renders/probe.json",
    ])


def execute(args, root: Path = ROOT, client=None) -> None:
    if args.job == "render" and not args.include:
        args.include = json.loads(repo_file(root, RECEIPT).read_text(encoding="utf-8")).get("include", [])
    files = project_inputs(root, args.job, args.include)  # Fail before allocating paid compute.
    sources = hashes(root, files) if args.job == "prepare" else None
    if args.job == "render":
        files += verify_prepared(root, files)
    elif args.job == "prepare":
        (root / RECEIPT).unlink(missing_ok=True)
    if client is None:
        try:
            from daytona import Daytona
        except ImportError:
            raise RuntimeError("Missing Daytona SDK. Run: python -m pip install daytona") from None
        if not os.environ.get("DAYTONA_API_KEY"):
            raise RuntimeError("Set DAYTONA_API_KEY securely before running the helper")
        client = Daytona()
    from daytona import CreateSandboxFromImageParams, Resources
    from daytona.common.errors import DaytonaNotFoundError

    name = "video-engine-" + uuid.uuid4().hex[:16]
    log = root / "build/daytona" / f"{args.job}-{name}.log"
    sandbox = None
    deadline = time.monotonic() + args.timeout_minutes * 60
    preparation_retrieved = False
    activity_stop = threading.Event()
    activity_thread = None

    def keep_active():
        while not activity_stop.wait(30):
            try:
                sandbox.refresh_activity(request_timeout=15)
            except Exception as exc:
                print(f"[daytona] Activity refresh failed: {exc}", file=sys.stderr, flush=True)

    try:
        print(f"[daytona] Creating {name}; idle deletion after {args.idle_minutes} minutes", flush=True)
        sandbox = client.create(CreateSandboxFromImageParams(
            name=name, image="node:22-bookworm", os_user="root",
            resources=Resources(cpu=args.cpu, memory=args.memory, disk=args.disk),
            public=False, auto_stop_interval=args.idle_minutes, auto_delete_interval=0,
            labels={"app": "idevak-video-engine", "job": args.job},
        ), timeout=180)
        print(f"[daytona] Sandbox ID: {sandbox.id}", flush=True)
        activity_thread = threading.Thread(target=keep_active, daemon=True)
        activity_thread.start()
        if files:
            with tempfile.TemporaryDirectory(prefix="video-daytona-") as temp:
                archive = Path(temp) / "inputs.tar.gz"
                archive_inputs(root, files, archive)
                sandbox.fs.upload_file(str(archive), "/tmp/video-inputs.tar.gz")
            run_remote(sandbox, f"mkdir -p {REMOTE}\ntar -xzf /tmp/video-inputs.tar.gz -C {REMOTE}", deadline)
        audio = ""
        if args.job == "transcribe":
            audio = files[1].relative_to(root).as_posix()
        run_remote(sandbox, commands(args, audio), deadline)
        if args.job == "transcribe":
            # Validate the generated transcript before replacing an existing local one.
            data = sandbox.fs.download_file(f"{REMOTE}/build/vo.json")
            transcript = json.loads(data)
            if not any(segment.get("words") for segment in transcript.get("segments", [])):
                raise RuntimeError("Transcription returned no word timings; check audio/language")
            if transcript.get("audio") != audio:
                raise RuntimeError("Transcript audio path does not match the uploaded voiceover")
            destination = root / "build/vo.json"
            destination.parent.mkdir(parents=True, exist_ok=True)
            temporary = destination.with_suffix(".json.partial")
            try:
                temporary.write_bytes(data)
                temporary.replace(destination)
            finally:
                temporary.unlink(missing_ok=True)
            print(f"[daytona] Transcript: {destination}", flush=True)
        elif args.job == "prepare":
            retrieve_preparation(sandbox, root, args.qa_format)
            preparation_retrieved = True
            artifacts = [repo_file(root, name) for name in PREPARED]
            if "DRAFT ESTIMATE" in (root / "build/report.md").read_text(encoding="utf-8"):
                raise ValueError("Preparation needs final voiceover alignment, not draft timing")
            receipt = {"sources": sources, "artifacts": hashes(root, artifacts), "include": args.include}
            destination = root / RECEIPT
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
            print(f"[daytona] Prepared composition: {root / 'index.html'}", flush=True)
            print(f"[daytona] Review alignment, logs, and QA frames: {root / 'build/qa'}", flush=True)
        elif args.job == "render":
            download_atomic(sandbox, f"{REMOTE}/renders/probe.json", root / "renders/daytona-probe.json")
            probe = json.loads((root / "renders/daytona-probe.json").read_text(encoding="utf-8"))
            if not {"video", "audio"}.issubset({stream["codec_type"] for stream in probe["streams"]}):
                raise RuntimeError("Export must contain both video and audio streams")
            project = json.loads((root / "build/project.json").read_text(encoding="utf-8"))
            video = next(stream for stream in probe["streams"] if stream["codec_type"] == "video")
            if (video["width"], video["height"]) != (project["width"], project["height"]):
                raise RuntimeError("Export dimensions do not match the composition")
            if abs(float(probe["format"]["duration"]) - project["duration"]) > 0.25:
                raise RuntimeError("Export duration does not match the composition")
            download_atomic(sandbox, f"{REMOTE}/renders/video.mp4", root / "renders/video.mp4")
            print(f"[daytona] MP4: {root / 'renders/video.mp4'}", flush=True)
        else:
            print("[daytona] Remote toolchain check passed", flush=True)
    finally:
        # Creation can time out after the API allocates a sandbox. Recover only ours.
        if sandbox is None:
            try:
                sandbox = client.get(name)
            except DaytonaNotFoundError:
                pass
            except Exception as exc:
                raise RuntimeError(f"Could not verify cleanup for {name}; check this sandbox in Daytona. "
                                   "Idle deletion was requested at creation.") from exc
        if sandbox is not None:
            try:
                if args.job == "prepare" and not preparation_retrieved:
                    try:
                        retrieve_preparation(sandbox, root, args.qa_format)
                        print(f"[daytona] Preparation diagnostics: {root / 'build'}", flush=True)
                    except Exception as exc:
                        print(f"[daytona] Could not retrieve preparation diagnostics: {exc}", file=sys.stderr)
                download_atomic(sandbox, LOG, log)
                print(f"[daytona] Log: {log}", flush=True)
            except Exception as exc:
                print(f"[daytona] Could not retrieve job log: {exc}", file=sys.stderr)
            finally:
                activity_stop.set()
                if activity_thread is not None:
                    activity_thread.join(timeout=20)
                try:
                    sandbox.delete(timeout=60, wait=True)
                except Exception as exc:
                    raise RuntimeError(f"Cleanup failed for {name} ({sandbox.id}); delete it in Daytona. "
                                       "The idle deletion fallback is still configured.") from exc
                print(f"[daytona] Deleted {sandbox.id}", flush=True)


def positive(value: str) -> int:
    number = int(value)
    if number <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return number


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("job", choices=["check", "transcribe", "prepare", "render"])
    parser.add_argument("--idle-minutes", type=positive, default=15,
                        help="auto-stop after idle minutes, then delete immediately (default: 15)")
    parser.add_argument("--timeout-minutes", type=positive, default=120,
                        help="remote command deadline (default: 120 minutes); transfers have SDK timeouts")
    parser.add_argument("--cpu", type=positive, default=4)
    parser.add_argument("--memory", type=positive, default=8, help="RAM in GiB")
    parser.add_argument("--disk", type=positive, default=10, help="disk in GiB")
    parser.add_argument("--model", default="large-v3-turbo")
    parser.add_argument("--language", default="en")
    parser.add_argument("--quality", choices=["draft", "looks", "delivery"], default="delivery")
    parser.add_argument("--workers", type=positive, default=2)
    parser.add_argument("--qa-format", choices=["jpg", "png"], default="jpg",
                        help="native-resolution QA still format (default: high-quality jpg; png is lossless)")
    parser.add_argument("--include", action="append", default=[], metavar="PATH",
                        help="additional repo-relative media file/directory; repeatable")
    args = parser.parse_args()
    signal.signal(signal.SIGTERM, lambda *_: sys.exit("Terminated"))
    try:
        execute(args)
    except (Exception, KeyboardInterrupt) as exc:
        parser.exit(1, f"[daytona] {type(exc).__name__}: {exc}\n")


if __name__ == "__main__":
    main()
