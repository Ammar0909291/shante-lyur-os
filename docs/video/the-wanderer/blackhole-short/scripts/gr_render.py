"""Schwarzschild black-hole renderer (NumPy). Real null geodesics, not an artistic approximation:
each light ray from the camera stays in a plane through the black hole, where its orbit obeys u'' = -u + 3 M u^2 (u = 1/r, M = 1).
Per frame we integrate a table of rays (one per launch angle from the camera), then every pixel is a table lookup:
 - disk crossings: the ray meets the disk plane at analytically known in-plane angles phi_k; r(phi_k) comes from the table
   (primary image, the image bent over/under the shadow, and the thin higher-order ring);
 - rays that fall below r = 2M are captured (the shadow); rays that escape sample the real ESO Milky Way panorama in their
   final, bent direction.
Disk: thin Keplerian disk from the innermost stable orbit (6M) outward, Novikov-Thorne-like temperature profile, relativistic
Doppler + gravitational shift g = sqrt(1-3/r)/(1 + Omega*Lz) applied to brightness (g^4) and colour. Turbulence is a periodic noise
field advected with the local orbital speed (differential rotation).
"""
import numpy as np, math
from PIL import Image

M = 1.0

def geodesic_table(r0, n_alpha=1600, dphi=0.004, phi_max=4 * math.pi):
    """For launch angles alpha in (0, pi) (alpha = angle between the ray and the direction to the hole) integrate u(phi)."""
    a = np.linspace(1e-4, math.pi - 1e-4, n_alpha)
    u0 = 1.0 / r0
    # local static observer: b = r0 sin(alpha) / sqrt(1 - 2M/r0); du/dphi = u^2 * dr... use (u')^2 = 1/b^2 - u^2 (1 - 2u)
    b = r0 * np.sin(a) / math.sqrt(1 - 2 * M / r0)
    up0 = np.sqrt(np.maximum(1 / b**2 - u0**2 * (1 - 2 * M * u0), 0)) * np.sign(np.cos(a))   # inward (cos>0) -> u grows
    ns = int(phi_max / dphi)
    U = np.empty((ns, n_alpha), np.float32)
    u, up = np.full(n_alpha, u0), up0.copy()
    alive = np.ones(n_alpha, bool); captured = np.zeros(n_alpha, bool); phi_end = np.full(n_alpha, phi_max)
    f = lambda u: -u + 3 * M * u * u
    for i in range(ns):
        U[i] = u
        k1u, k1p = up, f(u)
        k2u, k2p = up + 0.5 * dphi * k1p, f(u + 0.5 * dphi * k1u)
        k3u, k3p = up + 0.5 * dphi * k2p, f(u + 0.5 * dphi * k2u)
        k4u, k4p = up + dphi * k3p, f(u + dphi * k3u)
        un = u + dphi / 6 * (k1u + 2 * k2u + 2 * k3u + k4u); upn = up + dphi / 6 * (k1p + 2 * k2p + 2 * k3p + k4p)
        cap = alive & (un >= 0.5 / M); esc = alive & (un <= 0)
        phi_here = (i + 1) * dphi
        # escaping: interpolate the angle where u hits 0
        phi_end[esc] = phi_here - dphi * (un[esc] / (un[esc] - u[esc]))
        phi_end[cap] = phi_here; captured |= cap; alive &= ~(cap | esc)
        u, up = np.where(alive, un, u), np.where(alive, upn, up)
        if not alive.any(): U[i + 1:] = u; break
    return dict(a=a, U=U, dphi=dphi, phi_end=phi_end, captured=captured, b=b)

def lookup_u(T, ia, phi):
    """bilinear in (alpha index float, phi)."""
    U = T["U"]; ns = U.shape[0]
    fi = np.clip(phi / T["dphi"], 0, ns - 1.001); i0 = fi.astype(np.int32); w = fi - i0
    a0 = np.clip(ia.astype(np.int32), 0, U.shape[1] - 2); wa = np.clip(ia - a0, 0, 1)
    u00 = U[i0, a0]; u01 = U[i0, a0 + 1]; u10 = U[i0 + 1, a0]; u11 = U[i0 + 1, a0 + 1]
    return (u00 * (1 - wa) + u01 * wa) * (1 - w) + (u10 * (1 - wa) + u11 * wa) * w

def periodic_noise(nr=256, nt=1024, seed=3):
    """fbm noise periodic in angle (columns), smooth in log-radius (rows)."""
    rng = np.random.default_rng(seed); out = np.zeros((nr, nt), np.float32); amp = 1.0
    for o in range(5):
        fr, ft = 2 * 2**o, 10 * 2**o
        g = rng.normal(0, 1, (fr + 1, ft)).astype(np.float32)
        yi = np.linspace(0, fr, nr); xi = np.linspace(0, ft, nt, endpoint=False)
        y0 = np.floor(yi).astype(int); y1 = np.minimum(y0 + 1, fr); wy = (yi - y0)[:, None]
        x0 = np.floor(xi).astype(int) % ft; x1 = (x0 + 1) % ft; wx = (xi - np.floor(xi))[None, :]
        sy = wy * wy * (3 - 2 * wy); sx = wx * wx * (3 - 2 * wx)
        v = (g[y0][:, x0] * (1 - sx) + g[y0][:, x1] * sx) * (1 - sy) + (g[y1][:, x0] * (1 - sx) + g[y1][:, x1] * sx) * sy
        out += amp * v; amp *= 0.55
    out = (out - out.mean()) / out.std(); return out

