import json
import os

path = 'build/project.json' if os.path.exists('build/project.json') else 'content/video.json'
with open(path, 'r', encoding='utf-8') as f:
    v = json.load(f)

scenes = v.get('scenes', [])
for s in scenes:
    start = float(s.get('start', 0.0))
    dur = float(s.get('duration', 5.0))
    mid = start + dur * 0.75
    stype = s.get('type') or s.get('t') or 'unknown'
    print(f"{s['id']}: type={stype:<10} start={start:6.2f}s mid={mid:6.2f}s dur={dur:5.2f}s")
