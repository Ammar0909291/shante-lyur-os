// Chapters 4-5: powers of ten, physical laws, the double slit, the sealed laboratory, a proposed test.
'use strict';
Object.assign(window.OVCLS = window.OVCLS || {}, { zlab: 'lab', eq1: 'eq', eq2: 'eq', qlab1: 'lab', qlab2: 'lab', qlab3: 'lab', four: 'list', crlab1: 'lab', crlab2: 'lab', nots: 'list' });

// ---------- zoom: galaxy to atom, each level drawn at its own scale ----------
function terrainMesh() {
  const N = makeNoise(88), g = new THREE.PlaneGeometry(400, 400, 220, 220); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); let h = 0, a = 1, f = 0.006;
    for (let o = 0; o < 6; o++) { const n = 1 - Math.abs(N(x * f, 0.3, z * f, 1) * 2 - 1); h += n * n * a; a *= 0.5; f *= 2.1; }
    h = h * 70 - 20; p.setY(i, h);
    const snow = sstep(32, 42, h), rock = 0.25 + 0.1 * N(x * 0.05, 1, z * 0.05, 2);
    col.set([lerp(rock * 0.9, 0.92, snow), lerp(rock * 0.85, 0.94, snow), lerp(rock * 0.8, 0.98, snow)], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
}
function membraneMat(color, power = 2.5, k = 1) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { c: { value: new THREE.Color(color) }, p: { value: power }, k: { value: k } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 c; uniform float p, k; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), p); gl_FragColor = vec4(c * (f * 1.4 + 0.05) * k, 1.); }` });
}
SHOT.zoom = {
  init() {
    const L = this.levels = [];
    const mk = (fn) => { const s = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, W / H, 0.001, 1e6); const u = fn(s, cam); L.push(Object.assign({ s, cam }, u)); };
    mk((s, cam) => { s.add(starPoints(3000, 5e4, 3, 1.2, 0.7)); const g = makeGalaxy(140000, 50, 11, { size: 1.0 }); g.rotation.x = 0.5; s.add(g); g.userData.mat.uniforms.scale.value = 600; const nb = makeNebula(90, [46, 3, 46], 21, [[0.25, 0.45, 1.1], [0.5, 0.3, 0.9], [0.9, 0.4, 0.6], [0.4, 0.6, 0.9]], { opacity: 0.2, size: 0.55 }); g.add(nb);
      return { label: 'The Milky Way · about 100,000 light-years across', u(t) { g.rotation.y = t * 0.06; setCam(cam, [0, 40 - t * 6, 95 - t * 14], [0, 0, 0], 40); } }; });
    mk((s, cam) => { s.add(makeSkyDome(TEX.mw, 0.3)); const e = makeEarth(TEX, { sun: V3(1, 0.3, 0.6) }); s.add(e);
      return { label: 'Earth · 12,742 km across', u(t) { updateEarth(e, t + 10, 0.05); setCam(cam, [0.4, 0.5, 3.6 - t * 0.9], [0, 0.1, 0], 40); } }; });
    mk((s, cam) => { s.add(new THREE.Mesh(new THREE.SphereGeometry(5000, 32, 16), gradientSky(0x2a5ea8, 0xc8d6e6, 0x8a8a8a, V3(0.6, 0.4, -0.5), 0xfff0d8))); s.fog = new THREE.Fog(0x6f86a8, 260, 1100);
      s.add(terrainMesh()); const sun = new THREE.DirectionalLight(0xfff0d8, 2.6); sun.position.set(300, 200, -250); s.add(sun); s.add(new THREE.HemisphereLight(0xa8c4ff, 0x302820, 0.6));
      return { label: 'Mountains · a few kilometres', u(t) { setCam(cam, [-60 + t * 10, 150 - t * 8, 260 - t * 22], [10, 20, 0], 42); } }; });
    mk((s, cam) => { const R = rng(31), n = 5200, g = new THREE.IcosahedronGeometry(1, 0), M = new THREE.Matrix4(), q = new THREE.Quaternion();
      const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05, flatShading: true }), n);
      for (let i = 0; i < n; i++) { q.setFromEuler(new THREE.Euler(R() * 6, R() * 6, R() * 6)); const r = 0.09 + R() * 0.12; M.compose(V3((R() - 0.5) * 14, R() * 0.3, (R() - 0.5) * 14), q, V3(r * (0.7 + R() * 0.6), r * (0.6 + R() * 0.4), r * (0.8 + R() * 0.4))); m.setMatrixAt(i, M);
        const c = new THREE.Color().setHSL(0.08 + R() * 0.04, 0.35 + R() * 0.3, 0.45 + R() * 0.35); if (R() < 0.08) c.setHSL(0.6, 0.05, 0.85); m.setColorAt(i, c); }
      s.add(m); const sun = new THREE.DirectionalLight(0xffe6c0, 2.4); sun.position.set(5, 4, 3); s.add(sun); s.add(new THREE.HemisphereLight(0xbfd4ff, 0x3a2a1a, 0.5));
      return { label: 'Grains of sand · about half a millimetre', u(t) { setCam(cam, [0.3, 2.2 - t * 0.5, 3.6 - t * 0.7], [0, 0.1, 0], 40); } }; });
    mk((s, cam) => { const R = rng(41);
      s.add(new THREE.Mesh(new THREE.SphereGeometry(4, 64, 48), membraneMat(0x7fd0ff, 2.2, 0.9)));
      const nuc = new THREE.Mesh(new THREE.SphereGeometry(1.3, 48, 32), membraneMat(0xd889ff, 1.6, 1.0)); nuc.position.set(0.4, 0.2, 0); s.add(nuc);
      const nuc2 = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 24), membraneMat(0xff9ad0, 1.2, 1.2)); nuc2.position.set(0.6, 0.4, 0.2); s.add(nuc2);
      for (let i = 0; i < 26; i++) { const o = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), membraneMat(R() < 0.5 ? 0x9cffb0 : 0xffd27a, 1.5, 0.8)); const d = 1.8 + R() * 1.7, a = R() * TAU, b = Math.acos(R() * 2 - 1);
        o.position.set(d * Math.sin(b) * Math.cos(a), d * Math.cos(b), d * Math.sin(b) * Math.sin(a)); o.scale.set(0.35 + R() * 0.2, 0.14 + R() * 0.08, 0.14 + R() * 0.08); o.rotation.set(R() * 3, R() * 3, R() * 3); s.add(o); }
      return { label: 'A living cell · about 0.01 mm (illustration)', u(t) { s.rotation.y = t * 0.1; setCam(cam, [0, 1, 13 - t * 2.4], [0.4, 0.2, 0], 40); } }; });
    mk((s, cam) => { const g = new THREE.Group(); s.add(g); const ballG = new THREE.SphereGeometry(0.16, 20, 14), bond = new THREE.CylinderGeometry(0.05, 0.05, 1, 10);
      const cols = [0x4a7bff, 0xff4a4a, 0xf2f2f2, 0x9a9a9a, 0xffa030], mats = cols.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.1 }));
      for (let i = 0; i < 60; i++) { const a = i * 0.6, y = i * 0.34 - 10;
        const p1 = V3(Math.cos(a) * 1, y, Math.sin(a) * 1), p2 = V3(Math.cos(a + Math.PI * 0.8) * 1, y, Math.sin(a + Math.PI * 0.8) * 1);
        for (const p of [p1, p2]) { const b = new THREE.Mesh(ballG, mats[(i % 4)]); b.position.copy(p); g.add(b); }
        const mid = p1.clone().add(p2).multiplyScalar(0.5), c = new THREE.Mesh(bond, mats[4]); c.position.copy(mid); c.scale.y = p1.distanceTo(p2); c.lookAt(p2); c.rotateX(Math.PI / 2); g.add(c); }
      s.add(new THREE.HemisphereLight(0xcfe0ff, 0x202030, 0.8)); const k = new THREE.DirectionalLight(0xffffff, 1.6); k.position.set(3, 4, 5); s.add(k);
      return { label: 'DNA · about 2 nanometres wide', u(t) { g.rotation.y = t * 0.5; setCam(cam, [0, 1 - t * 0.2, 7 - t * 1.2], [0, 0, 0], 40); } }; });
    mk((s, cam) => { const R = rng(51), n = 30000, p = new Float32Array(n * 3), c = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { let x, y, z, w;   // 1s and 2p orbital shapes, sampled from their probability densities
        if (i % 3) { do { x = (R() - 0.5) * 8; y = (R() - 0.5) * 8; z = (R() - 0.5) * 8; const r = Math.hypot(x, y, z); w = Math.exp(-r) * r * r * (z * z) / (r * r + 1e-6) * 0.25; } while (R() > w); }
        else { do { x = (R() - 0.5) * 4; y = (R() - 0.5) * 4; z = (R() - 0.5) * 4; w = Math.exp(-2 * Math.hypot(x, y, z)); } while (R() > w); }
        p.set([x, y, z], i * 3); c.set(i % 3 ? [0.3, 0.6, 1.0] : [0.6, 0.85, 1.0], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      const cloud = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); s.add(cloud);
      const nuc = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color: new THREE.Color(3, 1.8, 1.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); nuc.scale.setScalar(0.35); s.add(nuc);
      return { label: 'An atom · about 0.1 nanometres · the cloud shows where an electron is likely to be found', u(t) { cloud.rotation.y = t * 0.15; setCam(cam, [0, 1.2, 12 - t * 1.4], [0, 0, 0], 40); } }; });
  },
  layers(lt, sc) {
    const D = sc.t1 - sc.t0 + 0.8, n = this.levels.length, seg = D / n, X = 0.45, out = [];
    this.levels.forEach((L, i) => { const a = i * seg, b = a + seg; const w = (i === 0 ? 1 : sstep(a - X, a + X, lt)) * (i === n - 1 ? 1 : 1 - sstep(b - X, b + X, lt));
      if (w > 0.002) { L.u(lt - a + 0.5); out.push({ scene: L.s, camera: L.cam, w }); } });
    return out;
  },
  overlay(lt, sc, w) {
    const D = sc.t1 - sc.t0 + 0.8, n = this.levels.length, seg = D / n, i = Math.min(n - 1, Math.max(0, Math.floor(lt / seg)));
    overlay('zlab', this.levels[i].label, 'left:110px;bottom:200px;font-size:22px', w * (0.25 + 0.75 * win(lt - i * seg, 0.15, seg - 0.1, 0.25)));
    tagOverlay('Illustration · each view at its own scale', w);
  },
};

// ---------- laws: gravity well, a light pulse, two exact statements ----------
SHOT.laws = {
  init() {
    const s = this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 5000);
    s.add(makeSkyDome(TEX.mw, 0.12)); s.add(starPoints(3000, 3000, 77, 1.2, 0.6));
    const nbL = makeNebula(40, [900, 200, 300], 31, [[1.4, 0.25, 0.12], [1.2, 0.45, 0.15], [0.55, 0.55, 0.62], [0.9, 0.2, 0.3]], { opacity: 0.16, size: 1.1 }); nbL.position.set(0, 60, -900); s.add(nbL);
    this.bokeh = addBokeh(s, this.cam, 18, 13, [[1.6, 1.0, 0.5]], { darkFrac: 0.2 });
    const g = new THREE.PlaneGeometry(240, 240, 240, 240); g.rotateX(-Math.PI / 2);
    this.grid = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, extensions: { derivatives: true }, uniforms: { k: { value: 1 } },
      vertexShader: `varying vec3 vW; void main(){ vec3 p = position; float r = length(p.xz); p.y = -260. / sqrt(r * r + 90.) + 1.4; vec4 w = modelMatrix * vec4(p,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float k; varying vec3 vW; void main(){ vec2 c = vW.xz / 6.; vec2 g = abs(fract(c - .5) - .5) / fwidth(c); float l = 1. - min(min(g.x, g.y), 1.);
        float fade = 1. - smoothstep(60., 120., length(vW.xz)); gl_FragColor = vec4(vec3(0.25, 0.55, 1.0) * l * 0.55 * fade * k, l * fade * 0.9); }` }));
    s.add(this.grid);
    const star = new THREE.Mesh(new THREE.SphereGeometry(3.2, 48, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.2) })); star.position.y = -25; s.add(star); this.star = star;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color: new THREE.Color(2, 1.3, 0.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); halo.scale.setScalar(30); halo.position.copy(star.position); s.add(halo);
    this.planet = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 24), new THREE.MeshStandardMaterial({ color: 0x5a8acc, roughness: 0.7 })); s.add(this.planet);
    const pl = new THREE.PointLight(0xffe2b0, 3, 0, 1); pl.position.copy(star.position); s.add(pl); s.add(new THREE.AmbientLight(0x223344, 0.4));
    this.orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 129 }, (_, i) => V3(Math.cos(i / 128 * TAU) * 34, 0, Math.sin(i / 128 * TAU) * 34))), new THREE.LineBasicMaterial({ color: 0x8fb8ff, transparent: true, opacity: 0.35 })); s.add(this.orbit);
    // a pulse of light crossing above the well with its trail
    this.pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color: new THREE.Color(2.5, 2.5, 2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); this.pulse.scale.setScalar(3); s.add(this.pulse);
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: 0xfff6dc, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })); this.trail.frustumCulled = false; s.add(this.trail);
  },
  layers(lt, sc) {
    const D = sc.t1 - sc.t0, r = 34, y = -260 / Math.sqrt(r * r + 90) + 3, a = lt * 0.32;
    this.planet.position.set(Math.cos(a) * r, y, Math.sin(a) * r); this.orbit.position.y = y;
    const t0 = cue(sc, 0) + 4.6, u = clamp((lt - t0) / 4), x = lerp(-140, 140, u);
    this.pulse.position.set(x, 18, -10); this.pulse.material.opacity = win(lt, t0, t0 + 4, 0.2);
    const tp = this.trail.geometry.attributes.position.array; tp.set([Math.max(-140, x - 60), 18, -10, x, 18, -10]); this.trail.geometry.attributes.position.needsUpdate = true; this.trail.material.opacity = 0.6 * this.pulse.material.opacity;
    this.grid.material.uniforms.k.value = 1 - 0.5 * sstep(cue(sc, 1), cue(sc, 1) + 3, lt); this.bokeh.update(lt);
    camPath(this.cam, lt, [[0, [0, 70, 120], [0, -10, 0], 40], [D * 0.5, [60, 45, 95], [0, -12, 0], 40], [D + 1, [95, 30, 40], [0, -14, 0], 40]]);
    return [{ scene: this.scene, camera: this.cam }];
  },
  overlay(lt, sc, w) {
    const c0 = cue(sc, 0);
    tagOverlay('Established physics', w * win(lt, 0.5, sc.t1 - sc.t0, 0.8));
    overlay('eq1', '<small>Newton’s law of gravitation</small>F = G m<sub>1</sub>m<sub>2</sub> / r<sup>2</sup>', 'left:120px;top:250px', w * win(lt, c0 + 0.3, cue(sc, 1) + 1.5, 0.8));
    overlay('eq2', '<small>Speed of light in a vacuum · exact, by definition</small>c = 299,792,458 m/s', 'left:120px;top:420px', w * win(lt, c0 + 4.2, cue(sc, 1) + 1.5, 0.8));
    overlay('lawnote', '<small>DESCRIPTION IS NOT MECHANISM</small><b>Equations describe patterns</b><p>They do not, by themselves, tell us whether anything is computing them.</p>', '', w * win(lt, cue(sc, 1) + 2.5, sc.t1 - sc.t0 - 0.3));
  },
};

// ---------- quantum: single-electron build-up of a two-slit pattern ----------
function slitSamples(n, seed, interfere) {
  const R = rng(seed), out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    let x, ok = false;
    while (!ok) { x = (R() - 0.5) * 2; const env = Math.pow(Math.sin(x * 4.2 + 1e-6) / (x * 4.2 + 1e-6), 2);
      const p = interfere ? env * Math.pow(Math.cos(x * 15.5), 2) : 0.5 * (Math.exp(-Math.pow((x - 0.13) / 0.2, 2)) + Math.exp(-Math.pow((x + 0.13) / 0.2, 2))) * (0.6 + 0.4 * env);
      ok = R() < p; }
    let y = 0; for (let k = 0; k < 4; k++) y += R(); y = (y / 4 - 0.5) * 1.5;
    out[i * 2] = x; out[i * 2 + 1] = y;
  }
  return out;
}
SHOT.quantum = {
  init() {
    const s = this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(38, W / H, 0.01, 200);
    s.fog = new THREE.FogExp2(0x03050a, 0.012); s.add(new THREE.HemisphereLight(0x8aa6d6, 0x101010, 1.1)); { const k = new THREE.SpotLight(0xcfe0ff, 2.5, 60, 0.6, 0.8); k.position.set(-4, 14, 10); s.add(k, k.target); }
    const metal = new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.45, metalness: 0.7 });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(30, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.4, metalness: 0.3 })); bench.position.y = -2.2; s.add(bench);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 2.4, 32), metal); gun.rotation.z = Math.PI / 2; gun.position.set(-11, 0, 0); s.add(gun);
    this.gunTip = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color: new THREE.Color(0.6, 1.4, 2.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); this.gunTip.position.set(-9.7, 0, 0); this.gunTip.scale.setScalar(1.2); s.add(this.gunTip);
    for (const [y, h] of [[2.6, 4.4], [-2.6, 4.4], [0, 0.5]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, h, 6), metal); b.position.set(-2, y, 0); s.add(b); }   // barrier with two slits at y = +-0.3
    // which-path detector beside the upper slit
    this.det = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 16, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0) })); this.det.position.set(-1.4, 0.55, 0); this.det.rotation.y = Math.PI / 2; s.add(this.det);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.2, 6, 7), new THREE.MeshStandardMaterial({ color: 0x0b0e13, roughness: 0.8 })); screen.position.set(9, 0, 0); s.add(screen);
    // dots: appear at precomputed times; a brief flash on arrival
    const mk = (n, seed, interfere, tStart, tSpan) => {
      const sm = slitSamples(n, seed, interfere), pos = new Float32Array(n * 3), at = new Float32Array(n);
      for (let i = 0; i < n; i++) { pos.set([8.88, sm[i * 2 + 1] * 2.2, sm[i * 2] * 3.3], i * 3); at[i] = tStart + (i < 8 ? i * 0.8 : 6.4 + tSpan * Math.pow((i - 8) / (n - 8), 0.55)); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('at', new THREE.BufferAttribute(at, 1));
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 }, k: { value: 1 } },
        vertexShader: `attribute float at; uniform float t; varying float vA; void main(){ float d = t - at; vA = d < 0. ? 0. : 0.55 + 4. * exp(-d * 6.); vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = d < 0. ? 0. : 3.2 + 12. * exp(-d * 8.); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform float k; varying float vA; void main(){ vec2 d = gl_PointCoord - .5; gl_FragColor = vec4(vec3(0.45, 0.85, 1.0) * vA * k * exp(-dot(d,d) * 16.), 1.); }` });
      const p = new THREE.Points(g, m); p.frustumCulled = false; s.add(p); return m;
    };
    this.dotsA = mk(7000, 5, true, 0, 11.5); this.dotsB = mk(5000, 6, false, 0, 7.5);
    // faint wave model between the slits and the screen
    const wg = new THREE.PlaneGeometry(11, 6.5, 1, 1); this.wave = new THREE.Mesh(wg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { t: { value: 0 }, k: { value: 0 } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform float t, k; varying vec2 vP; void main(){ vec2 p = vec2(vP.x + 5.5, vP.y); float r1 = length(p - vec2(0., 0.3)), r2 = length(p - vec2(0., -0.3));
        float a = cos(r1 * 9. - t * 6.) / sqrt(r1 + .3) + cos(r2 * 9. - t * 6.) / sqrt(r2 + .3); float i = a * a * 0.25; gl_FragColor = vec4(vec3(0.3, 0.6, 1.0) * i * k * smoothstep(0., 1., p.x), 1.); }` }));
    this.wave.rotation.x = -Math.PI / 2; this.wave.position.set(3.5, 0, 0); this.wave.rotation.set(0, 0, 0); this.wave.rotateY(0); this.wave.position.set(3.5, 0, 0);
    this.wave.lookAt(3.5, 0, 10); s.add(this.wave);
  },
  layers(lt, sc) {
    const D = sc.t1 - sc.t0, c = k => cue(sc, k);
    const tA = lt - (c(0) + 1.2); this.dotsA.uniforms.t.value = tA; this.dotsA.uniforms.k.value = 1 - sstep(c(2) + 3, c(2) + 4.5, lt);
    const tB = lt - (c(2) + 5.5); this.dotsB.uniforms.t.value = tB; this.dotsB.uniforms.k.value = sstep(c(2) + 5, c(2) + 5.5, lt) * (1 - 0.5 * sstep(c(3) + 2, c(3) + 6, lt));
    this.gunTip.material.opacity = 0.4 + 0.6 * Math.exp(-((tA % 0.8) + 0.8) * 3) * (tA > 0 && tA < 6.4 ? 1 : 0.3);
    this.wave.material.uniforms.t.value = lt; this.wave.material.uniforms.k.value = 0.6 * win(lt, c(1) + 4, c(2) + 1, 1.5);
    const dk = sstep(c(2) + 3.5, c(2) + 4.5, lt); this.det.material.color.setRGB(dk * 2.2, dk * 1.4, dk * 0.4);
    camPath(this.cam, lt, [[0, [-9, 5, 16], [0, 0, 0], 38], [c(0) + 5, [-4, 3, 12], [3, 0, 0], 38], [c(1) + 2, [3.2, 1.2, 6.5], [8.9, 0, 0.3], 38], [c(1) + 9, [4.6, 0.6, 4.8], [8.9, 0, 0], 36], [c(2) + 1.5, [-5, 3.5, 9], [-1, 0, 0], 38], [c(2) + 9, [4.4, 0.8, 5.2], [8.9, 0, 0], 36], [D + 1, [-8, 7, 18], [1, 0, 0], 40]]);
    return [{ scene: this.scene, camera: this.cam }];
  },
  overlay(lt, sc, w) {
    const c = k => cue(sc, k);
    tagOverlay('Real experiment · visualised', w * win(lt, 0.5, sc.t1 - sc.t0, 0.8));
    overlay('qlab1', 'Electrons fired one at a time · each lands as a single dot', 'left:110px;top:240px', w * win(lt, c(0) + 1.5, c(1) + 2));
    overlay('qlab2', 'Thousands of dots later: interference stripes · first shown with single electrons in the 1970s–80s', 'left:110px;top:240px', w * win(lt, c(1) + 3, c(2) + 1));
    overlay('qlab3', 'Which-path detector on: the stripes vanish · the detector is a physical interaction, no human required', 'left:110px;top:240px', w * win(lt, c(2) + 4.5, sc.t1 - sc.t0 - 0.5));
  },
};

