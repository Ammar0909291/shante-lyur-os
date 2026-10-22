# INSTAGRAM: @cockroachacademy1 ("Cockroach Academy")

> **For any new session or account:** read `THE_WANDERER.md` and `VIDEO_QUALITY.md` first, then this file. This is the single place for everything about the Instagram account. The YouTube channel has its own rules in `THE_WANDERER.md`.
>
> **Never put secrets in this repo** (passwords, tokens, API keys, login links). The repository is public.

---

## 0. Standard reel workflow (approved by the owner, 2026-10-22)
Every new reel is made this way unless the owner says otherwise. Reference result: `cockroach-academy/black-hole-earth/`.
1. **Storyboard:** Claude writes five keyframe prompts (photoreal, cinematic, 9:16, consistent style block, no text), each tied to a time slot in a 30 s reel.
2. **Images:** the owner generates the five keyframes with an AI image tool and approves them. Claude cannot generate images and never pretends to.
3. **Animate:** Claude crops or collects the panels, upscales them (Real-ESRGAN, `the-wanderer/maya/upscale.py`), and animates them with an `animate.py` modelled on `black-hole-earth/animate.py`. **Everything moves:** camera push-ins and pans, swirling or flowing elements, planets spinning and drifting, debris and dust streaming, glowing parts flickering, stars twinkling, crossfades, and a fade to black at the end.
4. **Silent master:** 1080×1920, 30 fps, about 30 s. No on-screen text, no voice, no audio track. The owner adds music (for example "Interstellar") from Instagram's library when posting.
5. **Caption package** (`PACKAGE_instagram.md`): hook, 3–5 verified facts with sources, a line saying the visuals are AI-generated and dramatised, and 5 hashtags. Estimates are labelled as estimates.
6. **Post:** REEL, `isAiGenerated: true`, `autoPublish: false`. The owner adds the music, then checks the AI label.

## 1. Identity
| Item | Value |
|---|---|
| Handle | **@cockroachacademy1** |
| Name | Cockroach Academy |
| Category | Education (AI-generated profile) |
| Owner | The channel owner. It is a separate account from the YouTube channel **The Wanderer**. |
| Account type | **Creator** (confirmed by the owner, 2026-10-21). Scheduling limits for Creator accounts: see section 8. |
| Languages | Hindi and English |
| Audience | Hindi- and English-speaking viewers in India. The channel bible's audience is curious general viewers, students and young adults. |

## 2. What the account posts
- Short vertical science reels, **30–60 s**, in Hindi or English.
- Topics: science, with a cinematic space look (black holes, galaxies, big questions).
- Same intellectual-honesty promise as The Wanderer: real data, established science and fiction are never mixed up.
- Tone (inherited from The Wanderer): suspenseful but calm, never sensational. End with a question for the comments when it fits.
- Reels can be standalone or cut from The Wanderer's long-form films (see section 8).

