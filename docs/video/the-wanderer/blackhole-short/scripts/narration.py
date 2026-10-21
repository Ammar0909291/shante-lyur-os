"""Hindi narration (Piper hi_IN-rohan-medium, IndicTTS / IIT Madras). Each line is fitted inside its scene window."""
import json, wave, subprocess, os
from pathlib import Path
from piper import PiperVoice, SynthesisConfig
H = Path(__file__).resolve().parent.parent; (H / "audio" / "lines").mkdir(parents=True, exist_ok=True)
LINES = [  # (start, end of window in seconds, text)
    (0.15, 4.1, "ब्रह्मांड में एक जगह ऐसी है, जहाँ से रोशनी भी वापस नहीं आ सकती।"),
    (4.2, 8.9, "जब एक विशाल तारे का केंद्र, अपने ही गुरुत्वाकर्षण के आगे ढह जाता है..."),
    (9.2, 13.9, "तो जन्म ले सकता है एक ब्लैक होल। अंतरिक्ष का सबसे रहस्यमय पिंड।"),
    (14.1, 20.0, "इसके चारों ओर है इवेंट होराइज़न। वह सीमा, जिसके पार से प्रकाश भी बाहर नहीं निकल सकता।"),
    (20.2, 26.9, "इसका गुरुत्वाकर्षण अंतरिक्ष-समय को मोड़ता है, और दूर की रोशनी का रास्ता बदल देता है।"),
    (27.2, 32.9, "इसके करीब, दूर बैठे पर्यवेक्षक की तुलना में, समय धीमा गुज़र सकता है।"),
    (33.0, 39.1, "दो हज़ार उन्नीस में, वैज्ञानिकों ने पहली बार किसी ब्लैक होल की छाया की तस्वीर दुनिया के सामने रखी।"),
    (39.2, 44.9, "कुछ ब्लैक होल के आसपास, शक्तिशाली जेट, प्रकाश-वर्षों तक फैल सकते हैं।"),
    (45.1, 50.0, "लेकिन इसके भीतर क्या होता है? इसका पूरा जवाब, आज भी हमारे पास नहीं।"),
    (50.2, 55.8, "हर नई खोज हमें याद दिलाती है, कि ब्रह्मांड के रहस्य अभी बाकी हैं।"),
    (56.0, 59.7, "ऐसी अद्भुत खोजों के लिए, जुड़े रहिए, द वॉन्डरर के साथ।"),
]
voice = PiperVoice.load(os.path.expanduser("~/vw/voices/hi_IN-rohan-medium.onnx"))
out = []
for i, (a, b, text) in enumerate(LINES):
    raw = H / "audio" / "lines" / f"raw{i:02d}.wav"; fin = H / "audio" / "lines" / f"l{i:02d}.wav"
    with wave.open(str(raw), "wb") as w: voice.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=0.95, noise_scale=0.6, noise_w_scale=0.8))
    trim = "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse"
    tmp = H / "audio" / "lines" / f"trim{i:02d}.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(raw), "-af", trim, str(tmp)], check=True)
    with wave.open(str(tmp)) as r: d = r.getnframes() / r.getframerate()
    win = b - a; tempo = max(1.0, d / win)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(raw), "-af", f"{trim},atempo={tempo:.4f},highpass=f=70,equalizer=f=3200:t=q:w=1.2:g=2,loudnorm=I=-16:TP=-1.5:LRA=7",
                    "-ar", "48000", "-ac", "1", str(fin)], check=True)
    with wave.open(str(fin)) as r: dd = r.getnframes() / r.getframerate()
    out.append({"i": i, "t0": a, "t1": a + dd, "text": text, "tempo": round(tempo, 3)})
    print(f"{i:2d} window {win:4.1f}s  speech {d:4.2f}s  tempo x{tempo:.2f}  -> {dd:4.2f}s")
(H / "audio" / "narration.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
