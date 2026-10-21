#!/usr/bin/env bash
# 4K master in 5 parts. Each part is rendered as two halves (10 jobs, 4 at a time), then joined and muxed with its slice of the
# final mix. Video is never re-encoded after rendering. Run detached: setsid nohup ./make4k.sh > out4k/make.log 2>&1 &
set -e; cd "$(dirname "$0")"; mkdir -p out4k
T=$(python3 -c "import json;print(json.load(open('timeline.json'))['total'])")
N=$(python3 -c "print(round($T*24))")
# frame boundaries: 5 parts, each split in 2
B=($(python3 -c "n=$N;print(' '.join(str(n*k//10) for k in range(11)))"))
jobs=()
for k in $(seq 0 9); do
  [ -s out4k/h$k.mp4 ] && grep -q done out4k/h$k.log 2>/dev/null && continue
  jobs+=("K=2 python3 render.py $(python3 -c "print(${B[$k]}/24)") $(python3 -c "print(${B[$((k+1))]}/24)") out4k/h$k.mp4 > out4k/h$k.log 2>&1")
done
printf '%s\n' "${jobs[@]}" | xargs -P 4 -I{} bash -c '{}'
# full mix (voice + music), -14 LUFS
ffmpeg -loglevel error -y -i audio/music.wav -i audio/narration.wav -filter_complex \
  "[0:a]volume=2.4[m];[1:a]pan=stereo|c0=c0|c1=c0[n];[m][n]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5:LRA=11,atrim=0:$T" \
  -ar 48000 out4k/mix.wav
for p in 1 2 3 4 5; do
  a=$((2*(p-1))); b=$((a+1)); s=${B[$a]}; e=${B[$((b+1))]}
  printf "file 'h%d.mp4'\nfile 'h%d.mp4'\n" $a $b > out4k/l$p.txt
  ffmpeg -loglevel error -y -f concat -safe 0 -i out4k/l$p.txt -c copy out4k/v$p.mp4
  ffmpeg -loglevel error -y -i out4k/v$p.mp4 -ss $(python3 -c "print($s/24)") -t $(python3 -c "print(($e-$s)/24)") -i out4k/mix.wav \
    -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -movflags +faststart out4k/Maya-ya-Simulation_4K_part$p.mp4
done
printf "file 'Maya-ya-Simulation_4K_part%d.mp4'\n" 1 2 3 4 5 > out4k/lall.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i out4k/lall.txt -c copy -movflags +faststart out4k/Maya-ya-Simulation_4K.mp4
ls -la out4k/Maya*; echo ALLDONE
