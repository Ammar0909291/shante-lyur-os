// INSIDE SATURN'S RINGS: a seamless 36 s loop. Everything is a pure function of film time t, and every motion
// (flight distance, tumbling, sway, glints) completes a whole number of cycles per loop, so frame 0 follows the last frame.
// Three passes share one camera orientation: far (km: Saturn, stars), ground (m: the ring layer below), near (m: ice chunks, dust).
'use strict';
const W = 1080, H = 1920, LOOP = TL.total, FPS = 30;
const V = 110, D = V * LOOP;                 // flight speed (m/s) and distance flown per loop
const DR = D / 3, ZF = -(DR - 40);           // ice-chunk field: depth and far edge (wraps 3 times per loop)
const DD = D / 36, ZD = -(DD - 6);           // near dust field: wraps 36 times per loop
const SUBS = window.__subs != null ? window.__subs : 3;   // motion-blur sub-frames
const REQ = 60268, RPOL = 54364, RC = 131000;            // Saturn radii and our distance from its centre (km, A ring)
const az = (a, e) => V3(Math.sin(a * D2R) * Math.cos(e * D2R), Math.sin(e * D2R), -Math.cos(a * D2R) * Math.cos(e * D2R));
const SUN = az(65, 13).normalize();          // towards the Sun: front right, 13° above the ring plane
const SDIR = az(-24, 0);                     // towards Saturn's centre

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: false });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputEncoding = THREE.LinearEncoding; renderer.toneMapping = THREE.NoToneMapping;
window.__msaa = window.__msaa != null ? window.__msaa : 2;
const COMP = new Compositor(renderer, W, H);

const GLSL_NOISE = `
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
// value noise, periodic along y with period P cells (keeps the ground texture seamless over one loop)
float vnp(vec2 x, float P){ vec2 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  float y0 = mod(i.y, P), y1 = mod(i.y + 1., P);
  return mix(mix(h21(vec2(i.x, y0)), h21(vec2(i.x + 1., y0)), f.x), mix(h21(vec2(i.x, y1)), h21(vec2(i.x + 1., y1)), f.x), f.y); }`;

// ---------- far pass: Saturn and the stars (units: km) ----------
const farScene = new THREE.Scene(), farCam = new THREE.PerspectiveCamera(62, W / H, 500, 3e6);
const saturnMat = new THREE.ShaderMaterial({
  uniforms: { sun: { value: SUN }, ctr: { value: SDIR.clone().multiplyScalar(RC) }, req: { value: REQ }, rpol: { value: RPOL } },
  vertexShader: `varying vec3 vP, vW; void main(){ vP = normalize(position); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 sun, ctr; uniform float req, rpol; varying vec3 vP, vW;` + GLSL_NOISE + `
    float ringTau(float r){                        // normal optical depth of the main rings (km)
      if (r < 74658.) return 0.; if (r < 92000.) return 0.1; if (r < 117580.) return mix(1.0, 2.6, smoothstep(92000., 104000., r));
      if (r < 122170.) return 0.12; if (r > 133423. && r < 133745.) return 0.; if (r < 136775.) return 0.6; return 0.; }
    void main(){
      vec3 n = normalize(vec3(vP.x, vP.y * req / rpol, vP.z));
      vec3 v = normalize(cameraPosition - vW);
      float lat = asin(clamp(n.y, -1., 1.)), lon = atan(vP.z, vP.x);
      // zonal bands: muted butterscotch belts and zones, longitudinally stretched turbulence
      float w = vn3(vec3(lon * 3., lat * 34., 1.)) * 0.6 + vn3(vec3(lon * 9., lat * 90., 7.)) * 0.4;
      float L = lat + (w - 0.5) * 0.018;
      float b = 0.5 + 0.28 * sin(L * 23.) + 0.14 * sin(L * 57. + 1.3) + 0.08 * sin(L * 131. + 0.4);
      vec3 zone = vec3(0.95, 0.86, 0.66), belt = vec3(0.72, 0.56, 0.38);
      vec3 col = mix(belt, zone, clamp(b, 0., 1.));
      col = mix(col, vec3(0.97, 0.9, 0.72), smoothstep(0.18, 0.0, abs(L)) * 0.35);          // bright equatorial zone
      col = mix(col, vec3(0.6, 0.66, 0.72), smoothstep(0.95, 1.25, abs(L)));               // bluish high latitudes
      col = pow(col, vec3(2.2)) * 0.62;
      float mu0 = dot(n, sun), mu = max(dot(n, v), 0.);
      float lit = pow(max(mu0, 0.), 0.92) * pow(max(mu, 0.02), -0.08) * smoothstep(-0.04, 0.06, mu0);
      // shadow of the rings on the globe
      if (sun.y * (vW.y - ctr.y) < 0.) { vec3 q = vW + sun * (-(vW.y - ctr.y) / sun.y); lit *= exp(-ringTau(length(q.xz - ctr.xz)) / abs(sun.y)); }
      vec3 c = col * lit * 3.0; float lum = dot(c, vec3(0.3, 0.55, 0.15)); c = mix(c, vec3(lum) * vec3(0.95, 0.97, 1.05), smoothstep(0.35, 0.0, mu) * 0.7);
      c += vec3(0.55, 0.7, 1.0) * pow(1. - mu, 5.) * smoothstep(-0.1, 0.4, mu0) * 0.35;  // thin bright haze at the lit limb
      gl_FragColor = vec4(c, 1.); }` });
