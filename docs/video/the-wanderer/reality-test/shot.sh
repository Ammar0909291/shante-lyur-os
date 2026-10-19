#!/usr/bin/env bash
# usage: shot.sh t1 t2 ...   -> test/fT.png (960 px wide) for each film time
cd "$(dirname "$0")"; export NODE_PATH="$(npm root -g)" CAP_W=1920 CAP_H=1080 CAP_DPR=1 OUT_W=1920 OUT_H=1080
mkdir -p test; V=../video
for t in "$@"; do node $V/capture.js "$PWD/site" $t $(python3 -c "print($t+0.05)") 20 "$PWD/test/f$t.mp4" webgl 2>&1 | grep -iv "frames\|done in" & done; wait
for t in "$@"; do ffmpeg -loglevel error -y -i test/f$t.mp4 -frames:v 1 -vf scale=960:-1 test/f$t.png; done
