// Original score + sound design for the 60 s black-hole short, rendered offline with Web Audio. renderScore(N) -> AudioBuffer.
// N: narration windows [[t0,t1],...] for ducking. Arc: mystery -> impact -> wonder -> quiet ending.
async function renderScore(N) {
  const SR = 48000, T = 60, ctx = new OfflineAudioContext(2, SR * T, SR);
  let seed = 77; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const master = ctx.createGain(); master.gain.value = 0.85;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; master.connect(comp); comp.connect(ctx.destination);
  const music = ctx.createGain(); music.connect(master); const sfx = ctx.createGain(); sfx.connect(master);
  const imp = (sec, dec) => { const n = SR * sec, b = ctx.createBuffer(2, n, SR); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / n, dec); } return b; };
  const verb = ctx.createConvolver(); verb.buffer = imp(4.5, 2.6); const vo = ctx.createGain(); vo.gain.value = 0.45; verb.connect(vo); vo.connect(music);
  const noise = (() => { const b = ctx.createBuffer(1, SR * 4, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; return b; })();
  // ducking under the narration
  const g = music.gain; g.setValueAtTime(1, 0);
  for (const [a, b] of N) { g.setTargetAtTime(0.42, a - 0.15, 0.08); g.setTargetAtTime(1, b + 0.2, 0.4); }
  // section levels: quiet for the unknown (45-50) and the ending
  const sect = ctx.createGain(); music.disconnect(); music.connect(sect); sect.connect(master);
  [[0, 0.8], [4, 0.9], [9.2, 1], [20, 1], [33, 0.7], [39, 1.1], [45, 0.35], [50, 0.6], [56, 0.5], [59, 0.0001]].forEach(([t, v]) => sect.gain.setTargetAtTime(v, t, 0.6));

  // pads: D minor (mystery) -> D major / Bb lydian colours for wonder (20-45) -> D minor quiet
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.connect(music); lp.connect(verb);
  const MIN = [[38, 50, 57, 62, 65], [34, 46, 53, 58, 62], [36, 48, 55, 60, 64], [33, 45, 52, 57, 64]];
  const WON = [[38, 50, 57, 62, 66], [34, 46, 53, 58, 64], [41, 53, 57, 60, 67], [43, 50, 55, 59, 66]];
  for (let t0 = 0, k = 0; t0 < 60; t0 += 5, k++) {
    const ch = (t0 >= 19.5 && t0 < 45 ? WON : MIN)[k % 4];
    for (const n of ch) for (const det of [-7, 7]) {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det + (rnd() - .5) * 4;
      const a = n < 45 ? 0.03 : 0.011; og.gain.setValueAtTime(0, t0); og.gain.linearRampToValueAtTime(a, t0 + 2); og.gain.setValueAtTime(a, t0 + 5); og.gain.linearRampToValueAtTime(0, t0 + 7.5);
      o.connect(og); og.connect(lp); o.start(t0); o.stop(t0 + 7.6);
    }
  }
  // impacts and booms
  const boom = (t, vol, f0 = 60, len = 3) => { const o = ctx.createOscillator(), e = ctx.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(28, t + len);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol, t + 0.02); e.gain.setTargetAtTime(0, t + 0.08, len / 3); o.connect(e); e.connect(sfx); e.connect(verb); o.start(t); o.stop(t + len + 2); };
  const hit = (t, vol) => { const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const e = ctx.createGain(); e.gain.setValueAtTime(vol, t); e.gain.setTargetAtTime(0, t + 0.01, 0.35); s.connect(f); f.connect(e); e.connect(sfx); e.connect(verb); s.start(t, rnd(), 2); };
  const rumble = (a, b, vol) => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 120;
    const e = ctx.createGain(); e.gain.setValueAtTime(0, a); e.gain.linearRampToValueAtTime(vol, a + 1); e.gain.setValueAtTime(vol, b - 1.2); e.gain.linearRampToValueAtTime(0, b);
    s.connect(f); f.connect(e); e.connect(sfx); s.start(a); s.stop(b + 0.1); };
  boom(0.05, 0.85, 70, 3.5); hit(0.05, 0.6); rumble(0.4, 4.2, 0.5);                     // hook
  const sw = ctx.createOscillator(), swg = ctx.createGain(); sw.type = 'sawtooth'; sw.frequency.setValueAtTime(40, 4.6); sw.frequency.exponentialRampToValueAtTime(90, 5.35);
  const swf = ctx.createBiquadFilter(); swf.type = 'lowpass'; swf.frequency.setValueAtTime(200, 4.6); swf.frequency.exponentialRampToValueAtTime(1200, 5.35);
  swg.gain.setValueAtTime(0, 4.6); swg.gain.linearRampToValueAtTime(0.12, 5.3); swg.gain.linearRampToValueAtTime(0, 5.45); sw.connect(swf); swf.connect(swg); swg.connect(sfx); sw.start(4.6); sw.stop(5.5);
  boom(5.35, 0.8, 80, 4); hit(5.35, 0.7); rumble(5.4, 9.0, 0.35);                      // supernova
  boom(9.2, 0.7, 55, 3.5);                                                                // collapse
  boom(39.0, 0.45, 50, 3); rumble(39.2, 44.8, 0.22);                                     // jets
  boom(56.0, 0.35, 45, 3);                                                                // end reveal
  // string swells at the reveals
  for (const t0 of [9.6, 20.2, 33.2, 39.4, 56.2]) for (const n of [62, 69, 74]) for (const det of [-8, 0, 8]) {
    const o = ctx.createOscillator(), og = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det;
    f.type = 'lowpass'; f.frequency.setValueAtTime(400, t0); f.frequency.linearRampToValueAtTime(2200, t0 + 2.5); f.frequency.linearRampToValueAtTime(600, t0 + 5.5);
    og.gain.setValueAtTime(0, t0); og.gain.linearRampToValueAtTime(0.009, t0 + 2.5); og.gain.linearRampToValueAtTime(0, t0 + 6); o.connect(f); f.connect(og); og.connect(music); og.connect(verb); o.start(t0); o.stop(t0 + 6.1);
  }
  // clock ticks during the time-dilation scene: fast far-away tick, slow near tick
  for (let t = 27.4; t < 32.9; t += 1.0) { const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 8;
    const e = ctx.createGain(); e.gain.setValueAtTime(0.25, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(f); f.connect(e); e.connect(sfx); s.start(t, rnd() * 3, 0.06); }
  for (let t = 27.4; t < 32.9; t += 2.2) { const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 8;
    const e = ctx.createGain(); e.gain.setValueAtTime(0.3, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); s.connect(f); f.connect(e); e.connect(sfx); e.connect(verb); s.start(t, rnd() * 3, 0.1); }
  return await ctx.startRendering();
}
