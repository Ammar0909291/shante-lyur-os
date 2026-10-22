"""The black-hole reel from ONE approved image (storyboard scene 2): Earth spins and is pulled toward the black hole,
stretches, cracks, then breaks into fragments that tumble into the swirling disk. Every element comes from that image:
the background is the image with Earth painted out, Earth is a sphere re-projected from its own pixels, and the fragments
are pieces of that Earth (Voronoi cells) that keep their continents and clouds. Artistic dramatisation.
python3 one_image.py <worker> <n_workers> | python3 one_image.py still <t> <out.png>"""
import sys, math, numpy as np, cv2
from pathlib import Path
from PIL import Image
from scipy.ndimage import map_coordinates, gaussian_filter
import animate as A                                   # reuse the disk swirl and crack flicker from the five-image version
H = Path(__file__).resolve().parent
W, Hh, FPS, T = 1080, 1920, 30, 30.0
sst, lerp = A.sst, A.lerp
SRC = A.IMG[2]; h, w, _ = SRC.shape                  # trimmed scene-2 panel
BX, BY, BR0, BR = A.BH[2]; EX, EY, ER = A.EARTH[2][:3]
ys0, xs0 = np.mgrid[0:h, 0:w].astype(np.float32)

# ---- background: the image with Earth painted out (inpaint, then a sprinkle of stars where the fill is flat) ----
mask = (np.hypot(xs0 - EX, ys0 - EY) < ER * 1.16).astype(np.uint8) * 255
BG = cv2.inpaint((np.clip(SRC, 0, 1) * 255).astype(np.uint8), mask, 9, cv2.INPAINT_TELEA).astype(np.float32) / 255
feather = gaussian_filter((mask > 0).astype(np.float32), 25)[..., None]
BG = BG * (1 - 0.8 * feather) + np.array([0.02, 0.025, 0.05]) * feather               # space behind Earth stays dark
rs = np.random.default_rng(3); st = (rs.random((h, w)) > 0.9985) * rs.random((h, w)) * (mask > 0)
BG = np.clip(BG + gaussian_filter(st, 0.6)[..., None] * 3, 0, 1)

# ---- Earth as a sphere texture re-projected from the image ----
# pad so Earth's full disk exists even where it sat off the edge of the picture
PAD = int(ER) + 10
SRCP = cv2.copyMakeBorder(SRC, PAD, PAD, PAD, PAD, cv2.BORDER_REFLECT)
EXP, EYP = EX + PAD, EY + PAD
def sample_earth(lat, lon):
    """Colour of Earth's surface at sphere coords (radians), as seen in the image (front hemisphere, lon in [-pi/2, pi/2])."""
    lon = (lon + math.pi) % (2 * math.pi) - math.pi
    back = np.abs(lon) > math.pi / 2; lon = np.where(back, np.sign(lon) * math.pi - lon, lon)   # back side mirrors the front
    x = EXP + ER * np.cos(lat) * np.sin(lon); y = EYP - ER * np.sin(lat)
    return np.stack([map_coordinates(SRCP[..., k], [y, x], order=1, mode="nearest") for k in range(3)], -1)

# ---- fragments: Voronoi cells on Earth's visible disk, breaking from the side facing the hole ----
rf = np.random.default_rng(11); NF = 70
dirB = np.array([BX - EX, BY - EY], np.float32); dirB /= np.linalg.norm(dirB)
seeds = []
while len(seeds) < NF:
    p = rf.uniform(-1, 1, 2)
    if p @ p < 0.97: seeds.append(p)
seeds = np.array(seeds, np.float32)
proj = seeds @ dirB                                   # 1 = side facing the hole
T_BREAK = 15.5 + (1 - (proj + 1) / 2) * 9.0 + rf.uniform(0, 1.2, NF)   # near side first, 15.5 s .. 26 s
SPIN = rf.uniform(-2.2, 2.2, NF); SPD = rf.uniform(0.16, 0.28, NF); BEND = rf.uniform(-1, 1, NF)

def earth_state(t):
    """centre, radius scale, stretch (along the hole direction) and spin angle at time t."""
    pull = sst(0, 26, t) ** 1.4
    cx, cy = EX + dirB[0] * 120 * pull, EY + dirB[1] * 120 * pull
    stretch = 1 + 0.45 * sst(8, 20, t)
    return cx, cy, 1.0 - 0.06 * pull, stretch, -0.012 * t          # slow spin, sunlit side stays in view

