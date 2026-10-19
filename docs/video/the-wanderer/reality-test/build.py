import json
from pathlib import Path
H = Path(__file__).resolve().parent; S = H / "site"
tl = json.loads((H / "timeline.json").read_text())
shots = sorted(p.name for p in S.glob("shots_*.js"))
worlds = sorted(p.name for p in S.glob("world_*.js") if p.name != "world_city.js")
html = (S / "template.html").read_text().replace("__TL__", json.dumps(tl, ensure_ascii=False))
html = html.replace('<script src="main.js"></script>', "".join(f'<script src="{w}"></script>' for w in worlds) + '<script src="main.js"></script>')
html = html.replace("__SHOTS__", "".join(f'<script src="{s}"></script>' for s in shots))
(S / "index.html").write_text(html); print("ok", shots, worlds)
