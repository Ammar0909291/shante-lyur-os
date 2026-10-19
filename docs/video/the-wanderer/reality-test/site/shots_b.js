// Chapter 3: the archive and Bostrom's three doors.
'use strict';
Object.assign(window.OVCLS = window.OVCLS || {}, { tri: 'list', count1: 'lab', count2: 'lab' });

function makeDoorViews() {
  const V = [];
  // 1. a civilisation that did not survive: ruined skyline at a red dusk, embers rising
  {
    const s = new THREE.Scene(); s.fog = new THREE.FogExp2(0x7a2a14, 0.0065);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), gradientSky(0x12060a, 0xb3401c, 0x0a0404, V3(0, 0.05, -1), 0xff6a2a, 0.997)); s.add(sky);
    const R = rng(404), n = 260, g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0);
    const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 1 }), n); const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) { const x = (R() - 0.5) * 160, z = -20 - R() * 140, h = 4 + R() * R() * 45; e.set((R() - 0.5) * 0.25, R() * 3, (R() - 0.5) * 0.3); q.setFromEuler(e); M.compose(V3(x, -2, z), q, V3(3 + R() * 7, h, 3 + R() * 7)); m.setMatrixAt(i, M); }
    s.add(m);
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x140a08, roughness: 1 })); gr.rotation.x = -Math.PI / 2; gr.position.y = -2; s.add(gr);
    s.add(new THREE.HemisphereLight(0xff7040, 0x200808, 1.2)); const dl = new THREE.DirectionalLight(0xff5a20, 2.0); dl.position.set(0, 10, -100); s.add(dl);
    const EN = 700, ep = new Float32Array(EN * 3), e0 = []; for (let i = 0; i < EN; i++) e0.push([(R() - 0.5) * 60, R() * 30, -5 - R() * 60, R()]);
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
    s.add(new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xffa050, size: 2.2, sizeAttenuation: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    const cam = new THREE.PerspectiveCamera(50, 0.62, 0.5, 900);
    V.push({ s, cam, update(t) { e0.forEach(([x, y, z, r], i) => ep.set([x + Math.sin(t * 0.5 + r * 9) * 1.5, (y + t * (1 + r * 2)) % 30, z], i * 3)); eg.attributes.position.needsUpdate = true; cam.position.set(Math.sin(t * 0.05) * 3, 6, 18 - t * 0.3); cam.lookAt(0, 9, -60); } });
  }
  // 2. a civilisation with the power to simulate, but idle machines
  {
    const s = new THREE.Scene(); s.fog = new THREE.FogExp2(0x02060c, 0.03);
    const R = rng(505), rows = 8, per = 22, g = new THREE.BoxGeometry(1.2, 4, 1.4);
    const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0x15191f, roughness: 0.5, metalness: 0.6 }), rows * per); const M = new THREE.Matrix4();
    const ledP = [], ledC = [];
    let k = 0; for (let r = 0; r < rows; r++) for (let i = 0; i < per; i++) {
      const x = (r - rows / 2 + 0.5) * 4.2 + (r % 2 ? 0.7 : -0.7), z = -i * 1.45; M.makeTranslation(x, 2, z); m.setMatrixAt(k++, M);
      for (let j = 0; j < 14; j++) { ledP.push(x + (r % 2 ? -0.62 : 0.62), 0.5 + j * 0.25, z + (R() - 0.5) * 1.1); const on = R() < 0.05; ledC.push(on ? 0.1 : 0.012, on ? 0.6 : 0.03, on ? 0.25 : 0.05); }
    }
    s.add(m);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(ledP, 3)); lg.setAttribute('color', new THREE.Float32BufferAttribute(ledC, 3));
    s.add(new THREE.Points(lg, new THREE.PointsMaterial({ size: 2.5, sizeAttenuation: false, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x06080b, roughness: 0.3, metalness: 0.5 })); fl.rotation.x = -Math.PI / 2; s.add(fl);
    s.add(new THREE.HemisphereLight(0x5a7aa0, 0x050608, 0.9));
    for (let i = 0; i < 6; i++) { const L = new THREE.PointLight(0x7aa6e0, 1.6, 16, 2); L.position.set(0, 6, -i * 6); s.add(L); }
    const cam = new THREE.PerspectiveCamera(50, 0.62, 0.1, 300);
    V.push({ s, cam, update(t) { cam.position.set(0.3, 2.4, 6 - t * 0.12); cam.lookAt(0, 1.8, -30); } });
  }
  // 3. countless simulated worlds
  {
    const s = new THREE.Scene();
    const rt = new THREE.WebGLRenderTarget(256, 256), sc2 = new THREE.Scene(), e2 = makeEarth(TEX, { sun: V3(1, 0.3, 0.8) }); sc2.add(e2);
    const c2 = new THREE.PerspectiveCamera(30, 1, 0.1, 10); c2.position.set(0, 0, 4.1); c2.lookAt(0, 0, 0);
    const prevT = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(sc2, c2); renderer.setRenderTarget(prevT);
    const mat = new THREE.SpriteMaterial({ map: rt.texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const halo = new THREE.SpriteMaterial({ map: GLOW(), color: 0x46b4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35 });
    const R = rng(606);
    for (let i = 0; i < 3000; i++) { const p = V3((R() - 0.5) * 140, (R() - 0.5) * 220, -10 - R() * 400); const a = new THREE.Sprite(mat); a.position.copy(p); a.scale.setScalar(1.6); s.add(a); const h = new THREE.Sprite(halo); h.position.copy(p); h.scale.setScalar(5); s.add(h); }
    const cam = new THREE.PerspectiveCamera(50, 0.62, 0.1, 1000);
    V.push({ s, cam, update(t) { cam.position.set(0, 0, 20 - t * 0.8); cam.lookAt(0, 0, -200); } });
  }
  V.forEach(v => { v.rt = new THREE.WebGLRenderTarget(620, 1000, { type: THREE.HalfFloatType }); });
  return V;
}

SHOT.archive = {
  init() {
    const s = this.scene = new THREE.Scene(); s.fog = new THREE.FogExp2(0x05080e, 0.0105); this.cam = new THREE.PerspectiveCamera(42, W / H, 0.1, 800);
    const R = rng(303), L = 130, HW = 8, HH = 14;
    const real = new THREE.Group(), mirror = new THREE.Group(); s.add(real, mirror); mirror.scale.y = -1;
    const frameM = new THREE.MeshStandardMaterial({ color: 0x0d1016, roughness: 0.6, metalness: 0.4 });
    // storage walls: racks of data cells, most dark, some glowing
    const cell = new THREE.BoxGeometry(0.5, 0.26, 0.32); const NCELL = 2 * 180 * 26;
    const cm = new THREE.MeshBasicMaterial({ fog: true }); const M = new THREE.Matrix4(); const cells = new THREE.InstancedMesh(cell, cm, NCELL);
    let k = 0;
    for (const side of [-1, 1]) for (let i = 0; i < 180; i++) for (let j = 0; j < 26; j++) {
      M.makeTranslation(side * HW, 0.6 + j * 0.42, -i * 0.56); cells.setMatrixAt(k, M);
      const r = R(), on = r < 0.16, warm = R() < 0.25, b = on ? 0.4 + R() * 1.2 : 0.012 + R() * 0.02;
      cells.setColorAt(k, new THREE.Color(warm ? b * 1.0 : b * 0.35, warm ? b * 0.62 : b * 0.85, warm ? b * 0.3 : b * 1.1)); k++;
    }
    real.add(cells); mirror.add(cells.clone());
    for (const side of [-1, 1]) { const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, HH, 101), frameM); back.position.set(side * (HW + 0.35), HH / 2, -48); real.add(back); }
    for (let i = 0; i < 19; i++) for (const side of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, HH, 0.3), frameM); p.position.set(side * (HW - 0.2), HH / 2, -i * 5.4); real.add(p); mirror.add(p.clone()); }
    // ceiling light strips
    const stripM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.75, 2.0) });
    for (const x of [-3, 3]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, L), stripM); st.position.set(x, HH - 0.2, -L / 2 + 2); real.add(st); mirror.add(st.clone()); }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(2 * HW, L), frameM); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, HH, -L / 2 + 2); real.add(ceil);
    // the atrium and three doors
    const ZD = -L + 6; this.doors = [];
    const views = this.views = makeDoorViews();
    [-9, 0, 9].forEach((x, i) => {
      const g = new THREE.Group(); g.position.set(x, 0, ZD - (i === 1 ? 2 : 0)); g.rotation.y = -x * 0.022; real.add(g);
      const edgeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.1, 0.1) });
      for (const [w, h, px, py] of [[0.3, 11.6, -2.4, 5.8], [0.3, 11.6, 2.4, 5.8], [5.1, 0.3, 0, 11.6]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), edgeM); b.position.set(px, py, 0); g.add(b); }
      const viewM = new THREE.MeshBasicMaterial({ map: views[i].rt.texture, color: new THREE.Color(0, 0, 0), fog: false });
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 11.4), viewM); pane.position.set(0, 5.75, -0.1); g.add(pane);
      const spill = new THREE.Mesh(new THREE.PlaneGeometry(6, 14), new THREE.MeshBasicMaterial({ map: GLOW(), color: new THREE.Color(0, 0, 0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); spill.rotation.x = -Math.PI / 2; spill.position.set(0, 0.03, 6); g.add(spill);
      const wallL = new THREE.Mesh(new THREE.BoxGeometry(3.8, HH, 0.5), frameM); wallL.position.set(-4.3, HH / 2, -0.3); g.add(wallL);
      const wallR = wallL.clone(); wallR.position.x = 4.3; g.add(wallR);
      const top = new THREE.Mesh(new THREE.BoxGeometry(5, HH - 11.75, 0.5), frameM); top.position.set(0, 11.75 + (HH - 11.75) / 2, -0.3); g.add(top);
      this.doors.push({ g, edgeM, viewM, spill });
      const mg = g.clone(); mirror.add(mg); this.doors[i].mirror = mg;
    });
    const atriumW = new THREE.Mesh(new THREE.BoxGeometry(40, HH, 0.5), frameM); atriumW.position.set(0, HH / 2, ZD - 3); real.add(atriumW);
    for (const side of [-1, 1]) { const fw = new THREE.Mesh(new THREE.BoxGeometry(6.5, HH, 0.5), frameM); fw.position.set(side * 11.4, HH / 2, -100.5); real.add(fw); }
    const ac = new THREE.Mesh(new THREE.PlaneGeometry(30, 28), frameM); ac.rotation.x = Math.PI / 2; ac.position.set(0, HH, ZD + 11); real.add(ac);
    for (const side of [-1, 1]) { const aw = new THREE.Mesh(new THREE.BoxGeometry(0.5, HH, 24), frameM); aw.position.set(side * 14.5, HH / 2, ZD + 9); real.add(aw); }
    // reflective floor: a dark translucent plane over the mirrored hall
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, L + 40), new THREE.MeshBasicMaterial({ color: 0x05070a, transparent: true, opacity: 0.86, fog: true })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -L / 2); s.add(floor);
    s.add(new THREE.HemisphereLight(0x405a80, 0x080a0e, 0.5));
    // counting: one original observer among many simulated ones
    const CN = 9000, cp = new Float32Array(CN * 3), cc = new Float32Array(CN * 3), RR = rng(9);
    for (let i = 0; i < CN; i++) { const u = RR() * 2 - 1, a = RR() * TAU, rr = 2 + Math.pow(RR(), 0.5) * 9, sq = Math.sqrt(1 - u * u); cp.set([Math.cos(a) * sq * rr, 6 + u * rr * 0.6, Math.sin(a) * sq * rr], i * 3); cc.set([0.25, 0.75, 1.0], i * 3); }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cp, 3)); cg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    this.countMat = new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.count = new THREE.Points(cg, this.countMat); this.count.position.set(0, 0, ZD + 12); s.add(this.count);
    this.gold = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color: new THREE.Color(3, 2, 0.7), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    this.gold.scale.setScalar(1.4); this.gold.position.set(0, 6, ZD + 12); s.add(this.gold);
    this.ZD = ZD; this.bokeh = addBokeh(s, this.cam, 30, 23, [[0.5, 0.85, 1.6], [1.5, 0.9, 0.5]], { darkFrac: 0.12 }); this.bokeh = addBokeh(s, this.cam, 30, 23, [[0.5, 0.85, 1.6], [1.5, 0.9, 0.5]], { darkFrac: 0.12 });
  },
  layers(lt, sc) {
    const D = sc.t1 - sc.t0, c = k => cue(sc, k), ZD = this.ZD;
    // door states: each lights with its statement, earlier ones stay half lit
    const lit = [c(2), c(3), c(4)].map((t0, i) => { const on = sstep(t0 - 0.3, t0 + 1.2, lt), dim = 1 - 0.5 * sstep(c(Math.min(i + 3, 7)) - 0.5, c(Math.min(i + 3, 7)) + 1, lt); return on * dim * (1 - 0.75 * sstep(c(7), c(7) + 4, lt)); });
    this.doors.forEach((d, i) => {
      const k = lit[i], col = i === 0 ? [1.6, 0.55, 0.25] : i === 1 ? [0.35, 0.65, 1.1] : [0.6, 1.3, 1.8];
      d.edgeM.color.setRGB(0.06 + col[0] * k * 1.3, 0.06 + col[1] * k * 1.3, 0.07 + col[2] * k * 1.3);
      d.viewM.color.setRGB(0.05 + k * 2.4, 0.05 + k * 2.4, 0.05 + k * 2.4); d.spill.material.color.setRGB(col[0] * k * 0.5, col[1] * k * 0.5, col[2] * k * 0.5);
      d.mirror.children.forEach((ch, j) => { if (ch.material) ch.material = d.g.children[j].material; });
      if (k > 0.01 || lt < 2) { const v = this.views[i]; v.update(Math.max(0, lt - c(2 + i) + 6)); renderer.setRenderTarget(v.rt); renderer.setClearColor(0, 1); renderer.clear(); renderer.render(v.s, v.cam); }
    });
    this.bokeh.update(lt);
    this.bokeh.update(lt);
    const ck = win(lt, c(5) - 0.5, c(6) + 2, 1.5); this.countMat.opacity = ck; this.gold.material.opacity = ck; this.count.rotation.y = lt * 0.05;
    camPath(this.cam, lt, [
      [0, [0, 3.2, 8], [0, 3.6, -60], 42], [c(1), [0, 3.4, -40], [0, 4.0, -110], 42], [c(2) - 1, [0, 3.6, ZD + 34], [0, 5.5, ZD], 44],
      [c(2) + 3, [-3, 3.8, ZD + 20], [-9, 5.8, ZD], 44], [c(3) + 2, [0, 3.8, ZD + 20], [0, 5.8, ZD - 2], 44], [c(4) + 1.5, [4.5, 4.0, ZD + 17], [9, 6.0, ZD], 44],
      [c(5) + 1, [0, 5.5, ZD + 30], [0, 6, ZD + 12], 46], [c(6) + 2, [0, 4.5, ZD + 40], [0, 5.5, ZD], 46], [D + 1.5, [0, 3.5, ZD + 75], [0, 5, ZD], 46]]);
    return [{ scene: this.scene, camera: this.cam }];
  },
  overlay(lt, sc, w) {
    const c = k => cue(sc, k), D = sc.t1 - sc.t0;
    tagOverlay('Philosophical argument', w * win(lt, 0.5, D, 0.8));
    overlay('bostrom', '<small>NICK BOSTROM · 2003</small><b>Are You Living in a Computer Simulation?</b><p>Philosophical Quarterly, vol. 53, no. 211, pp. 243–255</p>', '', w * win(lt, c(0) + 0.5, cueEnd(sc, 1) + 0.5));
    const items = ['Almost all civilizations like ours die out before they can run such simulations', 'Almost none of those that survive choose to run them', 'Almost everyone with experiences like ours is simulated'];
    const lines = items.map((x, i) => `<p style="opacity:${(0.25 + 0.75 * sstep(c(2 + i), c(2 + i) + 0.8, lt)).toFixed(3)}"><em>${i + 1}</em>${x}</p>`).join('');
    overlay('tri', '<p style="font:600 16px Inter;letter-spacing:.3em;color:#f2b45a;margin-bottom:30px">AT LEAST ONE IS VERY LIKELY TRUE</p>' + lines, 'max-width:820px;top:250px', w * win(lt, c(2) - 0.4, c(5) - 0.3, 0.8));
    overlay('count1', '● one original world', 'left:1180px;top:500px;color:#ffd27a', w * win(lt, c(5) + 1.5, c(6) - 0.3));
    overlay('count2', '· · · many simulated worlds (if they exist)', 'left:1180px;top:540px', w * win(lt, c(5) + 2.5, c(6) - 0.3));
    overlay('assume', '<small>KEY ASSUMPTION</small><b>Substrate independence</b><p>A mind could run on silicon as well as on a brain. Bostrom: “not entirely uncontroversial.”</p>', '', w * win(lt, c(6) + 2.5, cueEnd(sc, 6) + 1));
  },
};