NOISE = periodic_noise()
# streaks: stretch the noise along the orbit by sampling it with more angular than radial structure
def disk_noise(r, ang):
    lr = (np.log(r) - math.log(6)) / (math.log(28) - math.log(6))
    y = np.clip(lr, 0, 1) * (NOISE.shape[0] - 1); x = (ang / (2 * math.pi) % 1) * NOISE.shape[1]
    y0 = y.astype(int); y1 = np.minimum(y0 + 1, NOISE.shape[0] - 1); wy = y - y0
    x0 = x.astype(int) % NOISE.shape[1]; x1 = (x0 + 1) % NOISE.shape[1]; wx = x - np.floor(x)
    return (NOISE[y0, x0] * (1 - wx) + NOISE[y0, x1] * wx) * (1 - wy) + (NOISE[y1, x0] * (1 - wx) + NOISE[y1, x1] * wx) * wy

RAMP_T = np.array([0.0, 0.25, 0.45, 0.65, 0.85, 1.05, 1.4, 3.0])
RAMP_C = np.array([[0.05, 0.0, 0.0], [0.45, 0.04, 0.0], [0.9, 0.22, 0.02], [1.0, 0.45, 0.08], [1.0, 0.68, 0.25],
                   [1.0, 0.86, 0.6], [1.0, 0.96, 0.9], [0.92, 0.95, 1.0]])
def blackbody_rgb(t):
    """t: temperature in units where 1 = hottest disk region. Deep red -> orange -> gold -> white-hot (-> faint blue-white when boosted)."""
    t = np.clip(t, 0, 3)
    return np.stack([np.interp(t, RAMP_T, RAMP_C[:, c]) for c in range(3)], -1).astype(np.float32)

