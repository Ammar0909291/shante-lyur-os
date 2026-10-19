// Chapters 7-8: outside the universe, the return, the pale blue dot, the closing questions.
'use strict';
Object.assign(window.OVCLS = window.OVCLS || {}, { endq1: 'center', endq2: 'center', endbrand: 'center', endcred: 'cred', olab: 'lab' });

function makeCosmicWeb(n, R, seed) {
  const N = makeNoise(seed), rnd = rng(seed + 1), p = new Float32Array(n * 3), c = new Float32Array(n * 3); let k = 0;
  while (k < n) { const x = (rnd() * 2 - 1) * R, y = (rnd() * 2 - 1) * R, z = (rnd() * 2 - 1) * R, r = Math.hypot(x, y, z); if (r > R) continue;
    const f = 1 - Math.abs(N(x / R * 3, y / R * 3, z / R * 3, 3) * 2 - 1); if (rnd() > Math.pow(f, 9)) continue;     // ridges of the noise field: filaments and walls
    p.set([x, y, z], k * 3); const b = 0.4 + rnd() * 0.6, warm = rnd() < 0.4; c.set(warm ? [b, b * 0.75, b * 0.55] : [b * 0.6, b * 0.75, b], k * 3); k++; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); pts.frustumCulled = false;
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R * 1.02, 64, 48), membraneMat(0xff9a60, 2.2, 0.5));
  const grp = new THREE.Group(); grp.add(pts, shell); return grp;
}

