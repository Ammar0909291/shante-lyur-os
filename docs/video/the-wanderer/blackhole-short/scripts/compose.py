"""Graphics pass: captions, titles, EVENT HORIZON marker, time-dilation clocks, M87* credit, subscribe prompts, end card.
Reads renders/base/b_NNNN.png, writes renders/final/F_NNNN.png. python3 scripts/compose.py <worker> <n_workers> | still <frame> <out>
Safe area for Shorts/Reels (1080x1920): keep text between y=230 and y=1560, x=60..960."""
import sys, os, json, math, functools, numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, str(Path(__file__).parent))
H = Path(__file__).resolve().parent.parent; W, Hh, FPS = 1080, 1920, 30
FD = "/root/.fonts/"; INTER = "/usr/share/fonts/opentype/inter/"
def F(path, size): return ImageFont.truetype(path, size, layout_engine=ImageFont.Layout.RAQM)
DEV, DEVB = FD + "NotoDeva-Medium.ttf", FD + "NotoDeva-Bold.ttf"
SERIF, INB, INM = FD + "Cormorant-SemiBold.ttf", INTER + "Inter-Bold.otf", INTER + "Inter-Medium.otf"
AMBER = (242, 180, 90)
NAR = json.loads((H / "audio" / "narration.json").read_text())
fade = lambda t, a, b, f=0.35: max(0.0, min(1.0, (t - a) / f, (b - t) / f))
ease = lambda x: 0.5 - 0.5 * math.cos(math.pi * min(1, max(0, x)))

@functools.lru_cache(maxsize=256)
def text(txt, path, size, fill=(255, 255, 255), track=0, shadow=True):
    f = F(path, size); d = ImageDraw.Draw(Image.new("L", (1, 1)))
    if track:  # letter-spaced Latin caps
        widths = [f.getlength(c) for c in txt]; tw = int(sum(widths) + track * (len(txt) - 1)); l, tp, r, b = d.textbbox((0, 0), "HÁgy", font=f)
    else:
        l, tp, r, b = d.textbbox((0, 0), txt, font=f); tw = r - l
    pad = 24; im = Image.new("RGBA", (tw + 2 * pad, b - tp + 2 * pad), (0, 0, 0, 0))
    def draw(dr, off, col):
        if track:
            x = pad + off[0]
            for c, wdt in zip(txt, widths): dr.text((x, pad - tp + off[1]), c, font=f, fill=col); x += wdt + track
        else: dr.text((pad - l + off[0], pad - tp + off[1]), txt, font=f, fill=col)
    if shadow:
        sh = Image.new("RGBA", im.size, (0, 0, 0, 0)); draw(ImageDraw.Draw(sh), (0, 3), (0, 0, 0, 220)); im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(6)))
    draw(ImageDraw.Draw(im), (0, 0), fill); return im

def put(fr, im, x, y, a):
    if a <= 0.003: return
    if a < 1: im = im.copy(); im.putalpha(im.getchannel("A").point(lambda v: v * a))
    fr.alpha_composite(im, (int(x), int(y)))
def center(fr, im, y, a): put(fr, im, (W - im.width) / 2, y, a)

def wrap(txt, path, size, maxw):
    f = F(path, size); words, lines, cur = txt.split(), [], ""
    for w in words:
        c = (cur + " " + w).strip()
        if f.getlength(c) <= maxw or not cur: cur = c
        else: lines.append(cur); cur = w
    lines.append(cur)
    if len(lines) == 2:  # balance two lines
        ws = txt.split(); k = min(range(1, len(ws)), key=lambda k: abs(f.getlength(" ".join(ws[:k])) - f.getlength(" ".join(ws[k:])))); lines = [" ".join(ws[:k]), " ".join(ws[k:])]
    return lines

