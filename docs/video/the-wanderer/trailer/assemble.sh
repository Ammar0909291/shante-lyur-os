#!/bin/bash
# 9 clips (54 s) + 6 s black base for the end card, Hindi overlay track, score + narration mix.
set -e; cd "$(dirname "$0")"; mkdir -p out
in=(); f=""; for i in $(seq 0 8); do in+=(-i clips/s$i.mp4); f+="[$i:v]setpts=PTS-STARTPTS,fps=24,format=yuv420p[v$i];"; done
f+="color=black:s=1920x1080:r=24:d=6,format=yuv420p[vb];"
f+="$(for i in $(seq 0 8); do printf '[v%d]' $i; done)[vb]concat=n=10:v=1:a=0,fade=in:st=0:d=0.6[base];"
f+="[base][9:v]overlay=0:0:format=auto,format=yuv420p[v];"
f+="[10:a]volume=2.2[m];[m][11:a]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]"
ffmpeg -y -v error -stats "${in[@]}" -framerate 24 -i ov/f%04d.png -i music.wav -i narration.wav -filter_complex "$f" -map "[v]" -map "[a]" -t 60 \
  -c:v libx264 -preset slow -crf 16 -profile:v high -pix_fmt yuv420p -r 24 -c:a aac -b:a 320k -movflags +faststart out/The-Wanderer_Trailer_Hindi_1080p.mp4
