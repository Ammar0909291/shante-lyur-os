// Original background score for MAYA YA SIMULATION, rendered offline (Web Audio). renderScore(TL) -> Promise<AudioBuffer>.
// A tanpura-style drone on D, slow pads (minor through the tests, warmer in the last chapter), string swells at each chapter,
// a ticking clock in the cold open, and silence before the two key moments. Music ducks under every narration cue.
async function renderScore(TL) {
  const SR = 48000, T = TL.total, ctx = new OfflineAudioContext(2, Math.ceil(SR * T), SR);
  let seed = 4242; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const CH = Object.fromEntries(TL.chapters.map(c => [c.id, c.t0]));
  const truth = CH.truth, q0 = TL.questions[0];

  const master = ctx.createGain(); master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 2.5; master.connect(comp); comp.connect(ctx.destination);
  const hole = ctx.createGain(); hole.connect(master); hole.gain.setValueAtTime(1, 0);
  for (const [a, b] of TL.holes) { hole.gain.setTargetAtTime(0, a, 0.08); hole.gain.setTargetAtTime(1, b, 0.5); }
  const music = ctx.createGain(); music.connect(hole);
  const impulse = (sec, dec) => { const n = Math.floor(SR * sec), b = ctx.createBuffer(2, n, SR); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / n, dec); } return b; };
  const verb = ctx.createConvolver(); verb.buffer = impulse(6, 2.8); const vo = ctx.createGain(); vo.gain.value = 0.6; verb.connect(vo); vo.connect(music);
  const noiseBuf = (() => { const b = ctx.createBuffer(1, SR * 4, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; return b; })();

  // ducking
  const g = music.gain; g.setValueAtTime(0.0001, 0); g.setTargetAtTime(1, 0.2, 0.8);
  const env = []; for (const c of TL.cues) if (c.text) { env.push([c.t0 - 0.3, 0.32]); env.push([c.t1 + 0.4, 1]); }
  env.sort((a, b) => a[0] - b[0]); for (const [t, v] of env) g.setTargetAtTime(v, Math.max(0, t), v < 1 ? 0.15 : 0.7);
  g.setTargetAtTime(0.0001, T - 3, 0.9);

  // tanpura drone: Pa - Sa - Sa - sa (A2, D3, D3, D2) plucked every 1.1 s with rich, slowly decaying harmonics
  const tan = ctx.createGain(); tan.gain.setValueAtTime(0, 0); tan.gain.setTargetAtTime(0.55, 1.5, 3); tan.connect(music); tan.connect(verb);
  tan.gain.setTargetAtTime(0.25, CH.t1, 4); tan.gain.setTargetAtTime(0.45, truth, 4); tan.gain.setTargetAtTime(0.0001, T - 4, 1.2);
  const pattern = [57 - 12, 62 - 12, 62 - 12, 50 - 12];
  for (let t = 1.0, k = 0; t < T - 2; t += 1.1, k++) {
    const f = midi(pattern[k % 4] + 12);
    for (const [h, a] of [[1, 0.05], [2, 0.03], [3, 0.022], [4, 0.014], [5, 0.01], [6, 0.007], [8, 0.004]]) {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = f * h * (1 + (rnd() - 0.5) * 0.0015);
      og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(a, t + 0.02); og.gain.setTargetAtTime(0, t + 0.05, 1.3 / Math.sqrt(h));
      o.connect(og); og.connect(tan); o.start(t); o.stop(t + 5);
    }
  }

  // pads
  const pad = ctx.createGain(); pad.gain.setValueAtTime(0, 0); pad.connect(music);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(pad); lp.connect(verb);
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.04; lg.gain.value = 300; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(0);
  const level = { rishi: 0.35, sim: 0.55, diff: 0.45, t1: 0.7, t2: 0.75, t3: 0.85, cheat: 0.6, truth: 0.6 };
  pad.gain.setTargetAtTime(0.25, 6, 3);
  for (const c of TL.chapters) pad.gain.setTargetAtTime(level[c.id], c.t0, 3);
  pad.gain.setTargetAtTime(0.5, q0, 2); pad.gain.setTargetAtTime(0.0001, T - 4, 1.2);
  const MINOR = [[38, 50, 53, 57, 62], [34, 46, 53, 58, 62], [36, 48, 55, 60, 64], [33, 45, 52, 57, 61]];
  const WARM = [[38, 50, 54, 57, 62], [43, 50, 55, 59, 62], [36, 48, 52, 55, 64], [41, 48, 53, 57, 60]];
  const LEN = 10;
  for (let t0 = 0.5, k = 0; t0 < T; t0 += LEN, k++) {
    const ch = (t0 >= truth - 2 ? WARM : MINOR)[k % 4];
    for (const n of ch) for (const det of [-7, 7]) {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det + (rnd() - 0.5) * 4;
      const a = n < 45 ? 0.026 : 0.01;
      og.gain.setValueAtTime(0, t0); og.gain.linearRampToValueAtTime(a, t0 + 4); og.gain.setValueAtTime(a, t0 + LEN); og.gain.linearRampToValueAtTime(0, t0 + LEN + 4);
      o.connect(og); og.connect(lp); o.start(t0); o.stop(t0 + LEN + 4.1);
    }
  }

  // string swells at each chapter card and at the end
  for (const t0 of [...TL.chapters.map(c => c.t0 - 1), TL.title[0], q0 - 1]) {
    const root = t0 >= truth - 2 ? 62 : 62;
    for (const n of [root, root + 7, root + 12]) for (const det of [-9, 0, 9]) {
      const o = ctx.createOscillator(), og = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det;
      const v = ctx.createOscillator(), vg = ctx.createGain(); v.frequency.value = 5; vg.gain.value = 6; v.connect(vg); vg.connect(o.detune); v.start(t0); v.stop(t0 + 10);
      f.type = 'lowpass'; f.frequency.setValueAtTime(400, t0); f.frequency.linearRampToValueAtTime(2400, t0 + 4); f.frequency.linearRampToValueAtTime(600, t0 + 9);
      og.gain.setValueAtTime(0, t0); og.gain.linearRampToValueAtTime(0.011, t0 + 4); og.gain.linearRampToValueAtTime(0, t0 + 9.5);
      o.connect(f); f.connect(og); og.connect(music); og.connect(verb); o.start(t0); o.stop(t0 + 10);
    }
  }

  // ticking clock: cold open, and quietly under the first test
  const tick = (t, hi, vol) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hi ? 3300 : 2100; f.Q.value = 6;
    const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol, t + 0.002); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    s.connect(f); f.connect(e); e.connect(master); e.connect(verb); s.start(t, rnd() * 3, 0.08); };
  const firstLineEnd = TL.cues[1].t1;
  for (let t = 0.3, k = 0; t < firstLineEnd + 1; t += 1.0, k++) tick(t, k % 2, 0.35);
  for (let t = CH.t1 + 2, k = 0; t < CH.t2 - 3; t += 1.0, k++) tick(t, k % 2, 0.06);

  // low boom under the title card, the "300" reveal and the black hole
  const boom = (t, vol) => { const o = ctx.createOscillator(), e = ctx.createGain(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(32, t + 2.5);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol, t + 0.03); e.gain.setTargetAtTime(0, t + 0.1, 0.9); o.connect(e); e.connect(master); e.connect(verb); o.start(t); o.stop(t + 5); };
  boom(TL.title[0], 0.5); boom(TL.three[0] + 0.2, 0.45); boom(CH.t3, 0.4);

  return await ctx.startRendering();
}
