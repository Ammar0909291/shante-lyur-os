# English voice-over for the lap race (Piper en_US-joe-medium, CC0), timed to the on-screen beats.
# usage: python3 voiceover.py   -> vo/*.wav, renders/vo.wav, output/lap_race_4k_vo.mp4
import subprocess, wave
from pathlib import Path
H = Path(__file__).parent; V = H / "vo"; V.mkdir(exist_ok=True)
MODEL = "/root/vw/voices/en_US-joe-medium.onnx"
LINES = [  # (start s, text) - the winner is only named at the reveal (24.5 s)
    (0.3, "Same speed. Same Earth. Who finishes a lap first? Guess now!"),
    (4.4, "Each one runs east, along their own line of latitude."),
    (7.4, "Forget Earth's spin. On foot, all three run ten kilometres an hour."),
    (11.3, "Go! Non-stop, day and night."),
    (15.0, "Who do you think is ahead?"),
    (24.6, "London wins, on day one hundred and four!"),
    (28.1, "Why? Closer to the poles, the circle around Earth is smaller."),
    (31.6, "London's lap is twenty-five thousand kilometres. Singapore's, forty thousand."),
]
inputs, filt = [], []
for i, (t0, txt) in enumerate(LINES):
    w = V / f"l{i}.wav"
    subprocess.run(["piper", "-m", MODEL, "--length_scale", "0.92", "-f", str(w)], input=txt.encode(), check=True, capture_output=True)
    with wave.open(str(w)) as f: d = f.getnframes() / f.getframerate()
    nxt = LINES[i + 1][0] if i + 1 < len(LINES) else 36.0
    print(f"{t0:5.2f}-{t0 + d:5.2f} (next {nxt:5.2f}) {'OVERLAP ' if t0 + d > nxt else ''}{txt}")
    inputs += ["-i", str(w)]; filt.append(f"[{i}]adelay={int(t0 * 1000)}:all=1[a{i}]")
mix = ";".join(filt) + ";" + "".join(f"[a{i}]" for i in range(len(LINES))) + f"amix=inputs={len(LINES)}:normalize=0,apad=whole_dur=36,atrim=0:36,loudnorm=I=-14:TP=-1.5:LRA=11[o]"
subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", mix, "-map", "[o]", "-ar", "48000", str(H / "renders" / "vo.wav")], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(H / "output" / "lap_race_4k.mp4"), "-i", str(H / "renders" / "vo.wav"), "-map", "0:v", "-map", "1:a",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(H / "output" / "lap_race_4k_vo.mp4")], check=True)
