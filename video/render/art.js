// İllüstrasyonlar: gökyüzü, çöl, dağlar, Kâbe, Hira, Medine, Arafat, Bağdat planı, desenler, hat efektleri.
const ART = {};

function setupArt() {
  const r = rng(7);
  ART.stars = [];
  for (let i = 0; i < 2600; i++) {
    const y = Math.pow(r(), 1.35) * H * 0.95;
    ART.stars.push({ x: r() * W * 1.3 - W * 0.15, y, s: Math.pow(r(), 6) * 2.6 + 0.35, ph: r() * TAU, sp: 0.6 + r() * 2.2, warm: r() });
  }
  // Samanyolu katmanı (bir kez üretilir)
  const mw = makeCanvas(W * 1.4, H);
  const m = mw.getContext('2d');
  const rr = rng(11);
  m.filter = 'blur(26px)';
  for (let i = 0; i < 420; i++) {
    const t = rr();
    const x = t * mw.width, y = H * 0.75 - t * H * 0.62 + (rr() - 0.5) * 170;
    m.fillStyle = `rgba(${170 + rr() * 60},${160 + rr() * 50},${200 + rr() * 40},${0.035 + rr() * 0.05})`;
    m.beginPath(); m.arc(x, y, 30 + rr() * 90, 0, TAU); m.fill();
  }
  m.filter = 'none';
  for (let i = 0; i < 5000; i++) {
    const t = rr();
    const x = t * mw.width, y = H * 0.75 - t * H * 0.62 + (rr() + rr() + rr() - 1.5) * 120;
    m.fillStyle = `rgba(255,250,240,${rr() * 0.5})`;
    m.fillRect(x, y, 1.1, 1.1);
  }
  m.filter = 'blur(14px)';
  for (let i = 0; i < 90; i++) {
    const t = rr();
    const x = t * mw.width, y = H * 0.75 - t * H * 0.62 + (rr() - 0.5) * 50;
    m.fillStyle = `rgba(20,14,30,${0.25 + rr() * 0.3})`;
    m.beginPath(); m.ellipse(x, y, 40 + rr() * 80, 8 + rr() * 14, -0.55, 0, TAU); m.fill();
  }
  m.filter = 'none';
  ART.milky = mw;
  // Kâğıt/parşömen dokusu
  const pc = makeCanvas(1024, 1024);
  const p = pc.getContext('2d');
  const pr = rng(5);
  p.fillStyle = '#d8c39a'; p.fillRect(0, 0, 1024, 1024);
  p.filter = 'blur(40px)';
  for (let i = 0; i < 120; i++) {
    p.fillStyle = `rgba(${130 + pr() * 50},${100 + pr() * 30},${60 + pr() * 30},${0.02 + pr() * 0.035})`;
    p.beginPath(); p.arc(pr() * 1024, pr() * 1024, 60 + pr() * 160, 0, TAU); p.fill();
  }
  const eg = p.createRadialGradient(512, 512, 300, 512, 512, 760);
  eg.addColorStop(0, 'rgba(90,60,25,0)'); eg.addColorStop(1, 'rgba(90,60,25,0.35)');
  p.filter = 'none'; p.fillStyle = eg; p.fillRect(0, 0, 1024, 1024);
  p.filter = 'none';
  for (let i = 0; i < 9000; i++) {
    p.fillStyle = `rgba(80,55,25,${pr() * 0.08})`;
    p.fillRect(pr() * 1024, pr() * 1024, 1 + pr() * 2, 1 + pr() * 2);
  }
  ART.paper = pc;
}

