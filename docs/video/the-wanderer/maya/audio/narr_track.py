# Place every narration clip at its cue time in one mono 48 kHz track.
import json, wave, array
from pathlib import Path
H = Path(__file__).resolve().parent.parent
tl = json.loads((H / "timeline.json").read_text()); SR = 48000
out = array.array('h', bytes(2 * int(SR * tl["total"] + SR)))
for c in [c for c in tl["cues"] if c["text"]]:
    with wave.open(str(H / "narr" / f"{c['i']:02d}.wav")) as w:
        assert w.getframerate() == SR and w.getnchannels() == 1
        a = array.array('h', w.readframes(w.getnframes()))
    s = int(c["t0"] * SR); out[s:s + len(a)] = a
with wave.open(str(H / "audio" / "narration.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print("narration.wav", len(out) / SR)
