"""Shared isolated project-workspace resolution for iDevak Video Engine."""
from __future__ import annotations

import os
import re
from pathlib import Path

ENGINE_ROOT = Path(__file__).resolve().parent.parent
WORKSPACES_DIR = ENGINE_ROOT / "workspaces"
ACTIVE_PROJECT_FILE = ENGINE_ROOT / ".active-project"


def slugify_workspace(value: str) -> str:
    slug = re.sub(r"[^a-z0-9_-]+", "-", str(value).strip().lower()).strip("-")
    return slug or "project"


def read_active_project(engine_root: Path = ENGINE_ROOT) -> str | None:
    active_file = engine_root / ".active-project"
    if not active_file.is_file():
        return None
    raw = active_file.read_text(encoding="utf-8").strip()
    return raw or None


def resolve_project_dir(
    spec: str | Path | None = None,
    *,
    engine_root: Path = ENGINE_ROOT,
    use_active: bool = True,
    must_exist: bool = True,
) -> Path:
    """Resolve a project workspace directory from slug, path, env, or .active-project."""
    chosen = spec
    if chosen is None or str(chosen).strip() == "":
        env_val = os.environ.get("IDEVAK_PROJECT", "").strip()
        if env_val:
            chosen = env_val
        elif use_active:
            chosen = read_active_project(engine_root)

    if chosen is None or str(chosen).strip() == "":
        return engine_root

    raw = str(chosen).strip()
    candidate = Path(raw)

    if candidate.is_file() and candidate.suffix.lower() == ".json":
        parent = candidate.resolve().parent
        return parent.parent if parent.name == "content" and (parent.parent / "engine").is_dir() else parent

    # Direct existing directory (absolute, cwd-relative, or engine_root-relative)
    if candidate.is_dir():
        return candidate.resolve()
    from_root = engine_root / candidate
    if from_root.is_dir():
        return from_root.resolve()

    # Bare slug -> workspaces/<slug>
    is_bare_slug = ("/" not in raw and "\\" not in raw and not candidate.is_absolute())
    if is_bare_slug:
        ws = engine_root / "workspaces" / raw
        if ws.is_dir() or not must_exist:
            return ws.resolve() if ws.exists() else ws

    if not must_exist:
        return candidate.resolve() if candidate.is_absolute() else (engine_root / candidate)

    raise SystemExit(
        f"Project workspace not found: {raw}\n"
        f"Create one with: npm run project:new -- {slugify_workspace(raw)}"
    )


def pop_project_arg(argv: list[str]) -> tuple[str | None, list[str]]:
    """Extract --project <val> or --workspace <val> from an argv list without touching other flags."""
    project_val: str | None = None
    rest: list[str] = []
    i = 0
    while i < len(argv):
        arg = argv[i]
        if arg in ("--project", "--workspace"):
            if i + 1 >= len(argv):
                raise SystemExit(f"{arg} requires a workspace slug or directory path")
            project_val = argv[i + 1]
            i += 2
        elif arg.startswith("--project=") or arg.startswith("--workspace="):
            project_val = arg.split("=", 1)[1]
            i += 1
        else:
            rest.append(arg)
            i += 1
    return project_val, rest


def project_json_path(project_dir: Path, engine_root: Path = ENGINE_ROOT) -> Path:
    if project_dir.resolve() == engine_root.resolve():
        return engine_root / "content/video.json"
    direct = project_dir / "video.json"
    if direct.is_file():
        return direct
    nested = project_dir / "content/video.json"
    if nested.is_file():
        return nested
    return direct


def default_audio_rel(project_dir: Path, engine_root: Path = ENGINE_ROOT) -> str:
    return "content/voiceover.wav" if project_dir.resolve() == engine_root.resolve() else "voiceover.wav"


def resolve_project_path(path: str | Path, project_dir: Path, engine_root: Path = ENGINE_ROOT) -> Path:
    p = Path(path)
    if p.is_absolute():
        return p
    local = project_dir / p
    if local.exists():
        return local
    fallback = engine_root / p
    if fallback.exists():
        return fallback
    return local
