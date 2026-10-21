// Earth, no longer spinning, still goes round the Sun: one sunrise a year (simplified; axial tilt ignored in the day length).
'use strict';
const ORB_T0 = 39.2, ORB_T1 = 44.95, ORB_R = 3.0;
let ORB = null;
function orbitWorld() {
  if (ORB) return ORB;
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(34, W / H, 0.05, 2e6);
  sc.add(makeSkyDome(TEX.mw, 0.5)); sc.add(starPoints(1500, 5e5, 41, 1.5 * SS, 0.9));
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 6.2, 2.6) })); sc.add(sunMesh);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color: new THREE.Color(1.3, 0.8, 0.3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sunGlow.scale.setScalar(2.6); sc.add(sunGlow);
  const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * TAU; pts.push(V3(Math.cos(a) * ORB_R, 0, Math.sin(a) * ORB_R)); }
  const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: new THREE.Color(0.55, 0.62, 0.8), transparent: true, opacity: 0.5 })); sc.add(ring);
  const sunU = V3(-1, 0, 0);
  const E = makeEarth({ day: TEX.day, night: TEX.night, clouds: BLACK }, { sun: sunU }); const shell = cloudShell(E.userData.mat.uniforms.sun);
  const grp = new THREE.Group(); grp.add(E); grp.add(shell);
  const pin = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color: new THREE.Color(7, 4, 0.8), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, transparent: true }));
  pin.position.copy(llToLocal(LAT, LON, 1.03)); pin.scale.setScalar(0.5); E.userData.earth.add(pin);
  grp.scale.setScalar(0.8); grp.rotation.z = 23.44 * D2R; sc.add(grp);
  E.userData.earth.rotation.y = ALPHA + 1.0; shell.rotation.y = ALPHA + 1.0;     // fixed orientation relative to the stars
  ORB = { sc, cam, grp, E, shell, pin, sunU }; return ORB;
}
SHOTS.push({
  id: 'orbit', t0: 39.2, t1: 44.95,
  layers(lt, t) {
    const S = orbitWorld(), p = clamp((t - ORB_T0) / (ORB_T1 - ORB_T0)), th = 0.55 + p * TAU * 0.98;
    S.grp.position.set(Math.cos(th) * ORB_R, 0, Math.sin(th) * ORB_R);
    S.sunU.copy(S.grp.position).multiplyScalar(-1).normalize();
    const el = 56 * D2R, az = lerp(0.35, -0.2, p), d = 21.5;
    setCam(S.cam, [Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d], [0, -0.3, 0], 34);
    return [{ scene: S.sc, camera: S.cam }];
  },
  grade: () => ({ exposure: 1.1, sat: 1.05 }),
  overlay(lt, t, w) {
    const S = orbitWorld(), p = clamp((t - ORB_T0) / (ORB_T1 - ORB_T0));
    const wp = S.pin.getWorldPosition(new THREE.Vector3()), n = wp.clone().sub(S.grp.position).normalize();
    const lit = n.dot(S.sunU) > 0.02, pr = proj(wp, S.cam), vis = n.dot(S.cam.position.clone().sub(S.grp.position).normalize()) > -0.05;
    overlay('opin', lit ? '<div class="lab amber" style="font-size:19px">दिल्ली: दिन</div>' : '<div class="lab" style="font-size:19px;color:#9fb6ff">दिल्ली: रात</div>',
      `left:${Math.min(pr.x + 18, 400).toFixed(0)}px;top:${(pr.y - 30).toFixed(0)}px`, (vis ? 1 : 0.35) * win(t, 39.6, 44.6, 0.4) * w);
    const months = Math.min(12, Math.floor(p * 12) + 1);
    overlay('oyr', `<div class="mono amber" style="font-size:34px;line-height:1;text-align:center">${months < 10 ? '0' + months : months}<span style="font-size:15px;color:#fff"> / 12 महीने</span></div><div class="lab" style="font-size:19px;text-align:center;margin-top:8px;white-space:normal">धरती घूमे बिना: 1 साल = 1 दिन</div>`,
      'left:0;width:540px;top:140px', win(t, 39.5, 44.6, 0.5) * w);
    overlay('o6', '<div class="lab" style="font-size:21px;text-align:center;white-space:normal"><span class="amber">6 महीने धूप</span> &nbsp;·&nbsp; <span style="color:#9fb6ff">6 महीने रात</span></div><div class="mono" style="font-size:11px;text-align:center;margin-top:5px;opacity:.8">सरलीकृत चित्रण</div>',
      'left:0;width:540px;top:600px', win(t, 42.9, 44.7, 0.4) * w);
  },
});
