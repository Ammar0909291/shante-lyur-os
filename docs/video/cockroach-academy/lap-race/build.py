"""Copies the shared helpers (Reality Test lib.js) and the real imagery into site/ so the page can be rendered."""
import shutil
from pathlib import Path
H = Path(__file__).resolve().parent; S = H / "site"; A = H.parent / "assets"; (S / "tex").mkdir(exist_ok=True)
shutil.copy(H.parents[1] / "the-wanderer" / "reality-test" / "site" / "lib.js", S / "lib.js")
for f in ("earth_day.jpg", "earth_night.jpg", "earth_clouds.jpg", "milkyway.jpg"): shutil.copy(A / f, S / "tex" / f)
print("ok")