const saturn = new THREE.Mesh(new THREE.SphereGeometry(1, 192, 128), saturnMat);
saturn.scale.set(REQ, RPOL, REQ); saturn.position.copy(SDIR.clone().multiplyScalar(RC)); saturn.position.y = -0.009;
farScene.add(saturn, starPoints(9000, 1.5e6, 7, 1.7, 0.5));

// ---------- ground pass: the ring layer below us, seen as a granular icy floor (units: m) ----------
const groundScene = new THREE.Scene(), groundCam = new THREE.PerspectiveCamera(62, W / H, 1, 4e5);
const groundMat = new THREE.ShaderMaterial({
  extensions: { derivatives: true }, depthTest: false, depthWrite: false,
  uniforms: { t: { value: 0 }, v: { value: V }, D: { value: D }, sun: { value: SUN } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float t, v, D; uniform vec3 sun; varying vec3 vW;` + GLSL_NOISE + `
    // height of the rubble at ground point p (m); octave k has D/n_k cells per loop so the pattern repeats exactly
    float hgt(vec2 p, float aa[6]){ float s = 0., a = 1.; float n[6]; n[0]=16.; n[1]=66.; n[2]=132.; n[3]=264.; n[4]=528.; n[5]=1056.;
      for (int k = 0; k < 6; k++){ float c = D / n[k]; s += a * aa[k] * (vnp(p / c, n[k]) - 0.5); a *= 0.55; } return s; }
    void main(){
      vec2 p = vec2(vW.x, vW.z - v * t);
      float aa[6]; float n[6]; n[0]=16.; n[1]=66.; n[2]=132.; n[3]=264.; n[4]=528.; n[5]=1056.;
      float fw = max(fwidth(p.x), fwidth(p.y));
      for (int k = 0; k < 6; k++) aa[k] = 1. - smoothstep(0.3, 0.9, fw / (D / n[k]));       // drop octaves finer than a pixel
      float h0 = hgt(p, aa);
      // bump normal from screen-space derivatives of the height (one noise evaluation per pixel)
      vec3 n0 = vec3(0., 1., 0.), dpx = dFdx(vW), dpy = dFdy(vW); float hx = dFdx(h0) * 5.0, hy = dFdy(h0) * 5.0;
      vec3 r1 = cross(dpy, n0), r2 = cross(n0, dpx); float det = dot(dpx, r1);
      vec3 nrm = abs(det) > 1e-9 ? normalize(abs(det) * n0 - sign(det) * (hx * r1 + hy * r2)) : n0;
      float alb = 0.28 + 0.7 * pow(clamp(h0 + 0.5, 0., 1.), 1.3);
      vec3 base = pow(vec3(0.84, 0.8, 0.74), vec3(2.2)) * alb;
      float dist = length(vW.xz), graze = smoothstep(800., 60000., dist);
      float lam = max(dot(nrm, sun), 0.);
      lam = mix(lam, sun.y * 1.15, graze);                                         // far away the floor reads as one smooth sheet
      float shade = mix(0.78, 1.0, graze);
      vec3 c = base * (lam * 2.6 * shade + 0.04) + pow(vec3(0.86, 0.79, 0.69), vec3(2.2)) * graze * 0.3;
      gl_FragColor = vec4(c, 1.); }` });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(6e5, 6e5), groundMat);
ground.rotation.x = -Math.PI / 2; ground.position.y = -9; groundScene.add(ground);

// ---------- near pass: tumbling ice chunks, glints and out-of-focus dust (units: m) ----------
const nearScene = new THREE.Scene(), nearCam = new THREE.PerspectiveCamera(62, W / H, 0.15, 3000);
function rockGeo(detail, seed) {
  const src = new THREE.IcosahedronGeometry(1, detail).attributes.position, N = makeNoise(seed), key = new Map(), pos = [], idx = [];
  for (let i = 0; i < src.count; i++) {        // weld duplicate corners so the displaced surface shades smoothly
    const x = src.getX(i), y = src.getY(i), z = src.getZ(i), h = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    let j = key.get(h);
    if (j == null) { j = pos.length / 3; key.set(h, j); const k = 0.7 + 0.6 * N(x * 1.2 + 9, y * 1.2, z * 1.2, 3) + 0.14 * N(x * 3.5, y * 3.5 + 3, z * 3.5, 3); pos.push(x * k, y * k * 0.8, z * k); }
    idx.push(j);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals(); return g;
}
const rockMat = new THREE.ShaderMaterial({
  uniforms: { t: { value: 0 }, v: { value: V }, dr: { value: DR }, zf: { value: ZF }, loop: { value: LOOP }, sun: { value: SUN }, sdir: { value: SDIR } },
  vertexShader: `attribute vec3 aOff, aCol; attribute vec4 aRot; attribute vec2 aSS; uniform float t, v, dr, zf, loop; varying vec3 vN, vW, vC, vO;
    vec3 rot(vec3 p, vec3 k, float a){ return p * cos(a) + cross(k, p) * sin(a) + k * dot(k, p) * (1. - cos(a)); }
    void main(){
      float z = zf + mod(aOff.z + v * t, dr), grow = smoothstep(zf, zf + 260., z);
      float a = aRot.w + aSS.y * 6.2831853 * t / loop; vec3 k = normalize(aRot.xyz);
      vec3 w = vec3(aOff.x, aOff.y, z) + rot(position, k, a) * aSS.x * grow;
      vN = rot(normal, k, a); vW = w; vC = aCol; vO = position * (1.5 + aSS.x * 0.4) + aOff * 0.37; gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`,
  extensions: { derivatives: true },
  fragmentShader: `uniform vec3 sun, sdir; varying vec3 vN, vW, vC, vO;` + GLSL_NOISE + `
    void main(){
      float hN = vn3(vO * 1.4) * 0.75 + vn3(vO * 3.2 + 4.) * 0.25;
      vec3 n = normalize(vN), vv = normalize(cameraPosition - vW);
      vec3 dpx = dFdx(vW), dpy = dFdy(vW); float hx = dFdx(hN), hy = dFdy(hN);
      vec3 r1 = cross(dpy, n), r2 = cross(n, dpx); float det = dot(dpx, r1);
      if (abs(det) > 1e-9) n = normalize(abs(det) * n - sign(det) * (hx * r1 + hy * r2) * 0.22);
      vec3 vC = vC * (0.78 + 0.45 * hN) * mix(vec3(1.), vec3(0.9, 0.96, 1.08), smoothstep(0.55, 0.8, hN));
      float d = max(dot(n, sun), 0.);
      vec3 floorC = pow(vec3(0.86, 0.79, 0.69), vec3(2.2));
      vec3 c = vC * (d * 2.6 + (0.5 - 0.5 * n.y) * 0.32 * floorC + max(dot(n, sdir), 0.) * vec3(0.3, 0.23, 0.14) + 0.03);
      c += vec3(1.0, 0.95, 0.88) * pow(max(dot(reflect(-sun, n), vv), 0.), 36.) * 1.1;          // icy glint
      c += vC * pow(1. - max(dot(n, vv), 0.), 3.) * max(dot(-vv, sun), 0.) * 0.9;              // forward-scattered rim
      float dist = length(vW), f = smoothstep(450., 1250., dist);
      c = mix(c, floorC * (sun.y * 1.15 * 2.6 * 0.68 + 0.05), f);                               // fade into the floor far away
      gl_FragColor = vec4(c, 1.); }` });
function rockField(n, detail, seed, size) {
  const R = rng(seed), base = rockGeo(detail, seed), g = new THREE.InstancedBufferGeometry();
  g.index = base.index; for (const k in base.attributes) g.setAttribute(k, base.attributes[k]);
  const off = new Float32Array(n * 3), rt = new Float32Array(n * 4), ss = new Float32Array(n * 2), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const s = size(R()); let x = (R() - 0.5) * 960, y = -9 + s * 0.55 + Math.pow(R(), 1.5) * 15.5;
    const clear = s + 3.2 + (s > 1.4 ? 9 : 0); if (Math.abs(x) < clear && Math.abs(y) < clear) x = (x < 0 ? -1 : 1) * (clear + R() * 6);
    off.set([x, y, R() * DR], i * 3);
    rt.set([R() - 0.5, R() - 0.5, R() - 0.5, R() * TAU], i * 4);
    ss.set([s, (R() < 0.5 ? -1 : 1) * (s < 0.6 ? 1 + Math.floor(R() * 2) : Math.floor(R() * 2))], i * 2);
    const a = 0.55 + R() * 0.45, warm = R(); col.set(pow3([0.9 - warm * 0.08, 0.84 - warm * 0.12, 0.76 - warm * 0.18], a), i * 3);
  }
  g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3)); g.setAttribute('aRot', new THREE.InstancedBufferAttribute(rt, 4));
  g.setAttribute('aSS', new THREE.InstancedBufferAttribute(ss, 2)); g.setAttribute('aCol', new THREE.InstancedBufferAttribute(col, 3));
  g.instanceCount = n; const m = new THREE.Mesh(g, rockMat); m.frustumCulled = false; return m;
}
function pow3(c, a) { return c.map(x => Math.pow(x, 2.2) * a); }
nearScene.add(rockField(16000, 1, 11, r => 0.1 + 0.7 * Math.pow(r, 2.2)), rockField(1500, 2, 23, r => 0.6 + 4.4 * Math.pow(r, 4)));

function pointField(n, seed, box, period, zf, mat) {
  const R = rng(seed), p = new Float32Array(n * 3), a = new Float32Array(n);
  for (let i = 0; i < n; i++) { p.set([(R() - 0.5) * box[0], box[1] + R() * box[2], R() * period], i * 3); a[i] = R(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aR', new THREE.BufferAttribute(a, 1));
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; return pts;
}
const PT_VS = `attribute float aR; uniform float t, v, per, zf, loop, k; varying float vA, vR;
  void main(){ float z = zf + mod(position.z + v * t, per); vec4 mv = viewMatrix * vec4(position.x, position.y, z, 1.);
    float d = -mv.z; vR = aR; vA = smoothstep(zf, zf + per * 0.25, z);
    gl_PointSize = clamp(k / d, 1.2, 90.); gl_Position = projectionMatrix * mv; }`;
const glintMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { t: { value: 0 }, v: { value: V }, per: { value: DR }, zf: { value: ZF }, loop: { value: LOOP }, k: { value: 30 } }, vertexShader: PT_VS,
  fragmentShader: `uniform float t, loop; varying float vA, vR; void main(){ vec2 q = gl_PointCoord - .5; float a = exp(-dot(q, q) * 26.);
    float tw = pow(0.5 + 0.5 * sin(6.2831853 * (vR * 40. + floor(vR * 5. + 1.) * t / loop * 12.)), 8.);
    gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * a * vA * (0.15 + 2.2 * tw), 1.); }` });
const dustMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { t: { value: 0 }, v: { value: V }, per: { value: DD }, zf: { value: ZD }, loop: { value: LOOP }, k: { value: 260 } }, vertexShader: PT_VS,
  fragmentShader: `varying float vA, vR; void main(){ vec2 q = gl_PointCoord - .5; float r = length(q) * 2.; float a = smoothstep(1., 0.82, r) * (0.55 + 0.45 * smoothstep(0.5, 0.95, r));
    gl_FragColor = vec4(mix(vec3(0.9, 0.82, 0.7), vec3(0.75, 0.8, 0.95), vR) * a * vA * 0.06, 1.); }` });
nearScene.add(pointField(26000, 31, [960, -8.8, 15], DR, ZF, glintMat), pointField(700, 41, [50, -7, 15], DD, ZD, dustMat));
const UNI = [groundMat, rockMat, glintMat, dustMat];

// ---------- camera: slight up-tilt and slow periodic sway (whole cycles per loop) ----------
function setCams(t) {
  const ph = TAU * t / LOOP;
  const e = new THREE.Euler((12 + 0.8 * Math.sin(ph * 2)) * D2R, (1.2 * Math.sin(ph) ) * D2R, (1.6 * Math.sin(ph * 3 + 0.7)) * D2R, 'YXZ');
  for (const c of [farCam, groundCam, nearCam]) c.quaternion.setFromEuler(e);
  nearCam.position.set(0.6 * Math.sin(ph * 2 + 1), 0.5 * Math.sin(ph * 3), 0); groundCam.position.copy(nearCam.position);
  farCam.position.set(0, 0, 0);
}
function renderScene(t) {
  for (const m of UNI) m.uniforms.t.value = t; setCams(t);
  const r = renderer; r.setRenderTarget(COMP.rt); r.setClearColor(0x000000, 1); r.clear(); r.autoClear = false;
  const dbg = window.__dbg || '';
  if (!dbg.includes('f')) r.render(farScene, farCam); r.clearDepth(); if (!dbg.includes('g')) r.render(groundScene, groundCam); r.clearDepth(); if (!dbg.includes('n')) r.render(nearScene, nearCam);
  r.autoClear = true;
}
// the Compositor's grade (ACES, true blacks, S-curve, cool shadows / warm highlights, vignette, grain) over motion-blurred sub-frames
function frame(t) {
  const r = renderer, C = COMP;
  r.setRenderTarget(C.acc); r.setClearColor(0x000000, 1); r.clear();
  for (let k = 0; k < SUBS; k++) {
    const ts = ((t + ((k + 0.5) / SUBS - 0.5) * 0.5 / FPS) % LOOP + LOOP) % LOOP;
    renderScene(ts);
    C.addMat.uniforms.t.value = C.rt.texture; C.addMat.uniforms.w.value = 1 / SUBS;
    r.setRenderTarget(C.acc); r.autoClear = false; r.render(C.addScene, C.cam); r.autoClear = true;
  }
  const ex = 1.0; C.gradeMat.uniforms.exposure.value = ex; C.brightMat.uniforms.exposure.value = ex;
  C.gradeMat.uniforms.fade.value = 1; C.gradeMat.uniforms.sat.value = 1.05; C.gradeMat.uniforms.seed.value = (t * 30) % 97;
  r.setRenderTarget(C.b1); r.render(C.brightScene, C.cam);
  for (let k = 0; k < 2; k++) {
    C.blurMat.uniforms.t.value = C.b1.texture; C.blurMat.uniforms.d.value.set((1 + k) / C.bw, 0); r.setRenderTarget(C.b2); r.render(C.blurScene, C.cam);
    C.blurMat.uniforms.t.value = C.b2.texture; C.blurMat.uniforms.d.value.set(0, (1 + k) / C.bh); r.setRenderTarget(C.b1); r.render(C.blurScene, C.cam);
  }
  r.setRenderTarget(null); r.render(C.gradeScene, C.cam);
}

window.__ready = Promise.resolve();
function loop() { requestAnimationFrame(loop); if (!window.__assetsOK) return; const t = (window.__startAt || 0) + performance.now() / 1000; frame(((t % LOOP) + LOOP) % LOOP); }
window.__ready.then(() => { window.__assetsOK = true; });
requestAnimationFrame(loop);
window.__frame = frame;
