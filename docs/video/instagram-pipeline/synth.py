"""Hindi narration: Piper hi_IN-rohan-medium (IndicTTS, IIT Madras). usage: python3 synth.py [length_scale]"""
import json, sys, wave, subprocess
from pathlib import Path
from piper import PiperVoice, SynthesisConfig
H = Path(__file__).resolve().parent; sys.path.insert(0, str(H)); import script as S
voice = PiperVoice.load(str(H / "voice" / "hi_IN-rohan-medium.onnx"))
ls = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
cfg = SynthesisConfig(length_scale=ls, noise_scale=0.6, noise_w_scale=0.8)
durs = []
for i, (cid, text, sub, pause) in enumerate(S.CUES):
    raw = H / "audio" / "raw" / f"{i:02d}.wav"; out = H / "audio" / "narr" / f"{i:02d}.wav"
    with wave.open(str(raw), "wb") as wf: voice.synthesize_wav(text, wf, syn_config=cfg)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(raw), "-af",
        "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
        "highpass=f=70,lowshelf=g=1.5:f=160,equalizer=f=3200:t=q:w=1.2:g=1.5,loudnorm=I=-16:TP=-1.5:LRA=7",
        "-ar", "48000", "-ac", "1", str(out)], check=True)
    with wave.open(str(out)) as rf: durs.append(round(rf.getnframes() / rf.getframerate(), 3))
t = S.LEAD; cues = []
for (cid, text, sub, pause), d in zip(S.CUES, durs):
    cues.append({"id": cid, "t0": round(t, 3), "t1": round(t + d, 3), "sub": sub}); t += d + pause
json.dump({"cues": cues, "speech_end": round(t, 3)}, open(H / "timeline.json", "w"), ensure_ascii=False, indent=1)
print("speech ends at", round(t, 2), "s;", sum(durs), "s of audio")
for c in cues: print(f'{c["t0"]:6.2f}-{c["t1"]:6.2f}  {c["id"]}')
