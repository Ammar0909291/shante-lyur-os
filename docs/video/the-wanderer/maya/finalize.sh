#!/usr/bin/env bash
# Join picture chunks, mix voice + music, loudness-normalise to -14 LUFS / -1.5 dBTP, encode the 1080p master.
set -e; cd "$(dirname "$0")"
T=$(python3 -c "import json;print(json.load(open('timeline.json'))['total'])")
printf "file 'c%d.mp4'\n" 0 1 2 3 > out/list.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i out/list.txt -c copy out/video.mp4
ffmpeg -loglevel error -y -i out/video.mp4 -i audio/music.wav -i audio/narration.wav -filter_complex \
  "[1:a]volume=2.4[m];[2:a]pan=stereo|c0=c0|c1=c0[n];[m][n]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5:LRA=11,atrim=0:$T[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 17 -profile:v high -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t $T out/Maya-ya-Simulation_1080p.mp4
ffprobe -v error -show_entries format=duration,size -of csv=p=0 out/Maya-ya-Simulation_1080p.mp4