SHOT.outside = {
  init() {
    // stage A: Earth, the Milky Way, the observable universe
    const A = this.A = {}; A.s = new THREE.Scene(); A.cam = new THREE.PerspectiveCamera(40, W / H, 0.0005, 1e7);
    A.s.add(makeSkyDome(TEX.mw, 0.35)); A.earth = makeEarth(TEX, { sun: V3(1, 0.2, 0.5) }); A.s.add(A.earth);
    const G = this.G = {}; G.s = new THREE.Scene(); G.cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 1e6); G.gal = makeGalaxy(160000, 50, 7, { size: 0.9 }); G.gal.rotation.x = 0.35; G.s.add(G.gal); G.gal.userData.mat.uniforms.scale.value = 700; G.gal.add(makeNebula(110, [46, 3, 46], 41, [[0.25, 0.45, 1.1], [0.5, 0.3, 0.9], [0.9, 0.4, 0.6], [0.4, 0.6, 0.9]], { opacity: 0.2, size: 0.55 })); G.s.add(starPoints(2000, 9e4, 5, 1.1, 0.5));
    const U = this.U = {}; U.s = new THREE.Scene(); U.cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 1e6); U.web = makeCosmicWeb(60000, 100, 12); U.s.add(U.web); U.web.add(makeNebula(70, [90, 90, 90], 43, [[1.4, 0.25, 0.12], [1.2, 0.45, 0.15], [0.55, 0.55, 0.62], [0.9, 0.2, 0.3]], { opacity: 0.08, size: 0.7 }));
    // stage B: a hypothetical laboratory whose screen shows our universe
    const B = this.B = {}; B.s = new THREE.Scene(); B.cam = new THREE.PerspectiveCamera(40, W / H, 0.01, 1e6);
    this.urt = new THREE.WebGLRenderTarget(1280, 720, { type: THREE.HalfFloatType }); this.ucam = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 1e5);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshBasicMaterial({ map: this.urt.texture })); screen.position.set(0, 5.5, -6); B.s.add(screen);
    const bez = new THREE.Mesh(new THREE.BoxGeometry(16.6, 9.6, 0.3), new THREE.MeshStandardMaterial({ color: 0x0a0b0e, roughness: 0.5 })); bez.position.set(0, 5.5, -6.2); B.s.add(bez);
    const room = new THREE.Mesh(new THREE.BoxGeometry(26, 13, 22), new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.9, side: THREE.BackSide })); room.position.set(0, 6.5, 2); B.s.add(room);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(9, 1, 1.6), new THREE.MeshStandardMaterial({ color: 0x1b1e24, roughness: 0.5, metalness: 0.5 })); desk.position.set(0, 0.9, 1.2); B.s.add(desk);
    for (let i = 0; i < 40; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 5 ? 0.2 : 1.6, i % 5 ? 0.9 : 0.7, i % 5 ? 1.6 : 0.2) })); l.rotation.x = -Math.PI / 2; l.position.set(-4 + (i % 20) * 0.42, 1.41, 0.8 + Math.floor(i / 20) * 0.5); B.s.add(l); }
    const op = makeFigure({ mat: new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.8 }), coat: true }); op.position.set(1.5, 0, 3.2); this.bokehB = addBokeh(B.s, B.cam, 14, 19, [[1.6, 1.0, 0.55]], { darkFrac: 0.1 }); op.rotation.y = Math.PI + 0.2; pose(op, { nod: -8 }); B.s.add(op);
    const glow = new THREE.PointLight(0xffb070, 1.2, 30, 2); glow.position.set(0, 5.5, -3); B.s.add(glow); B.s.add(new THREE.HemisphereLight(0x405070, 0x050505, 0.3));
    // stage C: the laboratory as a point inside something larger still
    this.labBox = new THREE.Mesh(new THREE.BoxGeometry(26.4, 13.4, 22.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.08, 0.06, 0.05) })); this.labBox.position.set(0, 6.5, 2); B.s.add(this.labBox);
    this.beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color: new THREE.Color(2.2, 1.5, 0.9), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); this.beacon.position.set(0, 6.5, 2); B.s.add(this.beacon);
    const R = rng(808), far = []; for (let i = 0; i < 1400; i++) far.push(V3((R() - 0.5) * 2e4, (R() - 0.5) * 8e3, (R() - 0.5) * 2e4));
    const fg = new THREE.BufferGeometry().setFromPoints(far); this.farM = new THREE.PointsMaterial({ color: 0x8aa0c0, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false }); B.s.add(new THREE.Points(fg, this.farM));
    const lines = []; for (let i = -5; i <= 5; i++) { lines.push(V3(i * 1500, -2000, -8000), V3(i * 1500, -2000, 8000), V3(-8000, -2000, i * 1500), V3(8000, -2000, i * 1500)); }
    this.gridL = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines), new THREE.LineBasicMaterial({ color: 0x1a2438, transparent: true, opacity: 0 })); B.s.add(this.gridL);
  },
  layers(lt, sc) {
    const D = sc.t1 - sc.t0, c = k => cue(sc, k), out = [];
    // A: Earth recedes, then the galaxy, then the cosmic web
    const kE = 1 - sstep(2.6, 3.6, lt), kG = sstep(2.6, 3.6, lt) * (1 - sstep(5.8, 6.8, lt)), kU = sstep(5.8, 6.8, lt) * (1 - sstep(c(1) + 0.2, c(1) + 1.6, lt));
    if (kE > 0.002) { updateEarth(this.A.earth, lt, 0.01); logDolly(this.A.cam, lt, -1.5, 3.6, 3.5, 60, V3(0.3, 0.25, 1), V3(0, 0, 0), 40); out.push({ scene: this.A.s, camera: this.A.cam, w: kE }); }
    if (kG > 0.002) { this.G.gal.rotation.y = lt * 0.05; logDolly(this.G.cam, lt, 2.4, 7, 30, 400, V3(0.1, 0.9, 1), V3(0, 0, 0), 40); out.push({ scene: this.G.s, camera: this.G.cam, w: kG }); }
    const ut = lt; this.U.web.rotation.y = ut * 0.03;
    if (kU > 0.002) { logDolly(this.U.cam, lt, 5.6, c(1) + 1, 40, 330, V3(0.3, 0.2, 1), V3(0, 0, 0), 40); out.push({ scene: this.U.s, camera: this.U.cam, w: kU }); }
    // B/C: the screen shows the same view of the cosmic web; pull back from the screen through the room and beyond
    const kB = sstep(c(1) + 0.2, c(1) + 1.6, lt);
    if (kB > 0.002) {
      setCam(this.ucam, [100, 66, 330], [0, 0, 0], 40); renderer.setRenderTarget(this.urt); renderer.setClearColor(0, 1); renderer.clear(); renderer.render(this.U.s, this.ucam);
      const pb = lt - c(1);
      const lab = sstep(c(2) + 2, c(2) + 6, lt); this.labBox.visible = lab > 0.01; this.labBox.material.color.setRGB(0.08 + lab * 0.6, 0.06 + lab * 0.42, 0.05 + lab * 0.25);
      this.beacon.material.opacity = sstep(c(2) + 5, c(2) + 8, lt); this.beacon.scale.setScalar(lerp(30, 400, sstep(c(2) + 5, c(3) + 4, lt)));
      this.farM.opacity = sstep(c(2) + 6, c(3), lt) * (1 - sstep(D - 5, D, lt)); this.gridL.material.opacity = 0.7 * sstep(c(2) + 6, c(3) + 2, lt) * (1 - sstep(D - 5, D, lt));
      const d = Math.exp(lerp(Math.log(7.2), Math.log(9000), ease(clamp((pb - 0.2) / (D - c(1) - 2)))));
      const dir = V3(lerp(0, 0.35, sstep(4, 12, pb)), lerp(0, 0.3, sstep(4, 12, pb)), 1).normalize();
      const tgt = V3(0, 5.5, -6).lerp(V3(0, 6.5, 2), sstep(8, 16, pb)), p = tgt.clone().addScaledVector(dir, d); setCam(this.B.cam, [p.x, p.y, p.z], [tgt.x, tgt.y, tgt.z], 40);
      this.bokehB.update(lt, 1 - sstep(c(1) + 6, c(1) + 10, lt));
      out.push({ scene: this.B.s, camera: this.B.cam, w: kB });
    }
    return out;
  },
  grade(lt, sc) { const D = sc.t1 - sc.t0; return { exposure: 1 - 0.85 * sstep(D - 6, D - 0.5, lt) }; },
  overlay(lt, sc, w) {
    const c = k => cue(sc, k), D = sc.t1 - sc.t0;
    tagOverlay(lt < c(1) ? 'Our universe · cosmic web visualised' : 'Hypothetical', w * win(lt, 0.5, D - 1, 0.8));
    overlay('olab', 'The observable universe · about 93 billion light-years across', 'left:110px;bottom:200px;font-size:22px', w * win(lt, 6.4, c(1), 0.6));
  },
};

