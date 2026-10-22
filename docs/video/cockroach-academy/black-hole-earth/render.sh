#!/usr/bin/env bash
# Render all 900 frames with 4 workers (finished frames are skipped, so it resumes after a restart), then encode the silent master.
cd "$(dirname "$0")"; set -e; mkdir -p renders output
for w in 0 1 2 3; do python3 render.py $w 4 > renders/w$w.log 2>&1 & done; wait
N=$(ls renders/frames/f_*.png | grep -vc tmp); echo "frames: $N"; [ "$N" -eq 900 ]
ffmpeg -loglevel error -y -framerate 30 -i renders/frames/f_%04d.png -an -c:v libx264 -preset slow -crf 17 -profile:v high -pix_fmt yuv420p -r 30 -movflags +faststart output/black_hole_earth.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration,size -of compact output/black_hole_earth.mp4
