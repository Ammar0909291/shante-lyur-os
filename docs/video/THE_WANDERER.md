# THE WANDERER: channel bible

> **For any new session or account:** read this file first, then `VIDEO_QUALITY.md` in the same folder. Together they describe the whole channel: concept, formats, quality bar, branding, production pipeline and rules. Source code and assets for the first video are in `the-wanderer/`.

---

## 1. Identity
| Item | Value |
|---|---|
| Channel name | **The Wanderer** (formerly "3D Universal Learning", a name no longer used anywhere) |
| Tagline | *Explore reality. Question assumptions. Follow the evidence.* |
| Hindi tagline | *वास्तविकता को खोजो। धारणाओं पर सवाल करो। सबूतों का पीछा करो।* |
| Type | Faceless, AI-assisted, cinematic science and philosophy documentaries |
| Platforms | YouTube (main, long-form, 16:9) · Shorts / Instagram Reels (9:16 cut-downs) |
| Related accounts | Instagram @cockroachacademy1 ("Cockroach Academy"), the owner's separate short-form science account (Hindi and English 60 s reels, hashtag #CockroachJantaParty) |
| Languages | English narration master. YouTube auto-dub for Hindi and other languages. Hindi thumbnails and titles. Russian transcript provided for the first video. |

## 2. Concept and audience
- **What we make:** visually stunning, intellectually honest investigations of big questions: reality, the universe, consciousness, space, time, life beyond Earth.
- **Audience:** curious general viewers, students and young adults, especially Hindi- and English-speaking.
- **Promise to the viewer:** a mystery-style story, real science, real sources, no fake claims. Every video separates **real data**, **established science**, **philosophical argument**, **hypothetical** and **fictional scene**, with on-screen tags.
- **Tone:** suspenseful but calm. Never sensational or exaggerated. Each video ends with a question for the comments.

## 3. Formats
| Format | Spec |
|---|---|
| Long-form documentary (main) | 8–10 min, 16:9, 1920×1080 (4K if render time allows), 24 fps, 6–8 chapters with on-screen chapter cards and YouTube chapters, −14 LUFS, H.264 High |
| Shorts / Reels | 30–60 s, 9:16, 1080×1920, 30 fps, cut from the long video or made standalone; see `VIDEO_QUALITY.md` for safe zones |
| Channel trailer | 60 s, Hindi narration, 16:9 |

Video structure:
1. Cold-open hook (0–30 s).
2. Numbered chapters, each with one purpose.
3. Counterarguments included.
4. "Honest answer" summary.
5. Two closing question cards.
6. End card with the channel name and subscribe button.