# ---------- icons (simple vector-style marks, kept small and undistorted) ----------
def yt_icon(h=64):
    s = 4; w2 = int(h * 1.42); im = Image.new("RGBA", (w2 * s, h * s), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w2 * s - 1, h * s - 1), radius=int(h * s * 0.28), fill=(255, 0, 0, 255))
    cx, cy, r = w2 * s / 2, h * s / 2, h * s * 0.24
    d.polygon([(cx - r * 0.8, cy - r), (cx - r * 0.8, cy + r), (cx + r * 1.0, cy)], fill=(255, 255, 255, 255))
    return im.resize((w2, h), Image.LANCZOS)
def ig_icon(h=64):
    s = 4; n = h * s; g = np.zeros((n, n, 4), np.uint8); yy, xx = np.mgrid[0:n, 0:n] / n
    t = np.clip((xx * 0.6 + (1 - yy) * 0.8) / 1.4, 0, 1)[..., None]
    c0, c1, c2 = np.array([254, 218, 117]), np.array([214, 41, 118]), np.array([79, 91, 213])
    col = np.where(t < 0.5, c0 + (c1 - c0) * (t / 0.5), c1 + (c2 - c1) * ((t - 0.5) / 0.5))
    g[..., :3] = col; g[..., 3] = 255; im = Image.fromarray(g, "RGBA")
    m = Image.new("L", (n, n), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, n - 1, n - 1), radius=int(n * 0.26), fill=255); im.putalpha(m)
    d = ImageDraw.Draw(im); lw = int(n * 0.075); p = n * 0.2
    d.rounded_rectangle((p, p, n - p, n - p), radius=int(n * 0.17), outline="white", width=lw)
    d.ellipse((n * 0.35, n * 0.35, n * 0.65, n * 0.65), outline="white", width=lw); d.ellipse((n * 0.66, n * 0.27, n * 0.74, n * 0.35), fill="white")
    return im.resize((h, h), Image.LANCZOS)
YT, IG = yt_icon(), ig_icon()

