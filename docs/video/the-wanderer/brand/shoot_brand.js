const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  let p = await b.newPage({ viewport: { width: 2560, height: 1440 } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + __dirname + '/banner.html'); await p.evaluate(() => window.__done); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  await p.locator('#w').screenshot({ path: __dirname + '/The-Wanderer_banner_2560x1440.png' });
  p = await b.newPage({ viewport: { width: 800, height: 800 } }); await p.goto('file://' + __dirname + '/avatar.html'); await p.waitForTimeout(300);
  await p.locator('#a').screenshot({ path: __dirname + '/The-Wanderer_avatar_800x800.png' }); await b.close(); })();
