// Kompozitör: zaman çizelgesini yükler, her kare için etkin sahneleri çizer ve geçişleri harmanlar.
let TL = null, CTX = null, CAMKF = [];
const SL = { a: null, b: null };

async function setup() {
  const cv = document.getElementById('c');
  CTX = cv.getContext('2d');
  TL = await (await fetch('../assets/timeline.json')).json();
  const fonts = ['500 40px Cormorant', '600 40px Cormorant', '700 40px Cormorant', 'italic 500 40px Cormorant', 'italic 600 40px Cormorant',
    '400 40px Cinzel', '600 40px Cinzel', '700 40px Cinzel', '400 40px Amiri', '700 40px Amiri', '700 40px Ruqaa', '400 40px Ruqaa',
    '600 40px Kufi', '500 40px Inter', '600 40px Inter'];
  await Promise.all(fonts.map(f => document.fonts.load(f, 'AaĞğŞşİıÇçÖöÜü بسم')));
  await loadMap();
  LAYER.a = makeCanvas(); LAYER.m = makeCanvas(); SHINE_LAYER = makeCanvas();
  SL.a = makeCanvas(); SL.b = makeCanvas();
  setupArt();
  prepArt();
  // Sahneleri hazırla, kamera anahtar karelerini birleştir
  for (const S of TL.scenes) {
    S.L = i => S.lines[i].start;
    S.E = i => S.lines[i].end;
    S.D = i => S.lines[i].end - S.lines[i].start;
    S.def = SCENES[S.id] || SCENES[S.kind] || null;
    if (S.def && S.def.cams) CAMKF.push(...S.def.cams(S));
  }
  CAMKF.sort((a, b) => a[0] - b[0]);
  CAMKF = CAMKF.filter((k, i) => i === CAMKF.length - 1 || CAMKF[i + 1][0] - k[0] > 0.05);
  for (const S of TL.scenes) if (S.def && S.def.prep) S.def.prep(S);
  return { duration: TL.duration, fps: TL.fps, frames: Math.ceil(TL.duration * TL.fps) };
}

function camAt(t) { return camPath(CAMKF, t); }

function drawScene(ctx, S, t) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (S.def) S.def.draw(ctx, t, S);
  else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); txt(ctx, S.id, W / 2, H / 2, { size: 60 }); }
  ctx.restore();
}

function renderAt(t) {
  const ctx = CTX;
  const scs = TL.scenes;
  const act = [];
  for (let i = 0; i < scs.length; i++) {
    const S = scs[i], N = scs[i + 1];
    const xin = (S.def && S.def.xin != null) ? S.def.xin : 1.0;
    const xout = N ? ((N.def && N.def.xin != null) ? N.def.xin : 1.0) : 0;
    if (t >= S.start - xin / 2 && t < S.end + xout / 2) act.push({ S, w: i === 0 ? 1 : smooth(S.start - xin / 2, S.start + xin / 2, t) });
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (act.length === 1) drawScene(ctx, act[0].S, t);
  else {
    act.forEach((a, k) => {
      const L = k === 0 ? SL.a : SL.b;
      const lc = L.getContext('2d');
      lc.setTransform(1, 0, 0, 1, 0, 0);
      lc.clearRect(0, 0, W, H);
      drawScene(lc, a.S, t);
      ctx.globalAlpha = k === 0 ? 1 : a.w;
      ctx.drawImage(L, 0, 0);
    });
    ctx.globalAlpha = 1;
  }
  // genel kenar karartma ve başlangıç/bitiş kararması
  vignette(ctx, 0.35, 0.55);
  const fb = 1 - smooth(0, 1.2, t) + smooth(TL.duration - 2.0, TL.duration, t);
  if (fb > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(fb)})`; ctx.fillRect(0, 0, W, H); }
}

window.setup = setup;
window.renderFrame = f => renderAt(f / TL.fps);
window.renderTime = t => renderAt(t);
