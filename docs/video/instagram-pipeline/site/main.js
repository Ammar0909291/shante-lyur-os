'use strict';
function loop() {
  requestAnimationFrame(loop);
  if (!window.__assetsOK) return;
  frame(Math.min((window.__startAt || 0) + performance.now() / 1000, TL.total - 0.001));
}
window.__ready.then(() => { window.__assetsOK = true; });
requestAnimationFrame(loop);
window.__frame = frame;
