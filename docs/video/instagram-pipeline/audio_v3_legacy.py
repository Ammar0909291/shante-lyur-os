"""Original soundtrack for the Earth-stop short: pads, risers, impacts, wind, ocean, ticks. No samples, no copyrighted music."""
import numpy as np, wave, json, subprocess, sys
from pathlib import Path
H = Path(__file__).resolve().parent
SR = 48000; T = 58.0; N = int(SR * T); t = np.arange(N) / SR
rng = np.random.default_rng(7)
TL = json.load(open(H / "timeline_v3.json", encoding="utf8")); TOTAL = TL["total"]; N_NEW = int(SR * TOTAL); ANCH = TL["anch"]
def env(pts): xs, ys = zip(*pts); return np.interp(t, xs, ys)
def win(a, b, f=0.3): return np.clip((t - a) / f, 0, 1) * np.clip((b - t) / f, 0, 1)
def band(x, lo, hi):
    F = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.exp(-((np.log(np.maximum(f, 1) / np.sqrt(lo * hi)) / np.log(hi / lo) * 2.2) ** 4))
    return np.fft.irfft(F * m, len(x))
def noise(lo, hi, seed): 
    x = np.random.default_rng(seed).standard_normal(N); y = band(x, lo, hi); return y / (np.std(y) + 1e-9)
def tone(f, ph=0.0, vib=0.0): return np.sin(2 * np.pi * f * t + ph + vib * np.sin(2 * np.pi * 0.23 * t))
def burst(t0, dur, decay):  # exponential decay starting at t0
    e = np.where(t >= t0, np.exp(-(t - t0) * decay), 0.0); return e * (t < t0 + dur)
