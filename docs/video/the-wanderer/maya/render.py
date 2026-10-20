"""Picture for MAYA YA SIMULATION: stills with slow camera moves, cross-dissolves, grade, grain and all text overlays.
Everything is a pure function of film time t.  python3 render.py <start> <end> <out.mp4>   (or: python3 render.py still <t> <out.png>)"""
import json, sys, math, subprocess, functools
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
H = Path(__file__).resolve().parent; sys.path.insert(0, str(H)); import script as S
TL = json.loads((H / "timeline.json").read_text())
W, Hh, FPS, XF = 1920, 1080, 24, 0.9          # frame size, frame rate, cross-dissolve seconds
Image.MAX_IMAGE_PIXELS = None
FD = "/root/.fonts/"
F = lambda name, size: ImageFont.truetype(FD + name, size, layout_engine=ImageFont.Layout.RAQM)
DEV, DEVB, SERIF = "NotoDeva-Medium.ttf", "NotoDeva-Bold.ttf", "Cormorant-SemiBold.ttf"
AMBER = (242, 180, 90)

# ---------- pictures ----------
@functools.lru_cache(maxsize=12)
def still(fn):
    im = Image.open(H / "images" / fn).convert("RGB")
    k = max(W * 1.3 / im.width, Hh * 1.3 / im.height)          # cover the frame with 30% headroom for moves
    return im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)

@functools.lru_cache(maxsize=1)
def video_frames(fn):
    p = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(H / "images" / fn), "-vf", f"fps={FPS},scale={W}:{Hh}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(p, np.uint8).reshape(-1, Hh, W, 3)

ease = lambda x: 0.5 - 0.5 * math.cos(math.pi * min(1, max(0, x)))
MOVES = {"in": ((1.0, 0, 0), (1.13, 0, 0)), "out": ((1.13, 0, 0), (1.0, 0, 0)), "r": ((1.1, -0.35, 0), (1.1, 0.35, 0)),
         "l": ((1.1, 0.35, 0), (1.1, -0.35, 0)), "up": ((1.12, 0, 0.35), (1.12, 0, -0.35))}
CYCLE = {"in": ["in", "r", "out", "l"], "out": ["out", "l", "in", "r"], "r": ["r", "in", "l", "out"], "l": ["l", "out", "r", "in"], "up": ["up", "in", "out", "r"]}

def parts(seg):
    """Long shots are split into ~11 s camera moves on the same picture (a new angle each time)."""
    d = seg["t1"] - seg["t0"]; n = max(1, round(d / 11.5)); L = d / n
    mv = S.SHOTS[seg["shot"]][1]
    return [(seg["t0"] + k * L, seg["t0"] + (k + 1) * L, CYCLE.get(mv, [mv])[k % len(CYCLE.get(mv, [mv]))]) for k in range(n)]

PARTS = [(p0, p1, mv, s["shot"]) for s in TL["segs"] for (p0, p1, mv) in parts(s)]

def render_part(p, t):
    p0, p1, mv, shot = p
    fn = S.SHOTS[shot][0]
    if fn is None: return np.zeros((Hh, W, 3), np.float32)
    x = ease((t - p0 + XF / 2) / (p1 - p0 + XF))
    if mv == "video":
        fr = video_frames(fn); a = fr[int((t - p0) * FPS) % len(fr)]
        z = 1.0 + 0.06 * x; im = Image.fromarray(a)
        cw, ch = W / z, Hh / z; box = ((W - cw) / 2, (Hh - ch) / 2, (W + cw) / 2, (Hh + ch) / 2)
        return np.asarray(im.resize((W, Hh), Image.BICUBIC, box=box), np.float32)
    im = still(fn); (z0, x0, y0), (z1, x1, y1) = MOVES[mv]
    z, px, py = z0 + (z1 - z0) * x, x0 + (x1 - x0) * x, y0 + (y1 - y0) * x
    # the view is W/1.3/z wide inside the stored image; pan within the remaining margin
    vw, vh = im.width / 1.3 / z * (W * 1.3 / im.width * im.width / (W * 1.3)), 0
    sc = min(im.width / (W * 1.3), im.height / (Hh * 1.3))           # stored pixels per output pixel at z=1 / 1.3
    vw, vh = W * 1.3 * sc / 1.3 / z, Hh * 1.3 * sc / 1.3 / z
    cx = im.width / 2 + px * (im.width - vw) / 2; cy = im.height / 2 + py * (im.height - vh) / 2
    box = (cx - vw / 2, cy - vh / 2, cx + vw / 2, cy + vh / 2)
    return np.asarray(im.resize((W, Hh), Image.BICUBIC, box=box), np.float32)

