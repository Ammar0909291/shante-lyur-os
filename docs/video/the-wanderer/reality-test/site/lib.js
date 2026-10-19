// THE REALITY TEST: shared helpers. Everything is a pure function of film time so any frame can be rendered alone.
'use strict';
const TAU = Math.PI * 2, D2R = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function rng(seed) { let s = (seed >>> 0) || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
// window of visibility: fades in over f seconds from a, out over f seconds to b
const win = (t, a, b, f = 0.6) => Math.min(sstep(a, a + f, t), 1 - sstep(b - f, b, t));

// value noise (CPU) for procedural geometry
function makeNoise(seed) {
  const R = rng(seed), p = new Uint8Array(512), v = new Float32Array(256);
  const q = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
  for (let i = 0; i < 512; i++) p[i] = q[i & 255];
  for (let i = 0; i < 256; i++) v[i] = R();
  const h = (i, j, k) => v[p[p[p[i & 255] + (j & 255)] + (k & 255)]];
  const sm = t => t * t * (3 - 2 * t);
  const n3 = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
    return lerp(lerp(lerp(h(xi, yi, zi), h(xi + 1, yi, zi), xf), lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf), yf),
                lerp(lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf), lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf), yf), zf);
  };
  return (x, y, z, oct = 4) => { let a = 0.5, f = 1, s = 0, n = 0; for (let o = 0; o < oct; o++) { s += a * n3(x * f, y * f, z * f); n += a; a *= 0.5; f *= 2.03; } return s / n; };
}

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 8; return t;
}
function glowTex(stops) {
  return canvasTex(256, 256, (g) => {
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    for (const [o, c] of stops) r.addColorStop(o, c);
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  }, false);
}
const GLOW = () => glowTex([[0, 'rgba(255,255,255,1)'], [0.15, 'rgba(255,255,255,0.8)'], [0.4, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']]);

// Camera keyframes: [time, [px,py,pz], [tx,ty,tz], fov]. Catmull-Rom through positions, eased per segment.
function camPath(cam, t, keys) {
  if (t <= keys[0][0]) return setCam(cam, keys[0][1], keys[0][2], keys[0][3]);
  const n = keys.length;
  if (t >= keys[n - 1][0]) return setCam(cam, keys[n - 1][1], keys[n - 1][2], keys[n - 1][3]);
  let i = 0; while (t > keys[i + 1][0]) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
  const u = (t - k1[0]) / (k2[0] - k1[0]), e = ease(u);
  const cr = (a, b, c, d, s) => { const s2 = s * s, s3 = s2 * s; return 0.5 * ((2 * b) + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s2 + (-a + 3 * b - 3 * c + d) * s3); };
  const P = [0, 1, 2].map(j => cr(k0[1][j], k1[1][j], k2[1][j], k3[1][j], e));
  const T = [0, 1, 2].map(j => cr(k0[2][j], k1[2][j], k2[2][j], k3[2][j], e));
  setCam(cam, P, T, lerp(k1[3], k2[3], e));
}
function setCam(cam, p, t, fov) { cam.position.set(p[0], p[1], p[2]); cam.lookAt(t[0], t[1], t[2]); if (fov && cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
// log-distance dolly along a fixed direction (for huge scale changes)
function logDolly(cam, t, t0, t1, d0, d1, dir, target, fov) {
  const e = ease((t - t0) / (t1 - t0)), d = Math.exp(lerp(Math.log(d0), Math.log(d1), e));
  const p = dir.clone().normalize().multiplyScalar(d).add(target);
  setCam(cam, [p.x, p.y, p.z], [target.x, target.y, target.z], fov);
  return d;
}

// ---------- Sky gradient environment (used for reflections) ----------
function gradientSky(top, horizon, ground, sunDir, sunColor, sunSize = 0.9995) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(horizon) }, gnd: { value: new THREE.Color(ground) },
      sun: { value: sunDir.clone().normalize() }, sunC: { value: new THREE.Color(sunColor) }, sunK: { value: sunSize }, bright: { value: 1 } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 top, hor, gnd, sun, sunC; uniform float sunK, bright; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 c = h > 0. ? mix(hor, top, pow(clamp(h,0.,1.), 0.55)) : mix(hor, gnd, pow(clamp(-h,0.,1.), 0.4));
        float s = dot(d, sun); c += sunC * (smoothstep(sunK, 1., s) * 30. + pow(max(s,0.), 12.) * 0.35 + pow(max(s,0.), 3.) * 0.12);
        gl_FragColor = vec4(c * bright, 1.); }`,
  });
}
function envFromMaterial(renderer, mat) {
  mat.depthTest = false;
  const sc = new THREE.Scene(); sc.add(new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), mat));
  const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromScene(sc, 0.02); pm.dispose(); return rt.texture;
}

// ---------- Human figure (stylised mannequin, used in silhouette / rim light) ----------
// Jointed: root(hips) > spine > chest > neck > head; shoulders > upper > lower arm; hips > thigh > shin.
function makeFigure(o = {}) {
  const s = o.scale || 1, mat = o.mat || new THREE.MeshStandardMaterial({ color: o.color || 0x1a1c22, roughness: 0.75, metalness: 0 });
  const seg = (len, r0, r1) => { const g = new THREE.CylinderGeometry(r1, r0, len, 14, 1); g.translate(0, -len / 2, 0); return g; };
  const ball = r => new THREE.SphereGeometry(r, 18, 12);
  const M = g => { const m = new THREE.Mesh(g, mat); m.castShadow = true; return m; };
  const root = new THREE.Group(), hips = new THREE.Group(); root.add(hips); hips.position.y = 0.95 * s;
  const pelvis = M(new THREE.SphereGeometry(0.17 * s, 18, 12)); pelvis.scale.set(1.1, 0.8, 0.75); hips.add(pelvis);
  const spine = new THREE.Group(); hips.add(spine);
  const torsoG = new THREE.CylinderGeometry(0.19 * s, 0.15 * s, 0.5 * s, 18, 1); torsoG.translate(0, 0.25 * s, 0);
  const torso = M(torsoG); torso.scale.z = 0.62; spine.add(torso);
  const chest = new THREE.Group(); chest.position.y = 0.5 * s; spine.add(chest);
  const neck = M(seg(0.1 * s, 0.05 * s, 0.05 * s)); neck.rotation.z = Math.PI; chest.add(neck);
  const headG = new THREE.Group(); headG.position.y = 0.12 * s; chest.add(headG);
  const head = M(ball(0.11 * s)); head.scale.set(0.9, 1.12, 0.98); head.position.y = 0.1 * s; headG.add(head);
  const limb = (parent, x, y, l1, l2, r) => {
    const a = new THREE.Group(); a.position.set(x, y, 0); parent.add(a);
    a.add(M(seg(l1, r, r * 0.8)));
    const j = new THREE.Group(); j.position.y = -l1; a.add(j); j.add(M(seg(l2, r * 0.8, r * 0.6)));
    const e = new THREE.Group(); e.position.y = -l2; j.add(e); e.add(M(ball(r * 0.75)));
    return [a, j, e];
  };
  const [shL, elL, haL] = limb(chest, 0.21 * s, -0.02 * s, 0.29 * s, 0.27 * s, 0.05 * s);
  const [shR, elR, haR] = limb(chest, -0.21 * s, -0.02 * s, 0.29 * s, 0.27 * s, 0.05 * s);
  const [hiL, knL, ftL] = limb(hips, 0.1 * s, -0.04 * s, 0.45 * s, 0.44 * s, 0.075 * s);
  const [hiR, knR, ftR] = limb(hips, -0.1 * s, -0.04 * s, 0.45 * s, 0.44 * s, 0.075 * s);
  for (const f of [ftL, ftR]) { const foot = f.children[0]; foot.scale.set(1, 0.6, 2.1); foot.position.z = 0.05 * s; }
  if (o.coat) { const cg = new THREE.CylinderGeometry(0.2 * s, 0.3 * s, 0.75 * s, 18, 1, true); cg.translate(0, 0.12 * s, 0); const coat = new THREE.Mesh(cg, o.coatMat || mat); coat.scale.z = 0.7; spine.add(coat); }
  const J = { root, hips, spine, chest, headG, shL, elL, shR, elR, hiL, knL, hiR, knR, haL, haR };
  root.userData.J = J; root.userData.s = s;
  return root;
}
// pose: angles in degrees; arms: shoulder x (forward +), z (out +); elbows bend x
function pose(fig, p) {
  const J = fig.userData.J, r = v => (v || 0) * D2R;
  J.spine.rotation.set(r(p.lean), r(p.twist), 0); J.headG.rotation.set(r(p.nod), r(p.turn), 0);
  J.shL.rotation.set(-r(p.armLx), 0, r(p.armLz != null ? p.armLz : 8)); J.elL.rotation.set(-r(p.elbL), 0, 0);
  J.shR.rotation.set(-r(p.armRx), 0, -r(p.armRz != null ? p.armRz : 8)); J.elR.rotation.set(-r(p.elbR), 0, 0);
  J.hiL.rotation.set(-r(p.legL), 0, 0); J.knL.rotation.set(r(p.kneeL), 0, 0);
  J.hiR.rotation.set(-r(p.legR), 0, 0); J.knR.rotation.set(r(p.kneeR), 0, 0);
  J.hips.position.y = 0.95 * fig.userData.s + (p.drop || 0) * fig.userData.s;
}
function walkPose(ph, amp = 1) {
  const a = Math.sin(ph) * 24 * amp;
  return { legL: a, legR: -a, kneeL: Math.max(0, -Math.cos(ph)) * 30 * amp, kneeR: Math.max(0, Math.cos(ph)) * 30 * amp,
    armLx: -a * 0.8, armRx: a * 0.8, elbL: 12, elbR: 12, drop: -Math.abs(Math.cos(ph)) * 0.02 * amp };
}

// ---------- Earth (real NASA imagery) ----------
function makeEarth(tex, o = {}) {
  const g = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    uniforms: { day: { value: tex.day }, night: { value: tex.night }, clouds: { value: tex.clouds }, sun: { value: (o.sun || V3(1, 0.2, 0.4)).normalize() },
      rot: { value: 0 }, cloudRot: { value: 0 }, nightK: { value: o.nightK != null ? o.nightK : 1 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D day, night, clouds; uniform vec3 sun; uniform float cloudRot, nightK; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }
      void main(){
        vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
        float l = dot(n, sun), dayK = smoothstep(-0.12, 0.25, l);
        vec3 d = toLin(texture2D(day, vUv).rgb);
        float c = texture2D(clouds, vec2(vUv.x + cloudRot, vUv.y)).r; c = smoothstep(0.18, 0.9, c);
        float ocean = smoothstep(0.02, 0.12, d.b - d.r) * (1. - c);
        vec3 h = normalize(sun + v); float spec = pow(max(dot(n, h), 0.), 60.) * ocean * 1.6 * dayK;
        vec3 col = d * (max(l, 0.) * 1.25 + 0.015);
        col = mix(col, vec3(0.92) * (max(l, 0.) * 1.3 + 0.01), c);
        vec3 nl = toLin(texture2D(night, vUv).rgb) * 1.4 * (1. - dayK) * (1. - c * 0.8) * nightK;
        col += nl + vec3(1.0, 0.95, 0.85) * spec;
        float rim = pow(1. - max(dot(n, v), 0.), 3.5);
        col += vec3(0.25, 0.5, 1.0) * rim * (0.15 + 0.85 * smoothstep(-0.3, 0.6, l)) * 0.9;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), mat); g.add(earth);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(1.025, 96, 64), new THREE.ShaderMaterial({
    uniforms: { sun: mat.uniforms.sun }, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 sun; varying vec3 vN; varying vec3 vW; void main(){ vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
      float k = pow(clamp(1. - abs(dot(n, v)) , 0., 1.), 1.0); float f = smoothstep(0.0, 1.0, k); f = pow(f, 6.0) * 1.8;
      float l = smoothstep(-0.35, 0.5, dot(-n, sun) * -1.0 + 0.0 + dot(n, sun) * 0.0 );
      float lit = smoothstep(-0.4, 0.4, dot(normalize(vW), sun));
      gl_FragColor = vec4(vec3(0.3, 0.55, 1.0) * f * (0.08 + lit), 1.); }`,
  }));
  g.add(atm);
  g.userData = { mat, earth };
  return g;
}
function updateEarth(e, t, spin = 0.012) {
  e.userData.earth.rotation.y = t * spin + (e.userData.rot0 || 0);
  e.userData.mat.uniforms.cloudRot.value = t * 0.0006;
}

