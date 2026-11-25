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
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from engine.workspace import (  # noqa: E402
    default_audio_rel,
    project_json_path,
    resolve_project_dir,
    resolve_project_path,
)

REMOTE = "/root/video-engine"
LOG = "/tmp/video-engine-job.log"
CHUNK = 1 << 20
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


def _project_rel(root: Path, project_dir: Path) -> str:
    if project_dir.resolve() == root.resolve():
        return "."
    return project_dir.resolve().relative_to(root.resolve()).as_posix()


def _artifact_rel(project_rel: str, name: str) -> str:
    return name if project_rel == "." else f"{project_rel}/{name}"


def project_inputs(root: Path, job: str, includes=(), project_dir: Path | None = None) -> list[Path]:
    if job == "check":
        return []
    pdir = (project_dir or root).resolve()
    is_ws = pdir != root.resolve()
    prel = _project_rel(root, pdir)
    vjson_path = project_json_path(pdir, root) if is_ws else repo_file(root, "content/video.json")
    vjson_rel = vjson_path.resolve().relative_to(root.resolve()).as_posix()
    video = json.loads(repo_file(root, vjson_rel).read_text(encoding="utf-8"))
    audio_spec = video.get("audio") or default_audio_rel(pdir, root)
    audio_resolved = resolve_project_path(audio_spec, pdir, root)
    audio_rel = audio_resolved.resolve().relative_to(root.resolve()).as_posix()
    audio = repo_file(root, audio_rel)
    if job == "transcribe":
        return [repo_file(root, "engine/transcribe.py"), repo_file(root, "engine/workspace.py"),
                repo_file(root, "engine/domain_vocab.py"), audio, repo_file(root, vjson_rel)] if is_ws else [repo_file(root, "engine/transcribe.py"), audio]
    # Preparation requires source plus the sandbox transcript, not a local build.
    vo_rel = _artifact_rel(prel, "build/vo.json")
    files = [repo_file(root, name) for name in (
        "package.json", "package-lock.json", vjson_rel, vo_rel,
    )]
    files.append(audio)
    dirs_to_scan = ["engine", "assets", "scripts", "tests", *includes]
    if is_ws:
        ws_assets = pdir / "assets"
        if ws_assets.exists():
            dirs_to_scan.append(f"{prel}/assets")
    for directory in dirs_to_scan:
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


def verify_prepared(root: Path, files: list[Path], project_dir: Path | None = None) -> list[Path]:
    pdir = (project_dir or root).resolve()
    prel = _project_rel(root, pdir)
    receipt_rel = _artifact_rel(prel, RECEIPT)
    receipt = json.loads(repo_file(root, receipt_rel).read_text(encoding="utf-8"))
    artifacts = [repo_file(root, _artifact_rel(prel, name)) for name in PREPARED]
    if "DRAFT ESTIMATE" in (pdir / "build/report.md").read_text(encoding="utf-8"):
        raise ValueError("Final rendering requires real voiceover alignment, not draft timing")
    if receipt.get("sources") != hashes(root, files) or receipt.get("artifacts") != hashes(root, artifacts):
        raise ValueError("Source or prepared files changed. Run the Daytona prepare command and review QA again")
    return artifacts + [root / receipt_rel]


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


def upload_large(sandbox, local: Path, remote: str, chunk: int = CHUNK, attempts: int = 4) -> None:
    """Chunked upload; the SDK resets on multi-megabyte transfers."""
    parts = remote + ".parts"
    sandbox.process.exec(f"rm -rf {parts}\nmkdir -p {parts}", timeout=120)
    hasher = hashlib.sha256()
    index = 0
    with local.open("rb") as stream:
        while data := stream.read(chunk):
            hasher.update(data)
            name = f"{parts}/part-{index:04d}"
            for attempt in range(1, attempts + 1):
                try:
                    sandbox.fs.upload_file(data, name)
                    break
                except Exception as exc:
                    if attempt == attempts:
                        raise RuntimeError(f"Could not upload {name}: {exc}") from exc
                    print(f"[daytona] Retry {attempt} upload {name}: {exc}", file=sys.stderr, flush=True)
                    time.sleep(3 * attempt)
            index += 1
            if index % 10 == 0:
                print(f"[daytona] Uploaded {index} chunks", flush=True)
    if not index:
        raise RuntimeError(f"Nothing to upload: {local}")
    joined = sandbox.process.exec(f"cat {parts}/part-* > {remote}\nsha256sum {remote}", timeout=600)
    if joined.exit_code != 0 or hasher.hexdigest() not in joined.result:
        raise RuntimeError(f"Upload checksum mismatch for {remote}")
    try:
        sandbox.process.exec(f"rm -rf {parts}", timeout=120)
    except Exception as exc:
        print(f"[daytona] Could not remove {parts}: {exc}", file=sys.stderr, flush=True)


