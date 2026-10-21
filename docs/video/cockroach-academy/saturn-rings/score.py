"""Original ambient score, a seamless 36 s loop: everything is rendered on a circular timeline (tails wrap into the start)
and reverbed by circular convolution, so the last sample flows into the first. Writes audio/music.wav (48 kHz stereo)."""
import numpy as np, wave
from pathlib import Path
H = Path(__file__).resolve().parent; SR = 48000; T = 36.0; N = int(SR * T); t = np.arange(N) / SR
rng = np.random.default_rng(7); out = np.zeros((2, N))
def place(sig, start, ch_gain):                       # add a signal at start (s), wrapping around the loop
    i = (int(start * SR) + np.arange(len(sig))) % N
    for c in (0, 1): np.add.at(out[c], i, sig * ch_gain[c])
def tone(f, dur, harm=6, roll=1.6, det=0.0):
    x = np.arange(int(dur * SR)) / SR; s = np.zeros_like(x)
    for n in range(1, harm + 1): s += np.sin(2 * np.pi * f * n * (1 + det) * x + rng.uniform(0, 6.28)) / n ** roll
    return s
def env(n, a, r):
    e = np.ones(n); A, R = int(a * SR), int(r * SR); e[:A] = np.sin(np.linspace(0, np.pi / 2, A)) ** 2; e[-R:] *= np.cos(np.linspace(0, np.pi / 2, R)) ** 2; return e
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
# chords (MIDI), 9 s each, overlapping 3 s: Dm9 - Bbmaj7 - Fmaj9/A - Csus2
CH = [[38, 50, 57, 60, 64, 69], [34, 46, 53, 57, 62, 65], [33, 45, 53, 57, 60, 67], [36, 48, 55, 62, 67, 69]]
for k, ch in enumerate(CH):
    for j, m in enumerate(ch):
        d = 12.0; s = tone(mid(m), d, harm=4 if m > 55 else 7, roll=1.8) * env(int(d * SR), 3.5, 4.5)
        s *= (0.11 if m < 45 else 0.07) * (1 + 0.15 * np.sin(2 * np.pi * np.arange(len(s)) / SR / 6 + j))
        pan = 0.5 + (j - 2.5) * 0.08; place(s, k * 9 - 1.5, (np.sqrt(1 - pan), np.sqrt(pan)))
# deep drone on D, breathing twice per loop
dr = (np.sin(2 * np.pi * mid(26) * t) + 0.5 * np.sin(2 * np.pi * mid(33) * t)) * (0.06 + 0.025 * np.sin(2 * np.pi * t * 2 / T))
out += dr
# icy chimes: D minor pentatonic, sparse, long decay
PENT = [74, 77, 79, 81, 84, 86, 89, 93]
for _ in range(30):
    st = rng.uniform(0, T); m = rng.choice(PENT); d = 4.0; x = np.arange(int(d * SR)) / SR
    s = (np.sin(2 * np.pi * mid(m) * x) + 0.3 * np.sin(2 * np.pi * mid(m) * 2.76 * x)) * np.exp(-x * 1.6) * np.minimum(1, x * 400) * 0.035
    p = rng.uniform(0.15, 0.85); place(s, st, (np.sqrt(1 - p), np.sqrt(p)))
# soft swells under the two big reveals (ring span at ~13.5 s, Cassini at ~22 s)
for st in (12.5, 21.2):
    d = 7.0; s = (tone(mid(62), d, 8, 1.2, 0.002) + tone(mid(69), d, 8, 1.2, -0.002)) * env(int(d * SR), 3.0, 3.5) * 0.035; place(s, st, (0.7, 0.7))
# reverb: circular convolution with a 3 s decaying noise tail (different per channel for width)
for c in (0, 1):
    ir = rng.standard_normal(int(3.0 * SR)) * np.exp(-np.arange(int(3.0 * SR)) / SR * 2.2); ir[0] = 6.0
    IR = np.zeros(N); IR[:len(ir)] = ir
    out[c] = np.real(np.fft.ifft(np.fft.fft(out[c]) * np.fft.fft(IR))) * 0.6 + out[c] * 0.4
out /= np.max(np.abs(out)) / 0.7
(H / "audio").mkdir(exist_ok=True)
with wave.open(str(H / "audio" / "music.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out.T * 32767).astype(np.int16).tobytes())
print("music.wav", T, "s")
