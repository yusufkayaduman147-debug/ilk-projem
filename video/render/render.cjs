// Kare üretici: Chromium'da sahneyi çizer, ekran görüntülerini ffmpeg'e aktarır.
// Kullanım:
//   node render.cjs --times 10,20.5 --png outdir         (önizleme kareleri)
//   node render.cjs --from 0 --to 900 --out seg.mkv        (kare aralığı -> video)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');

(async () => {

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const URL = args.url || 'http://127.0.0.1:8765/render/index.html';

const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--font-render-hinting=none', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error' || args.verbose) console.log('[page]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(URL);
const info = await page.evaluate(() => window.setup());
const cdp = await page.context().newCDPSession(page);
const shot = async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true })).data, 'base64');

if (args.times) {
  fs.mkdirSync(args.png, { recursive: true });
  for (const ts of String(args.times).split(',')) {
    const t = parseFloat(ts);
    const t0 = Date.now();
    await page.evaluate(t => window.renderTime(t), t);
    fs.writeFileSync(`${args.png}/t${t.toFixed(2).padStart(7, '0')}.png`, await shot());
    console.log('frame', t, Date.now() - t0, 'ms');
  }
} else {
  const from = parseInt(args.from || 0), to = Math.min(parseInt(args.to || info.frames), info.frames);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(info.fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '10', '-pix_fmt', 'yuv444p', args.out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    await page.evaluate(f => window.renderFrame(f), f);
    const buf = await shot();
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - from) % 150 === 0) console.log(`${args.out}: ${f - from}/${to - from} (${((Date.now() - t0) / Math.max(1, f - from + 1)).toFixed(0)} ms/kare)`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('done', args.out, ((Date.now() - t0) / 1000).toFixed(1), 's');
}
await browser.close();
})();
