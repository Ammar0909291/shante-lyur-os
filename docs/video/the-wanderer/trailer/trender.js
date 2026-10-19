// node render.js -> music.wav (stereo 48 kHz, score + sfx with ducking)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const TL = JSON.parse(fs.readFileSync(path.join(__dirname, 'tl.json'), 'utf8'));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => console.log(m.text()));
  await p.setContent('<html><body></body></html>'); await p.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'tscore.js'), 'utf8') });
  const n = await p.evaluate(async (TL) => { const buf = await renderScore(TL); window.L = buf.getChannelData(0); window.R = buf.getChannelData(1); return buf.length; }, TL);
  const SR = 48000, CH = SR * 20, out = fs.openSync(path.join(__dirname, 'music.wav'), 'w');
  const hdr = Buffer.alloc(44); const dataLen = n * 4;
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + dataLen, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(dataLen, 40);
  fs.writeSync(out, hdr);
  for (let a = 0; a < n; a += CH) {
    const b64 = await p.evaluate(([a, CH]) => { const n = Math.min(CH, L.length - a), o = new Int16Array(n * 2); for (let i = 0; i < n; i++) { o[2 * i] = Math.max(-1, Math.min(1, L[a + i])) * 32767; o[2 * i + 1] = Math.max(-1, Math.min(1, R[a + i])) * 32767; }
      let s = ''; const u = new Uint8Array(o.buffer); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }, [a, CH]);
    fs.writeSync(out, Buffer.from(b64, 'base64'));
  }
  fs.closeSync(out); await b.close(); console.log('wrote music.wav', (n / SR).toFixed(1), 's');
})();
