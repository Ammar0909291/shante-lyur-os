"""Base picture for every frame of the short (no text). Black-hole shots come from the GR renderer, scenes 2 and 11 from Blender,
scene 7 is the real EHT image. Writes renders/base/b_NNNN.png; existing frames are skipped (safe to re-run after a restart).
python3 scripts/render_frames.py <worker> <n_workers> [first last]"""
import sys, os, math, numpy as np
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent)); import gr_render as G
H = Path(__file__).resolve().parent.parent; OUT = H / "renders" / "base"; OUT.mkdir(parents=True, exist_ok=True)
W, Hh, FPS = 1080, 1920, 30
Image.MAX_IMAGE_PIXELS = None
ease = lambda x: 0.5 - 0.5 * math.cos(math.pi * min(1, max(0, x)))
lerp = lambda a, b, x: a + (b - a) * x

def cam_at(r, az, el):
    a, e = math.radians(az), math.radians(el)
    return (r * math.cos(e) * math.sin(a), -r * math.cos(e) * math.cos(a), r * math.sin(e))

# scene table: (start s, end s, kind)
SCENES = [(0, 4, "gr"), (4, 9.2, "blender"), (9.2, 14, "gr"), (14, 20, "gr"), (20, 27, "gr"), (27, 33, "gr"), (33, 39, "eht"),
          (39, 45, "gr"), (45, 50, "gr"), (50, 56, "gr"), (56, 60.01, "blender")]

def shot(t):
    """camera (r, az, el, fov), disk_on, sky name, jets for film time t (black-hole scenes)."""
    if t < 4:            # 1: rush in from deep space
        x = ease(t / 4) ** 0.6; r = math.exp(lerp(math.log(2500), math.log(78), x))
        return dict(r=r, az=-12 + 6 * x, el=6, fov=26, disk=1, sky="main")
    if t < 14:           # 3: the new black hole; the disk forms from the debris
        x = (t - 9.2) / 4.8
        return dict(r=lerp(95, 72, ease(x)), az=lerp(-30, 25, x), el=lerp(10, 7, x), fov=28, disk=ease((t - 9.6) / 3.2), sky="main")
    if t < 20:           # 4: disk + event horizon, closer
        x = (t - 14) / 6
        return dict(r=lerp(62, 52, ease(x)), az=lerp(25, 60, x), el=lerp(5, 4, x), fov=30, disk=1, sky="main")
    if t < 27:           # 5: lensing of a background galaxy: look from above the disk while the galaxy passes behind
        x = (t - 20) / 7
        return dict(r=lerp(70, 64, x), az=lerp(70, 130, x), el=lerp(38, 28, x), fov=30, disk=0.85, sky="galaxy")
    if t < 33:           # 6: background for the time-dilation comparison
        x = (t - 27) / 6
        return dict(r=lerp(58, 54, x), az=lerp(150, 175, x), el=9, fov=30, disk=1, sky="main")
    if t < 45:           # 8: jets along the spin axis
        x = (t - 39) / 6
        return dict(r=lerp(150, 125, ease(x)), az=lerp(200, 230, x), el=lerp(22, 16, x), fov=34, disk=1, sky="main", jets=1)
    if t < 50:           # 9: pull back, the black hole becomes a small luminous point
        x = ease((t - 45) / 5)
        return dict(r=math.exp(lerp(math.log(110), math.log(2200), x)), az=lerp(230, 250, x), el=lerp(14, 20, x), fov=30, disk=1, sky="main")
    # 10: silhouette against the bright centre of the Milky Way (real ESO panorama)
    x = (t - 50) / 6
    return dict(r=lerp(260, 200, ease(x)), az=lerp(-4, 3, x), el=lerp(2.5, 1.5, x), fov=26, disk=0.45, sky="main")

SKY = {}
def sky(name):
    if name not in SKY:
        if name == "main": SKY[name] = G.Sky(str(H / "assets" / "milkyway_eso0932a.jpg"), gain=0.35)
        else:  # the M51 galaxy placed behind the black hole as seen during scene 5
            SKY[name] = G.Sky(str(H / "assets" / "milkyway_eso0932a.jpg"), gain=0.3, extra=(str(H / "assets" / "m51_heic0506a.jpg"), -100, -33, 30))
    return SKY[name]

