// COSMIC ZOOM: one continuous logarithmic pull-back from Earth to the large-scale structure of the universe.
// Each scale lives in its own scene and units (Earth radii, AU, light-years, millions of light-years) so floats stay precise;
// neighbouring scales cross-fade in log-distance. Distances and sizes are to scale except where noted (planet dots, galaxy models).
'use strict';
const W = 1080, H = 1920, LOOP = TL.total;
const KM_RE = 6371, KM_AU = 1.496e8, KM_LY = 9.461e12, KM_MLY = 9.461e18;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputEncoding = THREE.LinearEncoding; renderer.toneMapping = THREE.NoToneMapping;
window.__msaa = 4;
const COMP = new Compositor(renderer, W, H);
const TEX = {}, loader = new THREE.TextureLoader();
const loadTex = (k, url, srgb = true) => new Promise(res => loader.load(url, t => { if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; TEX[k] = t; res(); }, undefined, () => res()));
// scenes are built once the real imagery has loaded
window.__ready = Promise.all([loadTex('day', 'tex/earth_day.jpg'), loadTex('night', 'tex/earth_night.jpg'), loadTex('clouds', 'tex/earth_clouds.jpg', false), loadTex('mw', 'tex/milkyway.jpg'), loadTex('face', 'tex/mw_face_4k.jpg'), loadTex('hudf', 'tex/hudf_4k.jpg')]).then(() => {

// camera distance from the origin of each scale, as log10(km), keyed by film time (holds where the eye needs time)
const KEYS = [[0, 4.62], [2.5, 4.78], [5.5, 6.25], [8, 6.7], [11, 9.95], [12.5, 10.4], [14.5, 15.5], [17, 17.6], [19.5, 18.2], [21.5, 18.3], [25, 20.0], [28, 21.0], [34, 21.42]];
function logD(t) {
  if (t <= KEYS[0][0]) return KEYS[0][1];
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const [t0, a] = KEYS[i], [t1, b] = KEYS[i + 1], u = clamp((t - t0) / (t1 - t0));
  // smooth velocity through keys: cubic Hermite with averaged slopes
  const s = j => { const p = KEYS[Math.max(0, j - 1)], n = KEYS[Math.min(KEYS.length - 1, j + 1)]; return (n[1] - p[1]) / (n[0] - p[0]); };
  const m0 = s(i) * (t1 - t0), m1 = s(i + 1) * (t1 - t0), u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * a + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * b + (u3 - u2) * m1;
}
const band = (x, a0, a1, b0, b1) => Math.min(sstep(a0, a1, x), 1 - sstep(b0, b1, x));     // fade in over [a0,a1], out over [b0,b1]
const SUN = V3(1, 0.22, 0.42).normalize();

function stage(fov, near, far) { const s = new THREE.Scene(), c = new THREE.PerspectiveCamera(fov, W / H, near, far); s.add(c); return { s, c }; }
function pointCloud(pos, col, size, maxPx = 6) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { k: { value: 1 }, sz: { value: size }, mx: { value: maxPx } },
    vertexShader: `attribute vec3 color; varying vec3 vC; uniform float sz, mx; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = clamp(sz / -mv.z, 1.0, mx); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; uniform float k; void main(){ vec2 d = gl_PointCoord - .5; float a = exp(-dot(d, d) * 12.); gl_FragColor = vec4(vC * a * k, 1.); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
}
function glowSprite(color, scale) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.scale.setScalar(scale); return s; }

// ---------- A: Earth and Moon (units: Earth radii) ----------
const A = stage(36, 0.01, 2e4);
A.dir = SUN.clone().multiplyScalar(0.75).add(V3(-0.35, -0.05, 0.6)).normalize();
A.earth = makeEarth(TEX, { sun: SUN.clone() }); A.earth.userData.rot0 = 2.2; A.s.add(A.earth);
const moonTex = canvasTex(512, 256, (g, w, h) => { const N = makeNoise(5), img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = x / w * TAU, v = y / h * Math.PI, X = Math.cos(u) * Math.sin(v), Y = Math.cos(v), Z = Math.sin(u) * Math.sin(v);
    const m = N(X * 2 + 3, Y * 2, Z * 2, 5), c = N(X * 9, Y * 9 + 4, Z * 9, 3), k = 0.42 + 0.35 * sstep(0.45, 0.6, m) + 0.12 * c, i = (y * w + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255 * k * 0.92; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0); });
A.moon = new THREE.Mesh(new THREE.SphereGeometry(1737 / KM_RE, 96, 64), new THREE.ShaderMaterial({ uniforms: { map: { value: moonTex }, sun: { value: SUN } },
  vertexShader: `varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: `uniform sampler2D map; uniform vec3 sun; varying vec2 vUv; varying vec3 vN; void main(){ vec3 c = pow(texture2D(map, vUv).rgb, vec3(2.2)); gl_FragColor = vec4(c * max(dot(normalize(vN), sun), 0.) * 1.3, 1.); }` }));
