"""Hindi narration: Piper hi_IN-rohan-medium (IndicTTS, IIT Madras). python3 synth.py [length_scale] [only,indices]"""
import json, sys, wave, subprocess, os
from pathlib import Path
from piper import PiperVoice, SynthesisConfig
H = Path(__file__).resolve().parent; sys.path.insert(0, str(H)); import script as S
VOICES = Path(os.environ.get("VOICES", H.parent / "voices"))
voice = PiperVoice.load(str(VOICES / "hi_IN-rohan-medium.onnx"))
ls = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
cfg = SynthesisConfig(length_scale=ls, noise_scale=0.6, noise_w_scale=0.8)
only = set(int(x) for x in sys.argv[2].split(",")) if len(sys.argv) > 2 else None
(H / "raw").mkdir(exist_ok=True); (H / "narr").mkdir(exist_ok=True)
for i, (ch, shot, text, pause) in enumerate(S.CUES):
    if not text or (only is not None and i not in only): continue
    w = H / "raw" / f"{i:02d}.wav"
    with wave.open(str(w), "wb") as wf: voice.synthesize_wav(text, wf, syn_config=cfg)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(w), "-af",
                    "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
                    "highpass=f=70,lowshelf=g=1.5:f=160,equalizer=f=3200:t=q:w=1.2:g=1.5,loudnorm=I=-16:TP=-1.5:LRA=7",
                    "-ar", "48000", "-ac", "1", str(H / "narr" / f"{i:02d}.wav")], check=True)
out = []
for i, c in enumerate(S.CUES):
    if not c[2]: out.append(0.0); continue
    with wave.open(str(H / "narr" / f"{i:02d}.wav")) as rf: out.append(round(rf.getnframes() / rf.getframerate(), 3))
(H / "durs.json").write_text(json.dumps(out))
sp = sum(out); words = sum(len(c[2].split()) for c in S.CUES)
tot = S.INTRO + sp + sum(c[3] for c in S.CUES) + S.ENDQ + S.ENDCARD
print(f"speech {sp:.1f}s  total {tot:.1f}s = {tot/60:.2f} min  words {words}  wpm {words/(sp/60):.0f}")
