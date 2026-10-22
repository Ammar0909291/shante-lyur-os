// Lap race: globe shots. 0-6 s: hook and the three latitude rings drawing eastward from each city.
// 24-30 s: recap, three dots run their rings at the SAME speed (km/h); London's shorter ring completes first.
'use strict';
const W = 1080, H = 1920, canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(1); renderer.setSize(W, H, false);
const COMP = new Compositor(renderer, W, H);
const TEX = {}, L = new THREE.TextureLoader();
const lt = (k, u, s = true) => new Promise(r => L.load(u, t => { if (s) t.encoding = THREE.sRGBEncoding; TEX[k] = t; r(); }, undefined, r));
window.__ready = Promise.all([lt('day', 'tex/earth_day.jpg'), lt('night', 'tex/earth_night.jpg'), lt('clouds', 'tex/earth_clouds.jpg', false), lt('mw', 'tex/milkyway.jpg'), document.fonts.ready, ...['sg', 'dl', 'ld'].flatMap(k => [...Array(24).keys()].map(i => lt(k + i, `tex/run/${k}_c${i}.png`)).concat([lt(k + 'w', `tex/run/${k}_win.png`)]))]).then(() => {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 1e5); scene.add(cam);
  scene.add(makeSkyDome(TEX.mw, 0.35, 5e4));
  TEX.clouds.wrapS = THREE.RepeatWrapping; TEX.clouds.needsUpdate = true;   // cloud drift wraps instead of smearing the edge texel
  const g = new THREE.Group(); scene.add(g);
  const earth = makeEarth(TEX, { sun: V3(0.3, 0.5, 1) }); g.add(earth);
  const P = (lat, lon, r = 1.0) => { const u = (lon + 180) / 360 * TAU, c = Math.cos(lat * D2R); return V3(-Math.cos(u) * c * r, Math.sin(lat * D2R) * r, Math.sin(u) * c * r); };
  // name, latitude, longitude, colour, lap length (km, WGS-84)
  const RUN = [['SINGAPORE', 1.3, 103.8, 0x3ee6d0, 40065, 'sg'], ['NEW DELHI', 28.6, 77.2, 0xffa63a, 35210, 'dl'], ['LONDON', 51.5, -0.13, 0xffffff, 25000, 'ld']];
  const R = RUN.map(([name, lat, lon, col, km, key]) => {
    const pts = []; for (let k = 0; k <= 720; k++) pts.push(P(lat, lon + k / 2, 1.004));   // starts at the city, runs EAST
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false), 720, 0.007, 6, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2.2) }));
    g.add(tube); const idxN = tube.geometry.index.count;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(4) })); g.add(dot);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color: col, blending: THREE.AdditiveBlending, depthWrite: false })); g.add(glow);
    // big readable label: dark pill, city name in its ring colour, latitude underneath
    const LAT = { SINGAPORE: '1.3°N', 'NEW DELHI': '28.6°N', LONDON: '51.5°N' }[name];
    const lab = canvasTex(1024, 300, (c2, w, h) => {
      c2.font = '800 110px Inter, Arial'; const tw = Math.max(c2.measureText(name).width, 420) + 80;
      const x0 = name === 'LONDON' ? 0 : w - tw; c2.fillStyle = 'rgba(0,0,0,0.86)';
      c2.beginPath(); c2.roundRect ? c2.roundRect(x0, 20, tw, 260, 40) : c2.rect(x0, 20, tw, 260); c2.fill();
      c2.fillStyle = '#' + new THREE.Color(col).getHexString(); c2.fillText(name, x0 + 40, 140);
      c2.font = '700 80px Inter, Arial'; c2.fillStyle = '#ffffff'; c2.fillText(LAT, x0 + 40, 245); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: lab, depthTest: false, transparent: true })); sp.scale.set(0.85, 0.249, 1);
    sp.center.set(name === 'LONDON' ? -0.05 : 1.05, 0.5); sp.position.copy(P(lat, lon, 1.03)); sp.renderOrder = 10; g.add(sp);
    // the runner: her/his own cut-out run cycle, standing on the ring (shown far larger than real scale)
    const man = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX[key + '0'], depthTest: false, transparent: true })); man.center.set(0.5, 0.02); man.renderOrder = 20; g.add(man);
    return { name, lat, lon, km, key, tube, idxN, dot, glow, sp, col, man };
  });
  g.rotation.y = -2.62;
  // aim so New Delhi faces the camera at t = 10 (London to its left, Singapore to its right); rotation y adds to the point's azimuth atan2(x, z) = u - PI/2
  const AIM = -((77.2 + 180) / 360 * TAU - Math.PI / 2) + 0.15;
  const DAYS = 40065 / 240, day = t => clamp((t - 10) / 14) * DAYS;     // 10-24 s = day 0..167, everyone at 240 km/day
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), camDir = new THREE.Vector3();
  window.__frame = t => {
    // during the race the view travels east with the middle runner (New Delhi), so all three stay on the visible side
    const follow = 2 * Math.PI * Math.min(1, day(t) * 240 / 35210);
    g.rotation.y = AIM + 0.012 * (t - 10) - follow; earth.userData.mat.uniforms.cloudRot.value = t * 0.0015;
    const draw = sstep(4.0, 7.0, t);
    const el = lerp(26, 34, sstep(7, 11, t)) * D2R, d = lerp(6.2, 5.3, ease(Math.min(t, 10) / 10)) + 0.9 * sstep(29, 35, t);
    cam.position.set(0, d * Math.sin(el), d * Math.cos(el)); cam.lookAt(0, 0.1, 0); cam.updateMatrixWorld(); g.updateMatrixWorld();
    for (const r of R) {
      const frac = Math.min(1, day(t) * 240 / r.km), done = frac >= 1 && t >= 10;
      r.tube.geometry.setDrawRange(0, Math.floor(r.idxN * draw));
      const lonNow = r.lon + 360 * frac;
      r.dot.position.copy(P(r.lat, r.lon, 1.012)); r.glow.position.copy(r.dot.position);
      const fin = done ? Math.max(0, 1 - (day(t) * 240 / r.km - 1) * 3) : 0;
      r.glow.scale.setScalar(0.2 * (1 + 2.5 * fin + 0.25 * Math.sin(t * 5)));
      r.tube.material.color.set(r.col).multiplyScalar(done ? 3.2 : 2.2);
      r.sp.material.opacity = sstep(0.8, 2.0, t) * (1 - sstep(9.5, 10.2, t)) + sstep(24.5, 25.5, t);
      // runner on the ring
      r.man.position.copy(P(r.lat, lonNow, 1.006));
      r.man.material.map = done ? TEX[r.key + 'w'] : TEX[r.key + (t >= 10 ? Math.round(t * 30) % 24 : 0)];
      const h = done ? 0.46 : 0.44, asp = r.man.material.map.image.width / r.man.material.map.image.height;
      // face the direction of travel on screen (east), and fade when on the far side of the globe
      tmp.copy(r.man.position).applyMatrix4(g.matrixWorld).project(cam); tmp2.copy(P(r.lat, lonNow + 2, 1.006)).applyMatrix4(g.matrixWorld).project(cam);
      const flip = !done && tmp2.x < tmp.x ? -1 : 1;
      r.man.scale.set(h * asp * flip, h, 1);
      const wp = r.man.position.clone().applyMatrix4(g.matrixWorld); camDir.copy(cam.position).sub(wp).normalize();
      r.man.material.opacity = sstep(-0.12, 0.05, wp.clone().normalize().dot(camDir)) * sstep(0.3, 1.2, t);
    }
    COMP.frame([{ scene, camera: cam, w: 1 }], { exposure: 1.12, sat: 1.12, seed: (t * 30) % 97 });
  };
  window.__assetsOK = true;
});
function loop() { requestAnimationFrame(loop); if (!window.__assetsOK || !window.__frame) return; const t = (window.__startAt || 0) + performance.now() / 1000; window.__frame(t); }
requestAnimationFrame(loop);
