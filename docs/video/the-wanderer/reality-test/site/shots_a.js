// Chapters 1-2: drip, window, ascend, build, worlds.
'use strict';
const cue = (sc, k) => sc.cues[k] ? sc.cues[k][0] - sc.t0 : 1e9;      // local start time of the k-th cue of a scene
const cueEnd = (sc, k) => sc.cues[k] ? sc.cues[k][1] - sc.t0 : 1e9;
function tagOverlay(text, k) { overlay('tag', '<i></i>' + text, '', k); }

// ---------- drip: a drop of water in a metal sink, in darkness ----------
SHOT.drip = {
  init() {
    const s = this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(30, W / H, 0.005, 50);
    const env = envFromMaterial(renderer, gradientSky(0x4a505a, 0x1c1e22, 0x0a0a0c, V3(0.3, 0.8, 0.4), 0xb8c4d6, 0.93));
    const prof = []; for (let i = 0; i <= 40; i++) { const u = i / 40; prof.push(new THREE.Vector2(0.02 + Math.sin(u * Math.PI / 2) * 0.24, -0.16 + (1 - Math.cos(u * Math.PI / 2)) * 0.16)); }
    prof.push(new THREE.Vector2(0.27, 0.0), new THREE.Vector2(0.32, 0.005), new THREE.Vector2(0.6, 0.005));
    const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 0.8, roughness: 0.26 });
    const basin = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), steel); basin.material.side = THREE.DoubleSide; s.add(basin);
    const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.004, 32), new THREE.MeshStandardMaterial({ color: 0x222, metalness: 1, roughness: 0.4 })); drain.position.y = -0.158; s.add(drain);
    this.water = new THREE.Mesh(new THREE.CircleGeometry(0.09, 96), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { tr: { value: -1 } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform float tr; varying vec2 vP; void main(){ float r = length(vP); float a = 0.0;
        if (tr > 0.) { for (int i = 0; i < 3; i++) { float rr = (tr - float(i) * 0.12) * 0.11; float w = exp(-pow((r - rr) * 140., 2.)) * exp(-tr * 1.6) * step(0., rr); a += w; } }
        gl_FragColor = vec4(vec3(0.75, 0.82, 0.9) * (a * 1.4 + 0.01), 0.55 + a * 0.4); }` }));
    this.water.rotation.x = -Math.PI / 2; this.water.position.y = -0.152; s.add(this.water);
    const tapM = steel; const spout = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.016, 16, 48, Math.PI), tapM); spout.position.set(0.0, 0.2, -0.12); spout.rotation.y = Math.PI / 2; s.add(spout);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.25, 24), tapM); post.position.set(0, 0.08, -0.24); s.add(post);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.02, 24), tapM); tip.position.set(0, 0.195, 0.0); s.add(tip);
    this.drop = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 24, 16), new THREE.MeshStandardMaterial({ color: 0x9fb0c4, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.8 })); s.add(this.drop);
    const key = new THREE.SpotLight(0xdfe8ff, 1.6, 3, 0.32, 1.0); key.position.set(0.5, 0.9, 0.3); key.target.position.set(0, -0.1, 0); s.add(key, key.target);
    const kick = new THREE.PointLight(0x8fa6c8, 0.8, 2); kick.position.set(-0.5, 0.3, -0.4); s.add(kick); s.add(new THREE.AmbientLight(0x404650, 0.05));
  },
  layers(lt) {
    const T_FALL = 1.75, fallH = 0.34, g = 9.8, tf = Math.sqrt(2 * fallH / g);
    const d = this.drop;
    if (lt < T_FALL) { const k = sstep(0.2, T_FALL, lt); d.scale.set(0.6 + k * 0.5, 0.6 + k * 0.75, 0.6 + k * 0.5); d.position.set(0, 0.182 - k * 0.004, 0); d.visible = true; }
    else if (lt < T_FALL + tf) { const u = lt - T_FALL; d.position.set(0, 0.182 - 0.5 * g * u * u, 0); d.scale.set(0.95, 1.3, 0.95); d.visible = true; }
    else d.visible = false;
    this.water.material.uniforms.tr.value = lt - (T_FALL + tf);
    camPath(this.cam, lt, [[0, [0.0, 0.36, 0.62], [0, -0.03, 0], 30], [4, [0.0, 0.31, 0.52], [0, -0.05, 0], 30]]);
    return [{ scene: this.scene, camera: this.cam }];
  },
  grade(lt) { return { exposure: 0.75 * sstep(0.2, 1.4, lt) + 0.0001 }; },
};

// ---------- window: the observer, the city, the frozen second ----------
SHOT.window = {
  init() { this.city = world('city', () => makeCity(renderer)); this.cam = new THREE.PerspectiveCamera(42, W / H, 0.05, 40000); },
  freeze(sc) { return [cue(sc, 1) + 0.2, cue(sc, 2) + 0.15]; },
  layers(lt, sc) {
    const C = this.city; C.setMode('morning');
    const [f0, f1] = this.freeze(sc), ct = lt < f0 ? lt : lt < f1 ? f0 : lt - (f1 - f0);
    C.update(ct + 4, { birdPath: (s, i) => ({ pos: V3(-38 + s * 1.0 - i * 7, C.FLOOR + 4 + Math.sin(s * 0.09 + i) * 1.2 + i * 2.2, 34 + i * 6), dir: V3(1, 0.02, 0) }) });
    const F = C.FLOOR;
    camPath(this.cam, lt, [[0, [-0.9, F + 1.62, -3.4], [-1.6, F + 1.75, 3], 40], [9, [-0.5, F + 1.6, -1.6], [-0.4, F + 1.7, 6], 40],
      [18, [0.1, F + 1.58, 0.6], [0.4, F + 1.6, 30], 40], [27, [0.35, F + 1.56, 2.2], [1.2, F - 6, 200], 40]]);
    return [{ scene: C.scene, camera: this.cam }];
  },
  grade(lt, sc) { const [f0, f1] = this.freeze(sc); return { sat: 1 - 0.35 * win(lt, f0, f1, 0.25), exposure: 1.0 }; },
  overlay(lt, sc, w) { tagOverlay('Thought experiment · fictional scene', w * win(lt, 1.5, sc.t1 - sc.t0 - 0.5, 0.8)); },
};

// ---------- ascend: from the city to orbit; Zhuangzi and Descartes ----------
SHOT.ascend = {
  init() {
    const s = this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(38, W / H, 0.001, 2e6);
    s.add(makeSkyDome(TEX.mw, 0.42)); s.add(starPoints(4000, 5e5, 9, 1.4, 0.9));
    this.earth = makeEarth(TEX, { sun: V3(1, 0.25, 0.35) }); this.earth.userData.rot0 = 3.2; s.add(this.earth);
    this.grid = new THREE.Mesh(new THREE.SphereGeometry(1.004, 72, 36), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { k: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform float k; varying vec2 vUv; void main(){ vec2 g = abs(fract(vUv * vec2(48., 24.)) - .5); float l = smoothstep(0.47, 0.5, max(g.x, g.y)); gl_FragColor = vec4(vec3(0.3, 0.8, 1.0) * l * k, 1.); }` }));
    this.earth.add(this.grid);
    // a glowing butterfly for Zhuangzi's dream
    const wingTex = canvasTex(512, 512, (g) => {
      const grd = g.createRadialGradient(80, 256, 10, 140, 256, 420); grd.addColorStop(0, '#bfeaff'); grd.addColorStop(0.35, '#3fa0ff'); grd.addColorStop(0.8, '#1a3b9a'); grd.addColorStop(1, 'rgba(10,20,60,0)');
      g.fillStyle = grd; g.beginPath(); g.moveTo(20, 256); g.bezierCurveTo(120, -40, 520, 0, 470, 210); g.bezierCurveTo(440, 300, 300, 290, 250, 280); g.bezierCurveTo(420, 330, 430, 500, 260, 480); g.bezierCurveTo(140, 470, 60, 360, 20, 256); g.fill();
      g.strokeStyle = 'rgba(220,245,255,0.5)'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(24, 256); g.quadraticCurveTo(200, 120 + i * 50, 440, 60 + i * 70); g.stroke(); }
    });
    const wm = new THREE.MeshBasicMaterial({ map: wingTex, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    this.bfly = new THREE.Group(); const wg = new THREE.PlaneGeometry(1, 1); wg.translate(0.5, 0, 0);
    this.wL = new THREE.Mesh(wg, wm); this.wR = new THREE.Mesh(wg, wm); this.wR.scale.x = -1; this.bfly.add(this.wL, this.wR); s.add(this.bfly);
  },
  layers(lt, sc) {
    const D = sc.t1 - sc.t0;
    updateEarth(this.earth, lt, 0.006);
    // pull back from low orbit over the dayside to a full-disc view
    const target = V3(0, 0, 0), dir = V3(0.25, 0.32, 1);
    const d = logDolly(this.cam, lt, -1, D * 0.9, 1.42, 3.8, dir, target, 38);
    this.cam.lookAt(lerp(-0.25, 0, sstep(0, D * 0.6, lt)), lerp(0.12, 0, sstep(0, D * 0.6, lt)), 0);
    this.grid.material.uniforms.k.value = 0.5 * sstep(cue(sc, 3) + 2.5, cue(sc, 3) + 5, lt);
    // butterfly crosses during the Zhuangzi line
    const b0 = cue(sc, 1) + 1.5, bk = win(lt, b0, b0 + 9.5, 1.2);
    this.bfly.visible = bk > 0.01; this.wL.material.opacity = bk;
    const camDir = this.cam.getWorldDirection(V3(0, 0, 0)), right = V3(0, 1, 0).cross(camDir).normalize().negate(), up = right.clone().cross(camDir).negate();
    const u = (lt - b0) / 9.5, p = this.cam.position.clone().add(camDir.clone().multiplyScalar(0.12 * d)).add(right.clone().multiplyScalar((u - 0.5) * 0.14 * d)).add(up.clone().multiplyScalar(Math.sin(u * 6) * 0.008 * d - 0.01 * d));
    this.bfly.position.copy(p); this.bfly.scale.setScalar(0.014 * d); this.bfly.lookAt(this.cam.position); this.bfly.rotateX(-0.9);
    const fl = Math.sin(lt * 9) * 0.9; this.wL.rotation.y = fl; this.wR.rotation.y = -fl;
    return [{ scene: this.scene, camera: this.cam }];
  },
  overlay(lt, sc, w) {
    overlay('zhuang', '<small>ZHUANGZI · 4TH CENTURY BCE</small><b>The butterfly dream</b>', '', w * win(lt, cue(sc, 1) + 1, cueEnd(sc, 1) + 0.4));
    overlay('desc', '<small>RENÉ DESCARTES · 1641</small><b>Meditations on First Philosophy</b>', '', w * win(lt, cue(sc, 2) + 0.6, cueEnd(sc, 2) + 0.4));
    overlay('credEarth', 'Earth: NASA Blue Marble & Black Marble imagery · Milky Way: ESO/S. Brunier', '', w * win(lt, 2, 9, 1));
  },
};

