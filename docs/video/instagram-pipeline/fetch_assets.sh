#!/bin/bash
# Downloads everything the pipeline needs that is NOT in git (textures, fonts, three.js, the Hindi Piper voice).
# Licences/credits: NASA Visible Earth and NASA SVS imagery (credit NASA), ESO Milky Way panorama (CC BY 4.0, credit ESO/S. Brunier),
# Noto Sans Devanagari and IBM Plex Mono (SIL OFL), three.js r128 (MIT), Piper voice hi_IN-rohan-medium (IndicTTS, IIT Madras; credit it).
set -e; cd "$(dirname "$0")"; mkdir -p site/tex site/fonts site/vendor voice audio audio2/narr audio2/clause out chunks
get() { for i in 1 2 3 4; do curl -sSL -m 600 -o "$1" "$2" && [ -s "$1" ] && return 0; sleep $((i*4)); done; echo "FAILED: $2" >&2; return 1; }
get site/tex/earth_clouds.jpg "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg"
get site/tex/milkyway.jpg     "https://cdn.eso.org/images/large/eso0932a.jpg"
get site/tex/moon.jpg         "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg"
get site/tex/moon_bump.jpg    "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_3_8bit.jpg"
# Earth day/night: download the big originals, then resize to 8192x4096 (WebGL-safe)
bash ./fetch_hi_textures.sh || true
python3 - <<'PY'
from PIL import Image; Image.MAX_IMAGE_PIXELS = None
for src, dst in (("tex_hi/day_hi.jpg", "site/tex/earth_day_8k.jpg"), ("tex_hi/night_hi.jpg", "site/tex/earth_night_8k.jpg")):
    Image.open(src).convert("RGB").resize((8192, 4096), Image.LANCZOS).save(dst, quality=94); print("ok", dst)
PY
get site/fonts/NotoSansDevanagari.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth%2Cwght%5D.ttf"
get site/fonts/IBMPlexMono-Medium.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/IBMPlexMono-Medium.ttf"
( cd /tmp && npm pack three@0.128.0 --silent && tar -xzf three-0.128.0.tgz package/build/three.min.js ) && cp /tmp/package/build/three.min.js site/vendor/three.min.js
for f in hi_IN-rohan-medium.onnx hi_IN-rohan-medium.onnx.json; do get voice/$f "https://huggingface.co/rhasspy/piper-voices/resolve/main/hi/hi_IN/rohan/medium/$f"; done
echo "Assets ready. Put the owner's supplied images in site/imgs/ (see README), then follow the run steps."
