#!/usr/bin/env bash
# Render the Blender shots (scene 2: frames 121-277, scene 11: 1681-1800) at half resolution, 16 samples + denoise
# (soft, glowing subjects; upscaled to 1080x1920 in render_frames.py). Resumable: existing frames are skipped.
cd "$(dirname "$0")/.."
FAST="import bpy; s = bpy.context.scene; s.render.resolution_percentage = 50; s.cycles.samples = 16"
blender -b scene/black_hole_blender.blend --python-expr "$FAST" -s 121 -e 277 -a
blender -b scene/black_hole_blender.blend --python-expr "$FAST" -s 1681 -e 1800 -a
echo BLENDER_DONE
