import wave, subprocess, json, sys
from pathlib import Path
from piper import PiperVoice, SynthesisConfig
sys.path.insert(0, '.'); import lines as L
v = PiperVoice.load('../voices/hi_IN-rohan-medium.onnx'); cfg = SynthesisConfig(length_scale=float(sys.argv[1]) if len(sys.argv) > 1 else 1.0, noise_scale=0.6, noise_w_scale=0.8)
items = [s[1] for s in L.SHOTS] + [L.END[0]]; durs = []
for i, t in enumerate(items):
    w = f'narr/{i:02d}raw.wav'
    with wave.open(w, 'wb') as wf: v.synthesize_wav(t, wf, syn_config=cfg)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', w, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,highpass=f=60,lowshelf=g=1.5:f=160,loudnorm=I=-16:TP=-1.5:LRA=7,volume=3dB,alimiter=limit=0.89', '-ar', '48000', '-ac', '1', f'narr/{i:02d}.wav'], check=True)
    with wave.open(f'narr/{i:02d}.wav') as rf: d = rf.getnframes() / rf.getframerate()
    durs.append(round(d, 3)); print(i, f'{d:.2f}s', 'TOO LONG' if d > 5.4 else '', t)
json.dump(durs, open('durs.json', 'w'))