// Gece gökyüzü: degrade + yıldızlar + samanyolu
function nightSky(ctx, t, o = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const top = o.top || '#04060f', mid = o.mid || '#0b1330', hor = o.hor || '#2a2440';
  g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, hor);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const drift = (o.drift == null ? 4 : o.drift) * (t - (o.t0 || 0));
  if (o.milky !== false) {
    ctx.save(); ctx.globalAlpha = o.milkyAlpha || 0.85;
    ctx.drawImage(ART.milky, -W * 0.2 - drift * 0.6, 0);
    ctx.restore();
  }
  const sa = o.starAlpha == null ? 1 : o.starAlpha;
  for (const s of ART.stars) {
    const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
    const x = s.x - drift, y = s.y;
    if (x < -5 || x > W + 5) continue;
    const a = sa * tw * (0.35 + 0.65 * (1 - y / H));
    if (a < 0.03) continue;
    ctx.fillStyle = s.warm > 0.8 ? `rgba(255,226,190,${a})` : s.warm < 0.15 ? `rgba(200,215,255,${a})` : `rgba(255,255,255,${a})`;
    if (s.s > 1.8) {
      ctx.beginPath(); ctx.arc(x, y, s.s * 0.8, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${a * 0.18})`;
      ctx.beginPath(); ctx.arc(x, y, s.s * 2.6, 0, TAU); ctx.fill();
    } else ctx.fillRect(x, y, s.s, s.s);
  }
  // ufuk ışıması
  const hg = ctx.createLinearGradient(0, H * 0.45, 0, H);
  hg.addColorStop(0, 'rgba(0,0,0,0)');
  hg.addColorStop(1, o.glow || 'rgba(120,80,90,0.35)');
  ctx.fillStyle = hg; ctx.fillRect(0, H * 0.45, W, H * 0.55);
}

function crescent(ctx, x, y, r, a = 1, rot = -0.5) {
  ctx.save();
  ctx.globalAlpha *= a;
  const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 5);
  g.addColorStop(0, 'rgba(255,240,200,0.28)'); g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 5, 0, TAU); ctx.fill();
  const c = LAYER.m.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
  c.fillStyle = '#fff4d6';
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.globalCompositeOperation = 'destination-out';
  c.beginPath(); c.arc(x + Math.cos(rot) * r * 0.42, y + Math.sin(rot) * r * 0.42, r * 0.86, 0, TAU); c.fill();
  c.globalCompositeOperation = 'source-over';
  ctx.drawImage(LAYER.m, 0, 0);
  ctx.restore();
}

// Kum tepeleri (parallax katmanlar)
function dunes(ctx, t, o = {}) {
  const layers = o.layers || [
    { y: 0.70, amp: 40, f: 0.0018, c1: '#3a2a2a', c2: '#1d1418', sp: 6, seed: 1 },
    { y: 0.78, amp: 55, f: 0.0013, c1: '#2a1d1c', c2: '#140d0f', sp: 12, seed: 2 },
    { y: 0.88, amp: 60, f: 0.0010, c1: '#1a1112', c2: '#0a0607', sp: 22, seed: 3 },
  ];
  for (const L of layers) {
    const off = t * L.sp + (o.offset || 0) * L.sp;
    const yAt = x => H * L.y - L.amp * (0.6 * Math.sin((x + off) * L.f * TAU + L.seed) + 0.4 * Math.sin((x + off) * L.f * 2.3 * TAU + L.seed * 3)) - fbm1((x + off) * 0.004, L.seed) * L.amp * 0.6;
    ctx.beginPath();
    ctx.moveTo(-10, H);
    for (let x = -10; x <= W + 10; x += 12) ctx.lineTo(x, yAt(x));
    ctx.lineTo(W + 10, H); ctx.closePath();
    const g = ctx.createLinearGradient(0, H * L.y - L.amp * 1.6, 0, H);
    g.addColorStop(0, L.c1); g.addColorStop(1, L.c2);
    ctx.fillStyle = g; ctx.fill();
    if (L.rim) {
      ctx.strokeStyle = L.rim; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = -10; x <= W + 10; x += 12) x === -10 ? ctx.moveTo(x, yAt(x)) : ctx.lineTo(x, yAt(x));
      ctx.stroke();
    }
  }
}

// Kırık dağ silueti (orta nokta kaydırma ile önceden üretilir)
function ridgePath(seed, y0, amp, rough = 0.55, peaks = null) {
  const r = rng(seed);
  const n = 257;
  const ys = new Array(n).fill(0);
  let step = n - 1, scale = 1;
  ys[0] = r() - 0.5; ys[n - 1] = r() - 0.5;
  while (step > 1) {
    const half = step / 2;
    for (let i = half; i < n; i += step) ys[i] = (ys[i - half] + ys[i + half]) / 2 + (r() - 0.5) * scale;
    step = half; scale *= rough;
  }
  const pts = ys.map((v, i) => {
    const x = (i / (n - 1)) * (W + 200) - 100;
    let y = y0 - v * amp;
    if (peaks) for (const pk of peaks) {
      const gk = Math.exp(-Math.pow((x - pk.x) / pk.w, 2));
      y -= pk.h * gk;
      if (pk.jag) y += (fbm1(x * 0.02, seed + 5, 5) - 0.5) * pk.jag * gk;
    }
    return [x, y];
  });
  return pts;
}
function fillRidge(ctx, pts, fill, rim) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], H + 10);
  for (const p of pts) ctx.lineTo(p[0], p[1]);
  ctx.lineTo(pts[pts.length - 1][0], H + 10);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (rim) {
    ctx.strokeStyle = rim; ctx.lineWidth = 1.4;
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
  }
}

// Işık hüzmeleri (merkezden yayılan)
function godRays(ctx, x, y, t, a = 1, o = {}) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const n = o.n || 18, len = o.len || 1400;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU + t * (o.rot || 0.03) + Math.sin(i * 7.3) * 0.1;
    const wdt = (o.width || 0.06) * (0.6 + 0.4 * Math.sin(i * 3.1 + t * 0.7));
    const g = ctx.createRadialGradient(x, y, 0, x, y, len);
    g.addColorStop(0, `rgba(255,226,160,${0.18 * a})`);
    g.addColorStop(1, 'rgba(255,226,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.arc(x, y, len, ang - wdt, ang + wdt); ctx.closePath(); ctx.fill();
  }
  const cg = ctx.createRadialGradient(x, y, 0, x, y, o.core || 160);
  cg.addColorStop(0, `rgba(255,245,215,${0.85 * a})`);
  cg.addColorStop(0.3, `rgba(255,214,140,${0.35 * a})`);
  cg.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(x, y, o.core || 160, 0, TAU); ctx.fill();
  ctx.restore();
}

// Yüzen toz/ışık parçacıkları
function motes(ctx, t, a = 1, o = {}) {
  if (a <= 0) return;
  const r = rng(o.seed || 3);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < (o.n || 70); i++) {
    const x0 = r() * W, y0 = r() * H, sp = 6 + r() * 18, ph = r() * TAU, sz = 0.8 + r() * 2.2;
    const x = (x0 + t * sp * (o.dx || 1) + Math.sin(t * 0.3 + ph) * 20) % (W + 40) - 20;
    const y = (y0 - t * sp * (o.dy || 0.4) + H * 10) % H;
    const tw = 0.5 + 0.5 * Math.sin(t * 1.3 + ph);
    ctx.fillStyle = `rgba(255,220,160,${0.45 * a * tw})`;
    ctx.beginPath(); ctx.arc(x, y, sz, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// --- Kâbe ---
function kaaba(ctx, cx, gy, sc = 1, o = {}) {
  ctx.save();
  ctx.translate(cx, gy);
  ctx.scale(sc, sc);
  const A = [-250, 0], B = [40, 22], C = [40, -330], D = [-250, -318];
  const E = [190, -4], F = [190, -322];
  // zemin ışığı (metaf)
  const lg = ctx.createRadialGradient(-40, 20, 30, -40, 20, 620);
  lg.addColorStop(0, `rgba(255,236,200,${0.55 * (o.light == null ? 1 : o.light)})`);
  lg.addColorStop(0.5, `rgba(220,190,150,${0.18 * (o.light == null ? 1 : o.light)})`);
  lg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lg;
  ctx.beginPath(); ctx.ellipse(-30, 20, 640, 110, 0, 0, TAU); ctx.fill();
  // gölge
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(-20, 22, 300, 30, 0, 0, TAU); ctx.fill();
  const quad = (p, fill) => { ctx.beginPath(); ctx.moveTo(...p[0]); for (let i = 1; i < p.length; i++) ctx.lineTo(...p[i]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
  // ön yüz
  let g = ctx.createLinearGradient(-250, 0, 40, 0);
  g.addColorStop(0, '#0c0c0e'); g.addColorStop(0.6, '#17161a'); g.addColorStop(1, '#0f0f12');
  quad([A, B, C, D], g);
  // yan yüz
  g = ctx.createLinearGradient(40, 0, 190, 0);
  g.addColorStop(0, '#070708'); g.addColorStop(1, '#0d0d10');
  quad([B, E, F, C], g);
  // kumaş kıvrım ışıkları
  ctx.save();
  ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.lineTo(...C); ctx.lineTo(...D); ctx.closePath(); ctx.clip();
  for (let i = 0; i < 9; i++) {
    const x = -240 + i * 33;
    const fg = ctx.createLinearGradient(x, 0, x + 26, 0);
    fg.addColorStop(0, 'rgba(255,255,255,0)'); fg.addColorStop(0.5, 'rgba(255,255,255,0.025)'); fg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = fg; ctx.fillRect(x, -340, 26, 360);
  }
  // alt ışık yansıması
  const bl = ctx.createLinearGradient(0, 0, 0, -160);
  bl.addColorStop(0, `rgba(255,220,170,${0.16 * (o.light == null ? 1 : o.light)})`); bl.addColorStop(1, 'rgba(255,220,170,0)');
  ctx.fillStyle = bl; ctx.fillRect(-260, -170, 320, 200);
  ctx.restore();
  // altın kuşak (hizam)
  const band = (p0, p1, f0, f1, dark) => {
    const y0 = -248, y1 = -212;
    const lerpY = (p, q, y) => { const tt = (y - p[1]) / (q[1] - p[1]); return [lerp(p[0], q[0], tt), y]; };
    const a0 = [p0[0], lerp(p0[1], f0[1], (y0 - 0) / -330)], a1 = [p1[0], lerp(p1[1], f1[1], (y0 - 0) / -330)];
    const b0 = [p0[0], lerp(p0[1], f0[1], (y1 - 0) / -330)], b1 = [p1[0], lerp(p1[1], f1[1], (y1 - 0) / -330)];
    const gg = ctx.createLinearGradient(p0[0], 0, p1[0], 0);
    if (dark) { gg.addColorStop(0, '#8a6a2c'); gg.addColorStop(1, '#5e4519'); }
    else { gg.addColorStop(0, '#b88a3a'); gg.addColorStop(0.5, '#f2d38a'); gg.addColorStop(1, '#a87b30'); }
    quad([a0, a1, b1, b0], gg);
    return [a0, a1, b1, b0];
  };
  const fb = band(A, B, D, C, false);
  band(B, E, C, F, true);
  // kuşak yazısı (ön yüz)
  ctx.save();
  ctx.beginPath(); ctx.moveTo(...fb[0]); ctx.lineTo(...fb[1]); ctx.lineTo(...fb[2]); ctx.lineTo(...fb[3]); ctx.closePath(); ctx.clip();
  ctx.transform(1, (fb[1][1] - fb[0][1]) / (fb[1][0] - fb[0][0]), 0, 1, 0, 0);
  ctx.font = '600 22px Amiri';
  ctx.fillStyle = 'rgba(60,35,8,0.75)';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillText('لَا إِلَٰهَ إِلَّا ٱللَّٰهُ  ۞  ٱللَّٰهُ أَكْبَرُ  ۞  لَا إِلَٰهَ إِلَّا ٱللَّٰهُ', -105, (fb[0][1] + fb[3][1]) / 2 + 30);
  ctx.restore();
  // kapı (ön yüzün sağ tarafında, yerden yüksekte)
  const dx0 = -40, dx1 = 8;
  const yAtX = (x, yb, yt) => [lerp(A[1], B[1], (x - A[0]) / (B[0] - A[0])) + yb, lerp(D[1], C[1], (x - D[0]) / (C[0] - D[0])) + yt];
  const [b0] = yAtX(dx0, -48, 0), [b1] = yAtX(dx1, -48, 0);
  const top0 = b0 - 150, top1 = b1 - 150;
  const dg = ctx.createLinearGradient(dx0, top0, dx1, b1);
  dg.addColorStop(0, '#f7dc96'); dg.addColorStop(0.5, '#c79a45'); dg.addColorStop(1, '#8c6324');
  ctx.beginPath(); ctx.moveTo(dx0, b0); ctx.lineTo(dx1, b1); ctx.lineTo(dx1, top1); ctx.lineTo(dx0, top0); ctx.closePath();
  ctx.fillStyle = dg; ctx.fill();
  ctx.strokeStyle = 'rgba(70,45,10,0.6)'; ctx.lineWidth = 1.2;
  for (let i = 1; i < 6; i++) { const yy = lerp(top0, b0, i / 6); ctx.beginPath(); ctx.moveTo(dx0 + 4, yy); ctx.lineTo(dx1 - 4, yy + 3.5); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo((dx0 + dx1) / 2, top0 + 2); ctx.lineTo((dx0 + dx1) / 2, b0 + 1); ctx.stroke();
  // köşe (Hacerü'l-Esved) gümüş çerçeve
  ctx.fillStyle = '#b9b9b9';
  ctx.beginPath(); ctx.ellipse(B[0], B[1] - 70, 7, 10, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.ellipse(B[0], B[1] - 70, 4, 6, 0, 0, TAU); ctx.fill();
  // mermer kaide (şazervan)
  ctx.fillStyle = '#cfc6b6';
  quad([[A[0] - 6, A[1] + 2], [B[0] + 2, B[1] + 4], [B[0] + 2, B[1] - 8], [A[0] - 6, A[1] - 10]], '#b8ae9c');
  quad([[B[0] + 2, B[1] + 4], [E[0] + 6, E[1] + 2], [E[0] + 6, E[1] - 10], [B[0] + 2, B[1] - 8]], '#8f8676');
  // kenar ışığı
  ctx.strokeStyle = 'rgba(255,230,190,0.18)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(...B); ctx.lineTo(...C); ctx.stroke();
  ctx.restore();
}

// Hurma ağacı (dolgun siluet)
function palm(ctx, x, y, h, lean = 0.1, color = '#0e0a08', t = 0, seed = 1) {
  const r = rng(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color; ctx.fillStyle = color;
  const tx = lean * h, ty = -h;
  // gövde: hafif kavisli, aşağıda kalın
  ctx.beginPath();
  ctx.moveTo(-h * 0.03, 0);
  ctx.quadraticCurveTo(lean * h * 0.2 - h * 0.02, -h * 0.5, tx - h * 0.014, ty);
  ctx.lineTo(tx + h * 0.014, ty);
  ctx.quadraticCurveTo(lean * h * 0.2 + h * 0.02, -h * 0.5, h * 0.03, 0);
  ctx.closePath(); ctx.fill();
  const sway = Math.sin(t * 0.8 + seed) * 0.035;
  const n = 13;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 3.9 + (r() - 0.5) * 0.25 + sway;
    const L = h * (0.30 + r() * 0.14);
    const droop = L * (0.35 + 0.45 * Math.abs(Math.cos(a)));
    const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.55 + droop;
    const mx = tx + Math.cos(a) * L * 0.55, my = ty + Math.sin(a) * L * 0.55 - L * 0.08;
    // orta damar
    ctx.lineWidth = h * 0.010;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    // yaprakçıklar (sık)
    for (let k = 2; k < 22; k++) {
      const f = k / 22;
      const px = (1 - f) * (1 - f) * tx + 2 * (1 - f) * f * mx + f * f * ex;
      const py = (1 - f) * (1 - f) * ty + 2 * (1 - f) * f * my + f * f * ey;
      const tang = Math.atan2(2 * (1 - f) * (my - ty) + 2 * f * (ey - my), 2 * (1 - f) * (mx - tx) + 2 * f * (ex - mx));
      const ll = h * 0.085 * Math.sin(Math.PI * Math.min(1, f * 1.15)) + h * 0.01;
      ctx.lineWidth = h * 0.0075;
      for (const sd of [-1, 1]) {
        const la = tang + sd * 0.9 + 0.35;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(la) * ll, py + Math.sin(la) * ll + ll * 0.35); ctx.stroke();
      }
    }
  }
  ctx.beginPath(); ctx.arc(tx, ty, h * 0.03, 0, TAU); ctx.fill();
  ctx.restore();
}

// Erken dönem Mescid-i Nebevi: kerpiç duvarlar, hurma gövdesi direkler, hurma yaprağı çatı
function earlyMosque(ctx, x, y, sc = 1, light = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(sc, sc);
  // avlu duvarı (arka)
  const wall = (x0, x1, h, c1, c2) => {
    const g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(x0, -h, x1 - x0, h);
  };
  wall(-420, 420, 78, '#8a5d3b', '#5a3a24');
  // revak (sundurma): çatı + direkler
  ctx.fillStyle = '#3d2817';
  ctx.fillRect(-420, -150, 360, 18);
  ctx.fillStyle = '#5e4128';
  for (let i = 0; i < 26; i++) { ctx.fillRect(-420 + i * 14, -156 + (i % 3) * 2, 12, 8); }
  const r = rng(4);
  for (let i = 0; i < 9; i++) {
    const px = -410 + i * 44;
    ctx.fillStyle = '#2b1c10';
    ctx.fillRect(px, -132, 9, 132);
    ctx.fillStyle = 'rgba(255,210,150,0.12)'; ctx.fillRect(px, -132, 3, 132);
  }
  // gölgeli iç
  ctx.fillStyle = 'rgba(15,8,4,0.55)';
  ctx.fillRect(-420, -132, 360, 132);
  // ön duvar (alçak)
  wall(-460, 460, 48, '#b07a4e', '#7c5233');
  ctx.fillStyle = `rgba(255,200,130,${0.22 * light})`;
  ctx.fillRect(-460, -48, 920, 6);
  // kapı açıklığı
  ctx.fillStyle = '#2a1a0e';
  ctx.fillRect(-40, -48, 80, 48);
  // tuğla dokusu
  ctx.strokeStyle = 'rgba(60,35,18,0.35)'; ctx.lineWidth = 1;
  for (let yy = -44; yy < 0; yy += 9) { ctx.beginPath(); ctx.moveTo(-460, yy); ctx.lineTo(-40, yy); ctx.moveTo(40, yy); ctx.lineTo(460, yy); ctx.stroke(); }
  ctx.restore();
}

// --- İslami geometrik desen: 8 köşeli yıldız ızgarası, çizim animasyonlu ---
function patternLayer(ctx, t, p, o = {}) {
  if (p <= 0) return;
  const s = o.cell || 150;
  const cx = o.cx == null ? W / 2 : o.cx, cy = o.cy == null ? H / 2 : o.cy;
  ctx.save();
  ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
  ctx.strokeStyle = o.color || GOLD;
  ctx.lineWidth = o.lw || 1.4;
  const maxD = Math.hypot(W, H) * 0.6;
  const nx = Math.ceil(W / s / 2) + 2, ny = Math.ceil(H / s / 2) + 2;
  for (let i = -nx; i <= nx; i++) for (let j = -ny; j <= ny; j++) {
    const x = cx + i * s, y = cy + j * s;
    const d = Math.hypot(x - cx, y - cy) / maxD;
    const lp = clamp((p * 1.6 - d) / 0.6);
    if (lp <= 0) continue;
    const R = s * 0.5, r2 = s * 0.27;
    ctx.globalAlpha = (o.alpha == null ? 1 : o.alpha) * lp * (o.fadeEdge ? (1 - clamp(d * 1.1)) : 1);
    // iki kare = 8 köşeli yıldız
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      for (let m = 0; m < 4; m++) {
        const a = k * Math.PI / 4 + m * Math.PI / 2 + (o.rot || 0);
        const px = x + Math.cos(a) * R * 0.92 * easeOut(lp), py = y + Math.sin(a) * R * 0.92 * easeOut(lp);
        m ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
    }
    // iç sekizgen
    ctx.beginPath();
    for (let m = 0; m < 8; m++) {
      const a = m * Math.PI / 4 + Math.PI / 8 + (o.rot || 0);
      const px = x + Math.cos(a) * r2 * easeOut(lp), py = y + Math.sin(a) * r2 * easeOut(lp);
      m ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
    // komşu yıldızları bağlayan haçlar
    ctx.beginPath();
    ctx.moveTo(x + s * 0.5, y + s * 0.18); ctx.lineTo(x + s * 0.5, y + s * 0.82);
    ctx.moveTo(x + s * 0.18, y + s * 0.5); ctx.lineTo(x + s * 0.82, y + s * 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

// Arapça hat: ekran dışına çizilip sağdan sola açılan maske ile gösterilir
function calligraphy(ctx, s, x, y, p, o = {}) {
  if (p <= 0) return;
  const L = LAYER.m, c = L.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, H);
  const size = o.size || 140;
  c.font = `${o.weight || 700} ${size}px ${o.font || 'Amiri'}`;
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.direction = 'rtl';
  const w = c.measureText(s).width;
  c.fillStyle = goldGradient(c, x - w / 2, y - size * 0.7, x + w / 2 * 0.2, y + size * 0.7);
  c.shadowColor = 'rgba(255,200,110,0.55)'; c.shadowBlur = o.glow == null ? 30 : o.glow;
  c.fillText(s, x, y + (o.dy || 0));
  c.shadowBlur = 0;
  // sağdan sola yumuşak silme
  c.globalCompositeOperation = 'destination-in';
  const x1 = x + w / 2 + 40, x0 = x - w / 2 - 40;
  const edge = lerp(x1 + 80, x0 - 80, easeInOut(clamp(p)));
  const g = c.createLinearGradient(edge - 80, 0, edge + 80, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
  ctx.drawImage(L, 0, 0);
  ctx.restore();
  return w;
}

// Usturlap çizimi
function astrolabe(ctx, x, y, R, t, p = 1, a = 1) {
  if (a <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= a;
  ctx.strokeStyle = GOLD; ctx.fillStyle = GOLD;
  ctx.lineWidth = 2.4;
  const arc = (r, f) => { ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke(); };
  arc(R, easeOut(clamp(p * 1.4)));
  arc(R * 0.9, easeOut(clamp(p * 1.4 - 0.1)));
  ctx.lineWidth = 1.2;
  const tp = clamp(p * 1.4 - 0.2);
  for (let i = 0; i < 72 * tp; i++) {
    const ang = i / 72 * TAU;
    const l = i % 6 === 0 ? 0.08 : 0.04;
    ctx.beginPath(); ctx.moveTo(Math.cos(ang) * R * 0.9, Math.sin(ang) * R * 0.9); ctx.lineTo(Math.cos(ang) * R * (0.9 - l), Math.sin(ang) * R * (0.9 - l)); ctx.stroke();
  }
  // halka (askı)
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, -R - 26, 18, 0, TAU * clamp(p * 2)); ctx.stroke();
  // tımpan: almukantar çemberleri
  ctx.lineWidth = 1;
  ctx.globalAlpha *= 0.7;
  const ip = clamp(p * 1.4 - 0.4);
  for (let i = 1; i <= 7; i++) {
    const rr = R * 0.12 * i;
    ctx.beginPath(); ctx.arc(0, R * 0.05 * i, rr, 0, TAU * ip); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-R * 0.86, 0); ctx.lineTo(R * 0.86 * (ip * 2 - 1), 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -R * 0.86); ctx.lineTo(0, R * 0.86 * (ip * 2 - 1)); ctx.stroke();
  ctx.globalAlpha /= 0.7;
  // ankebut (dönen ağ)
  ctx.rotate(t * 0.12);
  ctx.lineWidth = 2;
  const rp = clamp(p * 1.4 - 0.6);
  ctx.globalAlpha *= rp;
  ctx.beginPath(); ctx.arc(R * 0.18, 0, R * 0.62, 0, TAU); ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const ang = i / 9 * TAU + 0.3;
    const rr = R * (0.45 + (i % 3) * 0.13);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(ang + 0.3) * rr * 0.6, Math.sin(ang + 0.3) * rr * 0.6, Math.cos(ang) * rr, Math.sin(ang) * rr); ctx.stroke();
    ctx.beginPath(); ctx.arc(Math.cos(ang) * rr, Math.sin(ang) * rr, 4, 0, TAU); ctx.fill();
  }
  ctx.beginPath(); ctx.moveTo(-R * 0.85, 0); ctx.lineTo(R * 0.85, 0); ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
  ctx.restore();
}

// Parşömen (açılan) + Arapça satırlar
function parchment(ctx, x, y, w, h, p, o = {}) {
  if (p <= 0) return;
  const hh = h * easeInOut(clamp(p));
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#d2bb8c';
  ctx.fillRect(-w / 2, -h / 2, w, hh);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.save();
  ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, hh); ctx.clip();
  ctx.globalAlpha = 0.9;
  ctx.drawImage(ART.paper, -w / 2, -h / 2, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(110,70,30,0.6)'; ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2 + 24, -h / 2 + 24, w - 48, h - 48);
  if (o.lines) {
    ctx.fillStyle = 'rgba(55,30,12,0.88)';
    ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.textBaseline = 'middle';
    o.lines.forEach((ln, i) => {
      const ly = -h / 2 + 90 + i * (o.lh || 64);
      const lp = clamp((o.write || 1) * o.lines.length - i);
      if (lp <= 0) return;
      ctx.save();
      ctx.font = `${i === 0 ? 700 : 400} ${i === 0 ? 46 : 36}px Amiri`;
      const lw = ctx.measureText(ln).width;
      ctx.beginPath(); ctx.rect(w / 2 - 60 - (lw + 20) * lp - (w - 120 - lw) / 2, ly - 40, (lw + 20) * lp + (w - 120 - lw) / 2 + 10, 80); ctx.clip();
      ctx.fillText(ln, 0, ly);
      ctx.restore();
    });
  }
  ctx.restore();
  // rulolar
  for (const yy of [-h / 2, -h / 2 + hh]) {
    const g = ctx.createLinearGradient(0, yy - 16, 0, yy + 16);
    g.addColorStop(0, '#7a5426'); g.addColorStop(0.5, '#c9a061'); g.addColorStop(1, '#5c3c18');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(-w / 2 - 26, yy - 15, w + 52, 30, 15); ctx.fill();
  }
  ctx.restore();
}

// Rulo mektup simgesi
function scrollIcon(ctx, x, y, a = 1, sc = 1) {
  if (a <= 0) return;
  ctx.save();
  ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.globalAlpha *= a;
  ctx.fillStyle = '#e8d3a2';
  ctx.fillRect(-14, -10, 28, 20);
  ctx.fillStyle = '#b78f4c';
  ctx.beginPath(); ctx.ellipse(-14, 0, 5, 11, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(14, 0, 5, 11, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#9e2b22';
  ctx.beginPath(); ctx.arc(0, 4, 5, 0, TAU); ctx.fill();
  ctx.restore();
}

// Kitap/elyazması simgesi
function manuscript(ctx, x, y, w, h, rot, a, seed = 1, script = 'ar') {
  if (a <= 0) return;
  const r = rng(seed);
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.globalAlpha *= a;
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 24;
  ctx.fillStyle = '#e2cc9c';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowBlur = 0;
  ctx.globalAlpha *= 0.85;
  ctx.drawImage(ART.paper, -w / 2, -h / 2, w, h);
  ctx.fillStyle = 'rgba(60,35,15,0.8)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const samples = { ar: 'وَٱلْعِلْمُ نُورٌ', gr: 'ΦΙΛΟΣΟΦΙΑ', in: 'गणित', fa: 'دانش', num: '٠١٢٣٤٥٦٧٨٩' };
  ctx.font = script === 'gr' ? '600 22px Cormorant' : '400 26px Amiri';
  for (let i = 0; i < 6; i++) {
    const ly = -h / 2 + 40 + i * (h - 60) / 6;
    if (i === 0) ctx.fillText(samples[script] || samples.ar, 0, ly);
    else { ctx.fillRect(-w / 2 + 26, ly, (w - 52) * (0.6 + r() * 0.4), 2.2); }
  }
  ctx.restore();
}

// Bağdat yuvarlak şehir planı (yukarıdan, altın çizgilerle), p: 0..1 çizim ilerlemesi
function roundCity(ctx, cx, cy, R, p, t, o = {}) {
  if (p <= 0) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = GOLD; ctx.fillStyle = GOLD;
  const seg = (a, b) => clamp((p - a) / (b - a));
  // Dicle nehri
  const rp = seg(0, 0.25);
  if (rp > 0) {
    const pts = [];
    for (let i = 0; i <= 60; i++) { const f = i / 60; pts.push([R * 1.35 + Math.sin(f * 5) * 60 - 40, -H * 0.62 + f * H * 1.24]); }
    ctx.lineWidth = 34; ctx.strokeStyle = 'rgba(80,150,190,0.55)'; ctx.lineCap = 'round';
    partialPolyline(ctx, pts, rp); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(170,220,240,0.6)';
    partialPolyline(ctx, pts, rp); ctx.stroke();
  }
  ctx.strokeStyle = GOLD;
  const ring = (r, a, b, lw) => { const q = seg(a, b); if (q <= 0) return; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + TAU * easeInOut(q)); ctx.stroke(); };
  // hendek
  const mq = seg(0.05, 0.3);
  if (mq > 0) { ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(80,150,190,0.45)'; ctx.beginPath(); ctx.arc(0, 0, R * 1.08, -Math.PI / 2, -Math.PI / 2 + TAU * easeInOut(mq)); ctx.stroke(); ctx.strokeStyle = GOLD; }
  ring(R, 0.1, 0.35, 5);
  ring(R * 0.95, 0.15, 0.4, 2.5);
  ring(R * 0.62, 0.25, 0.5, 3.5);
  ring(R * 0.58, 0.28, 0.52, 1.5);
  // dört kapı ve yollar (KD: Horasan, GD: Basra, GB: Kûfe, KB: Şam)
  const gq = seg(0.4, 0.62);
  const gates = [[-Math.PI / 4, 'Horasan Kapısı'], [Math.PI / 4, 'Basra Kapısı'], [3 * Math.PI / 4, 'Kûfe Kapısı'], [-3 * Math.PI / 4, 'Şam Kapısı']];
  for (const [ang, name] of gates) {
    if (gq <= 0) break;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ca * R * 0.62, sa * R * 0.62); ctx.lineTo(ca * lerp(R * 0.62, R * 1.6, easeOut(gq)), sa * lerp(R * 0.62, R * 1.6, easeOut(gq))); ctx.stroke();
    ctx.save(); ctx.translate(ca * R, sa * R); ctx.rotate(ang);
    ctx.fillStyle = '#1a1206'; ctx.fillRect(-14, -18, 28, 36); ctx.strokeRect(-14, -18, 28, 36);
    ctx.restore();
    const lx = ca * R * 1.32, ly = sa * R * 1.32;
    txt(ctx, name, lx + (ca > 0 ? 20 : -20), ly + (sa > 0 ? 40 : -40), { size: 28, weight: 600, align: ca > 0 ? 'left' : 'right', color: CREAM, alpha: gq * (o.labels == null ? 1 : o.labels), stroke: 4, strokeColor: 'rgba(0,0,0,0.6)' });
  }
  // mahalle sokakları (radyal)
  const sq = seg(0.5, 0.78);
  ctx.lineWidth = 1;
  ctx.globalAlpha *= 0.65;
  for (let i = 0; i < 48 * sq; i++) {
    const ang = i / 48 * TAU;
    if (gates.some(g => Math.abs(((ang - g[0] + TAU * 2) % TAU)) < 0.09 || Math.abs(((g[0] - ang + TAU * 2) % TAU)) < 0.09)) continue;
    ctx.beginPath(); ctx.moveTo(Math.cos(ang) * R * 0.64, Math.sin(ang) * R * 0.64); ctx.lineTo(Math.cos(ang) * R * 0.93, Math.sin(ang) * R * 0.93); ctx.stroke();
  }
  ctx.globalAlpha /= 0.65;
  // merkez: cami (kare) ve saray (yeşil kubbe)
  const cq = seg(0.65, 0.9);
  if (cq > 0) {
    ctx.globalAlpha *= cq;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-R * 0.22, -R * 0.12 - R * 0.2, R * 0.2, R * 0.2);
    const g = ctx.createRadialGradient(R * 0.06, 0, 2, R * 0.06, 0, R * 0.14);
    g.addColorStop(0, '#7fd3a0'); g.addColorStop(1, '#1f6e4a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(R * 0.06, 0, R * 0.12, 0, TAU); ctx.fill();
    ctx.stroke();
    ctx.globalAlpha /= cq;
  }
  ctx.restore();
}
