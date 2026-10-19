// THE REALITY TEST: film clock, scene transitions, overlays.
'use strict';
const W = 1920, H = 1080;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputEncoding = THREE.LinearEncoding; renderer.toneMapping = THREE.NoToneMapping;
renderer.physicallyCorrectLights = false;
const COMP = new Compositor(renderer, W, H);
const SHOT = {};          // filled by shots_*.js: id -> { init(), layers(lt, sc), overlay?(lt, sc), grade?(lt) }
const WORLD = {};         // lazily built worlds shared between shots
function world(name, make) { if (!WORLD[name]) WORLD[name] = make(); return WORLD[name]; }
const TEX = {};
const loader = new THREE.TextureLoader();
const loadTex = (k, url, srgb = true) => new Promise(res => loader.load(url, t => { if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; TEX[k] = t; res(); }, undefined, () => res()));
window.__ready = Promise.all([loadTex('day', 'tex/earth_day.jpg'), loadTex('night', 'tex/earth_night.jpg'), loadTex('clouds', 'tex/earth_clouds.jpg', false), loadTex('mw', 'tex/milkyway.jpg'),
  document.fonts ? document.fonts.ready : Promise.resolve()]);

// boundary transition types between consecutive scenes: x = crossfade, b = dip to black
const TRANS = { 'drip>window': 'b', 'window>ascend': 'x', 'ascend>build': 'x', 'build>worlds': 'x', 'worlds>archive': 'b', 'archive>zoom': 'b',
  'zoom>laws': 'x', 'laws>quantum': 'b', 'quantum>lab': 'b', 'lab>test': 'x', 'test>moments': 'b', 'moments>mind': 'x', 'mind>outside': 'b',
  'outside>return': 'b', 'return>bluedot': 'x', 'bluedot>end': 'b' };
const XF = 1.6, DIP = 0.75;

// ---------- overlays ----------
const OVL = document.getElementById('ov'), OVE = {};
function ov(id, html, css) { let e = OVE[id]; if (!e) { e = document.createElement('div'); e.className = 'o'; OVL.appendChild(e); OVE[id] = e; } if (e._h !== html) { e.innerHTML = html; e._h = html; } if (css && e._c !== css) { e.style.cssText = css; e._c = css; } return e; }
function show(id, k) { const e = OVE[id]; if (!e) return; const o = clamp(k).toFixed(3); if (e.style.opacity !== o) e.style.opacity = o; e.style.visibility = k > 0.002 ? 'visible' : 'hidden'; }
const ALL_IDS = new Set();
function overlay(id, html, css, k) { ALL_IDS.add(id); ov(id, html, css); show(id, k); seen.add(id); }
let seen = new Set();

function cueTimes(sc) { return sc.cues; }
function frame(t) {
  seen = new Set();
  const S = TL.scenes; let i = 0; while (i < S.length - 1 && t >= S[i].t1) i++;
  const parts = [[i, 1]]; let fade = 1;
  const nb = S[i + 1], pb = S[i - 1];
  if (nb) { const ty = TRANS[S[i].id + '>' + nb.id] || 'x'; if (ty === 'x' && t > S[i].t1 - XF / 2) { const k = sstep(S[i].t1 - XF / 2, S[i].t1 + XF / 2, t); parts[0][1] = 1 - k; parts.push([i + 1, k]); } if (ty === 'b') fade = Math.min(fade, sstep(S[i].t1, S[i].t1 - DIP, t)); }
  if (pb) { const ty = TRANS[pb.id + '>' + S[i].id] || 'x'; if (ty === 'x' && t < S[i].t0 + XF / 2) { const k = sstep(S[i].t0 - XF / 2, S[i].t0 + XF / 2, t); parts[0][1] = k; parts.push([i - 1, 1 - k]); } if (ty === 'b') fade = Math.min(fade, sstep(S[i].t0, S[i].t0 + DIP, t)); }
  const layers = []; let grade = { exposure: 1, sat: 1 }, gw = 0;
  for (const [j, w] of parts) {
    const sc = S[j], sh = SHOT[sc.id]; if (!sh || w <= 0) continue;
    if (!sh._init) { sh.init && sh.init(); sh._init = true; }
    const lt = t - sc.t0, L = sh.layers(lt, sc, t) || [];
    for (const l of L) layers.push(Object.assign({}, l, { w: (l.w == null ? 1 : l.w) * w }));
    const g = sh.grade ? sh.grade(lt, sc) : {};
    grade.exposure = lerp(grade.exposure, g.exposure || 1, w >= 0.5 ? 1 : 0); grade.sat = lerp(grade.sat, g.sat != null ? g.sat : 1, w);
    if (sh.overlay) sh.overlay(lt, sc, w, t);
  }
  grade.fade = fade; grade.seed = (t * 24) % 97;
  COMP.frame(layers, grade);
  // subtitles
  let sub = ''; for (const [a, b, x] of TL.subs) if (t >= a && t < b) { sub = x; break; }
  overlay('sub', sub ? '<span>' + sub + '</span>' : '', '', sub ? 1 : 0);
  // chapter card
  for (const [c0, name] of TL.chapters) { const [num, ...rest] = name.split(' · '); const k = win(t, c0 + 0.8, c0 + 6.2, 0.8);
    overlay('chap' + num, '<small>CHAPTER ' + num + '</small><b>' + rest.join(' · ') + '</b>', '', k); }
  overlay('brand', '3D UNIVERSAL LEARNING', '', t > 4 && t < TL.total - 17 ? 0.55 : 0);
  for (const id of ALL_IDS) if (!seen.has(id)) show(id, 0);
}

// ---------- clock ----------
let started = false;
function loop() {
  requestAnimationFrame(loop);
  const t = (window.__startAt || 0) + performance.now() / 1000;
  if (!window.__assetsOK) return;
  frame(Math.min(t, TL.total - 0.001));
}
window.__ready.then(() => { window.__assetsOK = true; });
requestAnimationFrame(loop);
window.__frame = frame;
