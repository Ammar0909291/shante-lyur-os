const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--allow-file-access-from-files'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); await p.goto('file://' + __dirname + '/ov.html'); await p.waitForFunction(() => window.draw && document.fonts.ready); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  fs.mkdirSync(__dirname + '/ov', { recursive: true }); const N = 60 * 24;
  for (let i = 0; i < N; i++) { await p.evaluate(t => draw(t), i / 24); await p.screenshot({ path: path.join(__dirname, 'ov', `f${String(i).padStart(4, '0')}.png`), omitBackground: true }); }
  await b.close(); })();
