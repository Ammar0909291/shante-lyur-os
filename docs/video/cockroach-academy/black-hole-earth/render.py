"""EARTH MEETS A SUPERMASSIVE BLACK HOLE (30 s, silent, 1080x1920).
Background: the repo's Schwarzschild ray tracer (the-wanderer/blackhole-short/scripts/gr_render.py): real null geodesics,
lensed ESO Milky Way, thin disk. Units: M = GM/c^2. For a Sagittarius A*-like mass (4.3 million Suns) M is about 6.35 million km,
so Earth (radius 6,371 km) is 0.001 M and its tidal disruption radius R_E (M_bh/M_E)^(1/3) is about 70 million km, about 11 M:
Earth is torn apart outside the event horizon (2 M). Earth's stretching and the debris stream are an illustration on top
(drawn with straight rays; their own lensing is ignored), with time compressed.
python3 render.py <worker> <n_workers> | python3 render.py still <t> <out.png>"""
import sys, math, numpy as np
from pathlib import Path
from PIL import Image
H = Path(__file__).resolve().parent
sys.path.insert(0, str(H.parents[1] / "the-wanderer" / "blackhole-short" / "scripts")); import gr_render as G
Image.MAX_IMAGE_PIXELS = None
W, Hh, FPS, T = 1080, 1920, 30, 30.0
A = H.parent / "assets"
SKY = G.Sky(str(A / "milkyway.jpg"), gain=0.35)
EARTH = np.asarray(Image.open(A / "earth_day.jpg").convert("RGB").resize((2048, 1024), Image.LANCZOS), np.float32) / 255.0
EARTH_L = EARTH ** 2.2
RE = 0.001                                  # Earth radius in M
CRACK = [tuple(np.random.default_rng(i).normal(0, 1, 3)) + (i * 1.7,) for i in range(5)]
sstep = lambda a, b, x: (lambda u: u * u * (3 - 2 * u))(min(1.0, max(0.0, (x - a) / (b - a))))
def stretch(t): return 2.4 * sstep(5.0, 17.0, t) ** 1.6 + 38.0 * sstep(15.0, 30.0, t) ** 2.2
_tab = {}
_geo = G.geodesic_table
G.geodesic_table = lambda r0, *a, **k: _tab.setdefault(round(r0, 4), _geo(r0, *a, **k))   # camera radius is fixed: trace once

R_CAM, EL = 12.4, 9.0                       # camera distance from the hole (M) and height above the disk plane (deg)
def basis(t):
    az = math.radians(-18 + 14 * t / T); el = math.radians(EL)
    cam = np.array([R_CAM * math.cos(el) * math.sin(az), -R_CAM * math.cos(el) * math.cos(az), R_CAM * math.sin(el)])
    b = -cam / np.linalg.norm(cam); r0 = np.cross(b, [0, 0, 1.0]); r0 /= np.linalg.norm(r0); u0 = np.cross(r0, b)
    yaw, pitch = math.radians(27 - 3 * t / T), math.radians(-16)       # look past the hole: shadow upper left, Earth lower right
    fw = b * math.cos(yaw) * math.cos(pitch) + r0 * math.sin(yaw) * math.cos(pitch) + u0 * math.sin(pitch)
    fw /= np.linalg.norm(fw); look = cam + fw; rt = np.cross(fw, [0, 0, 1.0]); rt /= np.linalg.norm(rt); up = np.cross(rt, fw)
    return cam, look, fw, rt, up
FOV = 74.0
def earth_pos(t):
    cam, _, fw, rt, up = basis(t)
    return cam + fw * 0.0092 + rt * 0.0012 - up * 0.0022          # just ahead of the camera, lower right of frame

def project(P, cam, fw, rt, up):
    f = 0.5 * Hh / math.tan(math.radians(FOV) / 2); d = P - cam; z = d @ fw
    return W / 2 + (d @ rt) / z * f - 0.5, Hh / 2 - (d @ up) / z * f - 0.5, z