def render_earth(t, out, alpha_out):
    """Draw the intact (not yet detached) part of Earth: spin, stretch toward the hole, cracks glowing."""
    cx, cy, sc, stch, rot = earth_state(t); R = ER * sc
    ext = R * stch * 1.05; x0, x1 = int(max(0, cx - ext)), int(min(w, cx + ext)); y0, y1 = int(max(0, cy - ext)), int(min(h, cy + ext))
    if x1 <= x0 or y1 <= y0: return
    ys, xs = np.mgrid[y0:y1, x0:x1].astype(np.float32); dx, dy = xs - cx, ys - cy
    a = dx * dirB[0] + dy * dirB[1]; b = -dx * dirB[1] + dy * dirB[0]               # along / across the pull
    u = (a / stch * dirB[0] - b * dirB[1]) / R; v = (a / stch * dirB[1] + b * dirB[0]) / R   # unit-disk coords
    rr = u * u + v * v; inside = rr < 1
    lat = np.arcsin(np.clip(-v, -1, 1)); lon = np.arcsin(np.clip(u / np.maximum(np.cos(lat), 1e-3), -1, 1)) + rot
    col = sample_earth(lat, lon)
    # cracks: thin bright lines that grow from the near side after 10 s
    cell = np.argmin(((u[..., None] - seeds[:, 0]) ** 2 + (v[..., None] - seeds[:, 1]) ** 2), -1)
    d2 = np.sort(((u[..., None] - seeds[:, 0]) ** 2 + (v[..., None] - seeds[:, 1]) ** 2), -1)
    edge = np.sqrt(d2[..., 1]) - np.sqrt(d2[..., 0])
    near = (u * dirB[0] + v * dirB[1] + 1) / 2
    grow = np.clip((sst(10, 24, t) * 1.25 - (1 - near)) * 2.5, 0, 1)
    crack = np.clip(1 - edge / 0.012, 0, 1) * grow
    col = col * (1 - 0.7 * crack[..., None]) + np.array([1.9, 0.7, 0.15]) * crack[..., None] * (0.7 + 0.3 * np.sin(t * 6 + u * 9))[..., None]
    gone = T_BREAK[cell] <= t
    m = inside & ~gone; edgeA = np.clip((1 - np.sqrt(rr)) * R / 2.0, 0, 1) * m
    reg = out[y0:y1, x0:x1]; out[y0:y1, x0:x1] = reg * (1 - edgeA[..., None]) + col * edgeA[..., None]
    alpha_out[y0:y1, x0:x1] = np.maximum(alpha_out[y0:y1, x0:x1], edgeA)

FRAG = {}
def fragment(i):
    """Rock chunk i: jagged outline, Earth's surface on top (sampled inside the limb, so no glassy atmosphere rim),
    rough rocky texture. Returns (rgba, centre offset from the seed point, ocean fraction). Cached."""
    if i in FRAG: return FRAG[i]
    R = ER; s = int(R * 0.5); rg = np.random.default_rng(100 + i)
    ys, xs = np.mgrid[-s:s, -s:s].astype(np.float32); u, v = seeds[i, 0] + xs / R, seeds[i, 1] + ys / R
    jit = gaussian_filter(rg.normal(0, 1, (2 * s, 2 * s)), 9); jit = jit / (jit.std() + 1e-6) * 0.009   # ragged, broken edges
    d = (u[..., None] - seeds[:, 0]) ** 2 + (v[..., None] - seeds[:, 1]) ** 2
    d2 = np.sort(d, -1); own = np.argmin(d, -1) == i
    edge = (np.sqrt(d2[..., 1]) - np.sqrt(d2[..., 0])) * np.where(own, 1, -1) + jit
    mine = (edge > 0) & (u * u + v * v < 0.98)
    nlab, lab = cv2.connectedComponents(mine.astype(np.uint8))           # keep one solid piece
    if nlab > 2: big = 1 + np.argmax(np.bincount(lab.ravel())[1:]); mine = lab == big
    mine = mine.astype(bool)
    if mine.sum() < 30: FRAG[i] = None; return None
    k = 0.86                                                     # sample inside the limb
    lat = np.arcsin(np.clip(-v * k, -1, 1)); lon = np.arcsin(np.clip(u * k / np.maximum(np.cos(lat), 1e-3), -1, 1))
    col = sample_earth(lat, lon)
    col = np.maximum(col * 1.5, col * 0.6 + 0.05)                # night-side pieces lit by the disk's glow
    ocean = np.clip((col[..., 2] - col[..., 0]) * 4, 0, 1)
    rough = gaussian_filter(rg.random((2 * s, 2 * s)), 1.2); rough = 0.75 + 0.5 * (rough - rough.min()) / (np.ptp(rough) + 1e-6)
    shade = np.clip(1.0 + 0.4 * (xs * dirB[0] + ys * dirB[1]) / s, 0.55, 1.4)[..., None]
    rimw = np.clip(1 - edge / 0.02, 0, 1)
    rock = np.array([0.33, 0.24, 0.17]) * rough[..., None]
    col = (col * rough[..., None] * shade) * (1 - rimw[..., None]) + rock * rimw[..., None] * shade
    a = gaussian_filter(mine.astype(np.float32), 0.7)
    ys_, xs_ = np.nonzero(mine); y0, y1, x0, x1 = ys_.min(), ys_.max() + 1, xs_.min(), xs_.max() + 1
    FRAG[i] = (np.dstack([col[y0:y1, x0:x1], a[y0:y1, x0:x1]]), np.array([(x0 + x1) / 2 - s, (y0 + y1) / 2 - s]), float(ocean[mine].mean()))
    return FRAG[i]