// ---------- build: Earth to city, then the city becomes a model of itself ----------
SHOT.build = {
  init() {
    this.city = world('city', () => makeCity(renderer)); this.cam = new THREE.PerspectiveCamera(45, W / H, 1, 40000);
    this.e = SHOT.ascend; if (!this.e._init) { this.e.init(); this.e._init = true; }
    this.ecam = new THREE.PerspectiveCamera(38, W / H, 0.0005, 2e6);
  },
  layers(lt, sc) {
    const D = sc.t1 - sc.t0, k = sstep(1.5, 5.0, lt);
    const E = this.e; updateEarth(E.earth, lt + 40, 0.006); E.grid.material.uniforms.k.value = 0; E.bfly.visible = false;
    logDolly(this.ecam, lt, -1.2, 5.0, 3.0, 1.06, V3(0.3, 0.5, 1), V3(0, 0, 0), 38);
    const C = this.city; const dig = lerp(-5, 520, sstep(cue(sc, 2) - 1, cue(sc, 2) + 9, lt));
    C.setMode('morning', { digK: lt > cue(sc, 2) - 1.2 ? 1 : 0, dig, room: false }); C.update(lt + 30);
    camPath(this.cam, lt, [[0, [400, 2600, -900], [300, 0, 900], 45], [8, [200, 900, -600], [250, 60, 1100], 45], [15, [-80, 380, -260], [200, 80, 900], 45], [D + 2, [-260, 210, 60], [300, 120, 1100], 45]]);
    return [{ scene: E.scene, camera: this.ecam, w: 1 - k }, { scene: C.scene, camera: this.cam, w: k }];
  },
  overlay(lt, sc, w) { tagOverlay('Hypothetical', w * win(lt, cue(sc, 2), sc.t1 - sc.t0, 0.8)); },
};

