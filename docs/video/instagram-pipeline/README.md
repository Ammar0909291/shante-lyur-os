# Instagram / YouTube Shorts video pipeline (@cockroachacademy1)

Procedural 3D science reels, rendered frame-exact in headless Chromium (three.js r128, SwiftShader) and muxed with ffmpeg.
First production: **"What if Earth suddenly stopped spinning?"** (Hindi, 59.6 s, 1080x1920, 30 fps). Account rules: `../INSTAGRAM_ACCOUNT.md`. Research and scripts: `../INSTAGRAM_RESEARCH.md`.
**No secrets here (public repo).** Textures, models, owner-supplied images and renders are not in git.

## Output spec (one master for Instagram Reels and YouTube Shorts)
1080x1920 (9:16), 30 fps, H.264 High, AAC 48 kHz, about -14 LUFS, under 60 s. Safe zones (CSS px at 540x960): top 110, bottom 210-230, right 60-80.
Subtitles bold, about 450 px from the bottom, timed to the narration. Fonts: Noto Sans Devanagari, IBM Plex Mono.

## Decisions to keep
- Facts only from NASA/ESA/ESO/STScI/peer-reviewed sources. Hypotheticals labelled on screen (`HYPOTHETICAL`); AI images labelled `ILLUSTRATION`.
- Voice: Piper only (`hi_IN-rohan-medium` for Hindi, credit IndicTTS/IIT Madras; English `en_US-joe-medium`). Never ryan, hfc_male, pratham, priyamvada.
- Music is original (generated in `audio5.py`). Never copyrighted music.
- Owner direction on branding: the first cut was clean (no channel name, no icons); the final cut adds YouTube + Instagram icons with SUBSCRIBE / FOLLOW at 15 s, 30 s, 45 s and the end, and **no channel name** (see `core.js`, function `cta`). Platforms may lower reach for other platforms' logos.
- Always remind the owner to turn on Instagram's AI label / YouTube's altered-content setting. Nothing is posted without owner approval; use Metricool drafts.

## Layout
- `site/` the film page: `core.js` (segments, subtitles, CTA), `lib.js` (compositor, Earth shader), `sc_space.js`, `sc_photo.js`, `sc_moon.js`, `sc_orbit.js`, `tl.js` (generated timeline).
- `tools/capture2.js` virtual-clock frame capture (`node tools/capture2.js <siteDir> <start> <end> <fps> <out.mp4|out.png>`; a `.png` renders one frame).
- `script.py` cue list (voice text + subtitle + pauses). `synth2.py` Piper synthesis with punctuation-aware pauses. `build_tl.py` maps cue times onto scene segments. `audio5.py` soundtrack. `mix.sh` mix at -14 LUFS. `render_all.sh` 4 chunks, 2 at a time, then mux.
- `upscale2x.py` optional 2x upscaling of supplied still images (EDSR via `super-image`; stubs a broken `torchvision` import).

## Run
1. `./fetch_assets.sh` (needs `curl`, `npm`, `python3` with `Pillow`; Chromium at `/opt/pw-browsers/chromium`, global `playwright`, `ffmpeg`).
2. `pip install piper-tts numpy`. Put the owner's supplied images in `site/imgs/` (B1-B4 bus, I1-I3 street, S1-S3 sea; portrait, same camera per set).
3. `python3 synth2.py 0.90 && python3 build_tl.py && python3 audio5.py && ./mix.sh`
4. `export NODE_PATH=$(npm root -g); ./render_all.sh` (about 40-50 min on 4 CPUs at 1.5x supersampling). Output: `out/EarthStop_v5_1080x1920.mp4`.
Quick checks: `node tools/capture2.js site 25.4 25.4 30 still.png`.

## Known issues
- Orbit shot (~36 s): the small "Delhi: day/night" label can overlap the subtitle. Fix in `sc_orbit.js` (move the label or hide it while a subtitle is up), then re-render only the chunk covering 29.8-44.7 s.
- Scene timings are authored in an older "old time" axis and mapped through `TL.seg` (`build_tl.py`); change segments there, not in the scene files.
- Photo shots only look right if each image set shares one camera. 4K is not realistic for this renderer; keep 1080x1920.

## Next
A 30 s English Voyager 1 reel ("farthest thing we have built", light-time ladder, one-day delay each way) is scripted in `../VOYAGER_REEL_SCRIPT.md`; it reuses this engine.
