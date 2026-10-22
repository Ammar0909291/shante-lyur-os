"""LAP RACE reel compositor (2160x3840, 30 fps, 30 s). Globe shots come from site/globe.js (renders/globe_a.mp4 0-6 s,
renders/globe_b.mp4 24-30 s); 6-24 s is a three-band split screen built from the owner's AI images:
London (top), New Delhi (middle), Singapore (bottom). Every runner moves at the same pace (10 km/h = 240 km/day);
the race clock maps 12-24 s to day 0-167. python3 compose.py prep | python3 compose.py <worker> <n> | still <t> <out>"""
import sys, math, numpy as np, cv2
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
H = Path(__file__).resolve().parent; A = H.parent / "assets" / "lap_runners"; C = A / "cache"
W, HH, FPS, T = 2160, 3840, 30, 30.0
BAND = HH // 3
FONT = "/usr/share/fonts/opentype/inter/"
F = lambda w, s: ImageFont.truetype(FONT + {"xb": "Inter-ExtraBold.otf", "b": "Inter-Bold.otf", "sb": "Inter-SemiBold.otf"}[w], s)
KM_DAY = 240.0
# key, name, latitude label, lap km (WGS-84), colour
RUN = [("ld", "LONDON", "51.5°N", 25000, (255, 255, 255)), ("dl", "NEW DELHI", "28.6°N", 35210, (255, 166, 58)), ("sg", "SINGAPORE", "1.3°N", 40065, (62, 230, 208))]
DAY_END = 40065 / KM_DAY
day_at = lambda t: max(0.0, (t - 12.0) / 12.0 * DAY_END)
t_fin = lambda km: 12.0 + 12.0 * (km / KM_DAY) / DAY_END
sst = lambda a, b, x: (lambda u: u * u * (3 - 2 * u))(min(1.0, max(0.0, (x - a) / (b - a))))

def grade(img):
    """Hot sunrise grade: warmer highlights, a touch more contrast and saturation."""
    a = img.astype(np.float32) / 255
    a = a * np.array([1.06, 1.0, 0.92]); l = a.mean(-1, keepdims=True); a = l + (a - l) * 1.12
    a = np.clip((a - 0.02) / 0.98, 0, 1); a = a + (a * a * (3 - 2 * a) - a) * 0.25
    return (np.clip(a, 0, 1) * 255).astype(np.uint8)

def cover(im, w, h, z=1.0, fx=0.5, fy=0.5):
    """Crop-to-fill: scale image to cover (w,h) times zoom z, centred at fractions (fx, fy)."""
    s = max(w / im.width, h / im.height) * z; iw, ih = int(im.width * s), int(im.height * s)
    r = im.resize((iw, ih), Image.LANCZOS); x = int((iw - w) * fx); y = int((ih - h) * fy)
    return r.crop((x, y, x + w, y + h))

def prep():
    """Inpaint the runner out of each running photo (for a moving background) and scale everything once."""
    from rembg import remove, new_session
    C.mkdir(exist_ok=True); s = new_session("isnet-general-use")
    for k, *_ in RUN:
        run = Image.open(A / "up" / f"{k}_run.png").convert("RGB")
        # fill the runner's hole with real background from the start and finish images (same scene), inpaint only what's left
        def mask(im): return cv2.dilate((np.asarray(remove(im, session=s, only_mask=True)) > 40).astype(np.uint8), np.ones((31, 31), np.uint8)) > 0
        bg = np.asarray(run).copy(); hole = mask(run)
        for other in ("start", "finish"):
            im = Image.open(A / "up" / f"{k}_{other}.png").convert("RGB")
            if im.size != run.size: im = im.resize(run.size, Image.LANCZOS)
            ok = hole & ~mask(im); bg[ok] = np.asarray(im)[ok]; hole &= ~ok
        bg = cv2.inpaint(bg[..., ::-1].copy(), hole.astype(np.uint8) * 255, 15, cv2.INPAINT_TELEA)[..., ::-1]
        Image.fromarray(grade(bg)).save(C / f"{k}_bg.png")
        ys, xs = np.nonzero(np.asarray(remove(run, session=s, only_mask=True)) > 128)
        np.save(C / f"{k}_box.npy", np.array([xs.min(), ys.min(), xs.max(), ys.max(), run.width, run.height]))
        for p in ("start", "finish"): Image.fromarray(grade(np.asarray(Image.open(A / "up" / f"{k}_{p}.png").convert("RGB")))).save(C / f"{k}_{p}.png")
        print("prepped", k, flush=True)