// ---------- worlds: many simulated Earths, worlds within worlds ----------
SHOT.worlds = {
  init() {
    const s = this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(36, W / H, 0.01, 1e6);
    s.add(makeSkyDome(TEX.mw, 0.18)); s.add(starPoints(2500, 5e5, 21, 1.3, 0.6));
    this.earths = [0, 1, 2].map(i => { const e = makeEarth(TEX, { sun: V3(1, 0.3, 0.6) }); e.userData.rot0 = i * 2.1; e.position.x = (i - 1) * 3.2; s.add(e); return e; });
    // render one Earth to a texture and use it as the face of thousands of distant worlds
    const rt = new THREE.WebGLRenderTarget(256, 256), sc2 = new THREE.Scene(), e2 = makeEarth(TEX, { sun: V3(1, 0.3, 0.8) }); sc2.add(e2);
    const c2 = new THREE.PerspectiveCamera(30, 1, 0.1, 10); c2.position.set(0, 0, 4.1); c2.lookAt(0, 0, 0);
    const prevT = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(sc2, c2); renderer.setRenderTarget(prevT);
    const mat = new THREE.SpriteMaterial({ map: rt.texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const halo = new THREE.SpriteMaterial({ map: GLOW(), color: 0x3fa8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.25 });
    this.field = new THREE.Group(); s.add(this.field); const R = rng(77); this.fieldMats = [mat, halo];
    for (let i = 0; i < 2600; i++) {
      const p = V3((R() - 0.5) * 900, (R() - 0.5) * 360, -20 - R() * 900); if (Math.abs(p.x) < 14 && Math.abs(p.y) < 8 && p.z > -60) continue;
      const sp = new THREE.Sprite(mat); sp.position.copy(p); sp.scale.setScalar(2.4); this.field.add(sp);
      const hl = new THREE.Sprite(halo); hl.position.copy(p); hl.scale.setScalar(7); this.field.add(hl);
    }
    // nested worlds orbiting the right-hand Earth
    this.neb = makeNebula(60, [700, 260, 500], 5, [[0.25, 0.45, 1.1], [0.5, 0.3, 0.9], [0.9, 0.4, 0.6], [0.4, 0.6, 0.9]], { opacity: 0.22, size: 1.2 }); this.neb.position.set(0, 0, -700); s.add(this.neb);
    this.bokeh = addBokeh(s, this.cam, 26, 7, [[1.6, 1.1, 0.6], [0.6, 0.9, 1.6]], { darkFrac: 0.15 });
    this.nest = new THREE.Group(); this.earths[2].add(this.nest);
    for (let i = 0; i < 9; i++) { const sp = new THREE.Sprite(mat); const a = i / 9 * TAU; sp.position.set(Math.cos(a) * 1.8, Math.sin(a * 2) * 0.25, Math.sin(a) * 1.8); sp.scale.setScalar(0.32); this.nest.add(sp); }
  },
  layers(lt, sc) {
    const D = sc.t1 - sc.t0;
    this.earths.forEach((e, i) => { updateEarth(e, lt + i * 30, 0.02); const k = i === 1 ? 1 : sstep(1.5 + (i === 0 ? 0 : 1.6), 3.5 + (i === 0 ? 0 : 1.6), lt); e.scale.setScalar(Math.max(0.001, easeOut(k))); });
    this.nest.rotation.y = lt * 0.25; const nk = sstep(cue(sc, 0) + 4.5, cue(sc, 0) + 6.5, lt); this.nest.scale.setScalar(Math.max(0.001, nk));
    const fk = sstep(cue(sc, 1) - 0.5, cue(sc, 1) + 4, lt); this.fieldMats[0].opacity = fk; this.fieldMats[1].opacity = 0.25 * fk; this.field.visible = fk > 0.01;
    const dim = 1 - 0.55 * sstep(cue(sc, 2), cue(sc, 2) + 2, lt); this.neb.userData.setK(fk * dim); this.bokeh.update(lt, 0.4 + 0.6 * fk);
    this.fieldMats[0].opacity *= dim;
    camPath(this.cam, lt, [[0, [0, 0.4, 4.2], [0, 0, 0], 36], [cue(sc, 0) + 7, [0.5, 0.8, 11], [0.3, 0, 0], 36], [cue(sc, 1) + 6, [4, 6, 60], [0, 0, -40], 40], [D + 1.5, [10, 14, 120], [0, -5, -200], 42]]);
    return [{ scene: this.scene, camera: this.cam }];
  },
  overlay(lt, sc, w) {
    tagOverlay('Hypothetical', w * win(lt, 0.5, sc.t1 - sc.t0, 0.8));
    overlay('ifs', '<p><em>IF</em> a conscious mind can be simulated</p><p><em>IF</em> anyone actually builds such worlds</p>', '', w * win(lt, cue(sc, 2) + 1.2, sc.t1 - sc.t0 - 0.3, 0.8));
  },
};