music = np.zeros(N); sfx = np.zeros(N)
# ---- pads ----
minor = (tone(55) * 0.5 + tone(82.41, 1) * 0.35 + tone(110, 2, 0.002) * 0.3 + tone(130.81, 3, 0.002) * 0.22 * win(18, 45, 3)) * (0.55 + 0.45 * np.sin(2 * np.pi * t / 9.0 + 0.5))
music += minor * env([(0, 0.0), (1.5, 0.16), (5, 0.18), (6.2, 0.07), (20, 0.08), (30, 0.14), (32.4, 0.05), (39, 0.10), (44.9, 0.2), (45.6, 0.0), (58, 0.0)])
major = (tone(110) * 0.45 + tone(164.81, 1, 0.002) * 0.35 + tone(220, 2, 0.003) * 0.3 + tone(277.18, 3, 0.003) * 0.25 + tone(329.63, 4, 0.003) * 0.18) * (0.7 + 0.3 * np.sin(2 * np.pi * t / 7.0))
music += major * env([(44.5, 0.0), (47.5, 0.2), (48.6, 0.2), (49.1, 0.04), (50.2, 0.2), (56.2, 0.2), (58, 0.0)])
# moon + orbit: airy upper pad and month ticks
air = (tone(329.63, 0, 0.004) * 0.3 + tone(440, 1, 0.004) * 0.22 + tone(659.26, 2, 0.003) * 0.12) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 4.3))
music += air * env([(32.2, 0), (34, 0.05), (39.2, 0.06), (44.9, 0.0)])
for k in range(12): sfx += burst(39.2 + 0.55 + k * (5.75 - 0.55) / 12, 0.12, 60) * np.sin(2 * np.pi * 1900 * t) * 0.18
# ---- hook: riser then impact at the stop ----
r = noise(700, 7000, 1) * env([(3.4, 0), (5.1, 1.0), (5.15, 0)]) ** 2 * 0.22; sfx += r
sfx += burst(5.15, 1.6, 2.6) * (np.sin(2 * np.pi * 46 * t) * 0.95 + np.sin(2 * np.pi * 72 * t) * 0.4) + burst(5.15, 0.8, 5) * noise(60, 900, 2) * 0.5
# ---- bus: engine, brake screech, thud ----
eng = (noise(40, 180, 3) * 0.5 + tone(38) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t)) * 0.4)
sfx += eng * env([(6.0, 0), (6.5, 0.16), (7.9, 0.2), (8.5, 0.12), (9.0, 0.0)])
sweep = np.sin(2 * np.pi * np.cumsum(np.interp(t, [7.95, 8.9], [2600, 1350])) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(np.interp(t, [7.95, 8.9], [5200, 2700])) / SR)
sfx += (sweep * 0.16 + noise(1500, 6000, 4) * 0.22) * env([(7.9, 0), (8.0, 1), (8.5, 0.7), (8.95, 0)])
sfx += burst(8.25, 0.7, 6) * (tone(60) * 0.7 + noise(100, 700, 5) * 0.6) * 0.8
# ---- inertia: the stop, scrape and crate knocks ----
sfx += noise(150, 1200, 6) * env([(10.9, 0), (11.5, 0.05), (12.2, 0.06), (12.3, 0)])
sfx += burst(12.3, 1.5, 3.2) * (tone(52) * 0.9 + tone(78) * 0.35) + burst(12.3, 0.5, 8) * noise(80, 1500, 7) * 0.5
sfx += noise(400, 2600, 8) * env([(12.3, 0), (12.45, 0.28), (13.4, 0.2), (14.2, 0)]) * (0.7 + 0.3 * np.sin(2 * np.pi * 14 * t))
for tk, fq in [(12.62, 190), (12.85, 160), (13.05, 210), (13.3, 175)]: sfx += burst(tk, 0.25, 22) * tone(fq) * 0.35
# ---- Delhi: soft ping when the arrow appears ----
sfx += burst(17.5, 1.4, 3.5) * tone(880) * 0.12 + burst(17.5, 1.4, 3.5) * tone(1320) * 0.06
# ---- wind: rising bands, crest near 29.5 s ----
w1, w2, w3, w4 = noise(120, 400, 9), noise(400, 1000, 10), noise(1000, 2500, 11), noise(2500, 6000, 12)
sfx += w1 * env([(20.3, 0), (24, 0.25), (29.6, 0.5), (30.6, 0)]) + w2 * env([(20.3, 0), (25, 0.18), (29.6, 0.4), (30.6, 0)]) + w3 * env([(22, 0), (26.5, 0.12), (29.6, 0.32), (30.6, 0)]) + w4 * env([(24.5, 0), (28, 0.08), (29.6, 0.2), (30.6, 0)])
# ---- ocean: swell rumble, crash and foam hiss ----
sfx += noise(35, 300, 13) * env([(30.3, 0), (31.2, 0.5), (31.8, 0.45), (32.9, 0)]) + burst(31.35, 1.6, 2.4) * noise(1200, 9000, 14) * 0.6 + noise(2500, 9000, 15) * env([(31.3, 0), (31.8, 0.22), (32.9, 0)])
# ---- gentle dip of the bed before the key line ----
music *= env([(0, 1), (48.4, 1), (48.9, 0.35), (49.8, 0.35), (50.4, 1), (58, 1)])
music *= env([(0, 1), (56.3, 1), (58, 0)]); sfx *= env([(0, 1), (57, 1), (58, 0)])
# ---- time-warp music + sfx from the original 58 s layout onto the new narration timeline ----
def warp(tt):
    A = np.array(ANCH); return np.interp(tt, A[:, 0], A[:, 1])
pos = warp(np.arange(N_NEW) / SR) * SR
music = np.interp(pos, np.arange(N), music); sfx = np.interp(pos, np.arange(N), sfx)
# ---- narration: each Piper cue placed at its timeline slot ----
voice = np.zeros(N_NEW)
for i, c in enumerate(TL["cues"]):
    with wave.open(str(H / "audio2" / "narr" / f"{i:02d}.wav")) as w: a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    s0 = int(c["t0"] * SR); voice[s0:s0 + len(a)] += a[:N_NEW - s0]
def stereo(x, spread=0.0):
    d = int(0.011 * SR) if spread else 0; l = x; r = np.roll(x, d) if d else x; return np.stack([l, r], 1)
def save(name, x):
    x = np.clip(x, -1, 1); y = (x * 32767).astype(np.int16)
    with wave.open(str(H / "audio" / name), "wb") as w: w.setnchannels(2 if y.ndim == 2 else 1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())
sfx = sfx * (0.85 / max(1e-9, np.abs(sfx).max())); save("voice.wav", voice); save("music.wav", stereo(music / 1.0, 1)); save("sfx.wav", stereo(sfx))
print("stems written; peaks voice %.2f music %.2f sfx %.2f" % (np.abs(voice).max(), np.abs(music).max(), np.abs(sfx).max()))
