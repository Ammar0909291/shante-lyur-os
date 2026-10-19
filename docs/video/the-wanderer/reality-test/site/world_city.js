// City world: morning or rain, an apartment interior with the observer at the window, birds, traffic, and a "digitise" sweep.
'use strict';
function makeCity(renderer) {
  const scene = new THREE.Scene();
  const W = { scene, mode: 'morning' };
  const SKY = {
    morning: { top: 0x061637, hor: 0xd9824e, gnd: 0x0c0c10, sun: V3(0.18, 0.03, 1), sunC: 0xff9a50, fog: [0.07, 0.075, 0.11], dens: 0.00048, sunI: 1.1, reflK: 0.22 },
    rain: { top: 0x2a323c, hor: 0x5c656e, gnd: 0x1c2024, sun: V3(0.3, 0.5, 0.8), sunC: 0x2a2e33, fog: [0.16, 0.18, 0.2], dens: 0.0012, sunI: 0.4, reflK: 0.3 },
  };
  const skyMat = gradientSky(0, 0, 0, V3(0, 1, 0), 0); const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 48, 24), skyMat); sky.frustumCulled = false; scene.add(sky);
  const sun = new THREE.DirectionalLight(0xffffff, 2.5); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xbcd2ff, 0x3a3530, 0.6); scene.add(hemi);
  const U = {   // shared uniforms for the custom city shaders
    sunDir: { value: V3(0, 1, 0) }, sunCol: { value: new THREE.Color() }, top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, gnd: { value: new THREE.Color() },
    fogCol: { value: new THREE.Vector3() }, fogD: { value: 0.0005 }, reflK: { value: 0.3 }, dig: { value: -100 }, digK: { value: 0 }, litK: { value: 0.1 }, wet: { value: 0 }, time: { value: 0 },
  };
  const SKYFN = `uniform vec3 top, hor, gnd, sunDir, sunCol; uniform vec3 fogCol; uniform float reflK; vec3 fogc(vec3 vd){ return mix(fogCol, sunCol * 0.55, pow(max(dot(normalize(vd), sunDir), 0.), 6.)); } vec3 skyc(vec3 d){ float h = d.y; vec3 c = h > 0. ? mix(hor, top, pow(clamp(h,0.,1.),0.32)) : mix(hor, gnd, pow(clamp(-h,0.,1.),0.4)); float s = max(dot(d, sunDir),0.); return c + sunCol * (pow(s, 400.) * 25. + pow(s, 8.) * 0.3); }`;

  // ---- buildings ----
  const R = rng(1717), BLOCK = 130, ROAD = 22, N = 22, lots = [];
  for (let bx = -N; bx < N; bx++) for (let bz = -N; bz < N; bz++) {
    const cx = bx * BLOCK + BLOCK / 2, cz = bz * BLOCK + BLOCK / 2, dc = Math.hypot(cx - 200, cz - 1300);
    if (Math.abs(cx) < 60 && Math.abs(cz) < 60) continue;                 // our own building stands here
    if (R() < 0.08) { lots.push({ park: true, cx, cz }); continue; }
    const split = R() < 0.5 ? 2 : 3, inner = BLOCK - ROAD;
    for (let i = 0; i < split; i++) for (let j = 0; j < 2; j++) {
      const w = inner / split - 6, d = inner / 2 - 6;
      const x = cx - inner / 2 + (i + 0.5) * inner / split, z = cz - inner / 2 + (j + 0.5) * inner / 2;
      const core = Math.exp(-dc / 900), h = 18 + (R() * R()) * 80 + core * (60 + R() * 260) + (R() < 0.04 ? 120 : 0);
      lots.push({ x, z, w: w * (0.75 + R() * 0.25), d: d * (0.75 + R() * 0.25), h, tint: R() });
    }
  }
  const blds = lots.filter(l => !l.park);
  const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
  const bMat = new THREE.ShaderMaterial({ uniforms: U, extensions: { derivatives: true },
    vertexShader: `varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec3 vS;
      void main(){ mat4 m = modelMatrix * instanceMatrix; vec4 w = m * vec4(position,1.); vW = w.xyz; vN = normalize(mat3(m) * normal); vC = instanceColor; vS = vec3(length(m[0].xyz), length(m[1].xyz), length(m[2].xyz)); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: SKYFN + `
      uniform float fogD, dig, digK, litK, wet, time; varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec3 vS;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      void main(){
        vec3 n = normalize(vN), v = normalize(cameraPosition - vW); float side = 1. - abs(n.y);
        vec2 f = vec2(abs(n.x) > 0.5 ? vW.z : vW.x, vW.y);
        float style = vC.x;
        vec2 cell = style > 0.66 ? vec2(f.x / 1.6, (vW.y - 1.0) / 3.7) : style > 0.33 ? vec2(f.x / 6.0, (vW.y - 1.0) / 3.7) : vec2(f.x / 2.8, (vW.y - 1.0) / 3.7);
        vec2 id = floor(cell), fr = fract(cell);
        float glass = style > 0.66 ? step(0.03, fr.x) * step(fr.x, 0.97) * step(0.05, fr.y) * step(fr.y, 0.97)
                    : style > 0.33 ? step(0.02, fr.x) * step(fr.x, 0.98) * step(0.35, fr.y) * step(fr.y, 0.88)
                    : step(0.2, fr.x) * step(fr.x, 0.8) * step(0.25, fr.y) * step(fr.y, 0.85);
        glass *= side * step(1.2, vW.y);
        float fw = max(fwidth(cell.x), fwidth(cell.y)); float aaK = smoothstep(0.3, 0.9, fw);   // distant facades: average the pattern instead of aliasing
        vec3 base = mix(vec3(0.46, 0.44, 0.40), vec3(0.72, 0.68, 0.62), vC.y) * mix(0.8, 1.1, vC.z);
        if (style > 0.66) base *= 0.55;
        float l = max(dot(n, sunDir), 0.), amb = 0.45 + 0.25 * n.y;
        float ao = mix(0.45, 1.0, smoothstep(0., 40., vW.y));
        vec3 col = base * (sunCol * l * 1.6 + top * 0.6 * amb + hor * 0.08) * ao;
        // each pane is slightly out of plane, so reflections break up the way real glass does
        float hp = hash(id + vec2(floor(vC.z * 50.), 3.)); vec3 nn = normalize(n + vec3(hp - .5, hash(id + 7.) - .5, hash(id + 13.) - .5) * 0.06);
        vec3 r = reflect(-v, nn); float fres = 0.08 + 0.92 * pow(1. - max(dot(nn, v), 0.), 5.);
        vec3 refl = (skyc(r) * mix(0.55, 1.0, vC.z) + sunCol * pow(max(dot(r, sunDir), 0.), 2500.) * 12.) * reflK;
        vec3 tint = mix(vec3(0.55, 0.7, 0.75), vec3(0.75, 0.68, 0.55), vC.y);
        float hl = hash(id + vec2(vC.x * 91.)), hf = hash(vec2(id.y, vC.z * 77.)); vec3 lc = hf > 0.5 ? vec3(1.0, 0.72, 0.42) : vec3(0.85, 0.9, 1.0);
        vec3 inside = vec3(0.006, 0.007, 0.01) + lc * step(1. - litK * (0.4 + 1.2 * hf * hf), hl) * (0.7 + hash(id + 5.) * 1.1);
        vec3 g = mix(inside, refl * tint, clamp(fres + 0.35, 0., 1.)) ;
        vec3 gAvg = mix(vec3(0.006) + vec3(0.95, 0.75, 0.5) * litK * 0.55, refl * tint, clamp(fres + 0.35, 0., 1.));
        float frac = style > 0.66 ? 0.88 : style > 0.33 ? 0.5 : 0.36;
        col = mix(mix(col, g, glass), mix(col, gAvg, frac * side), aaK);
        if (n.y > 0.5) col = vec3(0.3, 0.3, 0.31) * (sunCol * l + vec3(0.5)) ;
        col *= 1. - wet * 0.25;
        // digital reconstruction: below the sweep line the building becomes a lit wire model
        if (digK > 0.) {
          vec2 e = abs(fract(vec2(f.x / 3.4, vW.y / 3.7)) - .5);
          float grid = smoothstep(0.43, 0.5, max(e.x, e.y));
          vec3 eb = abs(vW - vec3(0.)) ;
          vec3 dc = vec3(0.02, 0.05, 0.08) + vec3(0.25, 0.85, 1.0) * grid * 1.6;
          float below = smoothstep(dig + 2., dig - 2., vW.y);
          float line = exp(-abs(vW.y - dig) * 0.5) * 3.;
          col = mix(col, dc, below * digK) + vec3(0.4, 0.9, 1.0) * line * digK;
        }
        float dist = length(vW - cameraPosition); float fg = 1. - exp(-dist * fogD);
        col = mix(col, fogc(vW - cameraPosition), fg);
        gl_FragColor = vec4(col, 1.);
      }` });
  bMat.defines = { USE_INSTANCING_COLOR: '' };
  const bMesh = new THREE.InstancedMesh(bGeo, bMat, blds.length); const m4 = new THREE.Matrix4();
  bMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(blds.length * 3), 3);
  blds.forEach((b, i) => { m4.makeScale(b.w, b.h, b.d).setPosition(b.x, 0, b.z); bMesh.setMatrixAt(i, m4); bMesh.instanceColor.setXYZ(i, R(), R(), R()); });
  bMesh.frustumCulled = false; scene.add(bMesh);

  // ---- ground ----
  const gMat = new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: SKYFN + `uniform float fogD, dig, digK, wet; varying vec3 vW;
      void main(){ float B = ${BLOCK.toFixed(1)}, Rd = ${ROAD.toFixed(1)};
        vec2 p = mod(vW.xz + B * 100., B); vec2 dd = min(p, B - p);
        float road = 1. - step(Rd * .5, min(dd.x, dd.y));
        float walk = 1. - step(Rd * .5 + 3., min(dd.x, dd.y));
        vec3 c = mix(vec3(0.30, 0.31, 0.30), vec3(0.42, 0.41, 0.39), walk - road);
        c = mix(c, vec3(0.085, 0.088, 0.095), road);
        float dash = step(0.5, fract(vW.x / 6.)) * step(dd.y, 0.25) + step(0.5, fract(vW.z / 6.)) * step(dd.x, 0.25);
        c = mix(c, vec3(0.75, 0.72, 0.6), clamp(dash, 0., 1.) * road);
        float l = max(sunDir.y, 0.); c *= sunCol * l * 1.1 + vec3(0.5, 0.55, 0.62);
        vec3 r = reflect(normalize(vW - cameraPosition), vec3(0,1,0)); c = mix(c, skyc(r) * 0.5, wet * 0.35 * road);
        if (digK > 0.) { vec2 e = abs(fract(vW.xz / 10.) - .5); float grid = smoothstep(0.46, 0.5, max(e.x, e.y));
          c = mix(c, vec3(0.01, 0.03, 0.05) + vec3(0.2, 0.7, 1.0) * grid, digK * smoothstep(dig + 4., dig - 2., 0.)); }
        float dist = length(vW - cameraPosition); c = mix(c, fogc(vW - cameraPosition), 1. - exp(-dist * fogD));
        gl_FragColor = vec4(c, 1.); }` });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), gMat); ground.rotation.x = -Math.PI / 2; scene.add(ground);

  // ---- trees in parks and along some streets ----
  const trees = []; for (const l of lots) if (l.park) for (let k = 0; k < 40; k++) trees.push([l.cx + (R() - 0.5) * 100, l.cz + (R() - 0.5) * 100, 5 + R() * 5]);
  for (let k = 0; k < 900; k++) { const bx = Math.floor((R() - 0.5) * 2 * N), bz = Math.floor((R() - 0.5) * 2 * N); trees.push([bx * BLOCK + ROAD / 2 + 4, bz * BLOCK + R() * BLOCK, 3 + R() * 3]); }
  const tMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x3d5a2e, roughness: 1 }), trees.length);
  trees.forEach(([x, z, r], i) => { m4.makeScale(r, r * 1.25, r).setPosition(x, r * 1.4, z); tMesh.setMatrixAt(i, m4); }); scene.add(tMesh);

  // ---- traffic ----
  const NC = 700, cars = [];
  for (let i = 0; i < NC; i++) {
    const alongX = R() < 0.5, lane = Math.floor((R() - 0.5) * 2 * N), dir = R() < 0.5 ? 1 : -1;
    cars.push({ alongX, off: lane * BLOCK + dir * (3 + R() * 4), dir, s0: R() * BLOCK * 2 * N, v: 8 + R() * 7 });
  }
  const cMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(4.4, 1.5, 1.9), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.6 }), NC);
  const pal = [0xe8e8e8, 0x202226, 0x8a1f1f, 0x2b4f8a, 0x9a9da3, 0x56606a, 0xd0b060];
  cars.forEach((c, i) => cMesh.setColorAt(i, new THREE.Color(pal[i % pal.length]))); scene.add(cMesh);
  const lightP = new Float32Array(NC * 6), lightC = new Float32Array(NC * 6);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lightP, 3)); lg.setAttribute('color', new THREE.BufferAttribute(lightC, 3));
  const lights = new THREE.Points(lg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 color; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = clamp(900. / -mv.z, 1.5, 10.); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; void main(){ vec2 d = gl_PointCoord - .5; gl_FragColor = vec4(vC * exp(-dot(d,d) * 18.), 1.); }` }));
  lights.frustumCulled = false; scene.add(lights); W.carLights = lights;
  W.updateTraffic = ct => {
    const span = BLOCK * 2 * N;
    cars.forEach((c, i) => {
      let s = ((c.s0 + c.dir * c.v * ct) % span + span) % span - span / 2;
      if (c.alongX) m4.makeRotationY(0).setPosition(s, 0.9, c.off); else m4.makeRotationY(Math.PI / 2).setPosition(c.off, 0.9, s);
      cMesh.setMatrixAt(i, m4);
      const fwd = c.alongX ? V3(c.dir, 0, 0) : V3(0, 0, c.dir), side = c.alongX ? V3(0, 0, 0.7) : V3(0.7, 0, 0);
      const p = c.alongX ? V3(s, 0.9, c.off) : V3(c.off, 0.9, s), toward = c.alongX ? 0 : (c.dir < 0 ? 1 : 0);
      const col = (i % 2 === 0) ? [2.2, 2.0, 1.7] : [2.0, 0.12, 0.06];
      for (let k = 0; k < 2; k++) { const q = p.clone().addScaledVector(fwd, (i % 2 === 0 ? 2.3 : -2.3)).addScaledVector(side, k ? 1 : -1); lightP.set([q.x, q.y, q.z], (i * 2 + k) * 3); lightC.set(col, (i * 2 + k) * 3); }
    });
    lg.attributes.position.needsUpdate = true; lg.attributes.color.needsUpdate = true;
    cMesh.instanceMatrix.needsUpdate = true;
  };

  // ---- our building and apartment interior (camera stands here) ----
  const FLOOR = 62, room = new THREE.Group(); room.position.set(0, FLOOR, 0); scene.add(room);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(110, FLOOR, 110), new THREE.MeshStandardMaterial({ color: 0x55575c, roughness: 0.6 })); shell.position.set(0, FLOOR / 2 - 0.2, -48); scene.add(shell);
  const wallM = new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 0.9 }), darkM = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.6 });
  const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); room.add(b); return b; };
  box(12, 0.2, 9, 0, -0.1, -1.5, new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.55 }));   // floor
  box(12, 0.2, 9, 0, 3.3, -1.5, wallM);                                                                      // ceiling
  box(0.2, 3.4, 9, -6, 1.6, -1.5, wallM); box(0.2, 3.4, 9, 6, 1.6, -1.5, wallM); box(12, 3.4, 0.2, 0, 1.6, -6, wallM);
  // window wall at z = 3 with a 7 x 2.6 m opening
  box(2.5, 3.4, 0.25, -4.75, 1.6, 3, wallM); box(2.5, 3.4, 0.25, 4.75, 1.6, 3, wallM);
  box(7, 0.5, 0.25, 0, 0.15, 3, wallM); box(7, 0.4, 0.25, 0, 3.1, 3, wallM);
  for (const x of [-3.5, -1.75, 0, 1.75, 3.5]) box(0.08, 2.6, 0.12, x, 1.7, 3, darkM);
  box(7, 0.08, 0.12, 0, 0.42, 3, darkM);
  const glassMat = new THREE.ShaderMaterial({ uniforms: Object.assign({ rain: { value: 0 } }, U), transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float rain, time; varying vec2 vUv; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9, 78.2))) * 43758.5); }
      void main(){ float a = 0.035; vec3 c = vec3(0.6, 0.7, 0.8) * 0.04;
        if (rain > 0.) { vec2 g = vUv * vec2(70., 26.); vec2 id = floor(g); float r = h(id);
          vec2 f = fract(g) - .5; float sp = 0.15 + r * 0.6; f.y = fract(fract(g).y + time * sp * 0.35 + r) - .5;
          float drop = smoothstep(0.12, 0.0, length(f * vec2(1., 0.6))) * step(0.55, r);
          float streak = smoothstep(0.05, 0.0, abs(f.x)) * step(0., f.y) * step(0.8, r) * 0.6;
          a += (drop + streak) * 0.35 * rain; c += vec3(0.75, 0.8, 0.85) * (drop + streak) * 0.25 * rain; }
        gl_FragColor = vec4(c, a); }` });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.6), glassMat); glass.position.set(0, 1.7, 2.95); glass.rotation.y = Math.PI; room.add(glass);
  // wall clock showing the film's 8:17
  const clockTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#f1ece2'; g.beginPath(); g.arc(256, 256, 250, 0, TAU); g.fill();
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 14; g.stroke();
    for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, r0 = i % 5 ? 222 : 200; g.lineWidth = i % 5 ? 4 : 10; g.beginPath(); g.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0); g.lineTo(256 + Math.sin(a) * 236, 256 - Math.cos(a) * 236); g.stroke(); }
  });
  const clock = new THREE.Group(); clock.position.set(-4.3, 2.35, 2.84); clock.rotation.y = Math.PI; room.add(clock);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.32, 64), new THREE.MeshStandardMaterial({ map: clockTex, roughness: 0.5 })); clock.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 12, 64), darkM); clock.add(rim);
  const hand = (len, wid, col) => { const g = new THREE.PlaneGeometry(wid, len); g.translate(0, len * 0.4, 0.004); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col })); clock.add(m); return m; };
  const hH = hand(0.17, 0.028, 0x1a1a1a), hM = hand(0.26, 0.018, 0x1a1a1a), hS = hand(0.28, 0.007, 0xb3261e);
  W.setClock = sec => { const s = 8 * 3600 + 17 * 60 + 12 + sec; hS.rotation.z = -Math.floor(s % 60) / 60 * TAU; hM.rotation.z = -(s / 60 % 60) / 60 * TAU; hH.rotation.z = -(s / 3600 % 12) / 12 * TAU; };
  // desk with a child's drawing (return scene)
  const desk = new THREE.Group(); desk.position.set(2.2, 0, 1.6); room.add(desk);
  const dTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.8), new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 0.5 })); dTop.position.y = 0.76; desk.add(dTop);
  for (const [x, z] of [[-0.85, -0.35], [0.85, -0.35], [-0.85, 0.35], [0.85, 0.35]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.76, 0.05), darkM); l.position.set(x, 0.38, z); desk.add(l); }
  const drawing = canvasTex(1024, 724, (g, w, h) => {
    g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, h);
    const R2 = rng(5), wob = (x, y, r, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, rr = r * (1 + (R2() - 0.5) * 0.06); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.stroke(); };
    g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(210, 220, 110, 0, TAU); g.fill(); wob(210, 220, 112, '#f29b16', 9);
    g.strokeStyle = '#f2a516'; g.lineWidth = 10; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.moveTo(210 + Math.cos(a) * 135, 220 + Math.sin(a) * 135); g.lineTo(210 + Math.cos(a) * 185, 220 + Math.sin(a) * 185); g.stroke(); }
    g.fillStyle = '#3f8de0'; g.beginPath(); g.arc(640, 420, 120, 0, TAU); g.fill();
    g.fillStyle = '#3fae4f'; g.beginPath(); g.ellipse(600, 380, 55, 40, 0.4, 0, TAU); g.fill(); g.beginPath(); g.ellipse(690, 470, 45, 30, -0.3, 0, TAU); g.fill();
    wob(640, 420, 122, '#21579e', 8);
    g.fillStyle = '#7a7a7a'; g.beginPath(); g.arc(820, 260, 32, 0, TAU); g.fill();
    g.strokeStyle = '#3b3b9e'; g.lineWidth = 6;
    for (let k = 0; k < 11; k++) { const x = 80 + R2() * 860, y = 420 + R2() * 260; if (Math.hypot(x - 640, y - 420) < 170) continue; const r = 14 + R2() * 12; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.stroke(); }
    g.fillStyle = '#d23a3a'; g.font = 'bold 54px "Comic Sans MS", "Chalkboard SE", cursive'; g.fillText('MY UNIVERSE', 560, 110);
  });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.297), new THREE.MeshStandardMaterial({ map: drawing, roughness: 0.9 })); paper.rotation.x = -Math.PI / 2; paper.rotation.z = 0.12 + Math.PI; paper.position.set(-0.2, 0.79, 0.05); desk.add(paper);
  for (const [x, c] of [[0.25, 0xd23a3a], [0.29, 0x3f8de0], [0.33, 0xffd23a]]) { const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 8), new THREE.MeshStandardMaterial({ color: c })); cr.rotation.z = Math.PI / 2; cr.rotation.y = 0.3; cr.position.set(x, 0.795, 0.08 + (x - 0.25) * 0.5); desk.add(cr); }
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 24), new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.4 })); mug.position.set(0.55, 0.83, -0.15); desk.add(mug);
  // the observer
  const man = makeFigure({ scale: 1.0, color: 0x15161a, coat: true }); man.position.set(-1.1, 0, 2.15); man.rotation.y = 0.15; room.add(man);
  pose(man, { armLz: 6, armRz: 6, elbL: 6, elbR: 6 });
  // interior light: warm lamp, and a shaft of sun with dust
  const lamp = new THREE.PointLight(0xffc68a, 0.0, 9, 2); lamp.position.set(-3.5, 2.4, -3); room.add(lamp);
  const fill = new THREE.PointLight(0x9fb2d6, 0.35, 12, 2); fill.position.set(0, 2.2, 1.0); room.add(fill);
  const rimL = new THREE.PointLight(0xff9c5a, 0.9, 6, 2); rimL.position.set(-0.3, 1.9, 4.0); room.add(rimL);
  const dustN = 900, dustP = new Float32Array(dustN * 3), dust0 = [];
  for (let i = 0; i < dustN; i++) dust0.push([(R() - 0.5) * 6, R() * 3, R() * 3.8 - 1, R() * TAU]);
  const dustG = new THREE.BufferGeometry(); dustG.setAttribute('position', new THREE.BufferAttribute(dustP, 3));
  const dust = new THREE.Points(dustG, new THREE.PointsMaterial({ size: 0.012, color: 0xffe2b0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  room.add(dust);
  W.updateDust = ct => { dust0.forEach(([x, y, z, ph], i) => { dustP[i * 3] = x + Math.sin(ct * 0.13 + ph) * 0.15; dustP[i * 3 + 1] = ((y + ct * 0.02 + Math.sin(ct * 0.2 + ph) * 0.1) % 3 + 3) % 3 + 0.1; dustP[i * 3 + 2] = z + Math.cos(ct * 0.11 + ph) * 0.15; }); dustG.attributes.position.needsUpdate = true; };

  // ---- birds ----
  const birdM = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.8, side: THREE.DoubleSide });
  const birds = [0, 1, 2].map(k => {
    const b = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), birdM); body.scale.set(1, 0.7, 2.4); b.add(body);
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.12, 0, 0, -0.16, 0.62, 0.02, -0.08]), 3)); wg.computeVertexNormals();
    const wL = new THREE.Mesh(wg, birdM), wR = new THREE.Mesh(wg, birdM); wR.scale.x = -1; b.add(wL, wR); b.userData = { wL, wR, k }; b.scale.setScalar(2.2); scene.add(b); return b;
  });
  W.updateBirds = (ct, path) => birds.forEach((b, i) => {
    const s = ct * 9 + i * 7, p = path(s, i); b.position.copy(p.pos); b.lookAt(p.pos.clone().add(p.dir));
    const fl = Math.sin(ct * 11 + i * 2) * 0.7; b.userData.wL.rotation.z = fl; b.userData.wR.rotation.z = -fl;
  });

  // ---- rain outside ----
  const rainN = 6000, rainP = new Float32Array(rainN * 6), r0 = [];
  for (let i = 0; i < rainN; i++) r0.push([(R() - 0.5) * 120, R() * 120, 4 + R() * 140]);
  const rainG = new THREE.BufferGeometry(); rainG.setAttribute('position', new THREE.BufferAttribute(rainP, 3));
  const rain = new THREE.LineSegments(rainG, new THREE.LineBasicMaterial({ color: 0xaab4c0, transparent: true, opacity: 0.35, depthWrite: false })); rain.position.set(0, FLOOR - 50, 0); rain.frustumCulled = false; scene.add(rain);
  W.updateRain = ct => { r0.forEach(([x, y, z], i) => { const yy = ((y - ct * 28) % 120 + 120) % 120; rainP.set([x, yy, z, x - 0.15, yy + 1.6, z], i * 6); }); rainG.attributes.position.needsUpdate = true; };

  W.setMode = (mode, o = {}) => {
    const S = SKY[mode]; W.mode = mode;
    Object.assign(skyMat.uniforms.top.value, new THREE.Color(S.top)); skyMat.uniforms.top.value.set(S.top); skyMat.uniforms.hor.value.set(S.hor); skyMat.uniforms.gnd.value.set(S.gnd);
    skyMat.uniforms.sun.value.copy(S.sun).normalize(); skyMat.uniforms.sunC.value.set(S.sunC);
    U.top.value.set(S.top); U.hor.value.set(S.hor); U.gnd.value.set(S.gnd); U.sunDir.value.copy(S.sun).normalize(); U.sunCol.value.set(S.sunC);
    U.fogCol.value.set(...S.fog); U.fogD.value = S.dens; U.reflK.value = S.reflK; U.litK.value = mode === 'rain' ? 0.3 : 0.24; U.wet.value = mode === 'rain' ? 1 : 0;
    sun.position.copy(S.sun).multiplyScalar(1000); sun.intensity = S.sunI; sun.color.set(S.sunC);
    hemi.intensity = mode === 'rain' ? 0.7 : 0.35;
    glassMat.uniforms.rain.value = mode === 'rain' ? 1 : 0; rain.visible = mode === 'rain'; dust.visible = mode !== 'rain';
    lamp.intensity = mode === 'rain' ? 1.4 : 0; fill.intensity = mode === 'rain' ? 0.45 : 0.35; rimL.intensity = mode === 'rain' ? 0.15 : 0.9;
    U.digK.value = o.digK || 0; U.dig.value = o.dig != null ? o.dig : -100;
    room.visible = o.room !== false; shell.visible = true;
  };
  W.update = (ct, o = {}) => {
    U.time.value = ct; W.updateTraffic(ct); W.updateDust(ct); if (W.mode === 'rain') W.updateRain(ct); W.setClock(ct);
    W.updateBirds(ct, o.birdPath || ((s, i) => ({ pos: V3(-60 + s * 1.0 - i * 6, FLOOR + 6 + Math.sin(s * 0.08 + i) * 2 + i * 1.5, 40 + i * 5), dir: V3(1, 0, 0) })));
  };
  W.FLOOR = FLOOR; W.room = room; W.man = man; W.desk = desk; W.U = U;
  W.setMode('morning');
  return W;
}
