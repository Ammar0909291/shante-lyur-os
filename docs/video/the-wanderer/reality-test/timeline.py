"""Build timeline.json: cue times, scene spans, subtitles, chapter cards."""
import json, re
from pathlib import Path
import script as S
H = Path(__file__).resolve().parent
durs = json.loads((H / "durs.json").read_text())
LEAD = 0.9                      # a scene opens this long before its first line
t = S.INTRO
cues, scenes = [], []
for i, ((scene, text, pause), d) in enumerate(zip(S.CUES, durs)):
    cues.append({"i": i, "scene": scene, "t0": round(t, 3), "t1": round(t + d, 3)})
    t += d + pause
end_t = t + 0.6
total = round(end_t + S.ENDCARD, 3)
# scenes: drip intro, then one span per run of cues
scenes.append({"id": "drip", "t0": 0.0})
for c in cues:
    if c["scene"] != scenes[-1]["id"]:
        scenes.append({"id": c["scene"], "t0": round(max(scenes[-1]["t0"] + 2, c["t0"] - LEAD), 3)})
scenes.append({"id": "end", "t0": round(end_t, 3)})
for a, b in zip(scenes, scenes[1:]): a["t1"] = b["t0"]
scenes[-1]["t1"] = total
for sc in scenes: sc["cues"] = [[c["t0"], c["t1"]] for c in cues if c["scene"] == sc["id"]]
# subtitles: sentences, timed by character share inside each cue
subs = []
for (scene, text, pause), c in zip(S.CUES, cues):
    shown = text
    for k, v in S.SUBS.items(): shown = shown.replace(k, v)
    parts = [p.strip() for p in re.split(r'(?<=[.?!])\s+', shown) if p.strip()]
    out = []
    for p in parts:                       # split very long sentences at a comma or colon near the middle
        if len(p) > 105:
            cut = [m.end() for m in re.finditer(r'[,:]\s', p)]
            if cut:
                k = min(cut, key=lambda x: abs(x - len(p) / 2)); out += [p[:k].strip(), p[k:].strip()]; continue
        out.append(p)
    n = sum(len(p) for p in out); tt = c["t0"]; D = c["t1"] - c["t0"]
    for p in out:
        d = D * len(p) / n
        subs.append([round(tt, 3), round(tt + d + 0.15, 3), p]); tt += d
chapters = [[sc["t0"], S.CHAPTERS[sc["id"]]] for sc in scenes if sc["id"] in S.CHAPTERS]
tl = {"total": total, "cues": cues, "scenes": scenes, "subs": subs, "chapters": chapters}
(H / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=0))
for sc in scenes: print(f'{sc["id"]:8s} {sc["t0"]:7.2f} → {sc["t1"]:7.2f}  ({sc["t1"]-sc["t0"]:5.1f}s, {len(sc["cues"])} cues)')
print("total", total, f"= {total/60:.2f} min", len(subs), "subs")
