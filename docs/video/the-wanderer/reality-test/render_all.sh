#!/usr/bin/env bash
# Render THE REALITY TEST in 12 chunks (2 at a time), then concat and mix. Detached; writes out/progress.log
cd "$(dirname "$0")"; export NODE_PATH="$(npm root -g)" CAP_W=1920 CAP_H=1080 CAP_DPR=1 OUT_W=1920 OUT_H=1080
TOTAL=$(python3 -c "import json;print(json.load(open('timeline.json'))['total'])")
N=54; rm -f out/list.txt
python3 - "$TOTAL" "$N" > out/spans.txt <<'PY'
import sys; T=float(sys.argv[1]); n=int(sys.argv[2]); step=T/n
for i in range(n): print(i, round(i*step,3), round(min(T,(i+1)*step),3))
PY
run() { local i=$1 a=$2 b=$3; [ -s out/c$i.mp4 ] && return; echo "$(date +%T) start c$i $a-$b" >> out/progress.log
  node tools/capture.js "$PWD/site" $a $b 24 "$PWD/out/c$i.tmp.mp4" webgl >> out/c$i.log 2>&1 && mv out/c$i.tmp.mp4 out/c$i.mp4; echo "$(date +%T) end c$i $(ls -s out/c$i.mp4 2>/dev/null)" >> out/progress.log; }
while read i a b; do echo "file 'c$i.mp4'" >> out/list.txt; done < out/spans.txt
paste -d' ' - - < out/spans.txt | while read i1 a1 b1 i2 a2 b2; do run $i1 $a1 $b1 & [ -n "$i2" ] && run $i2 $a2 $b2 & wait; done
ffmpeg -loglevel error -y -f concat -safe 0 -i out/list.txt -c copy out/video.mp4
ffmpeg -loglevel error -y -i out/video.mp4 -i audio/music.wav -i audio/narration.wav -filter_complex \
  "[1:a]volume=2.2[m];[2:a]pan=stereo|c0=c0|c1=c0[v];[m][v]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest out/The-Reality-Test_1080p.mp4
echo "$(date +%T) DONE $(ffprobe -v error -show_entries format=duration -of csv=p=0 out/The-Reality-Test_1080p.mp4)" >> out/progress.log
touch out/ALL_DONE