CACHE = {}
def load():
    if CACHE: return CACHE
    for k, *_ in RUN:
        CACHE[k + "_bg"] = Image.open(C / f"{k}_bg.png"); CACHE[k + "_box"] = np.load(C / f"{k}_box.npy")
        for p in ("start", "finish"): CACHE[k + "_" + p] = Image.open(C / f"{k}_{p}.png")
        cyc = []
        for i in range(8):
            f = Image.open(A / f"cycle_{k}" / f"f{i}.png"); f = f.crop(f.getbbox()); cyc.append(f)
        CACHE[k + "_cyc"] = cyc
    return CACHE

def text(d, xy, s, font, fill, anchor="la", stroke=6):
    d.text(xy, s, font=font, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(0, 0, 0))

def band(k, name, lat, km, col, t):
    c = load(); tf = t_fin(km); img = None
    if t < 12:                                                    # start pose, slow push-in, light breathing sway
        img = cover(c[k + "_start"], W, BAND, 1.02 + 0.03 * sst(6, 12, t), 0.25 + 0.01 * math.sin(t * 1.3), 0.6)
    elif t < tf:                                                  # running: real stride from the run cycle, placed over the original runner
        bg = c[k + "_bg"]; x0b, y0b, x1b, y1b, bw, bh = c[k + "_box"]
        z = 1.02 + 0.02 * math.sin((t - 12) * 0.5); fx, fy = 0.25 + 0.006 * math.sin((t - 12) * 0.7), 0.6
        sc = max(W / bw, BAND / bh) * z; ox, oy = (bw * sc - W) * fx, (bh * sc - BAND) * fy
        img = cover(bg, W, BAND, z, fx, fy).copy()
        cyc = c[k + "_cyc"]; f = cyc[int(t * 11) % 8]
        tall = (y1b - y0b) * sc; s2 = tall / max(g.height for g in cyc); fr = f.resize((int(f.width * s2), int(f.height * s2)), Image.LANCZOS)
        cx = (x0b + x1b) / 2 * sc - ox; feet = y1b * sc - oy
        sh = Image.new("L", img.size, 0); ImageDraw.Draw(sh).ellipse((int(cx - 0.32 * tall), int(feet - 25), int(cx + 0.32 * tall), int(feet + 30)), fill=110)
        img = Image.composite(Image.new("RGB", img.size, (20, 12, 8)), img, sh.filter(ImageFilter.GaussianBlur(22)))
        img.paste(fr, (int(cx - fr.width / 2), int(feet - fr.height)), fr)
    else:                                                         # finished: celebration, push-in, flash
        img = cover(c[k + "_finish"], W, BAND, 1.02 + 0.06 * sst(tf, tf + 4, t), 0.25, 0.6)
        fl = max(0.0, 1 - (t - tf) / 0.35)
        if fl > 0: img = Image.blend(img, Image.new("RGB", img.size, (255, 250, 235)), fl * 0.85)
    img = img.convert("RGBA"); ov = Image.new("RGBA", img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    # legibility gradients top and bottom of the band
    gr = Image.new("L", (1, BAND)); gp = gr.load()
    for y in range(BAND): gp[0, y] = int(150 * max(0, 1 - y / 360) + 170 * max(0, (y - BAND + 300) / 300))
    img.alpha_composite(Image.merge("RGBA", (Image.new("L", img.size, 0),) * 3 + (gr.resize(img.size),)))
    text(d, (140, 70), name, F("xb", 120), col + (255,))
    text(d, (140, 215), f"{lat}  ·  lap ≈ {km:,} km", F("sb", 66), (240, 240, 240, 255), stroke=5)
    # progress bar: same km/day for everyone, different lap length
    frac = min(1.0, day_at(t) * KM_DAY / km) if t >= 12 else 0.0
    x0, x1, y0, y1 = 140, W - 140, BAND - 120, BAND - 78
    d.rounded_rectangle((x0, y0, x1, y1), radius=21, fill=(0, 0, 0, 150), outline=(255, 255, 255, 90), width=3)
    if frac > 0: d.rounded_rectangle((x0, y0, x0 + int((x1 - x0) * frac), y1), radius=21, fill=col + (255,))
    if t >= tf: text(d, (W - 140, 70), f"DAY {round(km / KM_DAY)}", F("xb", 120), col + (255,), anchor="ra")
    if k == "ld" and t >= tf: text(d, (W - 140, 215), "WINNER", F("xb", 96), (255, 210, 60, 255), anchor="ra")
    img.alpha_composite(ov); return img.convert("RGB")

GLOBE = {}
def globe_frame(t):
    seg, t0 = ("a", 0.0) if t < 12 else ("b", 24.0)
    if seg not in GLOBE: GLOBE[seg] = cv2.VideoCapture(str(H / "renders" / f"globe_{seg}.mp4"))
    cap = GLOBE[seg]; cap.set(cv2.CAP_PROP_POS_FRAMES, min(179, int(round((t - t0) * FPS)))); ok, fr = cap.read()
    return Image.fromarray(fr[..., ::-1]) if ok else Image.new("RGB", (W, HH))

def centre(d, y, s, font, fill=(255, 255, 255), stroke=8):
    d.text((W // 2, y), s, font=font, fill=fill, anchor="ma", stroke_width=stroke, stroke_fill=(0, 0, 0))

def frame(n):
    t = n / FPS
    if t < 6 or t >= 24:
        img = globe_frame(t); d = ImageDraw.Draw(img)
        if t < 3.1:
            a = sst(0.2, 0.8, t); centre(d, 520, "3 runners. Same speed.", F("xb", 150), (int(255 * a),) * 3)
            centre(d, 720, "Who finishes a lap of Earth first?", F("b", 96), (int(255 * a), int(210 * a), int(60 * a)))
        elif t < 6:
            centre(d, 560, "Each runs EAST along", F("xb", 120)); centre(d, 720, "their own line of latitude", F("xb", 120))
        elif t < 27.8:
            centre(d, 560, "Closer to the poles →", F("xb", 112)); centre(d, 710, "smaller circle → shorter lap", F("xb", 112), (255, 210, 60))
            centre(d, 3020, "Same speed + shorter track = first to finish", F("b", 76))
        else:
            centre(d, 560, "Which city would YOU run from?", F("xb", 112), (255, 210, 60))
            centre(d, 2960, "Thought experiment: imaginary laps,", F("sb", 70)); centre(d, 3060, "measured on the ground", F("sb", 70))
    else:
        img = Image.new("RGB", (W, HH))
        for i, r in enumerate(RUN): img.paste(band(*r, t), (0, i * BAND))
        d = ImageDraw.Draw(img)
        for i in (1, 2): d.rectangle((0, i * BAND - 5, W, i * BAND + 5), fill=(0, 0, 0))
        if 9.0 <= t < 12.0:                                       # the trap: spin speeds, then dismissed
            box = Image.new("RGBA", (W, 760), (0, 0, 0, 175)); img.paste(box, (0, HH // 2 - 380), box); d = ImageDraw.Draw(img)
            centre(d, HH // 2 - 320, "Earth's spin carries them at", F("b", 80))
            centre(d, HH // 2 - 200, "1,042  /  1,470  /  1,674 km/h…", F("xb", 104), (255, 210, 60))
            if t >= 10.4:
                a = sst(10.4, 10.9, t); y = HH // 2 - 140; d.line((260, y, 260 + int((W - 520) * a), y), fill=(255, 60, 60), width=14)
                centre(d, HH // 2 + 20, "…but on the ground, everyone", F("b", 86)); centre(d, HH // 2 + 140, "runs at the same 10 km/h", F("xb", 104), (62, 230, 208))
        if 12.0 <= t < 24.0:                                      # race clock
            box = Image.new("RGBA", (900, 240), (0, 0, 0, 185)); img.paste(box, (W // 2 - 450, BAND - 120), box); d = ImageDraw.Draw(img)
            centre(d, BAND - 105, f"DAY {int(day_at(t))}", F("xb", 120), (255, 210, 60), stroke=6)
            if t < 13.5: centre(d, BAND + 40, "GO!  Same pace: 10 km/h, non-stop", F("b", 70))
    # light flash on the cuts between the globe and the split screen
    if 6.0 <= t < 6.35: img = Image.blend(Image.new("RGB", img.size, (255, 245, 230)), img, sst(6.0, 6.35, t) * 0.7 + 0.3)
    if 24.0 <= t < 24.35: img = Image.blend(Image.new("RGB", img.size, (255, 245, 230)), img, sst(24.0, 24.35, t) * 0.7 + 0.3)
    a = np.asarray(img).astype(np.float32); a = a * (1 - sst(29.3, 30.0, t)) + np.random.default_rng(n).normal(0, 2.0, (HH, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

if __name__ == "__main__":
    if sys.argv[1] == "prep": prep(); sys.exit()
    if sys.argv[1] == "still": frame(int(float(sys.argv[2]) * FPS)).save(sys.argv[3]); sys.exit()
    wk, nw = int(sys.argv[1]), int(sys.argv[2]); out = H / "renders" / "frames"; out.mkdir(parents=True, exist_ok=True)
    for n in range(wk, int(T * FPS), nw):
        p = out / f"f_{n:04d}.png"
        if not p.exists(): frame(n).save(str(p) + ".tmp.png", compress_level=1); Path(str(p) + ".tmp.png").rename(p)
