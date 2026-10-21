// The Moon turns slowly, so its day lasts about a month (29.5 Earth days, NASA). A pin crosses from day to night.
'use strict';
let MOON = null;
function moonWorld() {
  if (MOON) return MOON;
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(34, W / H, 0.01, 2e6);
  sc.add(makeSkyDome(TEX.mw, 0.45)); sc.add(starPoints(1500, 5e5, 31, 1.5 * SS, 0.9));
  const sunDir = V3(-1, 0.15, 0.55).normalize();
  const L = new THREE.DirectionalLight(0xfff3e0, 2.3); L.position.copy(sunDir.clone().multiplyScalar(10)); sc.add(L);
  sc.add(new THREE.AmbientLight(0x303850, 0.18));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.MeshStandardMaterial({ map: TEX.moon, roughness: 1, metalness: 0 }));
  sc.add(moon);
  const pin = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color: new THREE.Color(7, 4, 0.8), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, transparent: true }));
  pin.position.set(1.02, 0.0, 0.0); pin.scale.setScalar(0.17); moon.add(pin);
  MOON = { sc, cam, moon, pin, sunDir }; return MOON;
}
SHOTS.push({
  id: 'moon', t0: 32.5, t1: 39.2,
  layers(lt, t) {
    const S = moonWorld(), u = clamp(lt / 6.7);
    S.moon.rotation.y = 0.55 + u * Math.PI * 2 * 0.96;               // one slow turn
    const d = lerp(7.4, 6.2, ease(u)); setCam(S.cam, [0.0, 0.12, d], [0, 0, 0], 34);
    S.pin.scale.setScalar(0.16 + 0.02 * Math.sin(t * 5));
    return [{ scene: S.sc, camera: S.cam }];
  },
  grade: () => ({ exposure: 1.25, sat: 1.0 }),
  overlay(lt, t, w) {
    const S = moonWorld(); const wp = S.pin.getWorldPosition(new THREE.Vector3());
    const lit = wp.clone().normalize().dot(S.sunDir) > 0.02, facing = wp.z > -0.1;
    const pr = proj(wp, S.cam);
    overlay('mpin', lit ? '<div class="lab amber" style="font-size:20px">दिन</div>' : '<div class="lab" style="font-size:20px;color:#9fb6ff">रात</div>',
      `left:${(pr.x - 16).toFixed(0)}px;top:${(pr.y - 48).toFixed(0)}px`, (facing ? 1 : 0) * win(t, 33.2, 38.9, 0.5) * w);
    overlay('m1', '<div class="lab" style="font-size:23px;line-height:1.3;text-align:center;white-space:normal">चाँद पर 1 दिन = <span class="amber">1 महीना</span><div class="mono" style="font-size:14px;margin-top:4px;opacity:.9">≈ 29.5 दिन (NASA)</div></div>',
      'left:0;width:540px;top:150px', win(t, 33.0, 37.0, 0.5) * w);
    overlay('m2', '<div class="lab" style="font-size:21px;text-align:center;white-space:normal"><span class="amber">≈ 14.8 दिन धूप</span> &nbsp;·&nbsp; <span style="color:#9fb6ff">≈ 14.8 दिन रात</span></div>',
      'left:0;width:540px;top:150px', win(t, 37.1, 39.0, 0.4) * w);
  },
});