// ---------- lab: a scientist in a sealed room, which is itself inside something larger ----------
SHOT.lab = {
  init() {
    const s = this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(40, W / H, 0.02, 6000);
    const wallM = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.85, side: THREE.BackSide });
    const room = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 8), wallM); room.position.y = 2; s.add(room);
    for (const x of [-2.5, 2.5]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.25, 2.3) })); p.rotation.x = Math.PI / 2; p.position.set(x, 3.98, 0); s.add(p); }
    for (const x of [-2.5, 2.5]) { const l = new THREE.PointLight(0xf4f7ff, 1.3, 14, 2); l.position.set(x, 3.6, 0); s.add(l); }
    s.add(new THREE.HemisphereLight(0xeef2ff, 0x404040, 0.35));
    const bench = new THREE.Mesh(new THREE.BoxGeometry(4, 0.08, 1.2), new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.4 })); bench.position.set(0.5, 0.95, -2.6); s.add(bench);
    for (const [x, z] of [[-1.4, -3.1], [2.4, -3.1], [-1.4, -2.1], [2.4, -2.1]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), bench.material); l.position.set(x, 0.47, z); s.add(l); }
    // pendulum, length 1 m: period 2.006 s
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.4, 0.05), new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.8, roughness: 0.3 })); frame.position.set(1.6, 1.68, -2.7); s.add(frame);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.04), frame.material); arm.position.set(1.32, 2.36, -2.7); s.add(arm);
    this.pend = new THREE.Group(); this.pend.position.set(1.05, 2.36, -2.7); s.add(this.pend);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 8), frame.material); rod.position.y = -0.5; this.pend.add(rod);
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 0.9, roughness: 0.25 })); bob.position.y = -1; this.pend.add(bob);
    // monitor showing the repeated measurement
    this.mc = document.createElement('canvas'); this.mc.width = 512; this.mc.height = 320; this.mtex = new THREE.CanvasTexture(this.mc); this.mtex.encoding = THREE.sRGBEncoding;
    const mon = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.47), new THREE.MeshBasicMaterial({ map: this.mtex })); mon.position.set(-0.6, 1.35, -3.15); s.add(mon);
    const mb = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.52, 0.04), new THREE.MeshStandardMaterial({ color: 0x15171a })); mb.position.set(-0.6, 1.35, -3.18); s.add(mb);
    this.sci = makeFigure({ color: 0xe9eaec, coat: true, coatMat: new THREE.MeshStandardMaterial({ color: 0xf2f3f5, roughness: 0.8, side: THREE.DoubleSide }) });
    this.sci.position.set(-0.2, 0, -1.6); this.sci.rotation.y = Math.PI * 0.92; s.add(this.sci);
    this.sci.traverse(o => { if (o.isMesh && o.material.color && o.material.color.getHex() === 0xe9eaec) o.material = new THREE.MeshStandardMaterial({ color: 0x3a3330, roughness: 0.8 }); });
    // glass sphere and the larger structure around it
    this.glass = new THREE.Mesh(new THREE.SphereGeometry(9, 96, 64), membraneMat(0x9fd8ff, 3, 0.6)); this.glass.position.y = 2; s.add(this.glass);
    const ring = (r, t, c) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 16, 200), new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0], c[1], c[2]) })); m.position.y = 2; s.add(m); return m; };
    this.rings = [ring(14, 0.05, [0.4, 0.8, 1.2]), ring(14, 0.05, [0.4, 0.8, 1.2]), ring(60, 0.3, [0.25, 0.4, 0.7])]; this.rings[1].rotation.y = Math.PI / 2; this.rings[2].rotation.x = Math.PI / 2;
    const lat = []; for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) { lat.push(V3(i * 120, -400, j * 120), V3(i * 120, 400, j * 120)); }
    s.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lat), new THREE.LineBasicMaterial({ color: 0x1c2a44, transparent: true, opacity: 0.6 })));
    s.add(starPoints(2500, 3000, 61, 1.2, 0.4));
    this.lastMeasure = -1;
  },
  layers(lt, sc) {
    const D = sc.t1 - sc.t0, c = k => cue(sc, k), fz = c(2) + 5.2, tt = Math.min(lt, fz);
    const T = 2.006, ang = 0.22 * Math.cos(TAU * tt / T); this.pend.rotation.z = ang;
    const n = Math.floor(tt / T);
    if (n !== this.lastMeasure) { this.lastMeasure = n; const g = this.mc.getContext('2d'); g.fillStyle = '#071018'; g.fillRect(0, 0, 512, 320); g.fillStyle = '#7fd8ff'; g.font = '500 26px "JetBrains Mono", monospace';
      g.fillText('PENDULUM  L = 1.000 m', 24, 46); g.fillStyle = '#cfe9ff'; for (let i = 0; i < 7; i++) { const k = n - 6 + i; if (k < 1) continue; g.fillText('run ' + String(k).padStart(3, '0') + '   T = 2.006 s', 24, 96 + i * 32); } this.mtex.needsUpdate = true; }
    pose(this.sci, { nod: 8 + Math.sin(tt * 0.6) * 3, armRx: 25, elbR: 70, armLx: 10, elbL: 30 });
    this.rings[0].rotation.x = tt * 0.08; this.rings[1].rotation.z = tt * 0.06;
    camPath(this.cam, lt, [[0, [1.8, 1.5, -0.4], [0.6, 1.4, -3], 40], [c(1) - 0.5, [2.6, 1.9, 1.6], [0.2, 1.3, -2.5], 40], [c(1) + 6, [10, 6, 26], [0, 2, 0], 40], [c(2) + 4, [40, 25, 110], [0, 2, 0], 42], [D + 1.5, [70, 40, 190], [0, 6, 0], 42]]);
    return [{ scene: this.scene, camera: this.cam }];
  },
  grade(lt, sc) { return { sat: 1 - 0.6 * sstep(cue(sc, 2) + 5.2, cue(sc, 2) + 5.6, lt) }; },
  overlay(lt, sc, w) {
    tagOverlay('Thought experiment', w * win(lt, 0.5, sc.t1 - sc.t0, 0.8));
    overlay('labnote', '<small>A WARNING</small><b>An untestable idea predicts nothing</b><p>If no observation could ever count against it, it cannot tell us what to expect.</p>', '', w * win(lt, cue(sc, 2) + 3.5, sc.t1 - sc.t0 - 0.3));
  },
};