def earth_layer(t, cam, fw, rt, up):
    """Ray-cast the (stretched) Earth: ellipsoid elongated along the direction to the hole."""
    E = earth_pos(t); rh = -E / np.linalg.norm(E)                    # unit vector Earth -> hole
    s = stretch(t)                                                  # elongation along the hole direction
    a, b = RE * (1 + s), RE / math.sqrt(1 + s)
    e2 = np.cross(rh, [0, 0, 1.0]); e2 /= np.linalg.norm(e2); e3 = np.cross(rh, e2)
    R = np.stack([rh, e2, e3]); S = np.array([a, b, b])
    f = 0.5 * Hh / math.tan(math.radians(FOV) / 2)
    x0, y0, z0 = project(E, cam, fw, rt, up); rad = int(a / z0 * f * 1.6) + 4
    X0, X1, Y0, Y1 = max(0, int(x0) - rad), min(W, int(x0) + rad), max(0, int(y0) - rad), min(Hh, int(y0) + rad)
    col = np.zeros((Hh, W, 3), np.float32); alpha = np.zeros((Hh, W), np.float32)
    if X1 <= X0 or Y1 <= Y0: return col, alpha
    ys, xs = np.mgrid[Y0:Y1, X0:X1].astype(np.float32)
    d = fw[None, None] + ((xs - W / 2 + 0.5) / f)[..., None] * rt + (-(ys - Hh / 2 + 0.5) / f)[..., None] * up
    d /= np.linalg.norm(d, axis=-1, keepdims=True)
    o = (R @ (cam - E)) / S; dl = (d @ R.T) / S                         # ellipsoid -> unit sphere
    A2 = (dl * dl).sum(-1); B2 = 2 * (dl @ o); C2 = o @ o - 1; disc = B2 * B2 - 4 * A2 * C2
    hit = disc > 0; tt = (-B2 - np.sqrt(np.maximum(disc, 0))) / (2 * A2)
    p = o + dl * tt[..., None]; n = p / S; n = (n @ R); n /= np.linalg.norm(n, axis=-1, keepdims=True)
    q = p @ R                                                      # sphere coords in world axes -> texture lat/lon
    lat = np.arcsin(np.clip(q[..., 2], -1, 1)); lon = np.arctan2(q[..., 1], q[..., 0]) + 1.3 + t * 0.02
    u = ((lon / (2 * math.pi)) % 1) * 2047; v = (0.5 - lat / math.pi) * 1023
    tex = EARTH_L[np.clip(v.astype(int), 0, 1023), np.clip(u.astype(int), 0, 2047)]
    L = -E / np.linalg.norm(E) * 0.6 + np.array([0, 0, -0.8]); L /= np.linalg.norm(L)   # lit by the hot disk below and ahead
    lam = np.clip(n @ L, 0, 1)
    c = tex * (lam[..., None] * np.array([3.4, 2.6, 1.9]) + 0.12)
    # heating: glowing fractures spread as the stretch grows (illustrative)
    w = sum(np.sin(a * np.sin(lat) * 9 + bb * np.cos(lat) * np.cos(lon + ph) * 9 + cc * np.cos(lat) * np.sin(lon + ph) * 9) for a, bb, cc, ph in CRACK) / len(CRACK)
    crack = np.clip(1 - np.abs(w) / (0.025 + 0.07 * sstep(9, 19, t)), 0, 1) ** 2
    c = c * (1 - 0.5 * crack[..., None] * sstep(8, 15, t)) + crack[..., None] * np.array([3.2, 1.2, 0.3]) * sstep(8, 15, t)
    fade = 1.0
    hot = np.clip((q @ rh) * 0.5 + 0.5, 0, 1) ** 2 * sstep(14, 26, t)          # end nearest the hole heats most
    c = c * (1 - hot[..., None]) + G.blackbody_rgb(0.5 + hot * 0.8) * (hot * 1.5)[..., None]
    col[Y0:Y1, X0:X1] = c * hit[..., None]; alpha[Y0:Y1, X0:X1] = hit * fade
    return col, alpha