def replace_retry(temporary: Path, target: Path, attempts: int = 5) -> None:
    """Windows scanners briefly lock freshly written files."""
    for attempt in range(1, attempts + 1):
        try:
            temporary.replace(target)
            return
        except PermissionError:
            if attempt == attempts:
                raise
            time.sleep(attempt)


def download_atomic(sandbox, remote: str, local: Path) -> None:
    local.parent.mkdir(parents=True, exist_ok=True)
    temporary = local.with_name(local.name + ".partial")
    try:
        sandbox.fs.download_file(remote, str(temporary))
        if not temporary.is_file() or temporary.stat().st_size == 0:
            raise RuntimeError(f"Empty download: {remote}")
        replace_retry(temporary, local)
    finally:
        temporary.unlink(missing_ok=True)


def download_large(sandbox, remote: str, local: Path, chunk: int = CHUNK, attempts: int = 4,
                   workers: int = 8) -> None:
    """The SDK resets on multi-megabyte single-shot downloads, so fetch retried chunks in parallel."""
    parts = remote + ".parts"
    split = sandbox.process.exec(
        f"rm -rf {parts}\nmkdir -p {parts}\nsplit -b {chunk} -d -a 4 {remote} {parts}/part-", timeout=600)
    if split.exit_code != 0:
        raise RuntimeError(f"Could not split {remote}: {split.result}")
    listing = sandbox.process.exec(f"ls {parts}", timeout=120)
    digest = sandbox.process.exec(f"sha256sum {remote}", timeout=600).result.split()[0]
    names = listing.result.split()
    local.parent.mkdir(parents=True, exist_ok=True)
    temporary = local.with_name(local.name + ".partial")
    hasher = hashlib.sha256()

    def fetch(name: str) -> bytes:
        for attempt in range(1, attempts + 1):
            try:
                data = sandbox.fs.download_file(f"{parts}/{name}")
            except Exception as exc:
                if attempt == attempts:
                    raise RuntimeError(f"Could not download {name}: {exc}") from exc
                print(f"[daytona] Retry {attempt} {name}: {exc}", file=sys.stderr, flush=True)
                time.sleep(3 * attempt)
            else:
                if not data:
                    raise RuntimeError(f"Empty download: {parts}/{name}")
                return data

    try:
        with ThreadPoolExecutor(max_workers=workers) as pool, temporary.open("wb") as out:
            # Bound memory: one pool.map call submits every part up front, so
            # completed 1 MiB parts pile up while an early part is still in
            # flight. Batches of workers * 2 keep the window small and ordered.
            batch = workers * 2
            index = 0
            for offset in range(0, len(names), batch):
                for data in pool.map(fetch, names[offset:offset + batch]):
                    out.write(data)
                    hasher.update(data)
                    index += 1
                    if index % 10 == 0 or index == len(names):
                        print(f"[daytona] Downloaded {index}/{len(names)} chunks", flush=True)
        if hasher.hexdigest() != digest:
            raise RuntimeError(f"Checksum mismatch for {remote}")
        replace_retry(temporary, local)
    finally:
        temporary.unlink(missing_ok=True)
        try:
            sandbox.process.exec(f"rm -rf {parts}", timeout=120)
        except Exception as exc:
            print(f"[daytona] Could not remove {parts}: {exc}", file=sys.stderr, flush=True)


def extract_results(root: Path, archive: Path) -> None:
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
                replace_retry(temporary, target)
            finally:
                temporary.unlink(missing_ok=True)