def picture(t):
    out, wsum = None, 0.0
    for k, p in enumerate(PARTS):
        a, b = p[0] - XF / 2, p[1] + XF / 2
        if not (a <= t < b): continue
        w = min(1.0, (t - a) / XF) if k else 1.0
        w = min(w, (b - t) / XF) if k < len(PARTS) - 1 else w
        w = max(0.0, min(1.0, w))
        f = render_part(p, t)
        out = f * w if out is None else out + f * w; wsum += w
    if out is None: return np.zeros((Hh, W, 3), np.float32)
    return out / max(wsum, 1e-6)

# ---------- grade: gentle S-curve, warm highlights / cool shadows, vignette, fine grain ----------
_x = np.linspace(0, 1, 256)
_s = np.clip(_x + 0.10 * np.sin(2 * np.pi * (_x - 0.5)) * 0.5 * (1 - abs(2 * _x - 1)), 0, 1)
LUT = np.stack([np.clip(_s * 255 * (1 + 0.03 * _x), 0, 255), _s * 255, np.clip(_s * 255 * (1 - 0.04 * _x) + 6 * (1 - _x) ** 3, 0, 255)], 1).astype(np.float32)
yy, xx = np.mgrid[0:Hh, 0:W]; VIG = (1 - 0.32 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - Hh / 2) / (Hh / 2)) ** 2) ** 1.4).clip(0.55, 1)[..., None].astype(np.float32)
BAND = (1 - 0.55 * np.clip((yy - Hh * 0.62) / (Hh * 0.38), 0, 1) ** 1.3)[..., None].astype(np.float32)
GRAIN = [np.random.default_rng(k).normal(0, 3.2, (Hh, W, 1)).astype(np.float32) for k in range(6)]

def grade(f, t):
    i = np.clip(f, 0, 255).astype(np.uint8)
    g = np.stack([LUT[i[..., c], c] for c in range(3)], -1)
    return g * VIG * BAND + GRAIN[int(t * FPS) % 6]

# ---------- text ----------
def text_img(txt, font, fill=(255, 255, 255), shadow=True, stroke=0):
    d = ImageDraw.Draw(Image.new("L", (1, 1))); l, tp, r, b = d.textbbox((0, 0), txt, font=font, stroke_width=stroke)
    pad = 30; im = Image.new("RGBA", (r - l + 2 * pad, b - tp + 2 * pad), (0, 0, 0, 0)); dr = ImageDraw.Draw(im)
    if shadow:
        sh = Image.new("RGBA", im.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).text((pad - l + 2, pad - tp + 3), txt, font=font, fill=(0, 0, 0, 230), stroke_width=stroke + 2, stroke_fill=(0, 0, 0, 230))
        im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(5))); dr = ImageDraw.Draw(im)
    dr.text((pad - l, pad - tp), txt, font=font, fill=fill, stroke_width=stroke, stroke_fill=(0, 0, 0))
    return im

def wrap(txt, font, maxw):
    words, lines, cur = txt.split(), [], ""
    for w in words:
        c = (cur + " " + w).strip()
        if font.getlength(c) <= maxw or not cur: cur = c
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

SUBF = F(DEV, 44)
def sub_chunks(c):
    """Split a cue into subtitle pages (max 2 lines), timed by length."""
    sents = [s.strip() for s in __import__("re").split(r"(?<=[।?!])\s+", c["text"]) if s.strip()]
    pages, cur = [], []
    for s in sents:
        trial = " ".join(cur + [s])
        if cur and len(wrap(trial, SUBF, 1500)) > 2: pages.append(" ".join(cur)); cur = [s]
        else: cur.append(s)
    if cur: pages.append(" ".join(cur))
    out = []
    for p in pages:  # a single over-long sentence: split by lines
        ls = wrap(p, SUBF, 1500)
        out += [" ".join(ls[k:k + 2]) for k in range(0, len(ls), 2)]
    tot = sum(len(p) for p in out); t = c["t0"]; res = []
    for p in out:
        d = (c["t1"] - c["t0"]) * len(p) / tot; res.append((t, t + d, p)); t += d
    return res

