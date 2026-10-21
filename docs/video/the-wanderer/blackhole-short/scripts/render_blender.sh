#!/usr/bin/env bash
# Render the Blender shots (scene 2: frames 121-277, scene 11: 1681-1800). Resumable: existing frames are skipped.
cd "$(dirname "$0")/.."
blender -b scene/black_hole_blender.blend -s 121 -e 277 -a
blender -b scene/black_hole_blender.blend -s 1681 -e 1800 -a
echo BLENDER_DONE
