"""Compose review sheets from the frames written by scripts/qa_frames.mjs."""
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
QA = ROOT / "build/qa/local"
REPORT = QA / "report.json"
FRAMES = QA / "frames"
SHEETS = QA / "sheets"

if not REPORT.is_file():
    sys.exit(f"Missing {REPORT.relative_to(ROOT)}. Run: npm run qa:frames")

data = json.loads(REPORT.read_text(encoding="utf-8"))
files = [shot["file"] for shot in data["shots"]]
SHEETS.mkdir(parents=True, exist_ok=True)
W, H = 480, 270
per = 12
for si in range(math.ceil(len(files) / per)):
    chunk = files[si * per:(si + 1) * per]
    sheet = Image.new("RGB", (4 * W + 20, 3 * H + 15), (17, 17, 17))
    draw = ImageDraw.Draw(sheet)
    for i, name in enumerate(chunk):
        image = Image.open(FRAMES / name).resize((W, H), Image.LANCZOS)
        x = (i % 4) * (W + 5)
        y = (i // 4) * (H + 5)
        sheet.paste(image, (x, y))
        index = si * per + i
        draw.text((x + 6, y + 4), f"{index:03d} {data['shots'][index]['t']:.1f}s", fill=(255, 240, 80))
    sheet.save(SHEETS / f"sheet_{si:02d}.png")
    print("sheet", si, len(chunk))
