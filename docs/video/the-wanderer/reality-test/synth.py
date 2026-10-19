import json, sys, wave, subprocess, re
from pathlib import Path
from piper import PiperVoice, SynthesisConfig
sys.path.insert(0, str(Path(__file__).parent)); import script as S
H = Path(__file__).resolve().parent
voice = PiperVoice.load(str(H.parent / "voices" / "en_US-norman-medium.onnx"))
ls = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
cfg = SynthesisConfig(length_scale=ls, noise_scale=0.62, noise_w_scale=0.8)
only = set(int(x) for x in sys.argv[2].split(",")) if len(sys.argv) > 2 else None
for i, (scene, text, pause) in enumerate(S.CUES):
    if only is not None and i not in only: continue
    w, t = H / "raw" / f"{i:02d}.wav", H / "raw" / f"{i:02d}t.wav"
    with wave.open(str(w), "wb") as wf: voice.synthesize_wav(text, wf, syn_config=cfg)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(w), "-af",
                    "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
                    "highpass=f=60,lowshelf=g=1.5:f=160,equalizer=f=3500:t=q:w=1.2:g=1.5,loudnorm=I=-16:TP=-1.5:LRA=7",
                    "-ar", "48000", "-ac", "1", str(H / "narr" / f"{i:02d}.wav")], check=True)
# durations + loudness check
out = []
for i in range(len(S.CUES)):
    f = H / "narr" / f"{i:02d}.wav"
    with wave.open(str(f)) as rf: d = rf.getnframes() / rf.getframerate()
    out.append(round(d, 3))
(H / "durs.json").write_text(json.dumps(out))
tot = S.INTRO + sum(out) + sum(c[2] for c in S.CUES) + S.ENDCARD
words = sum(len(c[1].split()) for c in S.CUES)
print(f"speech {sum(out):.1f}s  total {tot:.1f}s = {tot/60:.2f} min  words {words}  wpm {words / (sum(out)/60):.0f}")
