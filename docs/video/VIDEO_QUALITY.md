# Drawn to Scale — video quality standard (3D videos)

Paste this at the start of any new session, or save it as CLAUDE.md / memory in the project.

## Quality and colour target (reference: Instagram reel DdXi3zMo4UM, @nebula.galaxies)
- Photoreal, cinematic "you are flying through space" look. Dense, highly textured volumetric clouds (rocky, crusty, billowing), lit from inside.
- Palette: pure black void (#000) with deep contrast; fiery orange-red (#ff4a1a → #ff8a3c) and white-hot highlights (#fff3e0); cool violet / lavender-grey dust (#4a4066 → #cfc8e8); thousands of glowing ember sparks.
- Hero element has strong bent-light streaks (accretion-disc style arcs), a very dark core and a bright rim. Asteroids / debris tumbling close to camera for depth.
- Heavy bloom with a clean tone curve (hue-preserving filmic), no washed-out grey haze, no flat pastel fog.
- Slow, smooth, long camera moves; real parallax; scale changes are logarithmic.
- Minimal on-screen text. Short labels only where they teach something. No clutter, no UI-looking panels over the hero shot.
- Big original epic score (generated, no copyrighted music). Voice sits on top, music ducks.

## Standing production rules
- Facts: verify every number (NASA / ESA / ESO / STScI / peer-reviewed), cite sources in the caption, never invent figures. Say "about" if uncertain.
- Narration: Piper en_US-joe-medium (CC0) only. Hindi: hi_IN-rohan-medium (credit IndicTTS, IIT Madras). Never use ryan, pratham or priyamvada.
- Photos (if any): Wikimedia Commons only; credit author + licence on screen and in caption.
- Format: 1080x1920, 30 fps, H.264 + AAC, -14 LUFS (two-pass loudnorm), layout at 540x960 CSS with deviceScaleFactor 2.
- Safe zones (CSS px at 540x960): top 110, bottom 210, right 60. Subtitles ~18-19 px bold, strong shadow, about 460 px from the bottom, timed to narration. Narration starts 0.35 s into each shot.
- Length: whatever the user asks (30 s or 60 s so far).
- Caption: hook line, 3-5 verified facts, sources + credits, 5 hashtags (incl. #CockroachJantaParty), "Narration voice is computer-generated." Remind the user to turn on the AI label.
- Channel: Instagram @cockroachacademy1 ("Cockroach Academy", Education, AI-generated profile).
- Fonts: Big Shoulders Display + IBM Plex Sans (space), IBM Plex Mono for readouts, Noto Sans Devanagari for Hindi. Accent amber #ffb020.
- Thumbnails: Hindi title, very large type, thick outline, one bright focal point, high saturation, text inside safe zones.
- Pipeline: HTML + three.js r128 page, virtual-clock frame-exact capture in headless Chromium (swiftshader), offline Web Audio score + narration, ffmpeg mux. Everything is a pure function of film time t.

## Honest limit
The reference is AI-generated footage. A procedural renderer can approach the colours, contrast, embers and lensing but not match its photoreal texture detail. Best results: hybrid (AI-generated hero clips from the user + my voice-over, verified facts, graphics, subtitles, music, mix, caption).

## Shot anatomy learned from the reference (apply to every frame)
1. One hero subject, slightly off-centre, framed by leading curves (gas arcs, light streaks).
2. Three depth planes: out-of-focus foreground debris/bokeh, sharp mid-ground hero, soft background.
3. Volumetric atmosphere in every space shot: layered dust and gas with fine filament detail, lit from inside by the hero.
4. True blacks (0–3 %), highlights near white with a soft roll-off, a limited palette per scene; gentle S-curve; cool shadows and warm highlights; fine grain.
5. Slow push-ins and drifts of at least 4 s each, with parallax between the depth planes; no fast cuts.
6. Sound: a ticking pulse under tension, strings swelling at reveals, silence before key questions (in the style of the reference score, never the copyrighted track).
7. Real imagery wherever it exists: NASA Blue Marble / Black Marble for Earth (public domain) and the ESO Milky Way panorama (CC BY 4.0, credit ESO/S. Brunier). Do not add nebulae where none exist (for example around Earth orbit).

## Long-form YouTube format (documentaries)
- 16:9 master at 1920×1080 minimum (3840×2160 when render time allows), 24 or 30 fps, H.264 High at CRF 15–16, AAC 192–320 kbps, −14 LUFS integrated, −1 dBTP.
- Layout: 1920×1080 stage. Subtitles bottom-centre, 38 px semibold, strong shadow, ≤ 2 lines. Chapter cards top-left (serif title over a small amber "CHAPTER n" label). Category tag top-right (for example "Real experiment", "Hypothetical", "Illustration"). Small low-opacity brand mark bottom-right.
- Structure: a cold-open hook, then numbered chapters with on-screen chapter cards (also listed as YouTube chapters in the description), and a closing question card plus the brand card.
- Runtime: verified from the real narration timeline, never estimated.
- Narration for long-form: Piper en_US-norman-medium (public domain, LibriVox) or en_US-joe-medium (CC0), length_scale ≈ 1.15 (about 170 wpm), silence trimmed, loudnorm per clip.
- Shorts/Reels: cut 9:16 versions from the same master using the vertical rules above.

## Current long-form project
"The Reality Test — What If Everything You Know Is a Simulation?" for 3D Universal Learning: an 8:58 16:9 documentary in 8 chapters, rendered with the same three.js pipeline at 1920×1080. People and city shots are stylised silhouettes. For photoreal versions of those shots, use AI-generated clips in the style above and keep the narration, graphics, subtitles and mix.
