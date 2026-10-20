"""Build timeline.json from script.py + durs.json: cue times, shot segments, chapters, overlays."""
import json, re
from pathlib import Path
H = Path(__file__).resolve().parent
import sys; sys.path.insert(0, str(H)); import script as S

durs = json.loads((H / "durs.json").read_text())
t, cues, chapters = S.INTRO, [], []
seen = set()
for i, (ch, shot, text, pause) in enumerate(S.CUES):
    if ch == "end": t += S.ENDQ
    if ch in S.CHAPTERS and ch not in seen: seen.add(ch); chapters.append({"id": ch, "t0": round(t, 3)})
    d = durs[i]
    cues.append({"i": i, "ch": ch, "shot": shot, "text": text, "t0": round(t, 3), "t1": round(t + d, 3)})
    t += d + pause
total = round(t + S.ENDCARD, 3)

# shot segments: consecutive cues on one shot are one move; segment runs until the next segment starts
segs = []
for c in cues:
    if segs and segs[-1]["shot"] == c["shot"]: continue
    segs.append({"shot": c["shot"], "t0": c["t0"]})
segs[0]["t0"] = 0.0
q0 = next(c["t0"] for c in cues if c["ch"] == "end") - S.ENDQ
for k, s in enumerate(segs): s["t1"] = segs[k + 1]["t0"] if k + 1 < len(segs) else total
# the question cards and end card sit on black: cut the last picture at the question cards
segs = [s for s in segs if s["t0"] < q0]
segs[-1]["t1"] = q0
segs.append({"shot": "black", "t0": q0, "t1": total})

names = []
for c in cues:
    for key, label in S.NAMES.items():
        if key in c["text"]: names.append({"t0": c["t0"] + 0.3, "t1": min(c["t0"] + 5.5, c["t1"]), "text": label})
title = next(c for c in cues if c["ch"] == "title")
three = next(c for c in cues if c["text"].startswith("सिर्फ़ तीन सौ"))
holes = [[three["t0"] - 1.4, three["t1"] + 0.6], [cues[-2]["t0"] - 0.6, cues[-2]["t1"] + 0.4]]
TL = {"total": total, "cues": cues, "segs": segs, "chapters": chapters, "names": names,
      "title": [title["t0"], title["t0"] + 3.2], "three": [three["t0"] - 0.2, three["t1"] + 1.2],
      "questions": [q0, q0 + S.ENDQ], "endcard": [cues[-1]["t0"], total], "holes": holes}
(H / "timeline.json").write_text(json.dumps(TL, ensure_ascii=False, indent=1))
print(f"total {total:.2f}s ({total/60:.2f} min), {len(segs)} shots, {len(chapters)} chapters")
for ch in chapters: m, s = divmod(int(ch["t0"]), 60); print(f"  {m}:{s:02d} {S.CHAPTERS[ch['id']][1]}")
