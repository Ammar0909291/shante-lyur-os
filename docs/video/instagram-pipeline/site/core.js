// Earth-stop short: engine core. Everything is a pure function of film time t, so any frame renders alone.
'use strict';
const SS = 1.5, W = Math.round(1080 * SS), H = Math.round(1920 * SS), XF = 0.5;   // render supersampled, the page scales it to 1080x1920
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputEncoding = THREE.LinearEncoding; renderer.toneMapping = THREE.NoToneMapping;
const COMP = new Compositor(renderer, W, H);
const SHOTS = [];          // { id, t0, t1, init?, layers(lt,t), grade?(lt,t), overlay?(lt,t,w) }  contiguous in time
const TEX = {};
const BLACK = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat); BLACK.needsUpdate = true;
const loader = new THREE.TextureLoader();
const loadTex = (k, url, srgb = true) => new Promise(res => loader.load(url, t => { if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 16; TEX[k] = t; res(); }, undefined, () => { console.error('texture failed ' + url); res(); }));
window.__ready = Promise.all([loadTex('day', 'tex/earth_day_8k.jpg'), loadTex('night', 'tex/earth_night_8k.jpg'), loadTex('clouds', 'tex/earth_clouds.jpg', false),
  loadTex('mw', 'tex/milkyway.jpg'), loadTex('moon', 'tex/moon.jpg'), loadTex('moonbump', 'tex/moon_bump.jpg', false), ...['B1','B2','B3','B4','I1','I2','I3','S1','S2','S3'].map(n => loadTex(n, 'imgs/' + n + '.png')), document.fonts ? document.fonts.ready : Promise.resolve()]);

const cue = id => TL.cues.find(c => c.id === id);
// project a world point to 540x960 CSS px
function proj(v, cam) { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * 540, y: (-p.y * 0.5 + 0.5) * 960, z: p.z }; }

// ---------- overlays (HTML on top of the canvas) ----------
const OVL = document.getElementById('ov'), OVE = {}, ALL_IDS = new Set();
let seen = new Set();
function overlay(id, html, css, k) {
  ALL_IDS.add(id); seen.add(id);
  let e = OVE[id];
  if (!e) { e = document.createElement('div'); e.className = id === 'sub' ? 'o sub' : 'o'; OVL.appendChild(e); OVE[id] = e; }
  if (e._h !== html) { e.innerHTML = html; e._h = html; }
  if (css && e._c !== css) { e.style.cssText = css; e._c = css; }
  const o = clamp(k).toFixed(3); if (e.style.opacity !== o) e.style.opacity = o;
  e.style.visibility = k > 0.002 ? 'visible' : 'hidden';
}

let _sorted = false, QUIET = false;
function segAt(tr) { const S = TL.seg; for (let i = 0; i < S.length; i++) if (tr < S[i][1]) return i; return S.length - 1; }
// ---- subscribe / follow call-to-action (icons only, no channel name) ----
const SVG_YT = '<svg width="44" height="31" viewBox="0 0 44 31"><rect width="44" height="31" rx="8" fill="#ff0000"/><path d="M18 8.5v14l12-7z" fill="#fff"/></svg>';
const SVG_IG = '<svg width="38" height="38" viewBox="0 0 38 38"><defs><linearGradient id="igg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#feda75"/><stop offset=".3" stop-color="#fa7e1e"/><stop offset=".55" stop-color="#d62976"/><stop offset=".8" stop-color="#962fbf"/><stop offset="1" stop-color="#4f5bd5"/></linearGradient></defs><rect width="38" height="38" rx="10" fill="url(#igg)"/><rect x="8" y="8" width="22" height="22" rx="6.5" fill="none" stroke="#fff" stroke-width="2.4"/><circle cx="19" cy="19" r="5.2" fill="none" stroke="#fff" stroke-width="2.4"/><circle cx="26" cy="12" r="1.5" fill="#fff"/></svg>';
function cta(t, t0, dur, big) {
  const lt = t - t0, k = win(t, t0, t0 + dur, 0.4); if (k <= 0.002) return;
  const press = sstep(1.9, 2.05, lt), pulse = lt > 1.9 && lt < 2.35 ? 1 - 0.07 * Math.sin(Math.PI * (lt - 1.9) / 0.45) : 1;
  const sc = big ? 1.22 : 1, rise = (1 - ease(Math.min(1, lt / 0.45))) * 16;
  const btn = (on, off, c1, c2, w) => `<div style="display:inline-block;min-width:${w}px;text-align:center;padding:8px 14px;border-radius:7px;background:${press > 0.5 ? c2 : c1};color:#fff;font-family:'PM',monospace;font-size:13px;letter-spacing:.09em;transform:scale(${pulse.toFixed(3)});box-shadow:0 2px 10px rgba(0,0,0,.5)">${press > 0.5 ? off : on}</div>`;
  const html = `<div style="display:flex;align-items:center;justify-content:center;gap:9px;transform:scale(${sc});transform-origin:50% 50%">${SVG_YT}${btn('SUBSCRIBE', 'SUBSCRIBED ✓', '#e50000', '#4a4a4a', 112)}<span style="width:12px"></span>${SVG_IG}${btn('FOLLOW', 'FOLLOWING ✓', '#0095f6', '#4a4a4a', 84)}</div>`;
  overlay('cta' + t0, html, `left:0;width:540px;top:${(big ? 640 : 690) + rise}px`, k);
}
function frame(tr) {
  const si = segAt(tr), S = TL.seg[si], u = clamp((tr - S[0]) / (S[1] - S[0])), t = lerp(S[2], S[3], u);
  if (!_sorted) { SHOTS.sort((a, b) => a.t0 - b.t0); _sorted = true; }
  seen = new Set(); QUIET = !!S[5];
  const D = 0.14; let w = 1;
  if (si > 0 && !S[4]) w *= sstep(S[0], S[0] + D, tr);
  if (si < TL.seg.length - 1 && !(TL.seg[si + 1][4])) w *= 1 - sstep(S[1] - D, S[1], tr);
  let s = SHOTS[SHOTS.length - 1]; for (const x of SHOTS) if (t >= x.t0 && t < x.t1) { s = x; break; }
  if (!s._init) { s.init && s.init(); s._init = true; }
  const lt = t - s.t0, layers = s.layers(lt, t).map(l => Object.assign({}, l, { w: (l.w == null ? 1 : l.w) * w }));
  const g = s.grade ? s.grade(lt, t) : {};
  if (s.overlay) s.overlay(lt, t, w);
  const fadeIn = sstep(0, 0.35, tr), fadeOut = 1 - sstep(TL.total - 0.5, TL.total, tr);
  COMP.frame(layers, { exposure: g.exposure || 1, sat: g.sat != null ? g.sat : 1, fade: Math.min(fadeIn, fadeOut), seed: (tr * 24) % 97 });
  overlay('hyp', '<div class="tag">काल्पनिक · HYPOTHETICAL</div>', 'left:24px;top:118px', win(tr, 0.4, TL.hypEnd, 0.5));
  let sub = '', sk = 0;
  for (const c of TL.cues) { const k = win(tr, c.t0 - 0.05, c.t1 + 0.22, 0.12); if (k > sk) { sk = k; sub = c.sub; } }
  overlay('sub', '<span>' + sub + '</span>', '', sub ? sk : 0);
  TL.cta.forEach((c0, i) => cta(tr, c0, i === TL.cta.length - 1 ? TL.total - c0 : 4.4, i === TL.cta.length - 1));
  for (const id of ALL_IDS) if (!seen.has(id)) { const e = OVE[id]; e.style.opacity = '0'; e.style.visibility = 'hidden'; }
}
