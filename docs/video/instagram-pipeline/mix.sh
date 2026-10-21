#!/bin/bash
# voice + music (ducked under the voice) + sfx -> mix.wav at -14 LUFS, 58 s
cd "$(dirname "$0")"
ffmpeg -loglevel error -y -i audio/voice.wav -i audio/music.wav -i audio/sfx.wav -filter_complex "[1:a]volume=1.0[m];[2:a]volume=0.8[s];[0:a]asplit=2[v][vc];[m][vc]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=500[md];[v]pan=stereo|c0=c0|c1=c0[vs];[vs][md][s]amix=inputs=3:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5:LRA=9,atrim=0:59.6" -ar 48000 -ac 2 audio/mix.wav
ffmpeg -hide_banner -nostats -i audio/mix.wav -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|LRA|Peak):" | tail -3
