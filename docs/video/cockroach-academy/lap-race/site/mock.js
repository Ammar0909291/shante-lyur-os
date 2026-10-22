// Mock-up still: real NASA Earth, exact latitude rings for Singapore, New Delhi and London.
'use strict';
const W = 1080, H = 1920, canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(1); renderer.setSize(W, H, false);
const COMP = new Compositor(renderer, W, H);
const TEX = {}, L = new THREE.TextureLoader();
const lt = (k, u, s = true) => new Promise(r => L.load(u, t => { if (s) t.encoding = THREE.sRGBEncoding; TEX[k] = t; r(); }, undefined, r));
window.__ready = Promise.all([lt('day', 'tex/earth_day.jpg'), lt('night', 'tex/earth_night.jpg'), lt('clouds', 'tex/earth_clouds.jpg', false), lt('mw', 'tex/milkyway.jpg')]).then(() => {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 1e5); scene.add(cam);
  scene.add(makeSkyDome(TEX.mw, 0.35, 5e4));
  const g = new THREE.Group(); scene.add(g);
  const earth = makeEarth(TEX, { sun: V3(0.3, 0.5, 1) }); g.add(earth);
  // point on the textured sphere for latitude / longitude (matches THREE.SphereGeometry UVs)
  const P = (lat, lon, r = 1.0) => { const u = (lon + 180) / 360 * TAU, c = Math.cos(lat * D2R); return V3(-Math.cos(u) * c * r, Math.sin(lat * D2R) * r, Math.sin(u) * c * r); };
  const RUN = [['SINGAPORE', 1.3, 103.8, 0x3ee6d0, '1.3°N · 40,065 km'], ['NEW DELHI', 28.6, 77.2, 0xffa63a, '28.6°N · 35,210 km'], ['LONDON', 51.5, -0.13, 0xffffff, '51.5°N · ≈25,000 km']];
  for (const [name, lat, lon, col, sub] of RUN) {
    const pts = []; for (let k = 0; k <= 360; k++) pts.push(P(lat, k - 180, 1.004));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, linewidth: 2 })); g.add(line);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 360, 0.007, 6, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2.2) })); g.add(tube);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(4) })); dot.position.copy(P(lat, lon, 1.01)); g.add(dot);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color: col, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(0.2); glow.position.copy(dot.position); g.add(glow);
    // label sprite with an arrow pointing east
    const lab = canvasTex(768, 192, (c2, w, h) => { c2.font = '700 64px Arial'; c2.fillStyle = '#' + new THREE.Color(col).getHexString(); c2.textAlign = name === 'LONDON' ? 'left' : 'right'; const X = name === 'LONDON' ? 12 : w - 12; c2.fillText(name + '  →', X, 80); c2.font = '500 44px Arial'; c2.fillStyle = '#e8e8e8'; c2.fillText(sub, X, 150); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: lab, depthTest: false, transparent: true })); sp.scale.set(0.95, 0.24, 1); sp.center.set(name === 'LONDON' ? -0.06 : 1.04, 0.62); sp.position.copy(P(lat, lon, 1.03)); sp.renderOrder = 10; g.add(sp);
  }
  g.rotation.y = -2.62;                         // bring Europe-Asia to the front
  cam.position.copy(V3(0.0, 2.6, 6.3)); cam.lookAt(0, 0.05, 0);
  window.__frame = () => COMP.frame([{ scene, camera: cam, w: 1 }], { exposure: 1.1, sat: 1.05 });
  window.__frame(); window.__assetsOK = false;
});