def jets(cam, fw, rt, up, fov, t):
    """Illustrative relativistic jets along the spin axis (straight-ray volume march; lensing of the jets is ignored)."""
    f = 0.5 * Hh / math.tan(math.radians(fov) / 2)
    ys, xs = np.mgrid[0:Hh:2, 0:W:2].astype(np.float32)          # half resolution, upsampled (the jets are soft)
    d = fw + ((xs - W / 2) / f)[..., None] * rt + (-(ys - Hh / 2) / f)[..., None] * up; d /= np.linalg.norm(d, axis=-1, keepdims=True)
    r0 = np.linalg.norm(cam); acc = np.zeros(d.shape[:2], np.float32)
    for s in np.linspace(max(1, r0 - 110), r0 + 110, 56):
        p = cam + d * s; z = np.abs(p[..., 2]); rho = np.hypot(p[..., 0], p[..., 1])
        width = 0.9 + 0.09 * z
        core = np.exp(-(rho / width) ** 2) * np.clip((z - 4) / 6, 0, 1) * np.exp(-z / 70)
        knots = 0.85 + 0.15 * np.sin(z * 0.35 - t * 9.0 * np.sign(p[..., 2]))
        acc += core * knots
    acc *= 220 / 56 * 0.02
    from scipy.ndimage import zoom, gaussian_filter
    a = zoom(gaussian_filter(acc, 1.5), (Hh / acc.shape[0], W / acc.shape[1]), order=1)
    return a[..., None] * np.array([0.5, 0.75, 1.25], np.float32) * 1.8

def gr_frame(t):
    s = shot(t); cam = np.array(cam_at(s["r"], s["az"], s["el"])); look = np.zeros(3)
    img = G.render(cam, look, (0, 0, 1), s["fov"], W, Hh, t=t, sky=sky(s["sky"]), disk_on=s["disk"], tilt=(0.0, 0.0))
    if s.get("jets"):
        fw = -cam / np.linalg.norm(cam); rt = np.cross(fw, (0, 0, 1)); rt /= np.linalg.norm(rt); up = np.cross(rt, fw)
        ramp = min(1, (t - 39) / 1.2, (45 - t) / 0.6)
        img = img + jets(cam, fw, rt, up, s["fov"], t) * max(0, ramp)
    return G.tonemap(G.bloom(img), 1.35)

EHT = None
def eht_frame(t):
    """Scene 7: the real Event Horizon Telescope image of M87* (EHT Collaboration, CC BY 4.0) on black, slow push-in."""
    global EHT
    if EHT is None:
        im = Image.open(H / "assets" / "m87_eht_eso1907a.jpg").convert("RGB")
        side = min(im.size); EHT = im.crop(((im.width - side) // 2, (im.height - side) // 2, (im.width + side) // 2, (im.height + side) // 2))
    x = (t - 33) / 6; z = lerp(0.74, 0.8, x); size = int(W * z)
    pic = EHT.resize((size, size), Image.LANCZOS); can = Image.new("RGB", (W, Hh), (0, 0, 0))
    can.paste(pic, ((W - size) // 2, int(Hh * 0.41 - size / 2)))
    return np.asarray(can)

def base(n):
    t = (n - 1) / FPS
    kind = next(k for a, b, k in SCENES if a <= t < b)
    if kind == "gr": return gr_frame(t)
    if kind == "eht": return eht_frame(t)
    p = H / "renders" / "blender" / f"f_{n:04d}.png"
    if not p.exists() or p.stat().st_size == 0: return None
    im = Image.open(p).convert("RGB")
    if im.size != (W, Hh): im = im.resize((W, Hh), Image.LANCZOS)      # half-resolution Blender frames
    return np.asarray(im)

if __name__ == "__main__":
    wk, nw = int(sys.argv[1]), int(sys.argv[2])
    a, b = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (1, 1800)
    for n in range(a + wk, b + 1, nw):
        out = OUT / f"b_{n:04d}.png"
        if out.exists(): continue
        img = base(n)
        if img is None: continue                      # Blender frame not rendered yet; re-run later
        tmp = out.with_suffix(".tmp.png"); Image.fromarray(img).save(tmp); os.replace(tmp, out)
        print("ok", n, flush=True)
