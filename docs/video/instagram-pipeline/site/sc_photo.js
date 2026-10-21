// Photo shots: the supplied stills (AI-generated, labelled ILLUSTRATION) animated with a punch, shake and directional motion blur.
'use strict';
const PHOTO_MAT = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false,
  uniforms: { a: { value: null }, b: { value: null }, m: { value: 0 }, blur: { value: 0 }, zoom: { value: 1 }, shift: { value: new THREE.Vector2() }, rad: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: `uniform sampler2D a, b; uniform float m, blur, zoom, rad; uniform vec2 shift; varying vec2 vUv;
    vec3 samp(sampler2D t, vec2 uv){
      if (blur < 0.0004) return pow(texture2D(t, uv).rgb, vec3(2.2));
      vec3 s = vec3(0.); float ws = 0.;
      for (int i = -5; i <= 5; i++) { float k = float(i); float w = exp(-k * k / 18.); s += pow(texture2D(t, uv + vec2(k * blur / 5., 0.)).rgb, vec3(2.2)) * w; ws += w; }
      return s / ws; }
    void main(){
      vec2 c = vUv - 0.5; float r = length(c);
      vec2 uv = c / (zoom * (1. + rad * r * r)) + 0.5 + shift;
      vec3 ca = samp(a, uv), cb = (m > 0.001) ? samp(b, uv) : ca;
      gl_FragColor = vec4(mix(ca, cb, m), 1.); }`,
});
const PHOTO_SC = new THREE.Scene(); PHOTO_SC.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), PHOTO_MAT));
const PHOTO_CAM = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
// transitions: [[tStart, tEnd], ...] between consecutive images
function photoState(t, imgs, trans) {
  let i = 0;
  for (let k = 0; k < trans.length; k++) {
    const [a, b] = trans[k];
    if (t >= b) i = k + 1;
    else if (t >= a) return { A: imgs[k], B: imgs[k + 1], m: ease((t - a) / (b - a)), bl: Math.sin(Math.PI * clamp((t - a) / (b - a))) };
  }
  return { A: imgs[i], B: imgs[i], m: 0, bl: 0 };
}
const _noise = (t, f) => Math.sin(t * f) * 0.6 + Math.sin(t * f * 1.73 + 1.3) * 0.4;
function photoShot(id, t0, t1, imgs, trans, hits, o = {}) {
  SHOTS.push({
    id, t0, t1,
    layers(lt, t) {
      const st = photoState(t, imgs, trans);
      PHOTO_MAT.uniforms.a.value = TEX[st.A]; PHOTO_MAT.uniforms.b.value = TEX[st.B]; PHOTO_MAT.uniforms.m.value = st.m;
      let sh = 0, punch = 0;
      for (const [th, amp, dec] of hits) { if (t > th) { const e = Math.exp(-(t - th) * dec); sh += amp * e; punch += amp * 2.2 * e; } }
      const u = clamp(lt / (t1 - t0)), kb = lerp(o.z0 || 1.04, o.z1 || 1.10, ease(u));
      PHOTO_MAT.uniforms.zoom.value = kb + punch;
      PHOTO_MAT.uniforms.shift.value.set(_noise(t, 41) * sh * 0.9 + (o.panx ? lerp(-o.panx, o.panx, u) : 0) + _noise(t, 1.3) * 0.0025, _noise(t + 5, 37) * sh * 0.9 + _noise(t, 1.1) * 0.0018);
      PHOTO_MAT.uniforms.blur.value = st.bl * (o.maxBlur || 0.014) + sh * 0.15;
      PHOTO_MAT.uniforms.rad.value = sh * 3.0;
      return [{ scene: PHOTO_SC, camera: PHOTO_CAM }];
    },
    grade: () => ({ exposure: o.exposure || 1.0, sat: o.sat || 1.1 }),
    overlay: o.overlay,
  });
}
// BUS 6.3–10.9: the bus brakes at 7.95 s; passengers keep moving forward (to the right)
photoShot('bus', 6.3, 10.9, ['B1', 'B2', 'B3', 'B4'], [[7.95, 8.2], [8.2, 8.55], [9.6, 10.5]], [[7.95, 0.011, 7.5]], {
  z0: 1.03, z1: 1.09, exposure: 1.32, sat: 1.05, maxBlur: 0.013,
  overlay(lt, t, w) {
    overlay('ill1', '<div class="tag">ILLUSTRATION</div>', 'right:84px;top:118px', win(t, 6.5, 10.7, 0.4) * w);
    overlay('brk', '<div class="lab" style="font-size:20px;text-align:center">ब्रेक = बस रुकी, <span class="amber">आप नहीं</span></div>', 'left:0;width:540px;top:170px;white-space:normal', win(t, 8.2, 10.5, 0.45) * w * (QUIET ? 0 : 1));
  },
});
// INERTIA 10.9–16.1: the ground stops at 12.3 s; loose objects keep moving east (right)
photoShot('inertia', 10.9, 16.1, ['I1', 'I2', 'I3'], [[12.3, 12.6], [12.6, 13.5]], [[12.3, 0.013, 6.0]], {
  z0: 1.03, z1: 1.10, panx: 0.012, exposure: 1.25, sat: 1.05, maxBlur: 0.012,
  overlay(lt, t, w) {
    overlay('ill2', '<div class="tag">ILLUSTRATION</div>', 'right:84px;top:118px', win(t, 11.1, 15.9, 0.4) * w);
    overlay('nj', '<div class="lab" style="font-size:20px;text-align:center">जो जुड़ा नहीं, वो <span class="amber">चलता रहेगा</span> →</div>', 'left:0;width:540px;top:170px;white-space:normal', win(t, 13.2, 15.9, 0.5) * w * (QUIET ? 0 : 1));
  },
});
// SEA 30.4–32.5: swell, then surge
photoShot('sea', 30.4, 32.5, ['S1', 'S2', 'S3'], [[30.65, 31.3], [31.3, 31.9]], [[31.5, 0.004, 4.0]], {
  z0: 1.03, z1: 1.09, exposure: 1.15, sat: 1.05, maxBlur: 0.004,
  overlay(lt, t, w) { overlay('ill3', '<div class="tag">ILLUSTRATION</div>', 'right:84px;top:118px', win(t, 30.6, 32.3, 0.3) * w); },
});
