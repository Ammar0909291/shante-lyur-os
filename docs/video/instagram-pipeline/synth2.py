"""Voice v2: clause-by-clause Piper synthesis with punctuation-aware pauses, per-clause pacing, and a gentler processing chain."""
import json, re, sys, wave, subprocess
import numpy as np
from pathlib import Path
from piper import PiperVoice, SynthesisConfig
H = Path(__file__).resolve().parent; sys.path.insert(0, str(H)); import script as S
voice = PiperVoice.load(str(H / "voice" / "hi_IN-rohan-medium.onnx"))
BASE, SLOW = float(sys.argv[1]) if len(sys.argv) > 1 else 0.92, 1.0
PAUSE = {",": 0.30, ":": 0.40}          # inside a cue, by punctuation
GAP = {c[0]: c[3] for c in S.CUES}
KEY = re.compile(r"(सोलह सौ सत्तर|तबाही|एक साल|छह महीने|महीनों|रुक जाए|रुकती है|नहीं हो सकता)")
SR = 22050
def synth(text, ls):
    p = H / "audio2" / "clause" / "tmp.wav"
    with wave.open(str(p), "wb") as wf: voice.synthesize_wav(text, wf, syn_config=SynthesisConfig(length_scale=ls, noise_scale=0.68, noise_w_scale=0.85))
    with wave.open(str(p)) as r: a = np.frombuffer(r.readframes(r.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    # trim silence both ends
    m = np.abs(a) > 0.01; i, j = np.argmax(m), len(m) - np.argmax(m[::-1]); return a[i:j]
cues, t = [], S.LEAD
for ci, (cid, text, sub, _) in enumerate(S.CUES):
    parts = [x for x in re.split(r"(?<=[,:।?])\s*", text) if x.strip()]
    out = []
    for pi, c in enumerate(parts):
        ls = SLOW if KEY.search(c) else BASE
        a = synth(c, ls); out.append(a)
        if pi < len(parts) - 1: out.append(np.zeros(int(PAUSE.get(c.strip()[-1], 0.3) * SR)))
    a = np.concatenate(out)
    fade = int(0.012 * SR); a[:fade] *= np.linspace(0, 1, fade); a[-fade:] *= np.linspace(1, 0, fade)
    raw = H / "audio2" / "clause" / f"{ci:02d}.wav"
    with wave.open(str(raw), "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())
    o = H / "audio2" / "narr" / f"{ci:02d}.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(raw), "-af",
        "highpass=f=75,lowshelf=g=1.5:f=170,equalizer=f=3000:t=q:w=1.1:g=1.8,acompressor=threshold=-21dB:ratio=2.2:attack=8:release=140:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=7",
        "-ar", "48000", "-ac", "1", str(o)], check=True)
    with wave.open(str(o)) as r: d = r.getnframes() / r.getframerate()
    cues.append({"id": cid, "t0": round(t, 3), "t1": round(t + d, 3), "sub": sub}); t += d + GAP[cid]
json.dump({"cues": cues, "speech_end": round(t, 3)}, open(H / "timeline2.json", "w"), ensure_ascii=False, indent=1)
print("v2 speech ends at %.2f s" % (cues[-1]["t1"]))
for c in cues: print(f'{c["t0"]:6.2f}-{c["t1"]:6.2f} {c["id"]}')
