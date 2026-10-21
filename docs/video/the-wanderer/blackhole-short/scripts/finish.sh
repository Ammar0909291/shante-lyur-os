#!/usr/bin/env bash
# Finish the short end-to-end; every step resumes after a container restart. Run detached:
#   setsid nohup scripts/finish.sh > renders/finish.log 2>&1 < /dev/null &
cd "$(dirname "$0")/.."
set -e
# 1. Blender shots (skips frames already on disk)
pgrep -f "blender -b scene/black_hole_blender" >/dev/null || scripts/render_blender.sh
while pgrep -f "blender -b scene/black_hole_blender" >/dev/null; do sleep 20; done
# 2. base frames: wait for any running workers, refresh the real-image scene (layout changed), then fill every gap
while pgrep -f "render_frames.py" >/dev/null; do sleep 20; done
[ -f renders/.eht_v2 ] || { for n in $(seq 991 1170); do rm -f renders/base/b_$(printf %04d $n).png; done; touch renders/.eht_v2; }
for w in 0 1 2 3; do python3 scripts/render_frames.py $w 4 > renders/base2_w$w.log 2>&1 & done; wait
N=$(ls renders/base/b_*.png | grep -vc tmp); echo "base frames: $N"; [ "$N" -eq 1800 ]
# 3. graphics
for w in 0 1 2 3; do python3 scripts/compose.py $w 4 > renders/comp_w$w.log 2>&1 & done; wait
N=$(ls renders/final/F_*.png | wc -l); echo "final frames: $N"; [ "$N" -eq 1800 ]
# 4. audio: narration lines at their times + score, -14 LUFS
python3 - <<'EOF'
import json, wave, array
nar = json.load(open("audio/narration.json")); SR = 48000; out = array.array("h", bytes(2 * SR * 60))
for c in nar:
    with wave.open(f"audio/lines/l{c['i']:02d}.wav") as w: a = array.array("h", w.readframes(w.getnframes()))
    s = int(c["t0"] * SR); a = a[: len(out) - s]; out[s:s + len(a)] = a
with wave.open("audio/narration.wav", "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
EOF
ffmpeg -loglevel error -y -i audio/music.wav -i audio/narration.wav -filter_complex \
  "[0:a]volume=0.55[m];[1:a]pan=stereo|c0=c0|c1=c0[n];[m][n]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=9,atrim=0:60" -ar 48000 audio/mix.wav
# 5. encode: 1080x1920, 30 fps, exactly 1800 frames / 60 s
mkdir -p output
ffmpeg -loglevel error -y -framerate 30 -i renders/final/F_%04d.png -i audio/mix.wav -map 0:v -map 1:a -frames:v 1800 \
  -c:v libx264 -preset slow -crf 18 -profile:v high -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -t 60 -movflags +faststart output/the_wanderer_black_hole_short.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames:format=duration,size -of compact output/the_wanderer_black_hole_short.mp4
echo SHORT_DONE
# 6. then continue the long video's 4K build
cd ../maya && [ -x run4k.sh ] && setsid nohup ./run4k.sh > out4k_make.log 2>&1 < /dev/null &
echo MAYA_4K_STARTED
