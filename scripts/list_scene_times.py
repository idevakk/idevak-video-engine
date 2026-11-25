import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from engine.workspace import project_json_path, resolve_project_dir  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--project", "--workspace", default=None)
args = ap.parse_args()

project_dir = resolve_project_dir(args.project, engine_root=ROOT)
built = project_dir / "build/project.json"
path = built if built.is_file() else project_json_path(project_dir, ROOT)
with open(path, 'r', encoding='utf-8') as f:
    v = json.load(f)

scenes = v.get('scenes', [])
for s in scenes:
    start = float(s.get('start', 0.0))
    dur = float(s.get('duration', 5.0))
    mid = start + dur * 0.75
    stype = s.get('type') or s.get('t') or 'unknown'
    print(f"{s['id']}: type={stype:<10} start={start:6.2f}s mid={mid:6.2f}s dur={dur:5.2f}s")
