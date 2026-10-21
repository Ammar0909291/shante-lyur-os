#!/usr/bin/env bash
# Narration at its cue times + score (ducked under the voice), two-pass loudnorm to -14 LUFS, muxed onto the rendered picture.
cd "$(dirname "$0")"; set -e
python3 - <<'PY'
import json, wave, array
nar = json.load(open("audio/narration.json")); SR = 48000; N = SR * 36; out = array.array("h", bytes(2 * N))
for c in nar:
    with wave.open(f"audio/lines/l{c['i']:02d}.wav") as w: a = array.array("h", w.readframes(w.getnframes()))
    s = int(c["t0"] * SR); a = a[: N - s]; out[s:s + len(a)] = a
with wave.open("audio/narration.wav", "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
PY
MIX="[1:a]pan=stereo|c0=c0|c1=c0,asplit[n][sc];[0:a]volume=0.8[m];[m][sc]sidechaincompress=threshold=0.03:ratio=5:attack=40:release=600[md];[md][n]amix=inputs=2:normalize=0:duration=first"
M=$(ffmpeg -hide_banner -i audio/music.wav -i audio/narration.wav -filter_complex "$MIX,loudnorm=I=-14:TP=-1:LRA=9:print_format=json" -f null - 2>&1 | python3 -c "import sys,json,re; d=json.loads(re.search(r'\{[^{}]*\}', sys.stdin.read()).group()); print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
ffmpeg -loglevel error -y -i audio/music.wav -i audio/narration.wav -filter_complex "$MIX,loudnorm=I=-14:TP=-1:LRA=9:$M:linear=true,atrim=0:36" -ar 48000 audio/mix.wav
mkdir -p output
ffmpeg -loglevel error -y -i renders/picture.mp4 -i audio/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 17 -profile:v high -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -t 36 -movflags +faststart output/cockroach_academy_saturn_rings.mp4
ffmpeg -hide_banner -i output/cockroach_academy_saturn_rings.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|Peak:)" | tail -2
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration,size -of compact output/cockroach_academy_saturn_rings.mp4
