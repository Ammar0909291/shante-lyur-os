// Chapter 6: human moments, then the same moments as information.
'use strict';
function figMat(color) { return new THREE.MeshStandardMaterial({ color, roughness: 0.7, transparent: true, opacity: 1 }); }
function addFigurePoints(fig, color) {      // a luminous point version of each body part, riding on the same skeleton
  const pm = new THREE.PointsMaterial({ color: new THREE.Color(color), size: 2.0, sizeAttenuation: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  fig.traverse(o => { if (o.isMesh && !o.userData.pts) { const p = new THREE.Points(o.geometry, pm); o.add(p); o.userData.pts = p; } });
  fig.userData.pm = pm; return pm;
}
function figureOpacity(fig, meshK, ptsK) { fig.traverse(o => { if (o.isMesh) { o.material.opacity = meshK; o.material.transparent = meshK < 0.999; o.material.depthWrite = meshK > 0.5; } }); if (fig.userData.pm) fig.userData.pm.opacity = ptsK; }
function hugPose(k, lean = 10) { return { armLx: 80 * k, armRx: 80 * k, armLz: 8 + 30 * k, armRz: 8 + 30 * k, elbL: 70 * k, elbR: 70 * k, lean: lean * k, nod: 12 * k }; }

function makeMoments() {
  const V = [];
  const ground = (s, col) => { const g = new THREE.Mesh(new THREE.CircleGeometry(400, 64), new THREE.MeshStandardMaterial({ color: col, roughness: 1 })); g.rotation.x = -Math.PI / 2; s.add(g); };
  const backlit = (s, skyArgs, sunDir, sunCol, ints = 1.4) => { const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), gradientSky(...skyArgs)); s.add(sky);
    const d = new THREE.DirectionalLight(sunCol, ints); d.position.copy(sunDir).multiplyScalar(100); s.add(d); s.add(new THREE.HemisphereLight(0x8899bb, 0x2a2018, 0.45)); };
  const treeLine = (s, z, n, seed, col) => { const R = rng(seed), m = new THREE.MeshStandardMaterial({ color: col, roughness: 1 });
    for (let i = 0; i < n; i++) { const t = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), m); const r = 3 + R() * 5; t.scale.set(r, r * 1.3, r); t.position.set((R() - 0.5) * 220, r * 1.1, z - R() * 30); s.add(t); } };
  // 1. a parent and child at golden hour
  {
    const s = new THREE.Scene(); s.fog = new THREE.Fog(0xe8a46a, 40, 260); backlit(s, [0x5a7fb8, 0xffb06a, 0x2a2018, V3(0.2, 0.06, -1), 0xffb26a], V3(0.2, 0.3, -1), 0xffc080);
    ground(s, 0x2c3a1e); treeLine(s, -70, 40, 1, 0x1e2a16);
    const parent = makeFigure({ mat: figMat(0x16140f) }), child = makeFigure({ scale: 0.58, mat: figMat(0x16140f) }); s.add(parent, child);
    const cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 2000);
    V.push({ s, cam, figs: [parent, child], u(t) {
      parent.position.set(0.6, 0, 0); parent.rotation.y = -Math.PI / 2 - 0.2; const run = clamp(t / 3.2), reach = sstep(2.6, 3.6, t), lift = sstep(3.4, 4.6, t);
      pose(parent, Object.assign(hugPose(reach, 6), { kneeL: 50 * (1 - lift), kneeR: 50 * (1 - lift), legL: 30 * (1 - lift), legR: -10 * (1 - lift), drop: -0.18 * (1 - lift) }));
      const cx = lerp(-4.5, 0.15, easeOut(run)); child.position.set(cx, lift * 0.65 + Math.abs(Math.sin(t * 7)) * 0.05 * (1 - run), 0.0); child.rotation.y = Math.PI / 2;
      pose(child, run < 1 ? Object.assign(walkPose(t * 9, 1.3), { armLx: 40 * reach, armRx: 40 * reach }) : hugPose(1, 0));
      setCam(cam, [-1.2 + t * 0.12, 1.1, 7.5 - t * 0.2], [-0.4, 1.0, 0], 32); } });
  }
  // 2. two friends reunited at dusk
  {
    const s = new THREE.Scene(); s.fog = new THREE.Fog(0x6a5a78, 30, 220); backlit(s, [0x1c2448, 0xd88a6a, 0x151218, V3(-0.1, 0.03, -1), 0xff9a70], V3(-0.1, 0.25, -1), 0xffa070, 1.1);
    ground(s, 0x1a1a20);
    for (let i = 0; i < 9; i++) { const lp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 10), new THREE.MeshStandardMaterial({ color: 0x15151a })); lp.position.set(-16 + i * 4, 2.1, -6); s.add(lp);
      const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color: new THREE.Color(2.4, 1.7, 1.0), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); b.position.set(-16 + i * 4, 4.25, -6); b.scale.setScalar(1.4); s.add(b); }
    const a = makeFigure({ mat: figMat(0x121216), coat: true }), b = makeFigure({ scale: 0.95, mat: figMat(0x121216) }); s.add(a, b);
    const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 2000);
    V.push({ s, cam, figs: [a, b], u(t) {
      const k = easeOut(clamp(t / 3.4)), hug = sstep(3.0, 4.0, t);
      a.position.set(lerp(-5, -0.3, k), 0, 0); a.rotation.y = Math.PI / 2; b.position.set(lerp(5, 0.3, k), 0, 0); b.rotation.y = -Math.PI / 2;
      const wa = walkPose(t * 7.5, 1 - hug); pose(a, Object.assign(wa, hugPose(hug))); const wb = walkPose(t * 7.5 + 1, 1 - hug); pose(b, Object.assign(wb, hugPose(hug)));
      setCam(cam, [0.2, 1.3, 9 - t * 0.35], [0, 1.15, 0], 30); } });
  }
  // 3. an elderly person with a photograph by a window
  {
    const s = new THREE.Scene(); s.fog = new THREE.Fog(0x2a2420, 6, 30);
    const win_ = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 1.2) })); win_.position.set(0, 1.9, -2.5); s.add(win_);
    for (const x of [-0.8, 0.8]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.4, 0.05), new THREE.MeshStandardMaterial({ color: 0x0c0a08 })); m.position.set(x, 1.9, -2.45); s.add(m); }
    const room = new THREE.Mesh(new THREE.BoxGeometry(9, 4.2, 7), new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 1, side: THREE.BackSide })); room.position.set(0, 2.1, 0.9); s.add(room);
    const L = new THREE.SpotLight(0xffd2a0, 3.0, 12, 0.7, 0.8); L.position.set(0, 2.2, -2.6); L.target.position.set(0, 0.8, 1); s.add(L, L.target); s.add(new THREE.AmbientLight(0x3a3028, 0.4));
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), new THREE.MeshStandardMaterial({ color: 0x1a120c })); chair.position.set(0, 0.25, 0.4); s.add(chair);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.1), chair.material); back.position.set(0, 0.95, 0.75); s.add(back);
    const p = makeFigure({ mat: figMat(0x17130f), coat: true }); p.position.set(0, -0.4, 0.45); p.rotation.y = Math.PI; s.add(p);
    const photoTex = canvasTex(256, 192, (g) => { const gr = g.createLinearGradient(0, 0, 0, 192); gr.addColorStop(0, '#d9c49a'); gr.addColorStop(1, '#8a6e48'); g.fillStyle = gr; g.fillRect(0, 0, 256, 192);
      g.fillStyle = '#3a2a1a'; for (const [x, h] of [[95, 120], [160, 105]]) { g.beginPath(); g.arc(x, 192 - h, 18, 0, TAU); g.fill(); g.fillRect(x - 22, 192 - h + 14, 44, h); } g.strokeStyle = '#f4ead6'; g.lineWidth = 12; g.strokeRect(0, 0, 256, 192); });
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.135), new THREE.MeshBasicMaterial({ map: photoTex, color: new THREE.Color(1.3, 1.25, 1.15) })); s.add(photo);
    const cam = new THREE.PerspectiveCamera(34, W / H, 0.05, 100);
    V.push({ s, cam, figs: [p], u(t) {
      pose(p, { legL: 85, legR: 85, kneeL: 85, kneeR: 85, armLx: 45, armRx: 45, elbL: 75, elbR: 75, armLz: 14, armRz: 14, lean: 14, nod: 30 + Math.sin(t * 0.7) * 3, drop: -0.05 });
      p.updateMatrixWorld(true); const hp = p.userData.J.haL.getWorldPosition(V3(0, 0, 0)), hq = p.userData.J.haR.getWorldPosition(V3(0, 0, 0));
      photo.position.copy(hp.add(hq).multiplyScalar(0.5)).add(V3(0, 0.05, -0.02)); photo.lookAt(cam.position); photo.rotateX(-0.6);
      setCam(cam, [1.6 - t * 0.08, 1.35, 2.6 - t * 0.1], [0, 0.85, 0.2], 34); } });
  }
  // 4. a scientist at a telescope under the Milky Way
  {
    const s = new THREE.Scene(); s.add(makeSkyDome(TEX.mw, 0.9)); s.add(starPoints(4000, 800, 44, 1.5, 1.0));
    const g = new THREE.Mesh(new THREE.CircleGeometry(300, 64), new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 1 })); g.rotation.x = -Math.PI / 2; s.add(g);
    const hills = new THREE.Mesh(new THREE.CylinderGeometry(260, 260, 18, 64, 1, true), new THREE.MeshBasicMaterial({ color: 0x05060a, side: THREE.BackSide })); hills.position.y = 4; s.add(hills);
    s.add(new THREE.HemisphereLight(0x3a4a70, 0x050505, 0.55));
    const sci = makeFigure({ mat: figMat(0x0d0e12), coat: true }); sci.position.set(0, 0, 0); sci.rotation.y = -0.6; s.add(sci);
    const tm = new THREE.MeshStandardMaterial({ color: 0x2a2c32, roughness: 0.4, metalness: 0.7 });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.4, 24), tm); tube.position.set(0.55, 1.55, 0.35); tube.rotation.set(0.0, 0, -0.9); tube.rotateX(0.5); s.add(tube);
    for (const a of [0, 2.1, 4.2]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8), tm); l.position.set(0.55 + Math.cos(a) * 0.3, 0.7, 0.35 + Math.sin(a) * 0.3); l.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); s.add(l); }
    const red = new THREE.PointLight(0xff3020, 0.6, 3); red.position.set(0.2, 1.0, 0.6); s.add(red);
    const cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 2000);
    V.push({ s, cam, figs: [sci], u(t) { pose(sci, { armRx: 70, elbR: 60, armLx: 55, elbL: 80, nod: -12, lean: 12 }); setCam(cam, [-3.2 + t * 0.1, 0.9, 3.6], [0.4, 2.6, -2], 40); } });
  }
  return V;
}

