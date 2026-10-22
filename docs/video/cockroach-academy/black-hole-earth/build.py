"""Builds site/index.html: shared helpers from the Reality Test film (lib.js); real imagery copied from ../assets into site/tex."""
import json, shutil
from pathlib import Path
H = Path(__file__).resolve().parent; S = H / "site"; A = H.parent / "assets"; (S / "tex").mkdir(exist_ok=True)
shutil.copy(H.parents[1] / "the-wanderer" / "reality-test" / "site" / "lib.js", S / "lib.js")
for f in ("earth_day.jpg", "earth_night.jpg", "earth_clouds.jpg", "milkyway.jpg", "rock.jpg"): shutil.copy(A / f, S / "tex" / f)
TL = {"total": 30.0}
(S / "index.html").write_text((S / "template.html").read_text().replace("__TL__", json.dumps(TL)))
print("ok", TL["total"])
