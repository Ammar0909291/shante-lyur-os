const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const p = await b.newPage({ viewport: { width: 1280, height: 2300 } }); await p.goto('file://' + __dirname + '/t.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  for (const id of ['A', 'B', 'C']) await p.locator('#' + id).screenshot({ path: `${__dirname}/The-Wanderer_Hindi_thumb_${id}.png` }); await b.close(); })();
