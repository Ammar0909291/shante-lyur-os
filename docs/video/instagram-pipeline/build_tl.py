"""Timeline v5: narration cue times (from synth2) + segments that map new film time onto the visual 'old time' windows used by the scene code."""
import json
from pathlib import Path
H = Path(__file__).resolve().parent
new = json.load(open(H / "timeline2.json", encoding="utf8"))
cues = new["cues"]; T = 59.6
c = {x["id"]: x for x in cues}
stop = c["stop"]["t0"] + 0.95            # the ground stops on the word "रुकती"
# (n0, n1, o0, o1, cont, quiet): new-time window -> old-time window; cont = continuous with the previous segment (no dip); quiet = hide labels
SEG = [
 (0.0,        14.7,        0.0,  4.3,  0, 0),     # Earth spins, push-in (question + speed)
 (14.7,       stop - 1.2,  6.4,  7.8,  0, 0),     # people riding along on the bus (B1)
 (stop - 1.2, stop,        4.3,  5.15, 0, 0),     # Earth again, just before the stop
 (stop,       stop + 1.15, 5.15, 6.3,  1, 0),     # the stop: shock ring and shake
 (stop + 1.15, c["bus"]["t0"] - 0.25, 11.7, 14.9, 0, 0),   # loose objects slide east (street)
 (c["bus"]["t0"] - 0.25, c["bus"]["t0"] + 1.95, 6.3, 7.95, 0, 0),   # bus: moving
 (c["bus"]["t0"] + 1.95, c["air"]["t0"] - 0.25, 7.95, 10.9, 1, 0),  # bus: brake and lurch
 (c["air"]["t0"] - 0.25, c["air"]["t0"] + 2.15, 25.5, 29.9, 0, 0),  # wind over the surface, speed bars
 (c["air"]["t0"] + 2.15, c["year"]["t0"] - 0.25, 30.4, 32.5, 0, 0), # sea swell and surge
 (c["year"]["t0"] - 0.25, c["cata"]["t0"] - 0.13, 39.2, 44.95, 0, 0),  # Earth orbits the Sun without spinning
 (c["cata"]["t0"] - 0.13, c["cata"]["t0"] + 1.75, 27.5, 29.5, 0, 1),    # catastrophe: wind
 (c["cata"]["t0"] + 1.75, c["cata"]["t0"] + 3.55, 31.7, 32.45, 0, 1),   # catastrophe: sea surge
 (c["cata"]["t0"] + 3.55, c["cata"]["t0"] + 5.55, 41.5, 44.9, 0, 1),    # catastrophe: months-long night
 (c["cata"]["t0"] + 5.55, c["cata"]["t1"] + 0.2, 8.5, 9.9, 0, 1),       # catastrophe: people lurching
 (c["cata"]["t1"] + 0.2, T,  44.95, 58.0, 0, 0),                        # calm close
]
for a, b in zip(SEG, SEG[1:]): assert abs(a[1] - b[0]) < 1e-6, (a, b)
tl = {"cues": cues, "total": T, "seg": [list(s) for s in SEG], "stop": stop, "cta": [15.0, 30.0, 45.0, 55.0], "hypEnd": c["cata"]["t1"] + 0.2}
open(H / "site" / "tl.js", "w", encoding="utf8").write("const TL = " + json.dumps(tl, ensure_ascii=False) + ";\n")
json.dump(tl, open(H / "timeline_v5.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
for s in SEG: print("new %6.2f-%6.2f  old %5.2f-%5.2f %s%s" % (s[0], s[1], s[2], s[3], "cont " if s[4] else "", "quiet" if s[5] else ""))