// ---------- Milky Way background (ESO panorama, CC BY 4.0) ----------
function makeSkyDome(tex, bright = 0.55, radius = 9e5) {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { map: { value: tex }, b: { value: bright } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position = p.xyww; }`,
    fragmentShader: `uniform sampler2D map; uniform float b; varying vec2 vUv; void main(){ vec3 c = pow(texture2D(map, vUv).rgb, vec3(2.2)); gl_FragColor = vec4(c * b, 1.); }` });
  const s = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), m); s.renderOrder = -10; s.frustumCulled = false;
  s.rotation.set(1.1, 0.4, 0.6);
  return s;
}
function starPoints(n, r, seed, size = 1.6, bright = 1) {
  const R = rng(seed), p = new Float32Array(n * 3), c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - u * u);
    p.set([Math.cos(a) * s * r, u * r, Math.sin(a) * s * r], i * 3);
    const k = Math.pow(R(), 3) * bright, w = R();
    c.set(w < 0.2 ? [k, k * 0.8, k * 0.6] : w < 0.4 ? [k * 0.75, k * 0.85, k] : [k, k, k], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false; return pts;
}

// ---------- Spiral galaxy point cloud ----------
function makeGalaxy(n, R, seed, o = {}) {
  const rnd = rng(seed), p = new Float32Array(n * 3), c = new Float32Array(n * 3);
  const arms = o.arms || 4, pitch = (o.pitch || 14) * D2R, b = 1 / Math.tan(pitch);
  for (let i = 0; i < n; i++) {
    let x, y, z, col;
    if (rnd() < 0.22) {             // bulge and bar
      const r = R * 0.12 * Math.pow(rnd(), 1.5), a = rnd() * TAU, ph = Math.acos(rnd() * 2 - 1);
      x = r * Math.sin(ph) * Math.cos(a) * 1.8; z = r * Math.sin(ph) * Math.sin(a) * 0.8; y = r * Math.cos(ph) * 0.45;
      col = [1.0, 0.82, 0.55];
    } else {
      const r = R * (0.08 + 0.92 * Math.pow(rnd(), 0.75)), arm = Math.floor(rnd() * arms);
      const th = b * Math.log(r / (R * 0.08)) + arm * TAU / arms + ((rnd() + rnd() + rnd()) / 3 - 0.5) * 2.2 * (0.55 + 0.6 * (1 - r / R)) + (rnd() < 0.25 ? (rnd() - 0.5) * 2.4 : 0);
      x = r * Math.cos(th); z = r * Math.sin(th); y = (rnd() - 0.5) * R * 0.025 * (1.3 - r / R);
      const blue = rnd() < 0.6; col = blue ? [0.45, 0.62, 1.0] : [1.0, 0.82, 0.62];
      if (rnd() < 0.06) col = [1.0, 0.45, 0.6];
    }
    p.set([x, y, z], i * 3); const k = 0.35 + rnd() * 0.65; c.set([col[0] * k, col[1] * k, col[2] * k], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { k: { value: 1 }, sz: { value: o.size || 2.0 }, scale: { value: 1000 } },
    vertexShader: `attribute vec3 color; varying vec3 vC; uniform float sz, scale; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = clamp(sz * scale / -mv.z, 0.9, 3.2); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; uniform float k; void main(){ vec2 d = gl_PointCoord - .5; float a = exp(-dot(d,d) * 14.); gl_FragColor = vec4(vC * a * k * 0.42, 1.); }` });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex([[0, 'rgba(255,225,170,1)'], [0.2, 'rgba(255,200,140,0.45)'], [0.6, 'rgba(160,140,200,0.08)'], [1, 'rgba(0,0,0,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.setScalar(R * 0.9); const grp = new THREE.Group(); grp.add(pts, glow); grp.userData = { mat, glow };
  return grp;
}

// ---------- Compositor: weighted layers accumulate in HDR, then a grade pass ----------
class Compositor {
  constructor(renderer, W, H) {
    this.r = renderer; this.W = W; this.H = H;
    const o = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: true };
    this.rt = THREE.WebGLMultisampleRenderTarget ? new THREE.WebGLMultisampleRenderTarget(W, H, o) : new THREE.WebGLRenderTarget(W, H, o);
    if (this.rt.samples !== undefined) this.rt.samples = window.__msaa != null ? window.__msaa : 4;
    this.acc = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false });
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = g => { const s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), g)); return s; };
    this.addMat = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, w: { value: 1 } }, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
      fragmentShader: `uniform sampler2D t; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb * w, 1.); }` });
    this.addScene = quad(this.addMat);
    // cheap bloom: bright pass at quarter resolution, separable blur
    const bw = W >> 2, bh = H >> 2, ho = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.b1 = new THREE.WebGLRenderTarget(bw, bh, ho); this.b2 = new THREE.WebGLRenderTarget(bw, bh, ho);
    const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
    this.brightMat = new THREE.ShaderMaterial({ uniforms: { t: { value: this.acc.texture }, exposure: { value: 1 } }, depthTest: false, vertexShader: VS,
      fragmentShader: `uniform sampler2D t; uniform float exposure; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb * exposure; gl_FragColor = vec4(max(c - 0.9, 0.), 1.); }` });
    this.blurMat = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new THREE.Vector2() } }, depthTest: false, vertexShader: VS,
      fragmentShader: `uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb * 0.227;
        c += (texture2D(t, vUv + d * 1.38).rgb + texture2D(t, vUv - d * 1.38).rgb) * 0.316; c += (texture2D(t, vUv + d * 3.23).rgb + texture2D(t, vUv - d * 3.23).rgb) * 0.07; gl_FragColor = vec4(c, 1.); }` });
    this.brightScene = quad(this.brightMat); this.blurScene = quad(this.blurMat); this.bw = bw; this.bh = bh;
    this.gradeMat = new THREE.ShaderMaterial({ uniforms: { bloom: { value: this.b1.texture }, t: { value: this.acc.texture }, exposure: { value: 1 }, fade: { value: 1 }, seed: { value: 0 }, sat: { value: 1 }, res: { value: new THREE.Vector2(W, H) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
      fragmentShader: `uniform sampler2D t, bloom; uniform float exposure, fade, seed, sat; uniform vec2 res; varying vec2 vUv;
        vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0., 1.); }
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + seed) * 43758.5453); }
        void main(){
          vec3 c = texture2D(t, vUv).rgb * exposure;
          // soft bloom: a few taps of the bright part
          c += texture2D(bloom, vUv).rgb * 0.55;
          c = aces(c);
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, sat);
          c = clamp((c - 0.012) / 0.988, 0., 1.);                       // true blacks
          c = mix(c, c * c * (3. - 2. * c), 0.22);                      // gentle S-curve
          vec3 sh = vec3(0.92, 0.98, 1.06), hi = vec3(1.04, 1.0, 0.95); c *= mix(sh, hi, smoothstep(0.15, 0.7, l));   // cool shadows, warm highlights
          c = pow(c, vec3(1. / 2.2));
          vec2 q = vUv - .5; c *= 1. - dot(q, q) * 0.55;
          c += (hash(vUv * res) - .5) * 0.014;
          gl_FragColor = vec4(c * fade, 1.); }` });
    this.gradeScene = quad(this.gradeMat);
  }
  frame(layers, grade) {
    const r = this.r;
    r.setRenderTarget(this.acc); r.setClearColor(0x000000, 1); r.clear();
    for (const L of layers) {
      if (L.w <= 0.002) continue;
      r.setRenderTarget(this.rt); r.setClearColor(L.clear != null ? L.clear : 0x000000, 1); r.clear();
      r.render(L.scene, L.camera);
      this.addMat.uniforms.t.value = this.rt.texture; this.addMat.uniforms.w.value = L.w;
      r.setRenderTarget(this.acc); r.autoClear = false; r.render(this.addScene, this.cam); r.autoClear = true;
    }
    Object.assign(this.gradeMat.uniforms.exposure, { value: grade.exposure || 1 });
    this.gradeMat.uniforms.fade.value = grade.fade != null ? grade.fade : 1;
    this.gradeMat.uniforms.sat.value = grade.sat != null ? grade.sat : 1;
    this.gradeMat.uniforms.seed.value = grade.seed || 0;
    this.brightMat.uniforms.exposure.value = grade.exposure || 1;
    r.setRenderTarget(this.b1); r.render(this.brightScene, this.cam);
    for (let k = 0; k < 2; k++) {
      this.blurMat.uniforms.t.value = this.b1.texture; this.blurMat.uniforms.d.value.set((1 + k) / this.bw, 0); r.setRenderTarget(this.b2); r.render(this.blurScene, this.cam);
      this.blurMat.uniforms.t.value = this.b2.texture; this.blurMat.uniforms.d.value.set(0, (1 + k) / this.bh); r.setRenderTarget(this.b1); r.render(this.blurScene, this.cam);
    }
    r.setRenderTarget(null); r.render(this.gradeScene, this.cam);
  }
}

// ---------- Depth layers (quality standard): volumetric nebula clouds and foreground bokeh ----------
const _cloudTex = [];
function cloudTex(i) {
  if (_cloudTex[i]) return _cloudTex[i];
  const N = makeNoise(1000 + i * 17);
  _cloudTex[i] = canvasTex(256, 256, (g) => {
    const img = g.createImageData(256, 256), d = img.data;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const u = x / 256 - 0.5, v = y / 256 - 0.5, r = Math.hypot(u, v) * 2, fall = Math.max(0, 1 - r * r);
      const n = N(x / 40, y / 40, i * 3.1, 5), m = Math.pow(Math.max(0, n * 1.6 - 0.45), 1.5) * fall;
      const k = (y * 256 + x) * 4; d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = Math.min(255, m * 255);
    }
    g.putImageData(img, 0, 0);
  }, false);
  return _cloudTex[i];
}
// palette: array of [r,g,b] in linear HDR; clouds placed inside an ellipsoid of radii R
function makeNebula(n, R, seed, palette, o = {}) {
  const rnd = rng(seed), grp = new THREE.Group(); grp.userData.mats = [];
  for (let i = 0; i < n; i++) {
    const c = palette[Math.floor(rnd() * palette.length)];
    const m = new THREE.SpriteMaterial({ map: cloudTex(i % 6), color: new THREE.Color(c[0], c[1], c[2]), blending: o.dark ? THREE.NormalBlending : THREE.AdditiveBlending,
      transparent: true, depthWrite: false, opacity: (o.opacity || 0.35) * (0.5 + rnd() * 0.5), rotation: rnd() * TAU });
    const s = new THREE.Sprite(m); const u = rnd() * 2 - 1, a = rnd() * TAU, rr = Math.pow(rnd(), 0.6), sq = Math.sqrt(1 - u * u);
    s.position.set(Math.cos(a) * sq * R[0] * rr, u * R[1] * rr, Math.sin(a) * sq * R[2] * rr); s.scale.setScalar((o.size || 1) * (0.5 + rnd()) * Math.max(R[0], R[2]) * 0.35);
    m.userData.base = m.opacity; grp.add(s); grp.userData.mats.push(m);
  }
  grp.userData.setK = k => grp.userData.mats.forEach(m => { m.opacity = m.userData.base * k; });
  return grp;
}
let _bokehTex = null;
function bokehTex() { return _bokehTex || (_bokehTex = glowTex([[0, 'rgba(255,255,255,0.9)'], [0.55, 'rgba(255,255,255,0.75)'], [0.72, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']])); }
// out-of-focus foreground particles that ride with the camera and drift slowly
function addBokeh(scene, cam, n, seed, colors, o = {}) {
  if (!cam.parent) scene.add(cam);
  const rnd = rng(seed), list = [];
  for (let i = 0; i < n; i++) {
    const c = colors[i % colors.length], dark = o.darkFrac && rnd() < o.darkFrac;
    const m = new THREE.SpriteMaterial({ map: dark ? cloudTex(i % 6) : bokehTex(), color: dark ? new THREE.Color(0.01, 0.008, 0.008) : new THREE.Color(c[0], c[1], c[2]),
      blending: dark ? THREE.NormalBlending : THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false, opacity: dark ? 0.85 : 0.08 + rnd() * 0.14 });
    const sp = new THREE.Sprite(m); const z = -(0.6 + rnd() * 2.4);
    sp.userData = { x: (rnd() - 0.5) * 2.4, y: (rnd() - 0.5) * 1.4, z, s: (dark ? 0.5 : 0.08) + rnd() * (dark ? 0.9 : 0.22), ph: rnd() * TAU, base: m.opacity };
    sp.renderOrder = 50; cam.add(sp); list.push(sp);
  }
  return { list, update(t, k = 1) { for (const sp of list) { const u = sp.userData; sp.position.set(u.x * -u.z + Math.sin(t * 0.07 + u.ph) * 0.12, u.y * -u.z + Math.cos(t * 0.05 + u.ph) * 0.08, u.z); sp.scale.setScalar(u.s * -u.z); sp.material.opacity = u.base * k; } } };
}
