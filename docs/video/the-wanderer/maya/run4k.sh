#!/usr/bin/env bash
# resumable: upscale any still not yet in images_4k (4x Real-ESRGAN), then build the 4K parts
cd "$(dirname "$0")"
for f in images/*.png; do
  case "$f" in *_B.png|*09_gamer_A.png) continue;; esac
  b=images_4k/$(basename "$f")
  grep -q "^ok $f$" out/up4k.log 2>/dev/null && [ -s "$b" ] && continue
  rm -f "$b"; python3 ~/vw/up/compact.py images_4k "$f" >> out/up4k.log 2>&1
done
./make4k.sh