// ---------- test: a lattice universe and cosmic rays; four questions ----------
SHOT.test = {
  init() {
    const s = this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(40, W / H, 0.01, 1e5);
    s.add(makeSkyDome(TEX.mw, 0.18)); this.earth = makeEarth(TEX, { sun: V3(1, 0.3, 0.5) }); s.add(this.earth); this.bokeh = addBokeh(s, this.cam, 16, 17, [[0.5, 0.8, 1.6], [1.4, 1.0, 0.6]]);
    const L = []; const N = 7, sp = 1.6;
    for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) { L.push(V3(i * sp, j * sp, -N * sp), V3(i * sp, j * sp, N * sp), V3(i * sp, -N * sp, j * sp), V3(i * sp, N * sp, j * sp), V3(-N * sp, i * sp, j * sp), V3(N * sp, i * sp, j * sp)); }
    this.latMat = new THREE.LineBasicMaterial({ color: 0x4aa8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    s.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(L), this.latMat));
    // cosmic-ray tracks: isotropic (what an ordinary universe predicts) or aligned with the lattice axes (the hypothetical signature)
    const R = rng(97), NR = 160; this.rays = [];
    const axes = [V3(1, 0, 0), V3(-1, 0, 0), V3(0, 1, 0), V3(0, -1, 0), V3(0, 0, 1), V3(0, 0, -1)];
    for (let i = 0; i < NR; i++) {
      const u = R() * 2 - 1, a = R() * TAU, iso = V3(Math.sqrt(1 - u * u) * Math.cos(a), u, Math.sqrt(1 - u * u) * Math.sin(a));
      const ax = axes[i % 6].clone().add(V3((R() - 0.5) * 0.12, (R() - 0.5) * 0.12, (R() - 0.5) * 0.12)).normalize();
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const m = new THREE.LineBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const l = new THREE.Line(g, m); l.frustumCulled = false; s.add(l); this.rays.push({ l, m, iso, ax, ph: R() * 3, off: V3((R() - 0.5) * 1.6, (R() - 0.5) * 1.6, (R() - 0.5) * 1.6) });
    }
  },
  layers(lt, sc) {
    const D = sc.t1 - sc.t0, c = k => cue(sc, k);
    updateEarth(this.earth, lt, 0.03); this.bokeh.update(lt);
    this.latMat.opacity = 0.5 * sstep(c(0) + 5, c(0) + 9, lt) * (1 - 0.7 * sstep(c(1) + 8.5, c(1) + 10.5, lt)) + 0.08 * sstep(c(2), c(2) + 2, lt) * 0;
    const alignK = win(lt, c(1) + 1.5, c(1) + 6.2, 0.8), rayK = win(lt, c(1), c(2) + 1, 0.8);
    for (const r of this.rays) {
      const dir = r.iso.clone().lerp(r.ax, alignK).normalize(), cyc = ((lt * 0.7 + r.ph) % 3) / 3, head = lerp(16, 1.1, cyc), tail = head + 3.5;
      const p = r.l.geometry.attributes.position.array, o = r.off.clone().multiplyScalar(1 - cyc);
      const A = dir.clone().multiplyScalar(head).add(o), B = dir.clone().multiplyScalar(tail).add(o); p.set([A.x, A.y, A.z, B.x, B.y, B.z]); r.l.geometry.attributes.position.needsUpdate = true;
      r.m.opacity = rayK * 0.75 * Math.sin(cyc * Math.PI); r.m.color.setRGB(lerp(1, 0.5, alignK), lerp(0.85, 0.85, alignK), lerp(0.6, 1, alignK));
    }
    camPath(this.cam, lt, [[0, [0, 2, 8], [0, 0, 0], 40], [c(1), [10, 6, 20], [0, 0, 0], 40], [c(2), [16, 9, 26], [0, 0, 0], 40], [D + 1, [8, 4, 32], [-3, 0, 0], 40]]);
    return [{ scene: this.scene, camera: this.cam }];
  },
  overlay(lt, sc, w) {
    const c = k => cue(sc, k), D = sc.t1 - sc.t0;
    tagOverlay(lt < c(2) ? 'Proposed test · 2012' : 'How to judge a claim', w * win(lt, 0.5, D, 0.8));
    overlay('beane', '<small>BEANE, DAVOUDI &amp; SAVAGE · 2012</small><b>Constraints on the Universe as a Numerical Simulation</b><p>If space were a computational grid, the highest-energy cosmic rays might carry its imprint.</p>', '', w * win(lt, c(0) + 4, c(1) - 0.3));
    overlay('crlab1', 'Hypothetical signature: tracks aligned with the grid axes', 'left:110px;top:240px;color:#9fd8ff', w * win(lt, c(1) + 2, c(1) + 6.2, 0.5));
    overlay('crlab2', 'Reported observations: no lattice-aligned pattern', 'left:110px;top:240px;color:#ffd9a0', w * win(lt, c(1) + 6.6, c(2) + 0.5, 0.5));
    const qs = ['What exactly does it predict?', 'Can it be tested?', 'Does it rule out ordinary explanations?', 'Can others reproduce it?'];
    const tq = [c(2) + 1.2, c(2) + 3.6, c(2) + 5.3, c(2) + 8.4];
    overlay('four', '<p style="font:600 16px Inter;letter-spacing:.3em;color:#f2b45a;margin-bottom:30px">FOUR QUESTIONS FOR ANY CLAIMED GLITCH</p>' + qs.map((q, i) => `<p style="opacity:${(0.2 + 0.8 * sstep(tq[i] - 0.3, tq[i] + 0.5, lt)).toFixed(3)}"><em>${i + 1}</em>${q}</p>`).join(''), 'top:250px', w * win(lt, c(2) + 0.5, D - 0.3, 0.8));
    overlay('nots', '<p style="font:500 30px Inter;color:#b9c0cc"><s>Déjà vu</s> · <s>coincidences</s> · <s>strange personal experiences</s></p>', 'top:760px;background:none;padding-left:120px', w * win(lt, c(3) + 0.5, D - 0.3, 0.8));
  },
};