class Sky:
    def __init__(self, path, gain=1.0, extra=None):
        im = Image.open(path).convert("RGB"); Image.MAX_IMAGE_PIXELS = None
        self.a = (np.asarray(im, np.float32) / 255.0) ** 2.2 * gain          # linear light
        if extra is not None:   # paste an extra object (e.g. a galaxy) into the sky at a direction
            img, lon, lat, w = extra; g = np.asarray(Image.open(img).convert("RGB"), np.float32) / 255.0
            H, W = self.a.shape[:2]; pw = int(w * W / 360); ph = int(pw * g.shape[0] / g.shape[1])
            g = np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((pw, ph), Image.LANCZOS), np.float32) / 255.0
            cx = int((lon / 360 + 0.5) * W); cy = int((0.5 - lat / 180) * H)
            lum = g.max(-1, keepdims=True); alpha = np.clip((lum - 0.04) * 3, 0, 1)
            sl = self.a[cy - ph // 2: cy - ph // 2 + ph, cx - pw // 2: cx - pw // 2 + pw]
            sl[:] = sl * (1 - alpha) + (g ** 2.2) * alpha * 1.6
        self.H, self.W = self.a.shape[:2]
    def sample(self, d):
        lon = np.arctan2(d[..., 0], d[..., 1]); lat = np.arcsin(np.clip(d[..., 2], -1, 1))
        x = (lon / (2 * math.pi) + 0.5) * self.W; y = (0.5 - lat / math.pi) * self.H
        x0 = np.floor(x).astype(int); y0 = np.clip(np.floor(y).astype(int), 0, self.H - 2); wx = (x - x0)[..., None]; wy = (y - y0)[..., None]
        x0 %= self.W; x1 = (x0 + 1) % self.W
        a = self.a
        return (a[y0, x0] * (1 - wx) + a[y0, x1] * wx) * (1 - wy) + (a[y0 + 1, x0] * (1 - wx) + a[y0 + 1, x1] * wx) * wy

def render(cam_pos, look_at, up, fov_deg, W, H, t, sky, disk_gain=1.0, disk_on=1.0, r_in=6.0, r_out=26.0, ss=1, tilt=(0.0, 0.0)):
    """Return linear RGB float image (H, W, 3). Disk normal is +z, tilted by (tilt x, tilt y) radians."""
    cam = np.asarray(cam_pos, float); r0 = np.linalg.norm(cam)
    fw = np.asarray(look_at, float) - cam; fw /= np.linalg.norm(fw)
    rt = np.cross(fw, up); rt /= np.linalg.norm(rt); upv = np.cross(rt, fw)
    Hs, Ws = H * ss, W * ss
    f = 0.5 * Hs / math.tan(math.radians(fov_deg) / 2)
    ys, xs = np.mgrid[0:Hs, 0:Ws].astype(np.float32)
    px = (xs - Ws / 2 + 0.5) / f; py = -(ys - Hs / 2 + 0.5) / f
    d = fw[None, None] + px[..., None] * rt[None, None] + py[..., None] * upv[None, None]
    d /= np.linalg.norm(d, axis=-1, keepdims=True)
    e1 = cam / r0                                         # from hole toward camera
    cosA = -(d @ e1); alpha = np.arccos(np.clip(cosA, -1, 1))       # 0 = straight at the hole
    e2 = d - (d @ e1)[..., None] * e1; n2 = np.linalg.norm(e2, axis=-1, keepdims=True); e2 = e2 / np.maximum(n2, 1e-9)
    # nx, ny: disk normal
    tx, ty = tilt
    n = np.array([math.sin(ty), -math.sin(tx) * math.cos(ty), math.cos(tx) * math.cos(ty)]); n /= np.linalg.norm(n)
    T = geodesic_table(r0)
    ia = np.interp(alpha, T["a"], np.arange(len(T["a"])))
    a0 = np.clip(ia.astype(int), 0, len(T["a"]) - 1)
    phi_end = np.interp(ia, np.arange(len(T["a"])), T["phi_end"]); captured = T["captured"][a0]
    out = np.zeros((Hs, Ws, 3), np.float32); trans = np.ones((Hs, Ws), np.float32)
    if disk_on > 0:
        e1n = float(e1 @ n); e2n = e2 @ n
        phic = np.arctan2(-e1n * np.ones_like(e2n), e2n) % math.pi
        # angular momentum of the (time-reversed) photon about the disk axis, per unit energy: Lz = -b (e1 x e2).n
        bimp = np.interp(ia, np.arange(len(T["a"])), T["b"])
        crossn = np.cross(np.broadcast_to(e1, e2.shape), e2) @ n
        Lz = -bimp * crossn
        # disk frame axes for azimuth
        ax = np.array([1.0, 0, 0]); ax = ax - (ax @ n) * n; ax /= np.linalg.norm(ax); ay = np.cross(n, ax)
        for k in range(3):
            phk = phic + k * math.pi
            hit = phk < phi_end
            u = lookup_u(T, ia, phk); r = 1.0 / np.maximum(u, 1e-6)
            hit &= (r >= r_in) & (r <= r_out)
            if not hit.any(): continue
            pos = r[..., None] * (np.cos(phk)[..., None] * e1 + np.sin(phk)[..., None] * e2)
            az = np.arctan2(pos @ ay, pos @ ax)
            Om = r ** -1.5
            g = np.sqrt(np.clip(1 - 3 / r, 1e-4, 1)) / np.maximum(1 + Om * Lz, 0.05)
            x = r_in / r
            temp = (x ** 0.75) * np.clip(1 - np.sqrt(x), 0, 1) ** 0.25 / 0.488      # peak ~1 near r ~ 8M
            turb = disk_noise(r, az - Om * t * 9.0)
            dens = np.clip(0.5 + 0.55 * turb, 0.02, 1.8) ** 1.4 * np.clip((r_out - r) / 9, 0, 1) * np.clip((r - r_in) / 0.6, 0, 1)
            tg = temp * g
            col = blackbody_rgb(tg * 0.72)
            I = (g ** 3.5) * (temp ** 3 * 1.6 + 0.05) * dens * disk_gain * disk_on * 2.2
            opac = np.clip(dens * 1.1, 0, 0.985) * hit
            out += (trans * opac)[..., None] * col * I[..., None] * hit[..., None]
            trans *= (1 - opac)
    # escaped rays: final direction
    esc = ~captured
    pf = phi_end
    dfin = np.cos(pf)[..., None] * e1 + np.sin(pf)[..., None] * e2
    skyc = sky.sample(dfin) * (esc & True)[..., None]
    out += trans[..., None] * skyc
    if ss > 1: out = out.reshape(H, ss, W, ss, 3).mean((1, 3))
    return out

def tonemap(lin, exposure=1.0):
    x = lin * exposure
    y = x / (1 + x) * 1.12           # gentle shoulder; keeps hot inner disk near white without clipping colours to grey
    y = np.clip(y, 0, 1) ** (1 / 2.2)
    return (y * 255 + 0.5).astype(np.uint8)

def bloom(lin, strength=0.16):
    """Soft glow around the brightest light: float Gaussian blur at three scales on a 1/4-size copy."""
    from scipy.ndimage import gaussian_filter, zoom
    bright = np.clip(lin - 1.0, 0, None)
    small = bright[::4, ::4]; acc = np.zeros_like(small)
    for sig in (2, 6, 14): acc += gaussian_filter(small, (sig, sig, 0))
    up = zoom(acc, (lin.shape[0] / acc.shape[0], lin.shape[1] / acc.shape[1], 1), order=1)
    return lin + up * strength
