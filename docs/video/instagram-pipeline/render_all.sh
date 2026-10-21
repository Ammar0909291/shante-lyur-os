#!/bin/bash
# Renders 4 chunks (2 at a time, resumable), joins them, muxes the soundtrack. Output: out/EarthStop_v5_1080x1920.mp4
cd "$(dirname "$0")"; export NODE_PATH=/opt/node22/lib/node_modules; mkdir -p chunks out
R() { local i=$1 a=$2 b=$3; [ -s chunks/c$i.mp4 ] && return; PRESET=slow CRF=16 node tools/capture2.js "$PWD/site" $a $b 30 chunks/c$i.part.mp4 && mv chunks/c$i.part.mp4 chunks/c$i.mp4; }
R 0 0 14.9 & R 1 14.9 29.8 & wait
R 2 29.8 44.7 & R 3 44.7 59.6 & wait
for i in 0 1 2 3; do [ -s chunks/c$i.mp4 ] || { echo "missing chunk $i"; exit 1; }; echo "file 'c$i.mp4'"; done > chunks/list.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i chunks/list.txt -c copy chunks/video.mp4
./mix.sh >/dev/null
ffmpeg -loglevel error -y -i chunks/video.mp4 -i audio/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest out/EarthStop_v5_1080x1920.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of csv=p=0 out/EarthStop_v5_1080x1920.mp4
ls -la out/
echo RENDER_DONE
