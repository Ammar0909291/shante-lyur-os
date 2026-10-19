// Original score and sound design for THE REALITY TEST, rendered offline (Web Audio).
// Exposes renderScore(TL) -> Promise<AudioBuffer>. Music ducks under narration cues; silence where the story asks for it.
async function renderScore(TL) {
  const SR = 48000, T = TL.total, ctx = new OfflineAudioContext(2, Math.ceil(SR * T), SR);
  let seed = 12345; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const S = Object.fromEntries(TL.scenes.map(s => [s.id, s]));
  const cueT = (id, k) => S[id].cues[k][0], cueE = (id, k) => S[id].cues[k][1];

  // ---- buses ----
  const master = ctx.createGain(); master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 2.5; comp.attack.value = 0.02; comp.release.value = 0.3;
  master.connect(comp); comp.connect(ctx.destination);
  const music = ctx.createGain(); music.connect(master);          // everything musical, ducked under the voice
  const sfx = ctx.createGain(); sfx.connect(master);
  const impulse = (sec, dec) => { const n = Math.floor(SR * sec), b = ctx.createBuffer(2, n, SR); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / n, dec); } return b; };
  const verb = ctx.createConvolver(); verb.buffer = impulse(7, 2.6); const verbOut = ctx.createGain(); verbOut.gain.value = 0.7; verb.connect(verbOut); verbOut.connect(music);
  const sverb = ctx.createConvolver(); sverb.buffer = impulse(3, 3); const sverbOut = ctx.createGain(); sverbOut.gain.value = 0.5; sverb.connect(sverbOut); sverbOut.connect(sfx);
  const noiseBuf = (() => { const b = ctx.createBuffer(1, SR * 4, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; return b; })();

  // ---- ducking: music sits low under narration, rises in the pauses ----
  const g = music.gain; g.setValueAtTime(0.0001, 0);
  const env = []; // [time, level]
  const BASE = 1.0, DUCK = 0.38;
  for (const c of TL.cues) { env.push([c.t0 - 0.25, DUCK]); env.push([c.t1 + 0.35, BASE]); }
  env.sort((a, b) => a[0] - b[0]);
  g.setTargetAtTime(BASE, 0.2, 0.8);
  for (const [t, v] of env) g.setTargetAtTime(v, Math.max(0, t), v === DUCK ? 0.12 : 0.6);
  // scripted silences: the frozen second, the question at the end of chapter 3, before the final questions
  const silence = (a, b, ramp = 0.15) => { const s = ctx.createGain(); return [a, b, ramp]; };
  const holes = [[cueT('window', 1) + 0.15, cueT('window', 2) + 0.1], [cueE('archive', 7) - 1.4, cueE('archive', 7) + 1.2], [S.end.t0 - 0.2, S.end.t0 + 0.9]];
  const hole = ctx.createGain(); hole.gain.setValueAtTime(1, 0);
  for (const [a, b] of holes) { hole.gain.setTargetAtTime(0.0, a, 0.05); hole.gain.setTargetAtTime(1, b, 0.4); }
  music.disconnect(); music.connect(hole); hole.connect(master);
  const sfxHole = ctx.createGain(); sfx.disconnect(); sfx.connect(sfxHole); sfxHole.connect(master);
  { const [a, b] = holes[0]; sfxHole.gain.setValueAtTime(1, 0); sfxHole.gain.setTargetAtTime(0, a, 0.03); sfxHole.gain.setTargetAtTime(1, b, 0.2); }

  // ---- intensity of the score over the film (per scene) ----
  const MOOD = { drip: [0, 0], window: [0.18, 0], ascend: [0.55, 0], build: [0.45, 1], worlds: [0.6, 0], archive: [0.5, 1], zoom: [0.65, 0], laws: [0.38, 0], quantum: [0.32, 0],
    lab: [0.3, 1], test: [0.42, 1], moments: [0.5, 0], mind: [0.52, 0], outside: [0.7, 1], return: [0.3, 0], bluedot: [0.72, 0], end: [0.6, 0] };
  const padLevel = ctx.createGain(); padLevel.gain.setValueAtTime(0, 0); padLevel.connect(music);
  for (const s of TL.scenes) padLevel.gain.setTargetAtTime(MOOD[s.id][0], s.t0, 2.5);
  padLevel.gain.setTargetAtTime(0, S.outside.t1 - 7, 2.0); padLevel.gain.setTargetAtTime(MOOD.return[0], S.return.t0 + 0.5, 2.5);
  padLevel.gain.setTargetAtTime(0.0001, T - 3.5, 1.0);
  const padF = ctx.createBiquadFilter(); padF.type = 'lowpass'; padF.frequency.value = 900; padF.Q.value = 0.5; padF.connect(padLevel); padF.connect(verb);
  const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.05; lfoG.gain.value = 350; lfo.connect(lfoG); lfoG.connect(padF.frequency); lfo.start(0);

  // chords: mystery in A minor, warmth (major lift) for chapter 6 and the ending
  const MINOR = [[45, 57, 60, 64, 71], [41, 53, 57, 60, 67], [48, 55, 60, 64, 71], [43, 55, 59, 62, 69]];
  const WARM = [[41, 53, 57, 60, 64], [48, 55, 60, 64, 67], [43, 55, 59, 62, 69], [45, 57, 60, 64, 72]];
  const warmZone = t => (t >= S.moments.t0 && t < S.outside.t0) || t >= S.bluedot.t0;
  const LEN = 9.6;
  for (let t0 = 0.5, k = 0; t0 < T; t0 += LEN, k++) {
    const ch = (warmZone(t0) ? WARM : MINOR)[k % 4];
    for (const n of ch) {
      for (const det of [-6, 6]) { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det + (rnd() - 0.5) * 4;
        og.gain.setValueAtTime(0, t0); og.gain.linearRampToValueAtTime(n < 50 ? 0.03 : 0.012, t0 + 3.5); og.gain.setValueAtTime(n < 50 ? 0.03 : 0.012, t0 + LEN); og.gain.linearRampToValueAtTime(0, t0 + LEN + 4);
        o.connect(og); og.connect(padF); o.start(t0); o.stop(t0 + LEN + 4.1); }
      // organ: soft sine partials
      for (const [h, a] of [[1, 0.018], [2, 0.008], [4, 0.003]]) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = midi(n) * h;
        og.gain.setValueAtTime(0, t0); og.gain.linearRampToValueAtTime(a, t0 + 4); og.gain.setValueAtTime(a, t0 + LEN); og.gain.linearRampToValueAtTime(0, t0 + LEN + 4); o.connect(og); og.connect(padF); o.start(t0); o.stop(t0 + LEN + 4.1); }
    }
  }
  // string swells at the reveals
  const swells = [S.ascend.t0 + 2, cueT('worlds', 1), cueT('archive', 4), S.zoom.t0, cueT('quantum', 1) + 3, cueT('lab', 1) + 1, cueT('mind', 0) + 1, cueT('outside', 1), S.bluedot.t0 + 4, S.end.t0 + 11];
  for (const t0 of swells) {
    const root = warmZone(t0) ? 65 : 64;
    for (const n of [root, root + 7, root + 12]) for (const det of [-8, 0, 8]) {
      const o = ctx.createOscillator(), og = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det;
      const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.2; vg.gain.value = 6; vib.connect(vg); vg.connect(o.detune); vib.start(t0); vib.stop(t0 + 11);
      f.type = 'lowpass'; f.frequency.setValueAtTime(500, t0); f.frequency.linearRampToValueAtTime(2600, t0 + 5); f.frequency.linearRampToValueAtTime(700, t0 + 10);
      og.gain.setValueAtTime(0, t0); og.gain.linearRampToValueAtTime(0.012, t0 + 5); og.gain.linearRampToValueAtTime(0, t0 + 10.5);
      o.connect(f); f.connect(og); og.connect(music); og.connect(verb); o.start(t0); o.stop(t0 + 11);
    }
  }
  // ---- the ticking pulse (clock motif) ----
  const tick = (t, hi, vol) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hi ? 3400 : 2100; f.Q.value = 6;
    const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol, t + 0.002); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    s.connect(f); f.connect(e); e.connect(sfx); e.connect(sverb); s.start(t, rnd() * 3, 0.08); };
  const tickZones = [[0.3, cueT('window', 1) + 0.1, 0.5, 1.0], [S.build.t0, S.worlds.t0, 0.12, 1.25], [cueT('archive', 2) - 1, S.zoom.t0 - 1, 0.13, 1.25], [S.lab.t0, S.test.t0 + 1, 0.16, 1.003], [cueT('test', 2), S.moments.t0 - 1, 0.12, 1.25], [cueT('outside', 1), S.outside.t1 - 8, 0.14, 1.25]];
  for (const [a, b, v, dt] of tickZones) { let i = 0; for (let t = a; t < b; t += dt, i++) tick(t, i % 2 === 0, v * Math.min(1, (t - a) / 2 + 0.3)); }
  // window: the clock keeps ticking after the freeze
  { let i = 0; for (let t = cueT('window', 2) + 0.1; t < S.ascend.t0 + 1; t += 1.0, i++) tick(t, i % 2 === 0, 0.35 * Math.max(0, 1 - (t - cueT('window', 2)) / 18)); }

  // ---- sound effects ----
  const noiseBed = (a, b, type, f0, q, vol, fadeIn = 1.5) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = f0; f.Q.value = q;
    const e = ctx.createGain(); e.gain.setValueAtTime(0, a); e.gain.linearRampToValueAtTime(vol, a + fadeIn); e.gain.setValueAtTime(vol, Math.max(a + fadeIn, b - 1.5)); e.gain.linearRampToValueAtTime(0, b); s.connect(f); f.connect(e); e.connect(sfx); s.start(a); s.stop(b + 0.1); return e; };
  // water drop (matches the visual: lands at 2.01 s)
  { const t = 2.01, o = ctx.createOscillator(), e = ctx.createGain(); o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(380, t + 0.09);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.5, t + 0.004); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.connect(e); e.connect(sfx); e.connect(sverb); o.start(t); o.stop(t + 0.3); }
  // city ambience: low traffic rumble and air, dropped out during the frozen second
  noiseBed(S.window.t0, S.ascend.t0 + 1.5, 'lowpass', 280, 0.7, 0.16);
  noiseBed(S.window.t0, S.ascend.t0 + 1.5, 'bandpass', 1200, 0.5, 0.025);
  for (let t = S.window.t0 + 2; t < cueT('window', 1); t += 1.1 + rnd() * 1.6) { const o = ctx.createOscillator(), e = ctx.createGain(); const f = 2600 + rnd() * 1800; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (1.15 + rnd() * 0.2), t + 0.08);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.03, t + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); o.connect(e); e.connect(sfx); o.start(t); o.stop(t + 0.15); }
  // rain on the return
  noiseBed(S.return.t0, S.bluedot.t0 + 3, 'highpass', 2500, 0.4, 0.06, 2.5); noiseBed(S.return.t0, S.bluedot.t0 + 3, 'lowpass', 500, 0.5, 0.07, 2.5);
  // archive: a low room tone, and a deep thrum when each door lights
  noiseBed(S.archive.t0, S.archive.t1, 'lowpass', 120, 1.2, 0.12, 3);
  for (const k of [2, 3, 4]) { const t = cueT('archive', k) - 0.2, o = ctx.createOscillator(), e = ctx.createGain(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(42, t + 1.8);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.35, t + 0.05); e.gain.exponentialRampToValueAtTime(0.0001, t + 3); o.connect(e); e.connect(sfx); e.connect(sverb); o.start(t); o.stop(t + 3.1); }
  // zoom: whooshes between scales
  { const D = S.zoom.t1 - S.zoom.t0 + 0.8, seg = D / 7; for (let i = 1; i < 7; i++) { const t = S.zoom.t0 + i * seg - 0.4, s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3000, t + 0.5); const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.09, t + 0.35); e.gain.linearRampToValueAtTime(0, t + 0.8); s.connect(f); f.connect(e); e.connect(sfx); s.start(t, rnd(), 1); } }
  // quantum: the first electrons arrive as soft clicks
  { const t0 = cueT('quantum', 0) + 1.2; for (let i = 0; i < 8; i++) { const t = t0 + i * 0.8; const o = ctx.createOscillator(), e = ctx.createGain(); o.frequency.value = 1900 + rnd() * 300; e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.06, t + 0.002); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); o.connect(e); e.connect(sfx); o.start(t); o.stop(t + 0.06); } }
  // lab: ventilation hum
  noiseBed(S.lab.t0, S.lab.t1, 'lowpass', 180, 0.8, 0.05, 2);
  // the outside reveal: a sub drone that fades into darkness
  { const a = cueT('outside', 1), b = S.outside.t1 - 2, o = ctx.createOscillator(), e = ctx.createGain(); o.frequency.value = 36.7; e.gain.setValueAtTime(0, a); e.gain.linearRampToValueAtTime(0.16, a + 5); e.gain.linearRampToValueAtTime(0, b); o.connect(e); e.connect(music); o.start(a); o.stop(b + 0.1); }

  return ctx.startRendering();
}
