// Lap race: globe shots. 0-6 s: hook and the three latitude rings drawing eastward from each city.
// 24-30 s: recap, three dots run their rings at the SAME speed (km/h); London's shorter ring completes first.
'use strict';
const W = 1080, H = 1920, canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(1); renderer.setSize(W, H, false);
const COMP = new Compositor(renderer, W, H);
const TEX = {}, L = new THREE.TextureLoader();
const lt = (k, u, s = true) => new Promise(r => L.load(u, t => { if (s) t.encoding = THREE.sRGBEncoding; TEX[k] = t; r(); }, undefined, r));
window.__ready = Promise.all([lt('day', 'tex/earth_day.jpg'), lt('night', 'tex/earth_night.jpg'), lt('clouds', 'tex/earth_clouds.jpg', false), lt('mw', 'tex/milkyway.jpg'), document.fonts.ready]).then(() => {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 1e5); scene.add(cam);
  scene.add(makeSkyDome(TEX.mw, 0.35, 5e4));
  const g = new THREE.Group(); scene.add(g);
  const earth = makeEarth(TEX, { sun: V3(0.3, 0.5, 1) }); g.add(earth);
  const P = (lat, lon, r = 1.0) => { const u = (lon + 180) / 360 * TAU, c = Math.cos(lat * D2R); return V3(-Math.cos(u) * c * r, Math.sin(lat * D2R) * r, Math.sin(u) * c * r); };
  // name, latitude, longitude, colour, lap length (km, WGS-84)
  const RUN = [['SINGAPORE', 1.3, 103.8, 0x3ee6d0, 40065], ['NEW DELHI', 28.6, 77.2, 0xffa63a, 35210], ['LONDON', 51.5, -0.13, 0xffffff, 25000]];
  const R = RUN.map(([name, lat, lon, col, km]) => {
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
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: lab, depthTest: false, transparent: true })); sp.scale.set(1.25, 0.366, 1);
    sp.center.set(name === 'LONDON' ? -0.05 : 1.05, 0.5); sp.position.copy(P(lat, lon, 1.03)); sp.renderOrder = 10; g.add(sp);
    return { name, lat, lon, km, tube, idxN, dot, glow, sp, col };
  });
  g.rotation.y = -2.62;
  window.__frame = t => {
    g.rotation.y = -2.62 + 0.006 * t;
    const draw = sstep(3.0, 6.0, t);                                   // rings draw on, eastward
    const race = clamp((t - 24.2) / 3.6);                              // recap race: 0..1 = 0..40,065 km travelled
    for (const r of R) {
      let frac = 0;
      if (t < 12) frac = 0; else frac = Math.min(1, race * 40065 / r.km);
      r.tube.geometry.setDrawRange(0, Math.floor(r.idxN * (t < 12 ? draw : 1)));
      r.dot.position.copy(P(r.lat, r.lon + 360 * frac, 1.012)); r.glow.position.copy(r.dot.position);
      const done = t > 12 && frac >= 1, pulse = done ? 1 + 2.5 * Math.exp(-(race * 40065 / r.km - 1) * 6) : 1 + 0.25 * Math.sin(t * 5);
      r.glow.scale.setScalar(0.2 * pulse); r.tube.material.color.set(r.col).multiplyScalar(done ? 3.2 : 2.2);
      r.sp.material.opacity = t < 12 ? sstep(0.8, 2.0, t) : 1;
    }
    const d = t < 12 ? lerp(7.2, 6.4, ease(t / 6)) : lerp(6.4, 7.6, sstep(27.6, 30, t));
    cam.position.set(0, d * 0.384, d * 0.923); cam.lookAt(0, 0.05, 0);
    COMP.frame([{ scene, camera: cam, w: 1 }], { exposure: 1.12, sat: 1.12, seed: (t * 30) % 97 });
  };
  window.__assetsOK = true;
});
function loop() { requestAnimationFrame(loop); if (!window.__assetsOK || !window.__frame) return; const t = (window.__startAt || 0) + performance.now() / 1000; window.__frame(t); }
requestAnimationFrame(loop);