SUBS = [s for c in TL["cues"] if c["text"] and c["ch"] not in ("title",) for s in sub_chunks(c)]
SUBS = [(a, b, p) for a, b, p in SUBS if not p.startswith("सिर्फ़ तीन सौ")]
def balanced(p):
    ls = wrap(p, SUBF, 1500)
    if len(ls) != 2: return ls
    w = p.split(); best = min(range(1, len(w)), key=lambda k: abs(SUBF.getlength(" ".join(w[:k])) - SUBF.getlength(" ".join(w[k:]))))
    return [" ".join(w[:best]), " ".join(w[best:])]
@functools.lru_cache(maxsize=64)
def sub_img(p):
    ls = balanced(p); ims = [text_img(l, SUBF) for l in ls]
    h = sum(i.height - 44 for i in ims) + 44; out = Image.new("RGBA", (max(i.width for i in ims), h), (0, 0, 0, 0)); y = 0
    for i in ims: out.alpha_composite(i, ((out.width - i.width) // 2, y)); y += i.height - 44
    return out

@functools.lru_cache(maxsize=None)
def chapter_img(cid):
    lab, title, tag = S.CHAPTERS[cid]
    a = text_img(lab, F(DEVB, 26), fill=AMBER); b = text_img(title, F(DEVB, 54))
    out = Image.new("RGBA", (max(a.width, b.width), a.height + b.height - 50), (0, 0, 0, 0)); out.alpha_composite(a, (0, 0)); out.alpha_composite(b, (0, a.height - 50))
    return out
@functools.lru_cache(maxsize=None)
def tag_img(tag): return text_img(tag, F(DEV, 26), fill=(230, 230, 230))
@functools.lru_cache(maxsize=None)
def name_img(n): return text_img(n, F(DEV, 30), fill=(240, 240, 240))
BRAND = text_img("THE WANDERER", ImageFont.truetype(FD + SERIF, 30), fill=(255, 255, 255), shadow=False)

def put(frame, img, x, y, alpha):
    if alpha <= 0.003: return
    if alpha < 1:
        a = img.getchannel("A").point(lambda v: v * alpha); img = img.copy(); img.putalpha(a)
    frame.alpha_composite(img, (int(x), int(y)))
fade = lambda t, a, b, f=0.5: max(0.0, min(1.0, (t - a) / f, (b - t) / f))

@functools.lru_cache(maxsize=None)
def big(txt, size, font=DEVB, fill=(255, 255, 255)): return text_img(txt, F(font, size), fill=fill)
def card_lines(txt, size, maxw):
    f = F(DEVB, size); ls = wrap(txt, f, maxw); return [big(l, size) for l in ls]

AVATAR = Image.open(H.parent / "brand" / "avatar_800x800.png").convert("RGBA").resize((300, 300), Image.LANCZOS)
_m = Image.new("L", (300, 300), 0); ImageDraw.Draw(_m).ellipse((0, 0, 299, 299), fill=255); AVATAR.putalpha(_m)

def subscribe_img(state):
    w, h = 250, 64; im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 32, fill=(204, 0, 0, 240) if state == 0 else (90, 90, 90, 235))
    f = F("NotoDeva-Bold.ttf", 26); txt = "SUBSCRIBE" if state == 0 else "SUBSCRIBED ✓"
    if state: f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    l, tp, r, b = d.textbbox((0, 0), txt, font=f); d.text(((w - (r - l)) / 2 - l, (h - (b - tp)) / 2 - tp), txt, font=f, fill="white")
    return im
SUB0, SUB1 = subscribe_img(0), subscribe_img(1)

def overlays(fr, t):
    q0, q1 = TL["questions"]; e0, e1 = TL["endcard"]
    # subtitles
    for a, b, p in SUBS:
        if a - 0.1 <= t < b + 0.15:
            im = sub_img(p); put(fr, im, (W - im.width) / 2, Hh - 92 - im.height + 22, fade(t, a - 0.1, b + 0.15, 0.12)); break
    # chapter card (top-left) and tag (top-right)
    for ch in TL["chapters"]:
        a = ch["t0"] - 0.4; b = a + 5.5
        if a <= t < b: put(fr, chapter_img(ch["id"]), 70, 50, fade(t, a, b, 0.7))
    cur = [c for c in TL["chapters"] if c["t0"] - 0.4 <= t]
    if cur and t < q0 - 0.5:
        tg = tag_img(S.CHAPTERS[cur[-1]["id"]][2]); put(fr, tg, W - tg.width - 50, 34, 0.85 * fade(t, cur[-1]["t0"] - 0.4, q0 - 0.5, 0.8))
    for n in TL["names"]:
        if n["t0"] <= t < n["t1"] + 0.4:
            im = name_img(n["text"]); al = fade(t, n["t0"], n["t1"] + 0.4, 0.4)
            ImageDraw.Draw(fr).rectangle((84, Hh - 300, 88, Hh - 254), fill=AMBER + (int(255 * al),)); put(fr, im, 70, Hh - 318, al)
    # title card
    a, b = TL["title"]
    if a - 0.3 <= t < b + 0.3:
        im = big(S.TITLE, 110); al = fade(t, a - 0.3, b + 0.3, 0.6)
        put(fr, im, (W - im.width) / 2, (Hh - im.height) / 2 - 30, al)
        tg = big("THE WANDERER", 30, SERIF, AMBER); put(fr, tg, (W - tg.width) / 2, Hh / 2 + 70, al)
    # 300
    a, b = TL["three"]
    if a <= t < b:
        im = big("300", 260, SERIF); put(fr, im, (W - im.width) / 2, (Hh - im.height) / 2 - 40, fade(t, a, b, 0.3))
        lab = big("सिर्फ़ तीन सौ कण", 44); put(fr, lab, (W - lab.width) / 2, Hh / 2 + 120, fade(t, a + 0.4, b, 0.3))
    # question cards
    if q0 <= t < q1:
        k = 0 if t < q0 + S.ENDQ / 2 else 1; a = q0 + k * S.ENDQ / 2; b = a + S.ENDQ / 2
        lab = big(f"सवाल {k + 1}", 30, DEVB, AMBER); ls = card_lines(S.QUESTIONS[k], 58, 1500); al = fade(t, a + 0.2, b - 0.1, 0.6)
        y = (Hh - sum(i.height - 50 for i in ls)) / 2 - 40; put(fr, lab, (W - lab.width) / 2, y - 70, al)
        for i in ls: put(fr, i, (W - i.width) / 2, y, al); y += i.height - 50
    # end card
    if t >= e0 - 0.5:
        al = fade(t, e0 - 0.5, e1 + 5, 0.8); put(fr, AVATAR, (W - 300) / 2, 200, al)
        tl = big("THE WANDERER", 72, SERIF); put(fr, tl, (W - tl.width) / 2, 520, al)
        tg = big("वास्तविकता को खोजो। धारणाओं पर सवाल करो। सबूतों का पीछा करो।", 34, DEV, (220, 220, 220)); put(fr, tg, (W - tg.width) / 2, 640, al)
        put(fr, SUB0 if t < e0 + 3 else SUB1, (W - 250) / 2, 760, al)
    # subscribe reminder at each minute mark, and the brand mark
    m = int(t // 60)
    if 1 <= m <= 9 and m * 60 <= t < m * 60 + 4.5 and t < q0:
        put(fr, SUB0 if t < m * 60 + 2.2 else SUB1, W - 300, Hh - 250, fade(t, m * 60, m * 60 + 4.5, 0.3))
    if t < q0: put(fr, BRAND, W - BRAND.width - 30, Hh - BRAND.height - 14, 0.35)

def frame(t):
    pic = grade(picture(t), t)
    fr = Image.fromarray(np.clip(pic, 0, 255).astype(np.uint8)).convert("RGBA")
    overlays(fr, t)
    return fr.convert("RGB")

if __name__ == "__main__":
    if sys.argv[1] == "still":
        frame(float(sys.argv[2])).save(sys.argv[3]); sys.exit()
    a, b, out = float(sys.argv[1]), float(sys.argv[2]), sys.argv[3]
    n0, n1 = round(a * FPS), round(min(b, TL["total"]) * FPS)
    ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{Hh}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for n in range(n0, n1): ff.stdin.write(frame(n / FPS).tobytes())
    ff.stdin.close(); ff.wait(); print("done", out, n1 - n0, "frames")
