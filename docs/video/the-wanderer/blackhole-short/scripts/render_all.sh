#!/usr/bin/env bash
# Resumable: base frames (GR + EHT now, Blender frames picked up as they appear), 3 workers.
cd "$(dirname "$0")/.."
for w in 0 1 2; do python3 scripts/render_frames.py $w 3 > renders/base_w$w.log 2>&1 & done; wait
echo BASE_PASS_DONE
