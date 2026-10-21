"""Soundtrack v5: music built on the new timeline; sfx built on the original layout and re-mapped through the segment table."""
import numpy as np, wave, json
from pathlib import Path
H = Path(__file__).resolve().parent
SR = 48000; TL = json.load(open(H / "timeline_v5.json", encoding="utf8")); TOTAL = TL["total"]; N_NEW = int(SR * TOTAL)
T = 58.0; N = int(SR * T); t = np.arange(N) / SR              # old axis (sfx authoring)
tn = np.arange(N_NEW) / SR                                      # new axis
rng = np.random.default_rng(7)
def env(pts): xs, ys = zip(*pts); return np.interp(t, xs, ys)
def envn(pts): xs, ys = zip(*pts); return np.interp(tn, xs, ys)
def band(x, lo, hi):
    F = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.exp(-((np.log(np.maximum(f, 1) / np.sqrt(lo * hi)) / np.log(hi / lo) * 2.2) ** 4))
    return np.fft.irfft(F * m, len(x))
def noise(lo, hi, seed):
    x = np.random.default_rng(seed).standard_normal(N); y = band(x, lo, hi); return y / (np.std(y) + 1e-9)
def noisen(lo, hi, seed):
    x = np.random.default_rng(seed).standard_normal(N_NEW); y = band(x, lo, hi); return y / (np.std(y) + 1e-9)
def tone(f, ph=0.0, vib=0.0): return np.sin(2 * np.pi * f * t + ph + vib * np.sin(2 * np.pi * 0.23 * t))
def tonen(f, ph=0.0, vib=0.0): return np.sin(2 * np.pi * f * tn + ph + vib * np.sin(2 * np.pi * 0.23 * tn))
def burst(t0, dur, decay):
    e = np.where(t >= t0, np.exp(-np.minimum((t - t0) * decay, 50)), 0.0); return e * (t < t0 + dur)
sfx = np.zeros(N)
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

# ---- re-map the sfx through the segment table (new time -> old time), with short fades at cuts ----
SEG = TL["seg"]
pos = np.zeros(N_NEW); gain = np.ones(N_NEW)
for i, (n0, n1, o0, o1, cont, quiet) in enumerate(SEG):
    m = (tn >= n0) & (tn < n1) if i < len(SEG) - 1 else (tn >= n0)
    u = np.clip((tn[m] - n0) / (n1 - n0), 0, 1); pos[m] = (o0 + (o1 - o0) * u) * SR
    g = np.ones(m.sum()); f = 0.025
    if i > 0 and not cont: g *= np.clip((tn[m] - n0) / f, 0, 1)
    if i < len(SEG) - 1 and not SEG[i + 1][4]: g *= np.clip((n1 - tn[m]) / f, 0, 1)
    gain[m] = g
sfxn = np.interp(pos, np.arange(N), sfx) * gain
sfxn = sfxn * (0.85 / max(1e-9, np.abs(sfxn).max()))
# ---- music on the new timeline ----
stop = TL["stop"]; cata0 = [c for c in TL["cues"] if c["id"] == "cata"][0]["t0"]; cata1 = [c for c in TL["cues"] if c["id"] == "cata"][0]["t1"]
pad = (tonen(55) * 0.5 + tonen(82.41, 1) * 0.35 + tonen(110, 2, 0.002) * 0.3 + tonen(130.81, 3, 0.002) * 0.22) * (0.55 + 0.45 * np.sin(2 * np.pi * tn / 9.0 + 0.5))
music = pad * envn([(0, 0.0), (1.2, 0.20), (stop - 0.4, 0.26), (stop + 0.1, 0.07), (28, 0.09), (cata0 - 0.3, 0.12), (cata0 + 2.5, 0.26), (cata1 - 0.4, 0.34), (cata1 + 0.05, 0.0), (58, 0.0)])
rise1 = noisen(700, 6500, 21) * envn([(stop - 4.0, 0), (stop - 0.05, 1.0), (stop, 0)]) ** 2 * 0.18
rise2 = noisen(500, 7000, 22) * envn([(cata0, 0), (cata1 - 0.3, 1.0), (cata1 - 0.25, 0)]) ** 2 * 0.2
air = (tonen(329.63, 0, 0.004) * 0.3 + tonen(440, 1, 0.004) * 0.22 + tonen(659.26, 2, 0.003) * 0.12) * (0.6 + 0.4 * np.sin(2 * np.pi * tn / 4.3))
music += air * envn([(33, 0), (34.5, 0.05), (39.5, 0.06), (40.2, 0)])
major = (tonen(110) * 0.45 + tonen(164.81, 1, 0.002) * 0.35 + tonen(220, 2, 0.003) * 0.3 + tonen(277.18, 3, 0.003) * 0.25 + tonen(329.63, 4, 0.003) * 0.18) * (0.7 + 0.3 * np.sin(2 * np.pi * tn / 7.0))
music += major * envn([(cata1 + 0.5, 0.0), (cata1 + 3.0, 0.2), (56.0, 0.2), (TOTAL, 0.0)])
music = music + rise1 + rise2
music *= envn([(0, 1), (TOTAL - 1.8, 1), (TOTAL, 0)]); sfxn *= envn([(0, 1), (TOTAL - 1.0, 1), (TOTAL, 0)])
# ---- narration ----
voice = np.zeros(N_NEW)
for i, c in enumerate(TL["cues"]):
    with wave.open(str(H / "audio2" / "narr" / f"{i:02d}.wav")) as w: a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    s0 = int(c["t0"] * SR); voice[s0:s0 + len(a)] += a[:N_NEW - s0]
def stereo(x, spread=0.0):
    d = int(0.011 * SR) if spread else 0; return np.stack([x, np.roll(x, d) if d else x], 1)
def save(name, x):
    x = np.clip(x, -1, 1); y = (x * 32767).astype(np.int16)
    with wave.open(str(H / "audio" / name), "wb") as w: w.setnchannels(2 if y.ndim == 2 else 1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())
save("voice.wav", voice); save("music.wav", stereo(music, 1)); save("sfx.wav", stereo(sfxn))
print("v5 stems written (%.1f s)" % TOTAL)
