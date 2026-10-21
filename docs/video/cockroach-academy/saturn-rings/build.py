"""Builds site/index.html: shared helpers come from the Reality Test film (lib.js), loop length from TL."""
import json, shutil
from pathlib import Path
H = Path(__file__).resolve().parent; S = H / "site"
shutil.copy(H.parents[1] / "the-wanderer" / "reality-test" / "site" / "lib.js", S / "lib.js")
TL = {"total": 36.0}
(S / "index.html").write_text((S / "template.html").read_text().replace("__TL__", json.dumps(TL, ensure_ascii=False)))
print("ok", TL["total"])
