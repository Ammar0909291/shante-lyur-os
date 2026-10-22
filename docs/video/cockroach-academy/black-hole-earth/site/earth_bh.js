// EARTH MEETS A BLACK HOLE (30 s, silent). Illustration: Earth (NASA imagery) fills the lower left; the side facing the
// black hole loses its crust, exposing glowing rock, and the pieces stream in a curving river into the black hole's
// swirling disk at the upper right. Black hole, disk and the break-up are artistic; see PACKAGE_instagram.md for the science.
'use strict';
const W = 1080, H = 1920, LEN = TL.total;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputEncoding = THREE.LinearEncoding; renderer.toneMapping = THREE.NoToneMapping;
window.__msaa = 4;
const COMP = new Compositor(renderer, W, H);
const TEX = {}, loader = new THREE.TextureLoader();
const loadTex = (k, url, srgb = true) => new Promise(res => loader.load(url, t => { if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; TEX[k] = t; res(); }, undefined, () => res()));

window.__ready = Promise.all([loadTex('day', 'tex/earth_day.jpg'), loadTex('clouds', 'tex/earth_clouds.jpg', false), loadTex('mw', 'tex/milkyway.jpg'), loadTex('rock', 'tex/rock.jpg')]).then(() => {
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 2e4); scene.add(cam);
const E = V3(-0.55, -1.25, -3.6), R = 1.0, B = V3(1.9, 3.7, -10.5);
const toB = B.clone().sub(E).normalize();
const SUN = V3(-0.9, 0.35, 0.55).normalize();                   // daylight from the left, like the reference
const ero = t => (78 * D2R) * Math.pow(sstep(1.2, 27, t), 0.8);  // angular radius of the stripped region (from the side facing the hole)

scene.add(makeSkyDome(TEX.mw, 0.22, 1.5e4), starPoints(5000, 1.4e4, 7, 1.6, 0.6));

// ---------- Earth: crust removed inside the erosion cap (ragged edge), glowing rock beneath ----------
const earthMat = new THREE.ShaderMaterial({
  uniforms: { day: { value: TEX.day }, clouds: { value: TEX.clouds }, sun: { value: SUN }, toB: { value: toB }, ero: { value: 0 }, t: { value: 0 } },
  vertexShader: `varying vec2 vUv; varying vec3 vN, vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform sampler2D day, clouds; uniform vec3 sun, toB; uniform float ero, t; varying vec2 vUv; varying vec3 vN, vW;
    float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
      return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
    void main(){
      vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
      float ang = acos(clamp(dot(n, toB), -1., 1.));
      float rag = (vn(n * 7.) * 0.65 + vn(n * 19.) * 0.35 - 0.5) * 0.42;
      float edge = ang - ero + rag;                      // < 0: crust already gone
      if (edge < 0. && ero > 0.01) discard;
      vec3 d = pow(texture2D(day, vUv).rgb, vec3(2.2));
      float c = smoothstep(0.2, 0.9, texture2D(clouds, vUv + vec2(t * 0.0004, 0.)).r);
      float l = max(dot(n, sun), 0.);
      vec3 col = d * (l * 1.7 + 0.05); col = mix(col, vec3(0.95) * (l * 1.8 + 0.04), c);
      col += vec3(0.25, 0.5, 1.0) * pow(1. - max(dot(n, v), 0.), 3.) * (0.25 + l) * 0.9;     // atmosphere rim
      float hot = smoothstep(0.22, 0.0, edge) * step(0.01, ero);                            // scorched, cracking band at the edge
      float cr = smoothstep(0.08, 0.0, abs(vn(n * 31.) - 0.5)) * hot;
      col = mix(col, col * vec3(0.35, 0.28, 0.24), hot * 0.85) + vec3(3.2, 1.1, 0.25) * cr * 1.4;
      gl_FragColor = vec4(col, 1.); }` });
const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 192, 128), earthMat); earth.position.copy(E); earth.rotation.y = 2.4; scene.add(earth);
// exposed interior: dark rock with glowing fissures, brightest towards the hole
const coreMat = new THREE.ShaderMaterial({ uniforms: { toB: { value: toB }, t: { value: 0 }, rock: { value: TEX.rock } },
  vertexShader: `varying vec3 vN, vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: earthMat.fragmentShader.split('void main()')[0].replace('uniform sampler2D day, clouds; uniform vec3 sun, toB; uniform float ero, t; varying vec2 vUv; varying vec3 vN, vW;', 'uniform vec3 toB; uniform float t; varying vec3 vN, vW;') + `
    void main(){ vec3 n = normalize(vN); float f = vn(n * 9. + t * 0.05) * 0.6 + vn(n * 27.) * 0.4;
      float k = pow(max(dot(n, toB), 0.), 1.5); vec3 rock = vec3(0.16, 0.12, 0.1) * (0.5 + f);
      float fis = smoothstep(0.1, 0.0, abs(vn(n * 14.) - 0.5)) + smoothstep(0.06, 0.0, abs(vn(n * 41. + 3.) - 0.5)) * 0.6;
      vec3 c = rock * (0.6 + 1.4 * k) + vec3(2.6, 0.8, 0.16) * fis * (0.15 + 0.9 * k) + vec3(0.6, 0.18, 0.04) * k * 0.3;
      gl_FragColor = vec4(c, 1.); }` });
const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.955, 160, 100), coreMat); core.position.copy(E); scene.add(core);

// ---------- black hole: shadow, swirling disk seen as a funnel, photon-ring glow ----------
const diskMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { t: { value: 0 } },
  vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: `uniform float t; varying vec2 vP;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 x){ vec2 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1,0)), f.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), f.x), f.y); }
    void main(){ float r = length(vP), a = atan(vP.y, vP.x);
      float sw = a + 2.6 / r + t * 1.4 / pow(r, 1.5);                       // spiral streaks, inner parts orbit faster
      vec2 q = vec2(cos(sw), sin(sw)) * r;
      float s = vn(q * 3.0 + r * 4.) * 0.6 + vn(q * 9.0 - r * 11.) * 0.4;
      float k = smoothstep(0.42, 0.62, r) * smoothstep(2.6, 0.9, r) * pow(s, 2.0) * 2.6 / r;
      vec3 c = mix(vec3(1.0, 0.36, 0.06), vec3(1.0, 0.85, 0.6), smoothstep(1.4, 0.55, r));
      gl_FragColor = vec4(c * k, 1.); }` });
const bh = new THREE.Group(); bh.position.copy(B); scene.add(bh);
const disk = new THREE.Mesh(new THREE.PlaneGeometry(7, 7, 1, 1), diskMat); bh.add(disk);
disk.lookAt(cam.position.clone().sub(B).normalize().add(V3(0.15, -0.55, 0.2)).add(B));
const halo = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), diskMat.clone()); halo.material.uniforms = { t: diskMat.uniforms.t };
bh.add(halo); halo.lookAt(cam.position); halo.scale.setScalar(0.38); halo.material.opacity = 0.6;                   // lensed far side arching over the shadow (illustrative)
const shadow = new THREE.Mesh(new THREE.SphereGeometry(0.4, 64, 32), new THREE.MeshBasicMaterial({ color: 0x000000 })); bh.add(shadow);
const ring = glowSprite(new THREE.Color(1.6, 0.8, 0.35), 1.25); ring.renderOrder = 5; bh.add(ring);
function glowSprite(color, s) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex([[0, 'rgba(0,0,0,0)'], [0.3, 'rgba(0,0,0,0)'], [0.36, 'rgba(255,255,255,0.9)'], [0.5, 'rgba(255,255,255,0.15)'], [1, 'rgba(255,255,255,0)']]), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.setScalar(s); return sp; }

// ---------- debris: crust chunks (coloured by the Earth image where they came from) and dust ----------
const img = TEX.day.image, cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g2 = cv.getContext('2d'); g2.drawImage(img, 0, 0, 512, 256);
const pix = g2.getImageData(0, 0, 512, 256).data;
const rnd = rng(5), NC = 6500, ND = 26000;
const up0 = V3(0, 1, 0), side = toB.clone().cross(up0).normalize(), up = side.clone().cross(toB).normalize();
function capPoint(maxA) {                       // random point on the sphere within maxA of the direction to the hole
  const a = Math.acos(1 - rnd() * (1 - Math.cos(maxA))), p = rnd() * TAU;
  return toB.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a) * Math.cos(p)).addScaledVector(up, Math.sin(a) * Math.sin(p)).normalize();
}
function birth(n) { const a = Math.acos(clamp(n.dot(toB), -1, 1)); for (let t = 0; t < LEN; t += 0.05) if (ero(t) >= a) return t; return 1e9; }
function earthColor(n) {
  const m = new THREE.Matrix4().makeRotationY(-earth.rotation.y), q = n.clone().applyMatrix4(m);
  const u = (Math.atan2(-q.z, q.x) / TAU + 0.5) % 1, v = Math.acos(clamp(q.y, -1, 1)) / Math.PI;
  const i = (Math.min(255, Math.floor(v * 256)) * 512 + Math.floor(u * 512)) * 4; return [pix[i] / 255, pix[i + 1] / 255, pix[i + 2] / 255].map(x => Math.pow(x, 2.2));
}
const geo = new THREE.IcosahedronGeometry(1, 1), pp = geo.attributes.position, N3 = makeNoise(3);
for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), k = 0.65 + 0.7 * N3(x * 1.7 + 4, y * 1.7, z * 1.7, 2); pp.setXYZ(i, x * k * 1.25, y * k * 0.55, z * k); }
geo.computeVertexNormals();
const chunkMat = new THREE.MeshStandardMaterial({ map: TEX.rock, roughness: 0.9, metalness: 0, vertexColors: false });
const chunks = new THREE.InstancedMesh(geo, chunkMat, NC); chunks.frustumCulled = false; scene.add(chunks);
const CH = [], isOcean = c => c[2] > c[0] * 1.15 && c[2] > c[1] * 0.9;
for (let i = 0; i < NC; i++) {
  let n, top, tries = 0; do { n = capPoint(80 * D2R); top = earthColor(n); } while (isOcean(top) && ++tries < 12);   // chunks come from land
  const shade = 0.75 + rnd() * 0.35;
  CH.push({ n, tb: birth(n) + rnd() * 1.2, s: 0.012 + Math.pow(rnd(), 3.2) * 0.13, spd: 0.09 + rnd() * 0.12, j: V3(rnd() - .5, rnd() - .5, rnd() - .5), ax: V3(rnd() - .5, rnd() - .5, rnd() - .5).normalize(), w: (rnd() - 0.5) * 3 });
  chunks.setColorAt(i, new THREE.Color(Math.min(1, top[0] * 1.8 * shade + 0.03), Math.min(1, top[1] * 1.8 * shade + 0.03), Math.min(1, top[2] * 1.6 * shade + 0.02)));
}
// path from a surface point into the hole: lift off, bend towards the hole, then wind into the disk
const AX = disk.getWorldDirection(new THREE.Vector3());
const tmp = new THREE.Vector3(), Q = new THREE.Quaternion(), M4 = new THREE.Matrix4(), S3 = new THREE.Vector3();
function pathPos(n, u, j, out) {
  const S = n.clone().multiplyScalar(R).add(E), C = S.clone().addScaledVector(n, 1.3).lerp(B, 0.28);
  const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
  out.copy(S).multiplyScalar(a).addScaledVector(C, b).addScaledVector(B, c);
  const spread = 0.05 + 0.6 * Math.sin(Math.PI * Math.min(u, 0.85));
  out.addScaledVector(j, spread * (1 - u * 0.7));
  if (u > 0.7) {                                   // wind around the hole in the disk plane
    const k = (u - 0.7) / 0.3, rel = out.clone().sub(B), ang = k * k * 5.0;
    rel.applyAxisAngle(AX, ang).multiplyScalar(1 - 0.55 * k); out.copy(B).add(rel);
  }
  return out;
}
// soft particles: ocean water and vapour (from ocean points), cloud wisps, and rock dust
const dust = (() => {
  const pos = new Float32Array(ND * 3), col = new Float32Array(ND * 3), sz = new Float32Array(ND), D = [];
  for (let i = 0; i < ND; i++) {
    const n = capPoint(82 * D2R), c = earthColor(n), r0 = rnd();
    const kind = r0 < 0.18 ? 'cloud' : isOcean(c) ? 'water' : 'dust';
    const base = kind === 'water' ? [0.35, 0.6, 1.0] : kind === 'cloud' ? [0.95, 0.97, 1.0] : [0.62, 0.5, 0.38];
    D.push({ n, kind, base, tb: birth(n) - 0.6 + rnd() * 2, spd: (kind === 'cloud' ? 0.05 : 0.07) + rnd() * 0.12,
      j: V3(rnd() - .5, rnd() - .5, rnd() - .5).multiplyScalar(kind === 'cloud' ? 2.4 : 1.5) });
    sz[i] = kind === 'cloud' ? 2.6 : kind === 'water' ? 1.2 : 0.8;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('sz', new THREE.BufferAttribute(sz, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 color; attribute float sz; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = clamp(60. * sz / -mv.z, 1.5, 60.); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; void main(){ vec2 d = gl_PointCoord - .5; float a = exp(-dot(d, d) * 9.); gl_FragColor = vec4(vC * a, 1.); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); return { D, pos, col, g };
})();

const amb = new THREE.HemisphereLight(0x8fb4ff, 0x2a1a10, 0.35); scene.add(amb);
const key = new THREE.DirectionalLight(0xbfd6ff, 1.6); key.position.copy(SUN); scene.add(key);
const hot = new THREE.PointLight(0xff8a3c, 6, 0, 1.2); hot.position.copy(B); scene.add(hot);

function frame(t) {
  earthMat.uniforms.ero.value = ero(t); earthMat.uniforms.t.value = t; coreMat.uniforms.t.value = t; diskMat.uniforms.t.value = t;
  core.visible = ero(t) > 0.01;
  const k = t / LEN;   // slow push-in with a slight drift
  cam.position.set(0.12 * k, 0.1 * k, -0.9 * k); cam.lookAt(0.3 + 0.1 * k, 0.15, -6.2);
  for (let i = 0; i < NC; i++) {
    const c = CH[i], tau = t - c.tb;
    if (tau <= 0) { M4.makeScale(0, 0, 0); chunks.setMatrixAt(i, M4); continue; }
    const u = 1 - Math.exp(-tau * c.spd);
    pathPos(c.n, u, c.j, tmp);
    Q.setFromAxisAngle(c.ax, c.w * tau); const sc = c.s * Math.min(1, tau * 3) * (1 - 0.8 * u);
    S3.set(sc, sc, sc); M4.compose(tmp, Q, S3); chunks.setMatrixAt(i, M4);
  }
  chunks.instanceMatrix.needsUpdate = true;
  const { D, pos, col, g } = dust;
  for (let i = 0; i < ND; i++) {
    const d = D[i], tau = t - d.tb;
    if (tau <= 0) { pos[i * 3 + 2] = 1e6; continue; }
    const u = 1 - Math.exp(-tau * d.spd); pathPos(d.n, u, d.j, tmp); pos.set([tmp.x, tmp.y, tmp.z], i * 3);
    const heat = sstep(0.6, 0.95, u), a = Math.min(1, tau * 1.5) * (d.kind === 'cloud' ? 0.035 : d.kind === 'water' ? 0.07 : 0.05);
    col.set([a * (d.base[0] + heat * 1.4), a * (d.base[1] + heat * 0.45), a * Math.max(0, d.base[2] - heat * 0.6)], i * 3);
  }
  g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
  COMP.frame([{ scene, camera: cam, w: 1 }], { exposure: 1.0, sat: 1.08, seed: (t * 30) % 97 });
}
function loop() { requestAnimationFrame(loop); if (window.__assetsOK === false) return; const t = (window.__startAt || 0) + performance.now() / 1000; frame(Math.min(t, LEN - 0.001)); }
window.__frame = frame;
requestAnimationFrame(loop);
});
