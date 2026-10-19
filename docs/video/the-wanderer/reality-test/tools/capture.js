// Frame-exact capture of a film page into an H.264 segment.
// usage: node capture.js <siteDir> <startSec> <endSec> <fps> <out.mp4> [webgl]
// Time is virtual: performance.now, Date.now, rAF, timers and CSS transitions all advance only when we step a frame.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');

const [siteDir, startS, endS, fpsS, out, webgl, subsFile] = process.argv.slice(2);
const SUBS = subsFile ? fs.readFileSync(subsFile, 'utf8') : 'null';
const start = +startS, end = +endS, fps = +fpsS, frames = Math.round((end - start) * fps);
const WARM = Math.min(1.0, start);               // run this long before recording so transitions are settled

const CLOCK = `(() => {
  let now = 0, tid = 1; const raf = [], timers = [], seen = new WeakMap(), D0 = Date.now();
  performance.now = () => now; Date.now = () => D0 + now;
  window.requestAnimationFrame = cb => { raf.push(cb); return raf.length; };
  window.cancelAnimationFrame = () => {};
  window.setTimeout = (fn, ms = 0, ...a) => { const id = tid++; timers.push({ id, t: now + (+ms || 0), fn: () => fn(...a) }); return id; };
  window.clearTimeout = id => { for (let i = timers.length - 1; i >= 0; i--) if (timers[i].id === id) timers.splice(i, 1); };
  window.setInterval = (fn, ms) => { const id = tid++; const rep = () => { fn(); timers.push({ id, t: now + ms, fn: rep }); }; timers.push({ id, t: now + ms, fn: rep }); return id; };
  window.clearInterval = window.clearTimeout;
  window.__render = true; window.__startAt = ${start - WARM}; window.__subs = ${SUBS};
  const mark = () => document.documentElement && document.documentElement.classList.add('render');
  if (document.documentElement) mark(); else document.addEventListener('readystatechange', mark, { once: true });
  window.__advance = ms => {
    now += ms;
    for (;;) { timers.sort((a, b) => a.t - b.t); if (!timers.length || timers[0].t > now) break; timers.shift().fn(); }
    const list = raf.splice(0); for (const cb of list) cb(now);
    for (const a of document.getAnimations()) { if (!seen.has(a)) { seen.set(a, now); a.pause(); } a.currentTime = now - seen.get(a); }
  };
})();`;

(async () => {
  const args = webgl === 'webgl' ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [];
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args, proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const page = await browser.newPage({ viewport: { width: +(process.env.CAP_W || 540), height: +(process.env.CAP_H || 960) }, deviceScaleFactor: +(process.env.CAP_DPR || 2) });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route('https://film.test/**', r => {
    const f = path.join(siteDir, decodeURIComponent(new URL(r.request().url()).pathname));
    const type = f.endsWith('.jpg') ? 'image/jpeg' : f.endsWith('.png') ? 'image/png' : f.endsWith('.mp3') ? 'audio/mpeg' : f.endsWith('.js') ? 'application/javascript' : f.endsWith('.json') ? 'application/json' : 'text/html';
    r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: type });
  });
  await page.addInitScript(CLOCK);
  await page.goto('https://film.test/index.html', { waitUntil: 'load' });
  await page.evaluate(() => document.documentElement.classList.add('render'));
  await page.evaluate(() => document.fonts.ready.then(() => Promise.all([...document.images].map(i => i.decode().catch(() => {})))));
  await page.evaluate(() => window.__ready || null);   // pages may expose a promise for async assets
  await page.waitForTimeout(1500);                  // real time: let fonts and textures settle

  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-vf', `scale=${process.env.OUT_W || 1080}:${process.env.OUT_H || 1920}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  await page.evaluate(() => window.__advance(0));
  for (let k = 0; k < Math.round(WARM * fps); k++) await page.evaluate(ms => window.__advance(ms), 1000 / fps);
  for (let i = 0; i < frames; i++) {
    if (i) await page.evaluate(ms => window.__advance(ms), 1000 / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 97, timeout: 900000 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) process.stderr.write(`[${path.basename(out)}] ${i}/${frames} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  if (errs.length) process.stderr.write('page errors: ' + errs.slice(0, 3).join(' | ') + '\n');
  await browser.close();
  process.stderr.write(`[${path.basename(out)}] done in ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
})();