// ---------- return: the same room, rain, a child's drawing ----------
SHOT.return = {
  init() { this.city = world('city', () => makeCity(renderer)); this.cam = new THREE.PerspectiveCamera(42, W / H, 0.02, 40000); },
  layers(lt, sc) {
    const C = this.city, D = sc.t1 - sc.t0; C.setMode('rain'); const F = C.FLOOR;
    C.update(lt + 200, { birdPath: (s, i) => ({ pos: V3(-50 + (s - 1800) * 1.0 - i * 7, F + 3 + i * 2, 38 + i * 5), dir: V3(1, 0.02, 0) }) });
    const desk = V3(2.2, F, 1.6);
    camPath(this.cam, lt, [[0, [desk.x - 0.15, F + 1.05, desk.z - 0.35], [desk.x - 0.2, F + 0.79, desk.z + 0.05], 38], [7, [desk.x - 0.3, F + 1.2, desk.z - 0.6], [desk.x - 0.2, F + 0.8, desk.z + 0.1], 38],
      [11, [1.7, F + 1.35, 0.3], [1.2, F + 1.45, 6], 40], [15, [0.9, F + 1.55, -0.8], [0.6, F + 1.5, 6], 42], [D + 1.5, [0.2, F + 1.6, 1.4], [0.8, F + 2, 120], 42]]);
    return [{ scene: C.scene, camera: this.cam }];
  },
};

// ---------- bluedot: from orbit to a pale blue dot ----------
SHOT.bluedot = {
  init() { const s = this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(36, W / H, 0.001, 2e7);
    s.add(makeSkyDome(TEX.mw, 0.55)); s.add(starPoints(6000, 5e6, 23, 1.4, 1.0)); this.earth = makeEarth(TEX, { sun: V3(1, 0.15, 0.2) }); this.earth.userData.rot0 = 1.2; s.add(this.earth);
    this.dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color: new THREE.Color(0.5, 0.75, 1.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, sizeAttenuation: false, opacity: 0 })); this.dot.scale.setScalar(0.022); s.add(this.dot); },
  layers(lt, sc) {
    const D = sc.t1 - sc.t0; updateEarth(this.earth, lt, 0.01);
    const d = logDolly(this.cam, lt, -1.5, D - 1, 1.2, 6000, V3(0.6, 0.15, 1), V3(0, 0, 0), 36);
    this.dot.material.opacity = sstep(200, 1500, d) * (0.85 + 0.15 * Math.sin(lt * 2));
    return [{ scene: this.scene, camera: this.cam }];
  },
};

// ---------- end: two questions and the brand ----------
SHOT.end = {
  init() { this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 10); },
  layers() { return []; },
  overlay(lt, sc, w) {
    overlay('endq1', '<b>WHAT WOULD CONVINCE YOU<br>THAT REALITY IS A SIMULATION?</b>', '', win(lt, 1.0, 6.6, 0.9));
    overlay('endq2', '<b>AND WHAT EVIDENCE<br>WOULD CHANGE YOUR MIND?</b>', '', win(lt, 7.0, 11.4, 0.9));
    overlay('endbrand', '<b style="font:600 30px Inter;letter-spacing:.42em">3D UNIVERSAL LEARNING</b><p style="font:400 24px Inter;color:#c9ced8;letter-spacing:.06em;margin-top:22px">Explore reality. Question assumptions. Follow the evidence.</p>', '', win(lt, 11.8, 16.5, 0.8));
    overlay('endcred', 'Narration: computer-generated voice (Piper “Norman”, public domain) · Earth imagery: NASA Blue Marble / Black Marble · Milky Way: ESO/S. Brunier (CC BY 4.0) · Sources in the description', '', win(lt, 12.2, 16.5, 0.8));
  },
};
