// Space world: one Earth shared by the hook, Delhi, wind and closing shots. Eastward = +x at the Delhi-facing point.
'use strict';
const LAT = 28.61 * D2R, LON = 77.21 * D2R;               // Delhi
const ALPHA = -Math.PI / 2 - LON;                          // earth.rotation.y that puts Delhi facing the +z camera
const T_STOP = 5.15, OMEGA = 0.30, PHI0 = ALPHA - OMEGA * T_STOP;
const T_CLOSE = 44.95;
const SUN = V3(0.75, 0.30, 0.60).normalize();
const DELHI_W = V3(0, Math.sin(LAT), Math.cos(LAT));      // world position of Delhi once the surface faces us
const EAST = V3(1, 0, 0), NORTH = V3(0, Math.cos(LAT), -Math.sin(LAT));
const earthPhi = t => PHI0 + OMEGA * Math.min(t, T_STOP);

function cloudShell(sunU, radius = 1.011) {
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { map: { value: TEX.clouds }, sun: sunU, gain: { value: 1 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 sun; uniform float gain; varying vec2 vUv; varying vec3 vN;
      void main(){ float c = texture2D(map, vUv).r; c = smoothstep(0.22, 0.95, c); float l = dot(normalize(vN), sun);
        vec3 col = vec3(1.0) * (max(l, 0.) * 1.25 + 0.012); gl_FragColor = vec4(col, c * 0.80 * gain); }` });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 96), m);
}
const llToLocal = (lat, lon, r = 1) => V3(Math.cos(lat) * Math.cos(lon) * r, Math.sin(lat) * r, -Math.cos(lat) * Math.sin(lon) * r);

let SPACE = null;
function spaceWorld() {
  if (SPACE) return SPACE;
  const sc = new THREE.Scene();
  sc.add(makeSkyDome(TEX.mw, 0.5)); sc.add(starPoints(1800, 5e5, 11, 1.5 * SS, 0.9));
  const E = makeEarth({ day: TEX.day, night: TEX.night, clouds: BLACK }, { sun: SUN.clone() }); sc.add(E);
  const shell = cloudShell(E.userData.mat.uniforms.sun); sc.add(shell);
  const pivot = new THREE.Group(); sc.add(pivot);                 // rotates with the solid surface
  const P = llToLocal(LAT, LON, 1.006);
  const pin = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color: new THREE.Color(6, 3.4, 0.7), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true }));
  pin.position.copy(P); pivot.add(pin);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.985, 1.0, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3, 0.8), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ring.position.copy(P); ring.lookAt(P.clone().multiplyScalar(2)); pivot.add(ring);
  // eastward arrow along Delhi's parallel
  const pts = []; for (let i = 0; i <= 40; i++) pts.push(llToLocal(LAT, LON + (i / 40) * 0.40, 1.012));
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(curve, 80, 0.0026, 6, false);
  const arrow = new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.5, 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.034, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.5, 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const endP = pts[40], tan = pts[40].clone().sub(pts[39]).normalize();
  head.position.copy(endP); head.quaternion.setFromUnitVectors(V3(0, 1, 0), tan);
  pivot.add(arrow, head);
  // wind streak ribbons (world space; Earth is stopped while they run)
  const N = 2600, rnd = rng(77), base = [];
  for (let i = 0; i < N; i++) {
    const a = rnd() * TAU, rr = Math.sqrt(rnd()) * 0.85;                       // within ~49deg of Delhi
    const dir = DELHI_W.clone().add(EAST.clone().multiplyScalar(Math.cos(a) * rr)).add(NORTH.clone().multiplyScalar(Math.sin(a) * rr)).normalize();
    base.push({ dir, rad: 1.009 + rnd() * 0.028, len: 0.03 + rnd() * 0.07, ph: rnd(), sp: 0.7 + rnd() * 0.6, w: 0.00035 + rnd() * 0.0005, k: 0.35 + rnd() * 0.5 });
  }
  const pos = new Float32Array(N * 4 * 3), col = new Float32Array(N * 4 * 3), idx = [];
  for (let i = 0; i < N; i++) { const o = i * 4; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); wg.setAttribute('color', new THREE.BufferAttribute(col, 3)); wg.setIndex(idx);
  const wind = new THREE.Mesh(wg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  wind.frustumCulled = false; sc.add(wind);
  SPACE = { sc, E, shell, pivot, pin, ring, arrow, head, tube, wind, base, wg, N, camPos: V3(0, 0, 5) };
  return SPACE;
}

const windK = t => sstep(19.9, 20.9, t) * (1 - sstep(29.6, 30.6, t));
function updateSpace(t, camPos) {
  const S = spaceWorld(); let phi, psi;
  if (t < T_CLOSE - 0.6) { phi = earthPhi(t); psi = PHI0 + OMEGA * t; }
  else { const u = t - T_CLOSE; phi = ALPHA + 0.10 * u; psi = phi + 0.003 * u; }
  S.E.userData.earth.rotation.y = phi; S.shell.rotation.y = psi; S.pivot.rotation.y = phi;
  const closing = t > T_CLOSE - 0.6;
  // pin: visible from the hook onward until close
  S.pin.visible = !closing; S.pin.material.color.setRGB(6, 3.4, 0.7);
  S.pin.scale.setScalar(0.07 + 0.012 * Math.sin(t * 5));
  // shock ring at the stop
  const rk = (t - T_STOP) / 1.1; S.ring.visible = rk > 0 && rk < 1;
  if (S.ring.visible) { S.ring.scale.setScalar(0.02 + easeOut(rk) * 0.24); S.ring.material.opacity = 0.7 * (1 - rk) * (1 - rk); }
  // arrow reveal
  const ak = ease((t - 17.4) / 1.8), fade = 1 - sstep(20.0, 20.8, t);
  const total = S.tube.index.count; S.arrow.geometry.setDrawRange(0, Math.floor(total * ak / 6) * 6);
  S.arrow.material.opacity = fade; S.head.material.opacity = fade; S.arrow.visible = ak > 0.01 && fade > 0.01; S.head.visible = ak > 0.97 && fade > 0.01;
  // wind
  const wk = windK(t); S.wind.visible = wk > 0.01;
  if (S.wind.visible) {
    const P = S.wg.attributes.position.array, C = S.wg.attributes.color.array, cp = camPos || V3(0, 0, 3);
    const tt = t - 20.0; let o = 0;
    for (let i = 0; i < S.N; i++) {
      const b = S.base[i];
      // slide along +x (east) in a looping window; rotating the base direction about the world y axis
      const th = ((b.ph + tt * 0.20 * b.sp) % 1) * 1.1 - 0.55;
      const edge = Math.sin(Math.PI * ((th + 0.55) / 1.1));
      const cs = Math.cos(th), sn = Math.sin(th), cs2 = Math.cos(th - b.len), sn2 = Math.sin(th - b.len);
      const hx = (b.dir.x * cs + b.dir.z * sn) * b.rad, hz = (-b.dir.x * sn + b.dir.z * cs) * b.rad, hy = b.dir.y * b.rad;
      const tx = (b.dir.x * cs2 + b.dir.z * sn2) * b.rad, tz = (-b.dir.x * sn2 + b.dir.z * cs2) * b.rad;
      let dx = hx - tx, dy = 0, dz = hz - tz; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      const vx = hx - cp.x, vy = hy - cp.y, vz = hz - cp.z;
      let sx = dy * vz - dz * vy, sy = dz * vx - dx * vz, sz = dx * vy - dy * vx; const sl = Math.hypot(sx, sy, sz) || 1; sx *= b.w / sl; sy *= b.w / sl; sz *= b.w / sl;
      P.set([tx - sx * 0.3, hy - sy * 0.3, tz - sz * 0.3, tx + sx * 0.3, hy + sy * 0.3, tz + sz * 0.3, hx - sx, hy - sy, hz - sz, hx + sx, hy + sy, hz + sz], o);
      const k = wk * edge * b.k * 0.55, kh = k;
      C.set([0, 0, 0, 0, 0, 0, kh * 0.85, kh * 0.95, kh * 1.1, kh * 0.85, kh * 0.95, kh * 1.1], o);
      o += 12;
    }
    S.wg.attributes.position.needsUpdate = true; S.wg.attributes.color.needsUpdate = true;
  }
  return S;
}

const fmtK = n => n.toLocaleString('en-US');

// ---- S1: hook, push-in on a spinning Earth that freezes ----
SHOTS.push({
  id: 'hook', t0: 0, t1: 6.3, cam: new THREE.PerspectiveCamera(34, W / H, 0.01, 2e6),
  layers(lt, t) {
    const u = clamp(t / T_STOP), d = Math.exp(lerp(Math.log(7.4), Math.log(3.0), ease(u))) + 0.0 * t - (t > T_STOP ? 0.05 * (t - T_STOP) : 0);
    const elev = lerp(0.10, 0.46, ease(u)), az = lerp(-0.22, 0.0, ease(u));
    const dir = V3(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev)).normalize();
    const sh = t > T_STOP ? 0.014 * Math.exp(-(t - T_STOP) * 6.5) : 0;      // brief shake at the stop
    const p = dir.multiplyScalar(d).add(V3(Math.sin(t * 61) * sh, Math.cos(t * 53) * sh, Math.sin(t * 47) * sh));
    setCam(this.cam, [p.x, p.y, p.z], [0, 0, 0], 34);
    const S = updateSpace(t, this.cam.position); return [{ scene: S.sc, camera: this.cam }];
  },
  grade: () => ({ exposure: 1.12, sat: 1.04 }),
  overlay(lt, t, w) {
    const k = win(t, 2.2, 4.29, 0.3) * w;
    overlay('chips', '<div class="lab" style="font-size:14px;opacity:.9">भूमध्य रेखा</div><div class="mono amber" style="font-size:27px;line-height:1.1">≈ 1,670 km/h</div><div class="lab" style="font-size:14px;opacity:.9;margin-top:6px">दिल्ली</div><div class="mono" style="font-size:22px;line-height:1.1;color:#ffd9a0">≈ 1,470 km/h</div><div class="lab" style="font-size:13px;opacity:.85;margin-top:6px">आवाज़ ≈ 1,225 km/h</div>',
      'left:0;width:540px;text-align:center;top:150px;white-space:normal', k);
  },
});

// ---- S4: Delhi, the speed it keeps ----
SHOTS.push({
  id: 'delhi', t0: 16.1, t1: 20.3, cam: new THREE.PerspectiveCamera(34, W / H, 0.01, 2e6),
  layers(lt, t) {
    const u = clamp(lt / 4.2), d = Math.exp(lerp(Math.log(3.2), Math.log(1.62), ease(u)));
    const tgt = DELHI_W.clone().add(NORTH.clone().multiplyScalar(-0.10 * (1 - u)));
    const p = DELHI_W.clone().multiplyScalar(d).add(EAST.clone().multiplyScalar(-0.10 * (1 - u))).add(V3(0, 0.12 * (1 - u), 0));
    setCam(this.cam, [p.x, p.y, p.z], [tgt.x, tgt.y, tgt.z], 34);
    const S = updateSpace(t, this.cam.position); return [{ scene: S.sc, camera: this.cam }];
  },
  grade: () => ({ exposure: 1.12 }),
  overlay(lt, t, w) {
    const pr = proj(DELHI_W.clone().multiplyScalar(1.006), this.cam);
    const k = win(t, 16.6, 19.9, 0.5) * w;
    overlay('dl', '<div class="lab amber" style="font-size:17px">दिल्ली</div>', `left:${(pr.x + 14).toFixed(0)}px;top:${(pr.y - 28).toFixed(0)}px`, k * sstep(16.8, 17.4, t));
    overlay('spd', '<div class="mono amber" style="font-size:44px;line-height:1">1,470 km/h</div><div class="lab" style="font-size:15px;margin-top:6px;opacity:.9">पूरब की तरफ़</div>',
      'left:0;width:540px;text-align:center;top:620px;white-space:normal', k * sstep(17.8, 18.4, t));
  },
});

// ---- S5: wind & clouds keep moving over a stopped surface ----
SHOTS.push({
  id: 'wind', t0: 20.3, t1: 30.4, cam: new THREE.PerspectiveCamera(36, W / H, 0.01, 2e6),
  layers(lt, t) {
    const u = clamp(lt / 10.1);
    const r = lerp(1.21, 1.12, ease(u));
    const p = DELHI_W.clone().multiplyScalar(r).add(EAST.clone().multiplyScalar(lerp(-0.62, -0.30, u))).add(NORTH.clone().multiplyScalar(lerp(-0.22, -0.10, u)));
    const tgt = DELHI_W.clone().add(EAST.clone().multiplyScalar(lerp(0.30, 0.45, u))).add(NORTH.clone().multiplyScalar(0.05));
    setCam(this.cam, [p.x, p.y, p.z], [tgt.x, tgt.y, tgt.z], lerp(40, 46, u));
    const S = updateSpace(t, this.cam.position); return [{ scene: S.sc, camera: this.cam }];
  },
  grade: () => ({ exposure: 1.22, sat: 1.05 }),
  overlay(lt, t, w) {
    const kb = win(t, 26.4, 29.85, 0.4) * w * (QUIET ? 0 : 1);
    const g = ease((t - 26.6) / 1.6), h1 = 408 / 1670 * 100;
    overlay('bars',
      `<div style="display:flex;align-items:flex-end;justify-content:center;gap:34px;height:132px">
         <div style="text-align:center"><div class="mono" style="font-size:22px;color:#cfe8ff">408 km/h</div>
           <div style="width:78px;height:${(h1 * 1.0 * g).toFixed(1)}px;margin:6px auto 0;background:linear-gradient(#bfe0ff,#5b8ff0);box-shadow:0 0 18px rgba(120,170,255,.55)"></div></div>
         <div style="text-align:center"><div class="mono amber" style="font-size:22px">1,670 km/h</div>
           <div style="width:78px;height:${(100 * g).toFixed(1)}px;margin:6px auto 0;background:linear-gradient(#ffd27a,#ff7a1a);box-shadow:0 0 22px rgba(255,150,40,.7)"></div></div></div>
       <div style="display:flex;justify-content:center;gap:34px;margin-top:8px;font-size:12.5px;line-height:1.25;white-space:normal">
         <div class="lab" style="width:118px;text-align:center">अब तक नापा सबसे तेज़ झोंका<br>(बिना tornado)</div>
         <div class="lab" style="width:118px;text-align:center">इक्वेटर पर हवा<br>(शुरू में)</div></div>`,
      'left:0;width:540px;top:128px;white-space:normal', kb);
  },
});

// ---- S9: close, back to the real, spinning Earth ----
SHOTS.push({
  id: 'close', t0: T_CLOSE, t1: 58.0, cam: new THREE.PerspectiveCamera(34, W / H, 0.01, 2e6),
  layers(lt, t) {
    const u = clamp(lt / 13), e = ease(u), d = Math.exp(lerp(Math.log(2.35), Math.log(6.6), e));
    const az = lerp(0.0, 0.32, e), elev = lerp(0.40, 0.22, e);
    const dir = V3(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev)).normalize().multiplyScalar(d);
    setCam(this.cam, [dir.x, dir.y, dir.z], [0, 0, 0], 34);
    const S = updateSpace(t, this.cam.position); return [{ scene: S.sc, camera: this.cam }];
  },
  grade: () => ({ exposure: 1.12 }),
  overlay(lt, t, w) {
    overlay('chg', '<div class="lab" style="font-size:25px;line-height:1.35;text-align:center;white-space:normal">आप <span class="amber">बदलाव</span> महसूस करते हो,<br>रफ़्तार नहीं।</div>',
      'left:0;width:540px;top:150px', win(t, 48.9, 52.4, 0.6) * w);
  },
});