rng = np.random.default_rng(4); NP = 260000
P_Q = rng.random(NP) ** 0.8; P_SIDE = np.where(rng.random(NP) < 0.62, 1.0, -1.0)
P_OFF = rng.normal(0, 1, (NP, 2)); P_LAT = np.arcsin(rng.uniform(-1, 1, NP)); P_LON = rng.uniform(0, 2 * math.pi, NP)
P_COL = EARTH_L[np.clip(((0.5 - P_LAT / math.pi) * 1023).astype(int), 0, 1023), np.clip((((P_LON + 1.3) / (2 * math.pi)) % 1 * 2047).astype(int), 0, 2047)]
def stream_layer(t, cam, fw, rt, up):
    """Debris shed along the stretched Earth: a loose sheath around the strand, hottest towards the hole (illustrative)."""
    k = sstep(11.0, 22.0, t)
    if k <= 0: return np.zeros((Hh, W, 3), np.float32)
    E = earth_pos(t); rh = -E / np.linalg.norm(E); e2 = np.cross(rh, [0, 0, 1.0]); e2 /= np.linalg.norm(e2); e3 = np.cross(rh, e2)
    s = stretch(t); a, b = RE * (1 + s), RE / math.sqrt(1 + s)
    u = (P_Q * 2 - 1) * P_SIDE; spread = b * (1.0 + 1.2 * k) * (1 + 0.6 * np.abs(u))
    P = E + np.outer(u * a * 1.08, rh) + np.outer(P_OFF[:, 0] * spread, e2) + np.outer(P_OFF[:, 1] * spread * 0.7, e3)
    x, y, zc = project(P, cam, fw, rt, up); ok = (zc > 1e-4) & (x >= 0) & (x < W - 1) & (y >= 0) & (y < Hh - 1)
    heat = np.clip((u * 0.5 + 0.5) ** 2 * 1.2 * sstep(13, 26, t) + 0.1, 0, 1.3)
    c = P_COL * (1 - np.clip(heat, 0, 1))[:, None] * 2.0 + G.blackbody_rgb(0.4 + heat) * (heat ** 1.5 * 2.4)[:, None]
    c = c * k * 0.16
    img = np.zeros((Hh, W, 3), np.float32)
    xi, yi = x[ok].astype(int), y[ok].astype(int); fx, fy = (x[ok] - xi)[:, None], (y[ok] - yi)[:, None]; cc = c[ok]
    for dx, dy, w in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
        np.add.at(img, (yi + dy, xi + dx), cc * w)
    from scipy.ndimage import gaussian_filter
    return img + gaussian_filter(img, (1.6, 1.6, 0)) * 0.8

def frame(n):
    t = n / FPS; cam, look, fw, rt, up = basis(t)
    bg = G.render(cam, look, [0, 0, 1.0], FOV, W, Hh, t, SKY, disk_gain=1.0, disk_on=1.0, r_in=6.0, r_out=10.5)
    ec, ea = earth_layer(t, cam, fw, rt, up)
    img = bg * (1 - ea[..., None]) + ec * ea[..., None] + stream_layer(t, cam, fw, rt, up)
    img = G.bloom(img, 0.2)
    out = G.tonemap(img, 1.0).astype(np.float32)
    out += rng.normal(0, 1.6, out.shape[:2])[..., None]                          # fine grain
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

if __name__ == "__main__":
    if sys.argv[1] == "still": frame(int(float(sys.argv[2]) * FPS)).save(sys.argv[3]); sys.exit()
    wk, nw = int(sys.argv[1]), int(sys.argv[2]); out = H / "renders" / "frames"; out.mkdir(parents=True, exist_ok=True)
    for n in range(wk, int(T * FPS), nw):
        p = out / f"f_{n:04d}.png"
        if p.exists(): continue
        frame(n).save(str(p) + ".tmp.png"); Path(str(p) + ".tmp.png").rename(p); print("ok", n, flush=True)