## 3. Format and look
| Item | Spec |
|---|---|
| Frame | 1080×1920 (9:16), 30 fps |
| Codec / audio | H.264 + AAC, **−14 LUFS** (two-pass loudnorm) |
| Layout stage | 540×960 CSS px, deviceScaleFactor 2 |
| Safe zones (CSS px at 540×960) | top **110**, bottom **210**, right **60** (×2 at 1080×1920: 220 / 420 / 120) |
| Subtitles | about 18–19 px bold, strong shadow, about 460 px from the bottom, timed to the narration |
| Narration timing | starts 0.35 s into each shot |
| Look | cinematic space. True blacks, orange/red (#ff4a1a → #ff8a3c) and white-hot highlights against violet/lavender-grey dust. Amber accent #ffb020. Heavy but clean bloom, no grey haze |
| Camera | slow, smooth, long moves. One hero subject, three depth planes. No fast cuts |
| Reference reel | Instagram `DdXi3zMo4UM` (@nebula.galaxies). The reference is AI-generated footage, so we match its colour, contrast and lensing, not its photoreal texture |
| On-screen text | minimal. Short labels only where they teach something |

Full shot anatomy is in `VIDEO_QUALITY.md`.

## 4. Voice, music, fonts
- **Narration:** Piper TTS only.
  - English: `en_US-joe-medium` (CC0).
  - Hindi: `hi_IN-rohan-medium`. Credit IndicTTS, IIT Madras.
  - **Never use** ryan, hfc_male, pratham or priyamvada. They are non-commercial.
- **Music:** original and generated. Never copyrighted music. Voice sits on top and the music ducks.
- **Fonts:** Big Shoulders Display + IBM Plex Sans (space), IBM Plex Mono (readouts), Noto Sans Devanagari (Hindi). The finished black-hole Short uses The Wanderer's fonts instead (Cormorant, Inter, Noto Devanagari). See section 11.

## 5. Facts, images and credits
- **Facts:** only from NASA, ESA, ESO, STScI or peer-reviewed sources. Verify every number, never invent a figure, say "about" when unsure. Never invent quotes or studies.
- **Labels:** mark illustrations, hypotheticals and real observations on screen (the black-hole Short uses `ILLUSTRATION`, `REAL OBSERVATION` and `SCIENTIFIC VISUALISATION · GR RAY-TRACED`). Do not add nebulae or effects where reality has none.
- **Photos:** Wikimedia Commons only. Credit author and licence on screen and in the caption.
- **Licensed assets:** credit every one (for example ESO CC BY 4.0, IndicTTS). Credit lines go in unaltered.

## 6. Caption template
Every caption has these parts, in this order:
1. **Hook line**: one sentence, a question or a surprising true fact.
2. **3–5 verified facts**, one per line.
3. **Sources**, then **credits**.
4. **"Visuals: AI-generated artwork, animated."** (and "Narration voice is computer-generated." only if a reel has narration)
5. **5 hashtags** relevant to the topic.

Write a Hindi caption and a short English version for each reel. The owner approves the hashtags.

## 7. Before every post (checklist)
- [ ] Every fact has a source from section 5, and the sources are in the caption.
- [ ] Image and music credits are in the caption, and on screen where required.
- [ ] Illustrations and hypotheticals are labelled on screen.
- [ ] Text and subtitles are inside the safe zones.
- [ ] Caption says the visuals are AI-generated and dramatised.
- [ ] **Instagram's AI label is on.** Claude sets the `isAiGenerated` flag on every post it schedules through Metricool and reminds the owner every time. The owner still confirms the label on the live reel.
- [ ] The owner has approved the post.

## 8. Workflow and production reality
- **Default workflow:** Claude drafts the reel plan and caption, the owner approves, and then the post is scheduled. Nothing is published without the owner's approval. Claude saves each post as a Metricool draft, or sends a phone notification instead of autopublishing, so the owner confirms it first. The owner may change this later.
- **Scheduling tool:** Metricool, connected to Claude and linked to @cockroachacademy1 on 2026-10-21. A read-only test passed (brand settings, metrics list, scheduled posts, best times). Nothing is scheduled yet.
- **Creator-account limits in Metricool:** no Story autopublish, and no Reel audio set through Metricool (that needs a Business account linked to a Facebook Page). So the plan is Reels only, with the music already mixed into the video.
- **Timezone:** the Metricool brand is set to `Asia/Yekaterinburg` (UTC+5). The audience is in India (UTC+5:30), so convert times or change the brand timezone before scheduling.
- **A new cinematic render every day is not realistic.** A 9-minute film takes about 4.5 h to render, and cloud containers restart every 30 min to 2 h (see `THE_WANDERER.md`). The plan is to produce or cut reels in batches and schedule them from a queue.
- **Cut-downs:** Shorts/Reels are cut 9:16 from the same masters using the vertical rules above. The cut-down plan per long video is still to do (`THE_WANDERER.md`, section 10).

## 9. What exists
| Item | Status | Where |
|---|---|---|
| Black-hole reel, 60 s, Hindi | Scripts, narration and audio mix are in the repo. The finished MP4 is **not** in the repo (`renders/` and `output/` are gitignored). Produced by `scripts/finish.sh`. | `the-wanderer/blackhole-short/` |
| Episode 1, *The Reality Test* (English, 8:58) | Rendered and delivered. Source in the repo. | `the-wanderer/reality-test/` |
| Episode 2, *Maya ya Simulation* (Hindi) | Script, voice, timeline, Hindi subtitles and YouTube package are in the repo. The 4K build is in progress. | `the-wanderer/maya/` |
| Channel trailer (Hindi, 1:00) | Rendered and delivered. | `the-wanderer/trailer/` |
| Instagram package for the black-hole reel | Not written yet. | `the-wanderer/blackhole-short/` |

## 10. Pre-verified sources (black-hole topic)
Checked against the pages below on 2026-10-21. Re-check before reusing.
| Claim | Source |
|---|---|
| Nothing, not even light, can pass outward across the event horizon | NASA SVS, *Black Holes* gallery (svs.gsfc.nasa.gov/gallery/black-holes) |
| Stellar-mass black holes form when the cores of very massive stars run out of fuel and collapse under their own weight | NASA SVS, *Black Holes* gallery |
| Time passes more slowly for an object nearer the black hole than for a faraway observer | NASA SVS 14574, *On the Brink* (an illustration, credit NASA's Goddard Space Flight Center Conceptual Image Lab) |
| Black hole gravity bends light | NASA Science, *Black Holes* (science.nasa.gov/universe/black-holes) |
| What matter looks like inside the event horizon is not known | NASA Science, *Black Holes* |
| 10 April 2019: first image of a black hole's shadow (M87*). 55 million light-years away, 6.5 billion solar masses | ESO eso1907. EHT Collaboration, ApJ Letters 875, L1 (2019): M = (6.5 ± 0.7) × 10⁹ M☉ |
| M87's jet is 5,000 light-years long (NASA/ESA Hubble, 22 Aug 2013) or 3,000 (ESA/Hubble, 26 Sep 2024). The sources differ, so say "thousands of light-years" | NASA Science, *Hubble Takes Movies of Space Slinky*; ESA/Hubble heic2411b |

Credit lines and licences (use unaltered):
- **EHT image of M87\*:** "EHT Collaboration". ESO publishes its images under CC BY 4.0 unless an item says otherwise.
- **Milky Way panorama:** "ESO/S. Brunier" (ESO, CC BY 4.0 by default).
- **Whirlpool Galaxy M51 (heic0506a):** "NASA, ESA, S. Beckwith (STScI), and The Hubble Heritage Team (STScI/AURA)". ESA/Hubble publishes under CC BY 4.0.

## 11. Open decisions
1. **Branding on reels:** the black-hole Short ends on a **The Wanderer** end card with a YouTube button and says "जुड़े रहिए, द वॉन्डरर के साथ". If it is posted here, viewers are sent to the other brand. Decide whether Instagram gets its own end card.
2. **Fonts:** section 4 lists two sets (this account's and The Wanderer's). Decide which one Instagram reels use.
3. **Finished MP4s:** where they are stored. They are not in the repo. Metricool needs a public, Google Drive or Dropbox link for each video.
4. **Timezone:** keep the Metricool brand on `Asia/Yekaterinburg` or change it to `Asia/Kolkata`.
5. **Metricool connection type:** Instagram login (scheduling and basic metrics) or through Facebook (full analytics). Check the banner at the bottom of Metricool's Analytics tab for Instagram.