def frag_pos(i, t, cx, cy, sc, off):
    tau = t - T_BREAK[i]; p0 = np.array([cx, cy]) + seeds[i] * ER * sc + off
    s = (1 - math.exp(-max(tau, 0) * SPD[i])) ** 1.3
    tgt = np.array([BX, BY + BR0 * 0.2]); ctrl = p0 + (tgt - p0) * 0.5 + np.array([-dirB[1], dirB[0]]) * 160 * BEND[i]
    return (1 - s) ** 2 * p0 + 2 * (1 - s) * s * ctrl + s * s * tgt, s

def render_fragments(t, out, trail):
    cx, cy, sc, stch, rot = earth_state(t)
    side = np.array([dirB[1], -dirB[0]]) * 0.6 - dirB * 0.8            # rock thickness shows on the side away from the hole
    for i in np.argsort(T_BREAK):
        tau = t - T_BREAK[i]
        if tau <= 0: continue
        fr = fragment(i)
        if fr is None: continue
        rgba, off, ocean = fr
        pos, s = frag_pos(i, t, cx, cy, sc, off)
        scale = (1 - 0.85 * s) * (1 + 0.15 * min(tau, 1)); ang = SPIN[i] * tau * 0.6
        hh, ww = rgba.shape[:2]; fade = 1 - sst(0.82, 0.98, s)
        thick = 10 * scale
        for layer in range(2):                                         # 0: dark rock side, 1: the surface
            M = cv2.getRotationMatrix2D((ww / 2, hh / 2), math.degrees(ang), scale)
            M[:, 2] += pos - np.array([ww / 2, hh / 2]) + (side * thick if layer == 0 else 0)
            warped = cv2.warpAffine(rgba, M, (w, h), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
            a = warped[..., 3:4] * fade
            if layer == 0: colr = np.array([0.16, 0.11, 0.08]) + warped[..., :3] * 0.15
            else: colr = warped[..., :3] * (1 + sst(0.4, 0.95, s) * np.array([0.6, 0.2, -0.3]))
            out[:] = out * (1 - a) + colr * a
        # ocean pieces shed water: a plume of droplets and vapour along the path behind them
        if ocean > 0.15:
            for j in range(1, 14):
                pj, _ = frag_pos(i, t - j * 0.07, cx, cy, sc, off)
                if 0 <= pj[0] < w - 1 and 0 <= pj[1] < h - 1:
                    trail[int(pj[1]), int(pj[0])] += np.array([0.55, 0.75, 1.0]) * ocean * (1 - j / 14) * 0.9 * fade

def particles(t, add, dust, rubble, cx, cy):
    """Dust clouds, small rubble, water vapour and embers torn from the near side, streaming into the disk."""
    k = sst(9, 18, t)
    if k <= 0: return
    rng = np.random.default_rng(5); n = 2400
    ph = rng.random(n); spd = 0.08 + rng.random(n) * 0.2; ang = rng.uniform(-1.2, 1.2, n); kind = rng.random(n)
    s = ((ph + t * spd) % 1.0) ** 1.5
    a0 = np.arctan2(dirB[1], dirB[0]) + ang
    start = np.stack([cx + ER * 0.95 * np.cos(a0), cy + ER * 0.95 * np.sin(a0)], -1)
    tgt = np.array([BX, BY + BR0 * 0.2]); off = rng.normal(0, 1, (n, 2)) * 70 * (1 - s)[:, None]
    pos = start * (1 - s)[:, None] + tgt * s[:, None] + off
    ok = (pos[:, 0] >= 0) & (pos[:, 0] < w - 1) & (pos[:, 1] >= 0) & (pos[:, 1] < h - 1)
    xi, yi = pos[:, 0].astype(int), pos[:, 1].astype(int); life = np.minimum(1, (1 - s) * 5) * k
    d = ok & (kind < 0.4) & (s < 0.55); np.add.at(dust, (yi[d], xi[d]), life[d] * (1 - s[d] / 0.55))   # brown dust, thins out near the hole
    r = ok & (kind >= 0.4) & (kind < 0.7); np.add.at(rubble, (yi[r], xi[r]), life[r])           # dark rubble specks
    wv = ok & (kind >= 0.7) & (kind < 0.9); np.add.at(add, (yi[wv], xi[wv]), np.array([0.5, 0.7, 1.0]) * life[wv, None] * 0.35)   # water vapour
    e = ok & (kind >= 0.9); np.add.at(add, (yi[e], xi[e]), np.array([1.0, 0.5, 0.15]) * (life[e] * (0.3 + s[e] ** 2))[:, None] * 0.6)   # embers

def frame(n):
    t = n / FPS
    img = swirl_bg(t)
    alpha = np.zeros((h, w), np.float32)
    render_earth(t, img, alpha)
    add = np.zeros_like(img); dust = np.zeros((h, w), np.float32); rubble = np.zeros((h, w), np.float32)
    cx, cy = earth_state(t)[:2]; particles(t, add, dust, rubble, cx, cy)
    dA = np.clip(gaussian_filter(dust, 9) * 60, 0, 0.55)[..., None]; img = img * (1 - dA) + np.array([0.36, 0.28, 0.21]) * dA       # dust clouds
    render_fragments(t, img, add)
    rA = np.clip(gaussian_filter(rubble, 1.0) * 3, 0, 0.9)[..., None]; img = img * (1 - rA) + np.array([0.12, 0.09, 0.07]) * rA     # rubble
    img = img + gaussian_filter(add, (1.6, 1.6, 0)) * 4 + gaussian_filter(add, (7, 7, 0)) * 7
    img = A.flicker(2, img, t)
    # camera: slow push toward the hole, then ease back for the aftermath
    z = 1 + 0.10 * sst(0, 22, t) - 0.06 * sst(24, 30, t)
    cw = min(w, h * W / Hh) / z; ch = cw * Hh / W
    ccx = lerp(w / 2, (BX + EX) / 2, 0.35 * sst(0, 20, t)); ccy = lerp(h * 0.55, (BY + EY) / 2, 0.5 * sst(0, 20, t))
    ccx = min(max(ccx, cw / 2), w - cw / 2); ccy = min(max(ccy, ch / 2), h - ch / 2)
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    sx, sy = ccx - cw / 2 + (xx + 0.5) * cw / W, ccy - ch / 2 + (yy + 0.5) * ch / Hh
    o = np.stack([map_coordinates(img[..., k], [sy, sx], order=3, mode="nearest") for k in range(3)], -1)
    o = np.clip(o, 0, 1) * (1 - sst(28.5, 30, t))
    o = o ** (1 / 1.0) * 255 + np.random.default_rng(n).normal(0, 2.0, (Hh, W, 1))
    return Image.fromarray(np.clip(o, 0, 255).astype(np.uint8))

def swirl_bg(t):
    """Same disk flow as animate.swirl, applied to the Earth-free background."""
    a = BG; cx, cy, r0, R = BX, BY, BR0, BR
    dx, dy = xs0 - cx, ys0 - cy; r = np.hypot(dx, dy) + 1e-3
    m = np.clip((r - r0 * 0.98) / 12, 0, 1) * np.clip((R - r) / (R * 0.35), 0, 1); om = 0.22 * (r0 / r) ** 1.5
    out = np.zeros_like(a)
    for ph in (0.0, 0.5):
        f = ((t / 2.4) + ph) % 1.0; wgt = 1 - abs(2 * f - 1); ang = -om * (f - 0.5) * m
        c, s = np.cos(ang), np.sin(ang)
        out += np.stack([map_coordinates(a[..., k], [cy + dx * s + dy * c, cx + dx * c - dy * s], order=1, mode="nearest") for k in range(3)], -1) * wgt
    return out

if __name__ == "__main__":
    if sys.argv[1] == "still": frame(int(float(sys.argv[2]) * FPS)).save(sys.argv[3]); sys.exit()
    wk, nw = int(sys.argv[1]), int(sys.argv[2]); out = H / "renders" / "one"; out.mkdir(parents=True, exist_ok=True)
    for n in range(wk, int(T * FPS), nw):
        p = out / f"f_{n:04d}.png"
        if not p.exists(): frame(n).save(str(p) + ".tmp.png"); Path(str(p) + ".tmp.png").rename(p)
