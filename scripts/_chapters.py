import re, json
md=open("php2shell_cve_2026_youtube_script.md",encoding="utf-8").read()
rows=[l for l in md.splitlines() if re.match(r"\| \*\*#\d+", l)]
acts=[]
for l in rows:
    cells=[c.strip() for c in l.strip().strip("|").split("|")]
    if len(cells)<4: continue
    m=re.search(r"#(\d+)",cells[0])
    if not m: continue
    idx=int(m.group(1))
    act=cells[3].replace("`","")
    if not acts or acts[-1][0]!=act:
        acts.append((act, idx))
scenes=json.load(open("build/scenes.json",encoding="utf-8"))
times={s["index"]:s["start"] for s in scenes}
def fmt(t):
    t=int(round(t)); return f"{t//60}:{t%60:02d}"
for act, idx in acts:
    print(fmt(times.get(idx,0)), "|", act, "| first scene", idx)
