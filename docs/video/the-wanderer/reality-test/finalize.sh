#!/usr/bin/env bash
# Join all chunks, re-time the picture to the exact film length (chunks round to whole frames), mix audio, encode the master.
set -e; cd "$(dirname "$0")"
T=$(python3 -c "import json;print(json.load(open('timeline.json'))['total'])")
ffmpeg -loglevel error -y -f concat -safe 0 -i out/list.txt -c copy out/video.mp4
DV=$(ffprobe -v error -show_entries format=duration -of csv=p=0 out/video.mp4)
K=$(python3 -c "print($T/$DV)"); echo "video $DV s -> $T s (x$K)"
ffmpeg -loglevel error -y -i out/video.mp4 -i audio/music.wav -i audio/narration.wav -filter_complex \
  "[0:v]setpts=PTS*$K,fps=24[v];[1:a]volume=2.2[m];[2:a]pan=stereo|c0=c0|c1=c0[n];[m][n]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11,atrim=0:$T[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 16 -profile:v high -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t $T out/The-Reality-Test_1080p.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 out/The-Reality-Test_1080p.mp4
