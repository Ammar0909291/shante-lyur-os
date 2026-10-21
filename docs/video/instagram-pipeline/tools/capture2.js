// Frame-exact capture. usage: node capture2.js <siteDir> <startSec> <endSec> <fps> <out.mp4|out.png>
// Virtual clock: performance.now, rAF, timers advance only when a frame is stepped.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const [siteDir, startS, endS, fpsS, out] = process.argv.slice(2);
const start = +startS, end = +endS, fps = +fpsS, still = out.endsWith('.png');
const frames = still ? 1 : Math.round((end - start) * fps);
const CLOCK = `(() => {
  let now = 0, tid = 1; const raf = [], timers = [], D0 = Date.now();
  performance.now = () => now; Date.now = () => D0 + now;
  window.requestAnimationFrame = cb => { raf.push(cb); return raf.length; };
  window.cancelAnimationFrame = () => {};
  window.setTimeout = (fn, ms = 0, ...a) => { const id = tid++; timers.push({ id, t: now + (+ms || 0), fn: () => fn(...a) }); return id; };
  window.clearTimeout = id => { for (let i = timers.length - 1; i >= 0; i--) if (timers[i].id === id) timers.splice(i, 1); };
  window.__render = true; window.__startAt = ${start};
  window.__advance = ms => { now += ms; for (;;) { timers.sort((a, b) => a.t - b.t); if (!timers.length || timers[0].t > now) break; timers.shift().fn(); } const list = raf.splice(0); for (const cb of list) cb(now); };
})();`;
const MIME = { '.js': 'application/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.ttf': 'font/ttf', '.html': 'text/html' };
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route('https://film.test/**', r => {
    const f = path.join(siteDir, decodeURIComponent(new URL(r.request().url()).pathname));
    if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: 'nf' });
    r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' });
  });
  await page.addInitScript(CLOCK);
  await page.goto('https://film.test/index.html', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__ready || null);
  await page.waitForTimeout(1200);
  let ff = null;
  if (!still) ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', process.env.PRESET || 'slow', '-crf', process.env.CRF || '15', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  await page.evaluate(() => window.__advance(0)); await page.evaluate(() => window.__advance(1));
  for (let i = 0; i < frames; i++) {
    if (i) await page.evaluate(ms => window.__advance(ms), 1000 / fps);
    if (still) { await page.screenshot({ type: 'png', path: out, timeout: 600000 }); break; }
    const buf = await page.screenshot({ type: 'jpeg', quality: 97, timeout: 900000 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 120 === 0) process.stderr.write(`[${path.basename(out)}] ${i}/${frames} ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
  }
  if (ff) { ff.stdin.end(); await new Promise(r => ff.on('close', r)); }
  if (errs.length) process.stderr.write('page errors: ' + [...new Set(errs)].slice(0, 5).join(' | ') + '\n');
  await browser.close();
  process.stderr.write(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
})();