A.moon.position.copy(V3(0.25, 1, 0).projectOnPlane(A.dir).normalize().multiplyScalar(384400 / KM_RE)); A.s.add(A.moon);
A.s.add(makeSkyDome(TEX.mw, 0.5, 1.5e4));

// ---------- B: the Solar System (units: AU; Earth at the origin) ----------
const B = stage(36, 1e-4, 4e5);
const sunPos = SUN.clone();          // the Sun is 1 AU away along the sunlight direction
const PL = [[0.387, 0x9a8f86, 1.0], [0.723, 0xe9d3a6, 1.3], [1.0, 0x6fa8ff, 1.35], [1.524, 0xd86a3a, 1.1], [5.2, 0xd9b48a, 2.2], [9.58, 0xe6d29c, 2.0], [19.2, 0x9fd6e0, 1.6], [30.1, 0x5f7fff, 1.6]];
{ // ecliptic: the plane containing the Sun-Earth line and the 'up' axis tilted slightly
  const n = V3(0.1, 1, -0.05).normalize(), e1 = sunPos.clone().negate().projectOnPlane(n).normalize(), e2 = n.clone().cross(e1);
  const R = rng(9);
  PL.forEach(([a, col, sz], i) => {
    const pts = []; for (let k = 0; k <= 256; k++) { const th = k / 256 * TAU; pts.push(sunPos.clone().addScaledVector(e1, a * Math.cos(th)).addScaledVector(e2, a * Math.sin(th))); }
    B.s.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x8aa6c8, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })));
    const th = i === 2 ? 0 : R() * TAU, p = sunPos.clone().addScaledVector(e1, a * Math.cos(th)).addScaledVector(e2, a * Math.sin(th));
    const d = glowSprite(new THREE.Color(col), 1); d.position.copy(p); d.userData.sz = sz; B.s.add(d); (B.dots = B.dots || []).push(d);
  });
}
B.sun = glowSprite(new THREE.Color(1.0, 0.86, 0.6), 1); B.sun.position.copy(sunPos); B.s.add(B.sun);
B.s.add(makeSkyDome(TEX.mw, 0.5, 3e5));
B.dir = V3(-0.3, 0.55, 1).normalize();

// ---------- C: the solar neighbourhood (units: light-years; Sun at the origin) ----------
const C = stage(36, 1e-6, 4e5);
{ const R = rng(21), pos = [], col = [];
  const add = (p, c) => { pos.push(p.x, p.y, p.z); col.push(...c); };
  add(V3(-2.6, 1.1, -3.1).normalize().multiplyScalar(4.24), [1.6, 1.4, 1.1]);          // Alpha Centauri system, 4.24 ly
  for (let i = 0; i < 26000; i++) { const r = 5 + Math.pow(R(), 0.42) * 6000, u = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - u * u);
    const p = V3(Math.cos(a) * s * r, u * r * (r > 400 ? 0.18 : 1), Math.sin(a) * s * r), w = R(), k = 0.35 + Math.pow(R(), 3) * 1.6;
    add(p, w < 0.25 ? [k, k * 0.75, k * 0.5] : w < 0.45 ? [k * 0.7, k * 0.82, k] : [k, k * 0.97, k * 0.9]); }
  C.stars = pointCloud(pos, col, 2600, 5); C.s.add(C.stars); }
C.sun = glowSprite(new THREE.Color(1.0, 0.88, 0.65), 1); C.s.add(C.sun);
C.dir = V3(-0.2, 0.62, 1).normalize();

