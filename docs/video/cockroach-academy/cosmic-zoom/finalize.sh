#!/usr/bin/env bash
# Silent master for Instagram (the owner adds licensed music from Instagram's library when posting).
cd "$(dirname "$0")"; set -e; mkdir -p output
ffmpeg -loglevel error -y -i renders/picture.mp4 -an -c:v libx264 -preset slow -crf 17 -profile:v high -pix_fmt yuv420p -r 30 -movflags +faststart output/cosmic_zoom.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration,size -of compact output/cosmic_zoom.mp4
