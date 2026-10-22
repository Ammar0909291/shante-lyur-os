# Smooth run cycle: 8 drawn frames -> 24 by optical-flow in-betweening (OpenCV DIS), written as site/tex/run/{k}_c{0..23}.png.
# usage: python3 tween.py   (reads the gitignored ../assets/lap_runners/cycle_{k}/f0-f7.png)
import cv2, numpy as np
from pathlib import Path
H = Path(__file__).parent; SRC = H.parent / "assets" / "lap_runners"; OUT = H / "site" / "tex" / "run"; OUT.mkdir(parents=True, exist_ok=True)
N, SUB, TALL = 8, 3, 640
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
def gray(im): a = im[..., 3:4] / 255.0; return np.ascontiguousarray((cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2GRAY)[..., None] * a)[..., 0].astype(np.uint8))
def warp(im, flow, s):
    h, w = flow.shape[:2]; gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    return cv2.remap(im, gx - s * flow[..., 0], gy - s * flow[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
def premul(im): f = im.astype(np.float32); f[..., :3] *= f[..., 3:4] / 255; return f
def unpremul(f): a = np.clip(f[..., 3:4], 1e-3, 255); o = f.copy(); o[..., :3] = f[..., :3] * 255 / a; o[..., 3:4] = f[..., 3:4]; return np.clip(o, 0, 255).astype(np.uint8)
for k in ["sg", "dl", "ld"]:
    fr = [cv2.imread(str(SRC / f"cycle_{k}" / f"f{i}.png"), cv2.IMREAD_UNCHANGED) for i in range(N)]
    ys, xs = np.where(np.max([f[..., 3] for f in fr], axis=0) > 8); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    fr = [f[y0:y1, x0:x1] for f in fr]; i = 0
    for n in range(N):
        A, B = fr[n], fr[(n + 1) % N]; gA, gB = gray(A), gray(B)
        fb = lambda a, b: cv2.calcOpticalFlowFarneback(a, b, None, 0.5, 6, 41, 8, 7, 1.5, cv2.OPTFLOW_FARNEBACK_GAUSSIAN)
        fab, fba = fb(gA, gB), fb(gB, gA); pA, pB = premul(A), premul(B)
        for s in range(SUB):
            t = s / SUB
            f = pA if s == 0 else (warp(pA, fab, t) if t < 0.5 else warp(pB, fba, 1 - t))   # warp the nearer drawing only: crisp limbs, no double image
            im = unpremul(f); h, w = im.shape[:2]; im = cv2.resize(im, (round(w * TALL / h), TALL), interpolation=cv2.INTER_AREA)
            cv2.imwrite(str(OUT / f"{k}_c{i}.png"), im); i += 1
    print(k, i, "frames")