// ---------- D: the Milky Way seen from outside (units: light-years; Sun at the origin) ----------
// Artist's impression NASA/JPL-Caltech/ESO/R. Hurt (eso1339g). In the image the Sun sits 0.19 of the width below the centre;
// with the Sun 26,000 ly from the centre that makes the image about 137,000 ly across.
const GW = 137000;
const D_ = stage(36, 10, 5e6);
D_.plane = new THREE.Mesh(new THREE.PlaneGeometry(GW, GW), new THREE.MeshBasicMaterial({ map: TEX.face, color: new THREE.Color(0.55, 0.55, 0.55), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
D_.plane.rotation.x = -Math.PI / 2; D_.center = V3(0.01 * GW, 0, -0.19 * GW); D_.plane.position.copy(D_.center); D_.s.add(D_.plane);
D_.dir = V3(0.12, 0.92, 0.38).normalize();

// ---------- E: zooming out past the Milky Way; the frame settles on the real Hubble Ultra Deep Field ----------
const E = stage(36, 1e-3, 5e4);
E.plane = new THREE.Mesh(new THREE.PlaneGeometry(GW / 1e6, GW / 1e6), D_.plane.material.clone()); E.plane.rotation.x = -Math.PI / 2; E.s.add(E.plane);
E.dir = D_.dir.clone();
const HUDF = new THREE.Scene(), HCAM = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
HUDF.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: TEX.hudf, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); HUDF.add(HUDF.mesh);

// ---------- frame ----------
function place(st, dUnits, target) { const p = st.dir.clone().multiplyScalar(dUnits).add(target || V3(0, 0, 0)); st.c.position.copy(p); st.c.up.set(0, 1, 0); st.c.lookAt(target || V3(0, 0, 0)); }
function frame(t) {
  const L = logD(t), d = Math.pow(10, L), layers = [];
  // A: Earth and Moon
  const wa = 1 - sstep(7.0, 7.45, L);
  if (wa > 0) { updateEarth(A.earth, t, 0.02); place(A, d / KM_RE); layers.push({ scene: A.s, camera: A.c, w: wa }); }
  // B: Solar System; planet dots keep a minimum on-screen size (sizes not to scale)
  const wb = band(L, 6.95, 7.45, 11.2, 11.75);
  if (wb > 0) { const dAU = d / KM_AU; place(B, dAU, V3(0, 0, 0).lerp(sunPos, sstep(7.6, 9.8, L)));
    for (const s of B.dots) s.scale.setScalar(dAU * 0.0042 * s.userData.sz * (1 - 0.5 * sstep(10.6, 11.5, L)));
    B.sun.scale.setScalar(Math.max(0.05, dAU * 0.03)); layers.push({ scene: B.s, camera: B.c, w: wb }); }
  // C: stars around the Sun
  const wc = band(L, 11.1, 11.7, 17.6, 18.0);
  if (wc > 0) { const dLY = d / KM_LY; place(C, dLY); C.sun.scale.setScalar(dLY * 0.007); C.stars.material.uniforms.sz.value = 2600 * (0.4 + 0.6 * sstep(12, 14.5, L)); layers.push({ scene: C.s, camera: C.c, w: wc }); }
  // D: the Milky Way seen from outside
  const wd = band(L, 17.3, 17.9, 19.4, 19.9);
  if (wd > 0) { const dLY = d / KM_LY; place(D_, dLY, V3(0, 0, 0).lerp(D_.center, sstep(17.4, 18.3, L))); layers.push({ scene: D_.s, camera: D_.c, w: wd }); }
  // E: the Milky Way shrinks to a smudge, then the Hubble Ultra Deep Field fades in and settles
  const we = sstep(19.3, 19.8, L);
  if (we > 0) { const dM = d / KM_MLY; place(E, dM, D_.center.clone().multiplyScalar(1e-6)); E.plane.material.opacity = 1 - sstep(20.4, 21.0, L); layers.push({ scene: E.s, camera: E.c, w: we }); }
  const wh = sstep(20.2, 21.2, L);
  if (wh > 0) { const k = 1.55 - 0.45 * sstep(20.2, 21.42, L); HUDF.mesh.scale.set(k * H / W, k, 1); layers.push({ scene: HUDF, camera: HCAM, w: wh * 1.25 }); }
  const ex = 1.0 + 0.35 * band(L, 11, 12, 17, 18.5);
  COMP.frame(layers, { exposure: ex, sat: 1.05, seed: (t * 30) % 97 });
}
function loop() { requestAnimationFrame(loop); if (!window.__assetsOK) return; const t = (window.__startAt || 0) + performance.now() / 1000; frame(Math.min(t, LOOP - 0.001)); }
window.__assetsOK = true;
requestAnimationFrame(loop);
window.__frame = frame;
});
