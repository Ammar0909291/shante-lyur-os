#!/usr/bin/env bash
# Render the 30 s reel in three parallel chunks with the repo's frame-exact capture tool, then join them.
# Chunks already on disk are kept, so the script can be re-run after a container restart.
cd "$(dirname "$0")"; set -e
python3 build.py
CAP=../../the-wanderer/reality-test/tools/capture.js; mkdir -p renders
for c in "0 10" "10 20" "20 30"; do set -- $c; f=renders/chunk_$1.mp4
  [ -s "$f" ] || CAP_W=540 CAP_H=960 CAP_DPR=2 OUT_W=1080 OUT_H=1920 node $CAP site $1 $2 30 $f webgl > renders/chunk_$1.log 2>&1 &
done; wait
printf "file 'chunk_0.mp4'\nfile 'chunk_10.mp4'\nfile 'chunk_20.mp4'\n" > renders/chunks.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i renders/chunks.txt -c copy renders/picture.mp4
ffprobe -v error -count_frames -show_entries stream=nb_read_frames,width,height -of compact renders/picture.mp4
echo PICTURE_DONE
