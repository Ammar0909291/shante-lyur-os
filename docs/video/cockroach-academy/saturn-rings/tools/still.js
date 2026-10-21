// Render single frames for review: node tools/still.js <siteDir> <outDir> <t1> [t2 ...]   (env SUBS=n overrides motion-blur sub-frames)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const [siteDir, outDir, ...ts] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => console.error('pageerror', e.message)); p.on('console', m => m.type() === 'error' && console.error('console', m.text()));
  await p.route('https://film.test/**', r => { const f = path.join(siteDir, new URL(r.request().url()).pathname); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: f.endsWith('.js') ? 'application/javascript' : 'text/html' }); });
  if (process.env.SUBS) await p.addInitScript(`window.__subs = ${+process.env.SUBS};`);
  await p.goto('https://film.test/index.html', { waitUntil: 'load' });
  await p.evaluate(() => window.__ready); await p.waitForTimeout(1500); await p.evaluate(() => { window.__assetsOK = false; });
  fs.mkdirSync(outDir, { recursive: true });
  for (const t of ts) { const t0 = Date.now(); await p.evaluate(t => window.__frame(t), +t); await p.screenshot({ path: path.join(outDir, `t${(+t).toFixed(1)}.png`) }); console.log(`t=${t} ${Date.now() - t0} ms`); }
  await b.close();
})();