SHOT.moments = {
  init() { this.V = world('moments', makeMoments); },
  layers(lt, sc) {
    const D = sc.t1 - sc.t0 + 0.8, n = this.V.length, seg = D / n, X = 0.7, out = [];
    this.V.forEach((v, i) => { const a = i * seg, b = a + seg, w = (i === 0 ? 1 : sstep(a - X, a + X, lt)) * (i === n - 1 ? 1 : 1 - sstep(b - X, b + X, lt));
      if (w > 0.002) { v.figs.forEach(f => figureOpacity(f, 1, 0)); v.u(lt - a + 0.4); out.push({ scene: v.s, camera: v.cam, w }); } });
    return out;
  },
  overlay(lt, sc, w) {
    tagOverlay('Illustration', w * win(lt, 0.5, sc.t1 - sc.t0, 0.8));
    overlay('hard', '<small>DAVID CHALMERS · 1995</small><b>The hard problem of consciousness</b><p>Why is any physical process accompanied by experience at all?</p>', '', w * win(lt, cue(sc, 2) + 0.6, sc.t1 - sc.t0 + 0.5));
  },
};

// mind: the friends' embrace and the parent and child, rebuilt as light, in a space of information
SHOT.mind = {
  init() {
    const s = this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(32, W / H, 0.05, 3000);
    this.V = world('moments', makeMoments);
    const v1 = this.V[1], v0 = this.V[0];
    // own copies of the two pairs so their opacity can be driven independently
    this.pairs = [];
    const mkPair = (dx, dz, kind) => {
      const g = new THREE.Group(); g.position.set(dx, 0, dz); s.add(g);
      const A = makeFigure({ mat: figMat(0x121216), coat: kind === 0 }), B = makeFigure({ scale: kind === 0 ? 0.95 : 0.58, mat: figMat(0x121216) }); g.add(A, B);
      addFigurePoints(A, 0x7fdcff); addFigurePoints(B, kind === 0 ? 0xffd28a : 0x9cffc8); this.pairs.push({ g, A, B, kind }); return g;
    };
    mkPair(0, 0, 0); mkPair(-7, -6, 1); mkPair(7, -8, 1); mkPair(-14, -16, 0); mkPair(13, -18, 0);
    this.bg = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), gradientSky(0x1c2448, 0xd88a6a, 0x151218, V3(-0.1, 0.03, -1), 0xff9a70)); s.add(this.bg);
    this.dark = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), new THREE.MeshBasicMaterial({ color: 0x02040a, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false })); this.dark.renderOrder = -5; s.add(this.dark);
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, extensions: { derivatives: true }, uniforms: { k: { value: 0 } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float k; varying vec3 vW; void main(){ vec2 c = vW.xz; vec2 g = abs(fract(c - .5) - .5) / fwidth(c); float l = 1. - min(min(g.x, g.y), 1.); float f = exp(-length(vW.xz) * 0.03);
        gl_FragColor = vec4(vec3(0.2, 0.6, 1.0) * l * f * k, l * f * k); }` }));
    gr.rotation.x = -Math.PI / 2; s.add(gr); this.gridM = gr.material;
    this.groundM = new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 1, transparent: true, depthWrite: false }); const gd = new THREE.Mesh(new THREE.CircleGeometry(400, 64), this.groundM); gd.rotation.x = -Math.PI / 2; gd.position.y = -0.01; s.add(gd);
    s.add(new THREE.HemisphereLight(0x8899bb, 0x2a2018, 0.45)); const d = new THREE.DirectionalLight(0xffa070, 1.1); d.position.set(-10, 25, -100); s.add(d);
    // threads of light between the figures: information shared between minds
    const pts = []; this.pairs.forEach(p => pts.push(p.g.position.clone().add(V3(0, 1.5, 0))));
    const seg = []; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) seg.push(pts[i], pts[j]);
    this.links = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({ color: 0x5ac8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); s.add(this.links);
  },
  layers(lt, sc) {
    const D = sc.t1 - sc.t0, c = k => cue(sc, k), dig = sstep(c(0) + 1, c(0) + 7, lt), more = sstep(c(1) - 1, c(1) + 4, lt);
    this.pairs.forEach((p, i) => {
      const t = lt + 4 + i * 0.7, show = i === 0 ? 1 : more;
      if (p.kind === 0) { p.A.position.set(-0.3, 0, 0); p.A.rotation.y = Math.PI / 2; p.B.position.set(0.3, 0, 0); p.B.rotation.y = -Math.PI / 2; const k = 0.85 + 0.15 * Math.sin(t * 1.3); pose(p.A, hugPose(k)); pose(p.B, hugPose(k)); }
      else { p.A.position.set(0.6, 0, 0); p.A.rotation.y = -Math.PI / 2 - 0.2; p.B.position.set(0.15, 0.65, 0); p.B.rotation.y = Math.PI / 2; pose(p.A, hugPose(1, 6)); pose(p.B, hugPose(1, 0)); p.g.rotation.y = 0.4 * Math.sin(t * 0.25 + i); }
      figureOpacity(p.A, (1 - dig) * show, dig * show); figureOpacity(p.B, (1 - dig) * show, dig * show); p.g.visible = show > 0.01;
    });
    this.dark.material.opacity = dig; this.gridM.uniforms.k.value = dig; this.groundM.opacity = 1 - dig; this.links.material.opacity = 0.35 * more * dig;
    camPath(this.cam, lt, [[0, [0.2, 1.3, 7.6], [0, 1.15, 0], 30], [c(1), [1.5, 1.8, 9], [0, 1.2, 0], 32], [c(2), [6, 6, 26], [0, 1, -8], 36], [D + 1, [9, 9, 36], [0, 0, -10], 38]]);
    return [{ scene: this.scene, camera: this.cam }];
  },
  overlay(lt, sc, w) {
    tagOverlay('Illustration · philosophical question', w * win(lt, 0.5, sc.t1 - sc.t0, 0.8));
    overlay('chalmers', '<small>DAVID CHALMERS · REALITY+ · 2022</small><b>A simulated world would still be a real world</b><p>Chalmers’ argument, in paraphrase: digital objects are real objects of a different kind, not illusions.</p>', '', w * win(lt, cue(sc, 1) + 1, cueEnd(sc, 1) + 1.5));
    overlay('twoq', '<p><em>1</em>Where does a world come from?</p><p><em>2</em>Do the experiences inside it have value?</p>', '', w * win(lt, cue(sc, 2) + 3, sc.t1 - sc.t0 - 0.3));
  },
};
Object.assign(window.OVCLS, { twoq: 'list' });