def retrieve_preparation(sandbox, root: Path, qa_format: str = "jpg", project_rel: str = ".") -> None:
    """Return generated artifacts/reports, including diagnostics from failed QA."""
    remote_proj = REMOTE if project_rel == "." else f"{REMOTE}/{project_rel}"
    package = (
        "import pathlib,subprocess,tarfile\n"
        f"root=pathlib.Path({remote_proj!r})\n"
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
        download_large(sandbox, "/tmp/video-results.tar.gz", archive)
        extract_results(root, archive)


def commands(args, audio: str, project_rel: str = ".") -> str:
    setup = """export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends python3 python3-venv ffmpeg
"""
    proj_flags = [] if project_rel == "." else ["--project", project_rel]
    hf_target = [] if project_rel == "." else [project_rel]
    remote_proj = REMOTE if project_rel == "." else f"{REMOTE}/{project_rel}"
    if args.job == "transcribe":
        env_lines = []
        if os.environ.get("DEEPGRAM_API_KEY"):
            env_lines.append(f"export DEEPGRAM_API_KEY={shlex.quote(os.environ['DEEPGRAM_API_KEY'])}")
        prefix = ("\n".join(env_lines) + "\n") if env_lines else ""
        extra_flags = ["--no-deepgram"] if getattr(args, "no_deepgram", False) else []
        out_vo = _artifact_rel(project_rel, "build/vo.json")
        cmd = ["/tmp/transcribe-env/bin/python", "engine/transcribe.py", audio,
               out_vo, *proj_flags, "--model", args.model, "--language", args.language,
               "--device", "cpu"] + extra_flags
        return setup + "\n" + prefix + "\n".join([
            "python3 -m venv /tmp/transcribe-env",
            "/tmp/transcribe-env/bin/python -m pip install faster-whisper",
            f"cd {REMOTE}",
            shlex.join(cmd),
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
        pflag_str = "" if project_rel == "." else f" --project {shlex.quote(project_rel)}"
        npm_pflag = "" if project_rel == "." else f" -- --project {shlex.quote(project_rel)}"
        htarg_str = "" if project_rel == "." else f" {shlex.quote(project_rel)}"
        htarg_list = "" if project_rel == "." else f",{project_rel!r}"
        endpoints = (
            "import json,subprocess\n"
            f"p=json.load(open({remote_proj + '/build/project.json'!r}))\n"
            "end=max(0,p['duration']-1/p['fps'])\n"
            "subprocess.run(['npx','--yes','hyperframes@latest','snapshot','--at',f'0,{end:.6f}',"
            f"'--no-end','--keep','--output',{remote_proj + '/build/qa'!r}{htarg_list}],check=True)"
        )
        return dependencies + "\n".join([
            f"python3 engine/validate.py{pflag_str}",
            f"python3 engine/align.py{pflag_str}",
            f"npm run build{npm_pflag}",
            f"npm test 2>&1 | tee {remote_proj}/build/test.log",
            f"npm run lint{npm_pflag} 2>&1 | tee {remote_proj}/build/lint.log",
            f"npm run check{npm_pflag} 2>&1 | tee {remote_proj}/build/check.log",
            f"npx --yes hyperframes@latest snapshot --review --output {remote_proj}/build/qa --json{htarg_str} > {remote_proj}/build/qa-report.json",
            shlex.join(["python3", "-c", endpoints]),
        ])
    npm_pflag = [] if project_rel == "." else ["--", "--project", project_rel]
    return dependencies + "\n".join([
        # Preserve the reviewed HTML/SFX instead of rebuilding a different artifact.
        shlex.join(["npm", "run", "lint", *npm_pflag]),
        shlex.join(["npm", "run", "check", *npm_pflag]),
        f"mkdir -p {remote_proj}/renders",
        shlex.join(["npx", "--yes", "hyperframes@latest", "render", "--quality", args.quality,
                    "--output", f"{remote_proj}/renders/video.mp4", "--workers", str(args.workers), *hf_target]),
        f"ffprobe -v error -show_format -show_streams -of json {remote_proj}/renders/video.mp4 > {remote_proj}/renders/probe.json",
    ])


def execute(args, root: Path = ROOT, client=None) -> None:
    proj_spec = getattr(args, "project", None)
    if proj_spec is not None:
        project_dir = resolve_project_dir(proj_spec, engine_root=root)
    elif root == ROOT:
        project_dir = resolve_project_dir(None, engine_root=root)
    else:
        project_dir = root
    project_rel = _project_rel(root, project_dir)
    receipt_rel = _artifact_rel(project_rel, RECEIPT)

    if args.job == "render" and not args.include:
        args.include = json.loads(repo_file(root, receipt_rel).read_text(encoding="utf-8")).get("include", [])
    files = project_inputs(root, args.job, args.include, project_dir=project_dir)  # Fail before allocating paid compute.
    sources = hashes(root, files) if args.job == "prepare" else None
    if args.job == "render":
        files += verify_prepared(root, files, project_dir=project_dir)
    elif args.job == "prepare":
        (root / receipt_rel).unlink(missing_ok=True)
    if client is None:
        try:
            from daytona import Daytona
        except ImportError:
            raise RuntimeError("Missing Daytona SDK. Run: python -m pip install daytona") from None
        if not os.environ.get("DAYTONA_API_KEY"):
            raise RuntimeError("Set DAYTONA_API_KEY securely before running the helper")
        if args.job == "transcribe" and not getattr(args, "no_deepgram", False) and not os.environ.get("DEEPGRAM_API_KEY"):
            raise RuntimeError("Set DEEPGRAM_API_KEY securely before running Daytona transcription (or pass --no-deepgram)")
        client = Daytona()
    from daytona import CreateSandboxFromImageParams, Resources
    from daytona.common.errors import DaytonaNotFoundError

    name = "video-engine-" + uuid.uuid4().hex[:16]
    log = project_dir / "build/daytona" / f"{args.job}-{name}.log"
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
                upload_large(sandbox, archive, "/tmp/video-inputs.tar.gz")
            run_remote(sandbox, f"mkdir -p {REMOTE}\ntar -xzf /tmp/video-inputs.tar.gz -C {REMOTE}", deadline)
        audio = ""
        if args.job == "transcribe":
            audio = next(p for p in files if p.suffix.lower() in (".wav", ".mp3", ".m4a", ".mp4", ".flac", ".aac", ".ogg")).relative_to(root).as_posix()
        run_remote(sandbox, commands(args, audio, project_rel=project_rel), deadline)
        remote_proj = REMOTE if project_rel == "." else f"{REMOTE}/{project_rel}"
        if args.job == "transcribe":
            # Validate the generated transcript before replacing an existing local one.
            data = sandbox.fs.download_file(f"{remote_proj}/build/vo.json")
            transcript = json.loads(data)
            if not any(segment.get("words") for segment in transcript.get("segments", [])):
                raise RuntimeError("Transcription returned no word timings; check audio/language")
            expected_audio = audio
            try:
                expected_audio_ws = (root / audio).resolve().relative_to(project_dir.resolve()).as_posix()
            except ValueError:
                expected_audio_ws = audio
            if transcript.get("audio") not in (expected_audio, expected_audio_ws):
                raise RuntimeError("Transcript audio path does not match the uploaded voiceover")
            destination = project_dir / "build/vo.json"
            destination.parent.mkdir(parents=True, exist_ok=True)
            temporary = destination.with_suffix(".json.partial")
            try:
                temporary.write_bytes(data)
                replace_retry(temporary, destination)
            finally:
                temporary.unlink(missing_ok=True)
            print(f"[daytona] Transcript: {destination}", flush=True)
        elif args.job == "prepare":
            retrieve_preparation(sandbox, project_dir, args.qa_format, project_rel=project_rel)
            preparation_retrieved = True
            artifacts = [repo_file(root, _artifact_rel(project_rel, name)) for name in PREPARED]
            if "DRAFT ESTIMATE" in (project_dir / "build/report.md").read_text(encoding="utf-8"):
                raise ValueError("Preparation needs final voiceover alignment, not draft timing")
            receipt = {"sources": sources, "artifacts": hashes(root, artifacts), "include": args.include}
            destination = root / receipt_rel
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
            print(f"[daytona] Prepared composition: {project_dir / 'index.html'}", flush=True)
            print(f"[daytona] Review alignment, logs, and QA frames: {project_dir / 'build/qa'}", flush=True)
        elif args.job == "render":
            download_atomic(sandbox, f"{remote_proj}/renders/probe.json", project_dir / "renders/daytona-probe.json")
            probe = json.loads((project_dir / "renders/daytona-probe.json").read_text(encoding="utf-8"))
            if not {"video", "audio"}.issubset({stream["codec_type"] for stream in probe["streams"]}):
                raise RuntimeError("Export must contain both video and audio streams")
            project = json.loads((project_dir / "build/project.json").read_text(encoding="utf-8"))
            video = next(stream for stream in probe["streams"] if stream["codec_type"] == "video")
            if (video["width"], video["height"]) != (project["width"], project["height"]):
                raise RuntimeError("Export dimensions do not match the composition")
            if abs(float(probe["format"]["duration"]) - project["duration"]) > 0.25:
                raise RuntimeError("Export duration do not match the composition")
            download_large(sandbox, f"{remote_proj}/renders/video.mp4", project_dir / "renders/video.mp4")
            print(f"[daytona] MP4: {project_dir / 'renders/video.mp4'}", flush=True)
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
                        retrieve_preparation(sandbox, project_dir, args.qa_format, project_rel=project_rel)
                        print(f"[daytona] Preparation diagnostics: {project_dir / 'build'}", flush=True)
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
    parser.add_argument("--workers", type=positive, default=1,
                        help="render workers (default: 1; multi-worker capture needs a large frame disk)")
    parser.add_argument("--qa-format", choices=["jpg", "png"], default="jpg",
                        help="native-resolution QA still format (default: high-quality jpg; png is lossless)")
    parser.add_argument("--include", action="append", default=[], metavar="PATH",
                        help="additional repo-relative media file/directory; repeatable")
    parser.add_argument("--no-deepgram", action="store_true",
                        help="skip Deepgram and use local CPU faster-whisper inside Daytona")
    parser.add_argument("--project", "--workspace", default=None,
                        help="isolated project workspace slug or directory")
    args = parser.parse_args()
    signal.signal(signal.SIGTERM, lambda *_: sys.exit("Terminated"))
    try:
        execute(args)
    except (Exception, KeyboardInterrupt) as exc:
        parser.exit(1, f"[daytona] {type(exc).__name__}: {exc}\n")


if __name__ == "__main__":
    main()
