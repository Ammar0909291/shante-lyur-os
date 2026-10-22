# English voice-over for the lap race (Piper en_US-joe-medium, CC0), timed to the on-screen beats.
# usage: python3 voiceover.py   -> vo/*.wav, renders/vo.wav, output/lap_race_4k_vo.mp4
import subprocess, wave
from pathlib import Path
H = Path(__file__).parent; V = H / "vo"; V.mkdir(exist_ok=True)
MODEL = "/root/vw/voices/en_US-joe-medium.onnx"
LINES = [  # (start s, text)
    (0.3, "Same speed. But one runner wins by sixty-three days. Guess who?"),
    (4.2, "Each one runs east, along their own line of latitude."),
    (7.2, "Forget Earth's spin. On foot, all three run ten kilometres an hour."),
    (11.0, "Go! Non-stop, day and night."),
    (13.4, "London's lap is only twenty-five thousand kilometres."),
    (18.4, "Day one hundred and four. London finishes first!"),
    (21.8, "Delhi, day one forty-seven."),
    (23.6, "Singapore, one sixty-seven."),
    (25.6, "Closer to the poles: smaller circle, shorter lap."),
    (28.35, "Which city would you run from?"),
]
inputs, filt = [], []
for i, (t0, txt) in enumerate(LINES):
    w = V / f"l{i}.wav"
    subprocess.run(["piper", "-m", MODEL, "--length_scale", "0.92", "-f", str(w)], input=txt.encode(), check=True, capture_output=True)
    with wave.open(str(w)) as f: d = f.getnframes() / f.getframerate()
    nxt = LINES[i + 1][0] if i + 1 < len(LINES) else 30.0
    print(f"{t0:5.2f}-{t0 + d:5.2f} (next {nxt:5.2f}) {'OVERLAP ' if t0 + d > nxt else ''}{txt}")
    inputs += ["-i", str(w)]; filt.append(f"[{i}]adelay={int(t0 * 1000)}:all=1[a{i}]")
mix = ";".join(filt) + ";" + "".join(f"[a{i}]" for i in range(len(LINES))) + f"amix=inputs={len(LINES)}:normalize=0,apad=whole_dur=30,atrim=0:30,loudnorm=I=-14:TP=-1.5:LRA=11[o]"
subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", mix, "-map", "[o]", "-ar", "48000", str(H / "renders" / "vo.wav")], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(H / "output" / "lap_race_4k.mp4"), "-i", str(H / "renders" / "vo.wav"), "-map", "0:v", "-map", "1:a",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(H / "output" / "lap_race_4k_vo.mp4")], check=True)
