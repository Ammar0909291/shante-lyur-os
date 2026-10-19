const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + __dirname + '/sub.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  for (const [mode, T] of [['card', 4.5], ['end', 4.6]]) {
    fs.mkdirSync(__dirname + '/' + mode, { recursive: true });
    const n = Math.round(T * 24);
    for (let i = 0; i < n; i++) { await p.evaluate(([m, t]) => draw(m, t), [mode, i / 24]); await p.screenshot({ path: `${__dirname}/${mode}/f${String(i).padStart(4, '0')}.png`, omitBackground: mode === 'card' }); }
  }
  await b.close();
})();
