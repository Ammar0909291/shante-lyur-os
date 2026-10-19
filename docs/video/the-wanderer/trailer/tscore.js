// Original 60 s trailer score for THE WANDERER (offline Web Audio). renderScore(TL) -> AudioBuffer
async function renderScore(TL) {
  const SR = 48000, T = TL.total, ctx = new OfflineAudioContext(2, Math.ceil(SR * T), SR);
  let seed = 777; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const master = ctx.createGain(); master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; master.connect(comp); comp.connect(ctx.destination);
  const music = ctx.createGain(); music.connect(master); const hits = ctx.createGain(); hits.connect(master);
  const impulse = (sec, dec) => { const n = Math.floor(SR * sec), b = ctx.createBuffer(2, n, SR); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / n, dec); } return b; };
  const verb = ctx.createConvolver(); verb.buffer = impulse(6, 2.6); const vo = ctx.createGain(); vo.gain.value = 0.6; verb.connect(vo); vo.connect(master);
  const noise = (() => { const b = ctx.createBuffer(1, SR * 4, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; return b; })();
  // ducking under the narration
  const g = music.gain; g.setValueAtTime(1, 0);
  for (const [a, b] of TL.cues) { g.setTargetAtTime(0.42, a - 0.2, 0.1); g.setTargetAtTime(1, b + 0.3, 0.5); }
  // intensity rises across the montage, peaks into the end card
  const lvl = ctx.createGain(); lvl.connect(music); lvl.gain.setValueAtTime(0.0001, 0); lvl.gain.linearRampToValueAtTime(0.45, 3); lvl.gain.linearRampToValueAtTime(0.7, 30); lvl.gain.linearRampToValueAtTime(1.0, 53.6); lvl.gain.setTargetAtTime(0.55, 54.2, 0.8); lvl.gain.setTargetAtTime(0.0001, T - 2.2, 0.6);
  const padF = ctx.createBiquadFilter(); padF.type = 'lowpass'; padF.Q.value = 0.6; padF.frequency.setValueAtTime(600, 0); padF.frequency.linearRampToValueAtTime(2400, 53.6); padF.frequency.setTargetAtTime(1200, 54.5, 1.5);
  padF.connect(lvl); padF.connect(verb);
  // pads: one chord per 6 s shot (A minor mystery), lifting to a major resolve on the end card
  const CH = [[45, 57, 60, 64], [41, 53, 57, 60, 67], [48, 55, 60, 64], [43, 55, 59, 62], [45, 57, 60, 64, 71], [41, 53, 57, 60], [38, 50, 57, 62, 65], [40, 52, 56, 59, 64], [41, 53, 60, 65, 69], [45, 57, 61, 64, 69, 76]];
  CH.forEach((ch, k) => { const t0 = k * 6, L = k === 9 ? T - t0 : 6;
    for (const n of ch) for (const det of [-7, 7]) { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det + (rnd() - 0.5) * 5;
      const a = n < 50 ? 0.034 : 0.013; og.gain.setValueAtTime(0, t0); og.gain.linearRampToValueAtTime(a, t0 + 0.9); og.gain.setValueAtTime(a, t0 + L - 0.3); og.gain.linearRampToValueAtTime(0, t0 + L + 1.2);
      o.connect(og); og.connect(padF); o.start(t0); o.stop(t0 + L + 1.3); } });
  // ticking clock pulse (the channel motif), doubling in the final stretch
  const tick = (t, amp, f = 2400) => { const s = ctx.createBufferSource(); s.buffer = noise; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 9; const tg = ctx.createGain();
    tg.gain.setValueAtTime(amp, t); tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(bp); bp.connect(tg); tg.connect(music); tg.connect(verb); s.start(t, rnd() * 3, 0.07); };
  for (let t = 0.5; t < 54; t += t < 42 ? 1.0 : 0.5) tick(t, (t < 42 ? 0.22 : 0.3), Math.round(t * 2) % 2 ? 2000 : 2600);
  // low pulse heartbeat from shot 3 on
  for (let t = 12; t < 54; t += 1.0) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.25); og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(0.16 + 0.1 * (t - 12) / 42, t + 0.01); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); o.connect(og); og.connect(music); o.start(t); o.stop(t + 0.45); }
  // cinematic hit at every cut: sub boom + filtered noise
  const boom = (t, amp, dec = 2.2) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.2); og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(amp, t + 0.02); og.gain.exponentialRampToValueAtTime(0.0001, t + dec); o.connect(og); og.connect(hits); og.connect(verb); o.start(t); o.stop(t + dec + 0.1);
    const s = ctx.createBufferSource(); s.buffer = noise; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3000, t); lp.frequency.exponentialRampToValueAtTime(200, t + 1); const ng = ctx.createGain(); ng.gain.setValueAtTime(amp * 0.35, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.4); s.connect(lp); lp.connect(ng); ng.connect(hits); ng.connect(verb); s.start(t, 0, 1.5); };
  for (let k = 1; k <= 8; k++) boom(k * 6, 0.32);
  boom(0.05, 0.25);
  // riser into the end card, then a short silence, then the final hit
  { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2; bp.frequency.setValueAtTime(300, 47); bp.frequency.exponentialRampToValueAtTime(6000, 53.6); const rg = ctx.createGain(); rg.gain.setValueAtTime(0.0001, 47); rg.gain.exponentialRampToValueAtTime(0.25, 53.55); rg.gain.linearRampToValueAtTime(0, 53.65); s.connect(bp); bp.connect(rg); rg.connect(hits); rg.connect(verb); s.start(47); s.stop(54); }
  const hole = ctx.createGain(); music.disconnect(); music.connect(hole); hole.connect(master); hole.gain.setValueAtTime(1, 0); hole.gain.setTargetAtTime(0, 53.65, 0.03); hole.gain.setTargetAtTime(1, 54.0, 0.2);
  boom(54.0, 0.6, 4.0);
  // subscribe click + bell on the end card (button press at 54 + 2.55 s)
  { const t = 56.55, s = ctx.createBufferSource(); s.buffer = noise; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000; const cg = ctx.createGain(); cg.gain.setValueAtTime(0.35, t); cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03); s.connect(hp); hp.connect(cg); cg.connect(hits); s.start(t, 0, 0.04);
    for (const [f, a] of [[1318.5, 0.12], [2637, 0.05], [1975.5, 0.04]]) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = f; og.gain.setValueAtTime(0.0001, t + 0.08); og.gain.linearRampToValueAtTime(a, t + 0.09); og.gain.exponentialRampToValueAtTime(0.0001, t + 1.6); o.connect(og); og.connect(hits); og.connect(verb); o.start(t + 0.08); o.stop(t + 1.7); } }
  return ctx.startRendering();
}