def subscribe_card(t, t0, instagram=False):
    """Pill with icon(s) + SUBSCRIBE TO CHANNEL; slides up and fades, ~1.8 s."""
    a = fade(t, t0, t0 + 1.9, 0.3)
    if a <= 0: return None, 0, 0
    lab = text("SUBSCRIBE TO CHANNEL", INB, 30, track=2, shadow=False)
    icons = [YT] + ([IG] if instagram else []); iw = sum(i.width for i in icons) + 14 * (len(icons) - 1)
    w2, h2 = iw + lab.width + 40, 92; card = Image.new("RGBA", (w2, h2), (0, 0, 0, 0)); d = ImageDraw.Draw(card)
    d.rounded_rectangle((0, 0, w2 - 1, h2 - 1), radius=46, fill=(12, 12, 16, 205), outline=(255, 255, 255, 60), width=2)
    x = 26
    for i in icons: card.alpha_composite(i, (x, (h2 - i.height) // 2)); x += i.width + 14
    card.alpha_composite(lab, (x - 10, (h2 - lab.height) // 2))
    # a click: the pill briefly flashes at 0.8 s
    if t0 + 0.75 < t < t0 + 1.0: card = Image.blend(card, Image.new("RGBA", card.size, (255, 255, 255, 0)), 0) ; d = ImageDraw.Draw(card); d.rounded_rectangle((2, 2, w2 - 3, h2 - 3), radius=44, outline=(255, 70, 70, 255), width=4)
    dy = (1 - ease((t - t0) / 0.35)) * 30
    return card, a, dy

def captions(fr, t):
    for c in NAR:
        if c["t0"] - 0.05 <= t < c["t1"] + 0.25:
            ls = wrap(c["text"], DEVB, 46, 900); y = 1450 - 66 * len(ls)
            for l in ls: im = text(l, DEVB, 46); center(fr, im, y, fade(t, c["t0"] - 0.05, c["t1"] + 0.25, 0.12)); y += 66
            return

def tag(fr, t):
    if t < 4 or 9.2 <= t < 33 or 39 <= t < 56: s = "SCIENTIFIC VISUALISATION · GR RAY-TRACED"
    elif 4 <= t < 9.2: s = "ILLUSTRATION"
    elif 33 <= t < 39: s = "REAL OBSERVATION"
    else: return
    im = text(s, INM, 22, (225, 225, 225), track=2); put(fr, im, 60, 236, 0.75)

def horizon_marker(fr, t):
    """Dashed circle at the shadow edge + label (scene 4)."""
    a = fade(t, 15.0, 19.6, 0.5)
    if a <= 0: return
    from render_frames import shot
    s = shot(t); f = 0.5 * Hh / math.tan(math.radians(s["fov"]) / 2)
    rr = f * math.tan(math.asin(min(1, 3 * math.sqrt(3) / s["r"] * math.sqrt(1 - 2 / s["r"]))))   # apparent shadow radius
    cx, cy = W / 2, Hh / 2; d = ImageDraw.Draw(fr); n = 72
    for k in range(n):
        if k % 2: continue
        a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 0.6) / n
        d.line([(cx + rr * math.cos(a0), cy + rr * math.sin(a0)), (cx + rr * math.cos(a1), cy + rr * math.sin(a1))], fill=(255, 255, 255, int(200 * a)), width=3)
    lab = text("EVENT HORIZON", INB, 44, track=6); put(fr, lab, (W - lab.width) / 2, cy - rr - 150, a)
    sub = text("घटना क्षितिज की छाया", DEV, 32, (230, 230, 230)); put(fr, sub, (W - sub.width) / 2, cy - rr - 98, a * 0.9)

def clock(size, ang_sec, ang_min, label, sub):
    s = 3; n = size * s; im = Image.new("RGBA", (n, n + 0), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((4, 4, n - 4, n - 4), fill=(10, 12, 18, 200), outline=(255, 255, 255, 230), width=3 * s)
    c = n / 2
    for k in range(60):
        a = math.radians(k * 6); r1 = c * (0.84 if k % 5 else 0.76); r2 = c * 0.9
        d.line([(c + r1 * math.sin(a), c - r1 * math.cos(a)), (c + r2 * math.sin(a), c - r2 * math.cos(a))], fill=(255, 255, 255, 220), width=(3 if k % 5 else 6) * s // 2)
    for ang, L, wd, col in ((ang_min, 0.62, 6, (255, 255, 255, 255)), (ang_sec, 0.8, 3, AMBER + (255,))):
        a = math.radians(ang); d.line([(c, c), (c + c * L * math.sin(a), c - c * L * math.cos(a))], fill=col, width=wd * s)
    d.ellipse((c - 6 * s, c - 6 * s, c + 6 * s, c + 6 * s), fill=AMBER + (255,))
    im = im.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size + 480, size), (0, 0, 0, 0)); out.alpha_composite(im, (0, 0))
    l1 = text(label, DEVB, 40); l2 = text(sub, INM, 22, (210, 210, 210), track=2); out.alpha_composite(l1, (size + 10, size // 2 - 60)); out.alpha_composite(l2, (size + 16, size // 2 + 2))
    return out

def time_dilation(fr, t):
    a = fade(t, 27.3, 33.0, 0.5)
    if a <= 0: return
    # darken the lower half (far away), divider line
    ov = Image.new("RGBA", (W, Hh), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    d.rectangle((0, Hh // 2, W, Hh), fill=(0, 0, 0, int(170 * a))); d.line([(60, Hh // 2), (W - 60, Hh // 2)], fill=(255, 255, 255, int(120 * a)), width=2)
    fr.alpha_composite(ov)
    el = t - 27.3; far = el * 60 * 1.0; near = el * 60 * 0.45          # illustrative ratio, not a measurement
    put(fr, clock(230, near, near / 12, "ब्लैक होल के पास", "NEAR THE BLACK HOLE"), 90, 420, a)
    put(fr, clock(230, far, far / 12, "बहुत दूर", "FAR AWAY"), 90, Hh // 2 + 120, a)
    note = text("दूर बैठे पर्यवेक्षक के अनुसार  ·  उदाहरण, पैमाने पर नहीं", DEV, 26, (215, 215, 215)); center(fr, note, Hh // 2 - 64, a * 0.9)

def m87(fr, t):
    a = fade(t, 33.4, 38.9, 0.5)
    if a <= 0: return
    l1 = text("M87*  ·  EVENT HORIZON TELESCOPE  ·  2019", INB, 34, track=2); center(fr, l1, 300, a)
    l2 = text("अंधेरी छाया के चारों ओर गर्म गैस की चमक", DEV, 34, (235, 235, 235)); center(fr, l2, 360, a)
    l3 = text("Image: EHT Collaboration (CC BY 4.0)", INM, 24, (200, 200, 200)); center(fr, l3, 1150, a * 0.9)

def hook(fr, t):
    a = fade(t, 0.5, 3.9, 0.4)
    if a > 0: center(fr, text("LIGHT CANNOT ESCAPE", INB, 64, track=8), 330, a)

AVATAR = Image.open(H.parent / "brand" / "avatar_800x800.png").convert("RGBA").resize((260, 260), Image.LANCZOS)
_m = Image.new("L", (260, 260), 0); ImageDraw.Draw(_m).ellipse((0, 0, 259, 259), fill=255); AVATAR.putalpha(_m)
def endcard(fr, t):
    a = fade(t, 57.0, 61, 0.7)
    if a <= 0: return
    ov = Image.new("RGBA", (W, Hh), (0, 0, 0, int(150 * a))); fr.alpha_composite(ov)
    put(fr, AVATAR, (W - 260) / 2, 560, a)
    center(fr, text("THE WANDERER", SERIF, 96, track=4), 860, a)
    center(fr, text("EXPLORE THE UNKNOWN", INB, 34, AMBER, track=8), 990, a)
    lab = text("SUBSCRIBE FOR MORE", INB, 32, track=3, shadow=False); cw = 110 + lab.width + 20
    sub = fade(t, 58.0, 61, 0.5); card = Image.new("RGBA", (cw, 88), (0, 0, 0, 0)); d = ImageDraw.Draw(card)
    d.rounded_rectangle((0, 0, cw - 1, 87), radius=44, fill=(204, 0, 0, 235))
    card.alpha_composite(YT.resize((70, 49)), (34, 20)); card.alpha_composite(lab, (110, (88 - lab.height) // 2))
    put(fr, card, (W - cw) / 2, 1100, sub)
    put(fr, IG, (W - 64) / 2, 1215, sub * 0.9)

def transitions(arr, t):
    """flash after the collapse, dips to black around the real image and the end."""
    x = arr.astype(np.float32)
    if 9.2 <= t < 9.75: k = 1 - (t - 9.2) / 0.55; x = x + (255 - x) * k ** 2
    for c, dur in ((4.0, 0.25), (33.0, 0.35), (39.0, 0.35), (56.0, 0.35), (45.0, 0.2)):
        if abs(t - c) < dur: x *= abs(t - c) / dur
    if t < 0.4: x *= t / 0.4
    return np.clip(x, 0, 255).astype(np.uint8)

def compose(n):
    t = (n - 1) / FPS
    base = np.asarray(Image.open(H / "renders" / "base" / f"b_{n:04d}.png").convert("RGB"))
    fr = Image.fromarray(transitions(base, t)).convert("RGBA")
    hook(fr, t); tag(fr, t); horizon_marker(fr, t); time_dilation(fr, t); m87(fr, t); endcard(fr, t)
    for t0, ig in ((19.0, False), (48.9, False), (54.9, True)):
        card, a, dy = subscribe_card(t, t0, ig)
        if card is not None: put(fr, card, (W - card.width) / 2, 1130 + dy, a)
    if t < 57.0: captions(fr, t)
    return fr.convert("RGB")

if __name__ == "__main__":
    if sys.argv[1] == "still": compose(int(sys.argv[2])).save(sys.argv[3]); sys.exit()
    wk, nw = int(sys.argv[1]), int(sys.argv[2]); out = H / "renders" / "final"; out.mkdir(exist_ok=True)
    for n in range(1 + wk, 1801, nw):
        p = out / f"F_{n:04d}.png"; b = H / "renders" / "base" / f"b_{n:04d}.png"
        if p.exists() or not b.exists(): continue
        compose(n).save(p); print("ok", n, flush=True)