## 4. Quality bar (summary; full rules in `VIDEO_QUALITY.md`)
Reference look: Instagram reel DdXi3zMo4UM (@nebula.galaxies).
- **Composition:** one hero subject per shot, and three depth planes (out-of-focus foreground bokeh, sharp subject, soft background).
- **Grade:** true blacks, a limited palette (crimson, orange and white-hot against silver-grey, plus amber #f2b45a and cyan #7fd8ff accents), an S-curve grade and fine grain.
- **Motion:** slow push-ins of at least 4 s each, and logarithmic zooms across scales.
- **Imagery:** real imagery where it exists. NASA Blue Marble / Black Marble for Earth (public domain). ESO Milky Way panorama (CC BY 4.0, credit "ESO/S. Brunier").
- **Text:** minimal on-screen text. Subtitles 38 px Inter semibold, bottom-centre. Serif chapter cards (Cormorant Garamond).
- **Sound:** an original score with a ticking pulse under tension, string swells at reveals, and silence before key questions. Never use copyrighted music.

## 5. Branding assets (`the-wanderer/brand/`)
- `avatar_800x800.png`: a hooded wanderer with a staff, silhouetted against a sunrise over Earth's curve, with an amber ring. YouTube profile picture spec: 800×800, shown as a circle and readable at 40 px. Source: `avatar.html`.
- `banner_2560x1440.png`: a NASA Earth horizon with stars, "THE WANDERER" and the tagline inside the 1546×423 safe area, under 6 MB. Source: `banner.html` (three.js and `lib.js`) and `shoot_brand.js`.
- **Subscribe button** (`reality-test/overlays/`): at every minute mark (1:00, 2:00 …), bottom-right above the subtitles, 4.5 s. A cursor clicks it, it turns grey "SUBSCRIBED" and the bell rings. The end card is a black screen with the avatar, "THE WANDERER", the tagline, the subscribe animation and the credits line.
- **Fonts:** Cormorant Garamond (titles), Inter (UI and subtitles), JetBrains Mono (labels), Noto Sans Devanagari (Hindi).
- **Thumbnails:** 1280×720. Very large text (Hindi preferred) with a thick black outline, one focal image from the film, bottom-right kept clear. Make three variants for YouTube "Test & compare". Templates: `reality-test/thumbnails/`.

## 6. Production pipeline (fully procedural, reproducible)
Everything is a pure function of film time `t`, so any frame can be rendered alone and chunks join seamlessly.
1. **Script** (`script.py`): a list of narration cues `(scene, text, pause)` plus chapter names. The target runtime is measured from the real narration, never estimated.
2. **Voice** (`synth.py`): Piper TTS.
   - Long-form English: `en_US-norman-medium` (LibriVox, public domain), length_scale 1.15 (about 170 wpm). Alternative: `en_US-joe-medium` (CC0).
   - Hindi: `hi_IN-rohan-medium` (IndicTTS, IIT Madras; credit it).
   - **Never use** ryan, hfc_male, pratham or priyamvada; they are non-commercial.
   - Processing: silence trimmed, highpass 60 Hz, loudnorm −16 per clip.
3. **Timeline** (`timeline.py`): cue times, scene spans and sentence-level subtitles, written to `timeline.json`.
4. **Film engine** (`site/`, three.js r128 from cdnjs):
   - `lib.js`: compositor with HDR layers, quarter-resolution bloom, ACES, S-curve, vignette and grain; camera paths; NASA Earth shader; ESO sky dome; galaxy; nebula clouds; bokeh; mannequin figures.
   - `world_city.js`: the dawn city with apartment, rain mode and "digitise" sweep.
   - `shots_a…e.js`: one object per scene.
   - `main.js`: transitions (crossfade or dip to black), overlays, subtitles and chapter cards.
   - `template.html` plus `build.py` produce `site/index.html`.
5. **Textures** (download into `site/tex/`, not committed because of size):
   - `earth_day.jpg` (4096): NASA Visible Earth `world.topo.bathy.200412.3x5400x2700.jpg`
   - `earth_night.jpg`: NASA `dnb_land_ocean_ice.2012.3600x1800.jpg`
   - `earth_clouds.jpg`: NASA `cloud_combined_8192.tif`
   - `milkyway.jpg`: ESO `https://cdn.eso.org/images/large/eso0932a.jpg`
6. **Capture** (`tools/capture.js`): headless Chromium with a virtual clock and SwiftShader WebGL, using JPEG frames, ffmpeg and x264.
   - Environment variables: `CAP_W=1920 CAP_H=1080 CAP_DPR=1 OUT_W=1920 OUT_H=1080`.
   - Usage: `node capture.js <siteDir> <start> <end> 24 out.mp4 webgl`.
7. **Render** (`render_all.sh`): 54 chunks of about 10 s, two in parallel, resumable (finished chunks are skipped).
   - About 1.3 s per frame on 4 CPU cores, so roughly 4.5 h for 9 minutes.
   - Run it as a **tracked background task**, not a detached process: cloud containers sleep when idle and restart about every 30 min to 2 h.
8. **Audio** (`audio/`): `render.js` renders `score.js` offline (Web Audio: pads, organ, string swells, tick motif, SFX, ducking, scripted silences) to `music.wav`. `narr_track.py` places each clip at its cue time to make `narration.wav`.
9. **Finalize** (`finalize.sh`):
   - Concatenates the chunks and retimes the picture to the exact film length, because chunks round to whole frames (+0.13 % stretch).
   - Mixes music ×2.2 with the narration, applies loudnorm −14, and encodes the master at CRF 16.
10. **Overlays** (`overlays/`): `frames.js` renders the subscribe-button and end-card PNG sequences. ffmpeg overlays them with `-itsoffset 60,120,…` and the end card at the last 4.5 s.
11. **Delivery:** the chat file-transfer limit is 400 MB. Use a two-pass ~5.3 Mbps 1080p copy for sending; keep the CRF 16–17 master for uploading.

Known limits: photoreal humans and cities are beyond this renderer. They appear as stylised silhouettes. For photoreal shots, generate clips with an AI video tool (Veo, Runway, Kling) in the reference style and keep our narration, graphics and mix; prompts are in `reality-test/PACKAGE_youtube_description_sources.md`.

## 7. Rules (non-negotiable)
- Verify every factual claim against primary or reputable sources, and list them in the description. Never invent quotes, studies or consensus; paraphrase when the exact wording is not verified.
- Label illustrations and hypotheticals on screen. Do not add nebulae or other effects where reality has none (for example around Earth orbit).
- Disclose AI on YouTube: "Altered or synthetic content" = Yes. Add "Narration voice is computer-generated" to the description.
- Credit every licensed asset (ESO CC BY 4.0, IndicTTS). Use original or licensed music only.
- Avoid "inauthentic / mass-produced" patterns. Each video needs an original script, research, varied visuals and real editing.

## 8. Upload checklist (YouTube)
- Title, plus a Hindi title under Languages
- Description: hook, chapters, a real/argument/hypothetical breakdown, sources, credits and a subscribe line
- 15 tags and 3–5 hashtags, including #TheWanderer
- Thumbnail ×3 for Test & compare
- Altered content = Yes; category Education
- End screen linking the next video plus a subscribe element
- Add the video to a playlist
- Turn auto-dubbing on, and preview the Hindi track before publishing

## 9. Episode log
| # | Title | Status | Files |
|---|---|---|---|
| 1 | **The Reality Test: What If Everything You Know Is a Simulation?** (8:58) | Rendered and delivered | `the-wanderer/reality-test/` |

Episode 1 details:
- **Chapters:** First Doubt · Building a World · Three Possibilities · A Clue in Physics? · Problem of Proof · Could a Simulation Feel? · Outside the Universe · The Reality Test.
- **Key sources:** Bostrom 2003 (Phil. Quarterly 53:243–255); Beane, Davoudi & Savage 2012/2014 (arXiv:1210.1847); Tonomura et al. 1989 (Am. J. Phys. 57:117); Chalmers 1995 (JCS 2:200–219) and *Reality+* 2022; Descartes 1641; Zhuangzi.
- **Hindi thumbnails:** "यह दुनिया नकली है?" · "पृथ्वी = कोड?" · "3 रास्ते, 1 सच".
- **Russian transcript:** `reality-test/transcript_RU.md`.

## 10. Still to do (channel completeness)
1. Channel "About" text and keywords
2. 60 s Hindi channel trailer (in progress)
3. Content plan: the next 10 topics and an upload schedule (suggested: one long video every 1–2 weeks plus 2–3 Shorts a week)
4. Playlists and end screens
5. A Shorts cut-down plan for each long video
