// Sahne tanımları. Her sahne: draw(ctx, t, S), isteğe bağlı cams(S) (harita kamerası anahtar kareleri), xin (geçiş süresi).
// S.L(i)/S.E(i): i. cümlenin başlangıç/bitiş zamanı (mutlak saniye).

// ---------- ortak yardımcılar ----------
function mapBase(ctx, t, o = {}) {
  const c = camAt(t);
  drawBase(ctx, c, o);
  return c;
}

function quoteCard(ctx, t, t0, t1, text, attrib, o = {}) {
  const a = fade(t, t0, t1, 0.9, 0.9);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  if (o.backdrop !== false) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.7);
    g.addColorStop(0, 'rgba(6,5,4,0.72)'); g.addColorStop(1, 'rgba(6,5,4,0.45)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const size = o.size || 62;
  const lines = wrap(ctx, text, o.maxW || 1350, { size, italic: true, weight: 500 });
  const lh = size * 1.28;
  const y0 = (o.y || H / 2 - 30) - (lines.length - 1) * lh / 2;
  txt(ctx, '“', W / 2, y0 - lh * 0.95, { size: 170, font: 'Cormorant', weight: 600, color: GOLD, alpha: 0.55 });
  const dur = o.revealDur || 1.6;
  lines.forEach((ln, i) => {
    const lp = easeOut(prog(t, t0 + 0.2 + i * dur / lines.length, t0 + 1.2 + i * dur / lines.length));
    txt(ctx, ln, W / 2, y0 + i * lh + (1 - lp) * 18, { size, italic: true, weight: 500, color: CREAM, alpha: lp, shadow: 18 });
  });
  const yb = y0 + (lines.length - 1) * lh + size * 1.0;
  divider(ctx, W / 2, yb, 360, prog(t, t0 + 1.0, t0 + 2.2), 1);
  if (attrib) txt(ctx, attrib, W / 2, yb + 46, { size: 32, weight: 600, color: '#e3c88c', alpha: prog(t, t0 + 1.4, t0 + 2.4), spacing: 2 });
  ctx.restore();
}

function centerTitle(ctx, t, t0, t1, title, sub, o = {}) {
  const a = fade(t, t0, t1, 0.8, 0.8);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  const y = o.y || H / 2;
  if (o.backdrop) {
    const g = ctx.createLinearGradient(0, y - 200, 0, y + 200);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(4,3,2,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, y - 200, W, 400);
  }
  if (o.arabic) calligraphy(ctx, o.arabic, W / 2, y - (o.size || 96) * 1.55, prog(t, t0, t0 + 1.6), { size: o.arSize || 92, glow: 22 });
  const sp = easeOut(prog(t, t0 + 0.2, t0 + 1.2));
  txt(ctx, title, W / 2, y + (1 - sp) * 20, { font: 'Cinzel', size: o.size || 96, weight: 700, gold: true, spacing: o.spacing == null ? 10 : o.spacing, alpha: sp, shadow: 20 });
  divider(ctx, W / 2, y + (o.size || 96) * 0.75, 520, prog(t, t0 + 0.6, t0 + 1.8), 1);
  if (sub) txt(ctx, sub, W / 2, y + (o.size || 96) * 0.75 + 52, { size: o.subSize || 40, italic: true, weight: 500, color: CREAM, alpha: prog(t, t0 + 0.9, t0 + 1.9), shadow: 12 });
  ctx.restore();
}

// İsim madalyonu (hat + rozet)
function medallion(ctx, x, y, R, ar, a = 1, o = {}) {
  if (a <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= a;
  const sc = 0.85 + 0.15 * easeOutBack(clamp(a));
  ctx.scale(sc, sc);
  const g = ctx.createRadialGradient(0, -R * 0.2, R * 0.1, 0, 0, R);
  g.addColorStop(0, o.inner || '#1f3a34'); g.addColorStop(1, o.outer || '#0b1716');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.9, 0, TAU); ctx.stroke();
  // dış süs halkası
  for (let i = 0; i < 16; i++) {
    const ang = i / 16 * TAU;
    star8(ctx, Math.cos(ang) * R * 1.12, Math.sin(ang) * R * 1.12, R * 0.07, GOLD, i % 2 === 0, 1);
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha *= a;
  txt(ctx, ar, x, y + (o.dy == null ? R * 0.06 : o.dy), { font: o.font || 'Amiri', size: o.size || R * 0.62, weight: 700, gold: true, glow: 10, dir: 'rtl' });
  ctx.restore();
}

function infoBox(ctx, x, y, w, h, a, title, lines, o = {}) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(8,7,5,0.66)';
  ctx.strokeStyle = rgba(GOLD, 0.7); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill(); ctx.stroke();
  if (title) txt(ctx, title, x + 30, y + 42, { font: 'Cinzel', size: 30, weight: 700, align: 'left', gold: true, spacing: 3 });
  (lines || []).forEach((ln, i) => {
    const la = o.lineAlpha ? o.lineAlpha(i) : 1;
    if (la <= 0) return;
    star8(ctx, x + 38, y + 100 + i * 52, 7 * la, GOLD, true, 1);
    txt(ctx, ln, x + 62, y + 100 + i * 52, { size: 36, weight: 600, align: 'left', color: CREAM, alpha: la });
  });
  ctx.restore();
}

// Basit evler (Mekke silueti)
function houses(ctx, x0, x1, y, seed, color, light = 0) {
  const r = rng(seed);
  let x = x0;
  while (x < x1) {
    const w = 26 + r() * 50, h = 22 + r() * 46;
    ctx.fillStyle = color;
    ctx.fillRect(x, y - h, w, h + 2);
    if (light > 0 && r() > 0.5) {
      ctx.fillStyle = `rgba(255,190,110,${light * (0.4 + r() * 0.6)})`;
      ctx.fillRect(x + w * 0.3, y - h * 0.6, 5, 7);
    }
    x += w - 4 + r() * 10;
  }
}

// Kitaplık rafları (Beytü'l-Hikme)
function bookshelves(ctx, t) {
  const r = rng(77);
  for (const side of [0, 1]) {
    const x0 = side ? W - 330 : 0, x1 = side ? W : 330;
    for (let row = 0; row < 6; row++) {
      const yb = 210 + row * 150;
      ctx.fillStyle = '#20150b'; ctx.fillRect(x0, yb, x1 - x0, 14);
      let x = x0 + 8;
      while (x < x1 - 20) {
        const bw = 14 + r() * 22, bh = 70 + r() * 55;
        const hue = [[90, 40, 25], [60, 45, 30], [110, 70, 35], [50, 60, 55], [120, 30, 30]][Math.floor(r() * 5)];
        ctx.fillStyle = `rgba(${hue[0]},${hue[1]},${hue[2]},0.85)`;
        ctx.fillRect(x, yb - bh, bw - 3, bh);
        ctx.fillStyle = 'rgba(230,190,110,0.35)'; ctx.fillRect(x + 2, yb - bh + 12, bw - 7, 2); ctx.fillRect(x + 2, yb - 16, bw - 7, 2);
        x += bw;
      }
    }
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(side ? 1 : 0, 'rgba(5,3,2,0.2)'); g.addColorStop(side ? 0 : 1, 'rgba(5,3,2,0.85)');
    ctx.fillStyle = g; ctx.fillRect(x0, 0, x1 - x0, H);
  }
}

const SCENES = {};

// ---------- 0. Besmele ----------
SCENES.bismillah = {
  xin: 1.2,
  draw(ctx, t, S) {
    const T = t - S.start, D = S.end - S.start;
    ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.6);
    g.addColorStop(0, 'rgba(60,45,20,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    patternLayer(ctx, T, prog(T, 0.2, 5.5), { alpha: 0.10, cell: 170, fadeEdge: true });
    calligraphy(ctx, 'بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', W / 2, H / 2 - 30, prog(T, 0.8, 4.0), { size: 128, glow: 34, alpha: 1 - smooth(D - 1.4, D - 0.2, T) });
    txt(ctx, "Rahmân ve Rahîm olan Allah'ın adıyla", W / 2, H / 2 + 110, { size: 38, italic: true, weight: 500, color: '#dccaa2', alpha: fade(T, 3.4, D - 0.4, 1.0, 1.0) });
  },
};

// ---------- 1. Giriş: iki imparatorluk arasında Arabistan ----------
SCENES.intro = {
  xin: 1.4,
  cams(S) {
    return [
      [S.start - 1, 40, 33.5, 4.25],
      [S.L(1) + 1, 40, 33.0, 4.5],
      [S.L(2) + 0.3, 41.5, 31.0, 4.6],
      [S.E(2), 45, 24.5, 5.25],
      [S.E(3) + 0.6, 40.2, 22.3, 6.6],
    ];
  },
  draw(ctx, t, S) {
    const c = mapBase(ctx, t, { dark: 0.1 + 0.25 * (1 - smooth(S.start, S.L(0) + 2, t)) });
    const aE = smooth(S.L(0) + 0.5, S.L(0) + 2.5, t) * (1 - 0.6 * smooth(S.L(2), S.L(2) + 2, t));
    territory(ctx, c, 'byz', { alpha: aE, fill: 'rgba(150,60,120,0.38)', glow: 'rgba(255,170,230,0.3)', stroke: 'rgba(255,190,235,0.85)' });
    territory(ctx, c, 'sas', { alpha: aE, fill: 'rgba(60,110,190,0.38)', glow: 'rgba(170,200,255,0.3)', stroke: 'rgba(190,215,255,0.85)' });
    const la = fade(t, S.L(0) + 1.2, S.E(1) + 1.5, 1, 1.2);
    regionLabel(ctx, c, 30.5, 40.2, 'BİZANS', la, { size: 44, sub: 'İMPARATORLUĞU' });
    regionLabel(ctx, c, 56.5, 33.4, 'SASANİ', la, { size: 44, sub: 'İMPARATORLUĞU' });
    // savaş
    const ba = fade(t, S.L(1) + 0.8, S.E(1) + 1.2, 0.6, 1.0);
    const [bx, by] = PL(c, 40.8, 37.6);
    battleIcon(ctx, bx, by, ba, 1.15);
    txt(ctx, '602 – 628', bx, by + 52, { size: 30, weight: 700, color: CREAM, alpha: ba, stroke: 5, strokeColor: 'rgba(0,0,0,0.6)' });
    txt(ctx, 'Bizans – Sasani savaşları', bx, by + 84, { size: 26, italic: true, weight: 600, color: '#e8d2a4', alpha: ba, stroke: 4, strokeColor: 'rgba(0,0,0,0.6)' });
    // Arabistan vurgusu
    const ar = fade(t, S.L(2), S.end + 1, 1.5, 0.8);
    if (ar > 0) {
      const [ax, ay] = PL(c, 45, 23);
      const R = 380 * Math.pow(2, c.zoom - 5);
      const g = ctx.createRadialGradient(ax, ay, 0, ax, ay, R);
      g.addColorStop(0, `rgba(255,214,140,${0.22 * ar})`); g.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ax, ay, R, 0, TAU); ctx.fill();
      regionLabel(ctx, c, 45.5, 24.0, 'ARABİSTAN', ar * (1 - smooth(S.L(3), S.L(3) + 1.2, t)), { size: 46, spacing: 14 });
    }
    // kervan yolu (Yemen - Mekke - Şam)
    const rp = prog(t, S.L(2) + 0.6, S.E(2) + 1.5);
    const rt = route(ctx, c, ['sana', 'necran', 'mekke', 'medine', 'hayber', 'tebuk', 'petra', 'busra', 'sam'], rp, { alpha: fade(t, S.L(2), S.end + 1, 0.5, 1), t, width: 3.5 });
    if (rt && rp < 1) { ctx.save(); ctx.fillStyle = '#20150a'; ctx.strokeStyle = '#20150a'; ctx.translate(rt.tip[0], rt.tip[1] - 6); ctx.scale(0.9, 0.9); camelShape(ctx, t * 8); ctx.restore(); }
    const ca = fade(t, S.L(2) + 1.0, S.end + 1, 0.8, 1);
    cityMark(ctx, c, 'sana', ca * 0.9, { size: 26, name: 'Yemen', side: 'right' });
    cityMark(ctx, c, 'sam', ca * 0.9, { size: 26, side: 'right' });
    cityMark(ctx, c, 'mekke', fade(t, S.L(2) + 2, S.end + 2, 0.8, 1), { size: 34, glow: true, pulse: prog(t, S.L(3) + 0.5, S.L(3) + 2.5), side: 'left' });
    dateCard(ctx, t, S.L(0) + 0.3, S.E(1) + 0.6, 'VII. Yüzyıl', 'İki imparatorluk arasında bir dünya', { size: 64 });
  },
};

// ---------- 2. Başlık ----------
SCENES.title = {
  xin: 1.6,
  draw(ctx, t, S) {
    const T = t - S.start, D = S.end - S.start;
    nightSky(ctx, t, { hor: '#3a2a3a', glow: 'rgba(150,90,80,0.4)', t0: S.start });
    crescent(ctx, W * 0.79, H * 0.2, 46, 1);
    dunes(ctx, t, { offset: 0, layers: [
      { y: 0.74, amp: 40, f: 0.0016, c1: '#2b2028', c2: '#170f14', sp: 5, seed: 1, rim: 'rgba(255,200,170,0.10)' },
      { y: 0.83, amp: 55, f: 0.0012, c1: '#1c1418', c2: '#0c080a', sp: 10, seed: 2, rim: 'rgba(255,200,170,0.08)' },
      { y: 0.93, amp: 50, f: 0.0010, c1: '#0e0a0c', c2: '#050304', sp: 18, seed: 3 },
    ] });
    motes(ctx, t, 0.6, { n: 40, seed: 9 });
    const out = 1 - smooth(D - 1.4, D, T);
    ctx.save();
    ctx.globalAlpha = out;
    const y = H * 0.42;
    txt(ctx, "İSLAM'IN", W / 2, y - 92, { font: 'Cinzel', size: 46, weight: 600, spacing: 22, color: CREAM, alpha: easeOut(prog(T, 0.8, 2.0)), shadow: 16 });
    const drawTitle = c2 => txt(c2, 'DOĞUŞU ve YAYILIŞI', W / 2, y, { font: 'Cinzel', size: 116, weight: 700, spacing: 8, gold: true, alpha: easeOut(prog(T, 1.4, 2.8)), shadow: 24 });
    drawTitle(ctx);
    shine(ctx, c2 => txt(c2, 'DOĞUŞU ve YAYILIŞI', W / 2, y, { font: 'Cinzel', size: 116, weight: 700, spacing: 8, color: '#fff' }), W * 0.15, W * 0.85, prog(T, 3.6, 5.6), 200, 0.55);
    divider(ctx, W / 2, y + 92, 640, prog(T, 2.4, 3.8), 1);
    txt(ctx, "Hira'dan dünyaya, bir medeniyetin hikâyesi", W / 2, y + 160, { size: 46, italic: true, weight: 500, color: '#e9dcc0', alpha: easeOut(prog(T, 3.0, 4.4)), shadow: 12 });
    ctx.restore();
  },
};

// ---------- Bölüm kartları ----------
SCENES.chapter = {
  xin: 0.9,
  draw(ctx, t, S) {
    const T = t - S.start, D = S.end - S.start;
    ctx.fillStyle = '#06080b'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.55);
    g.addColorStop(0, 'rgba(70,52,22,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    patternLayer(ctx, T, prog(T, 0, 3.2), { alpha: 0.16, cell: 190, fadeEdge: true, rot: T * 0.01 });
    const a = 1;
    const y = H / 2 - 10;
    txt(ctx, `BÖLÜM ${S.num}`, W / 2, y - 110, { font: 'Cinzel', size: 34, weight: 600, spacing: 16, color: '#d7c08d', alpha: easeOut(prog(T, 0.2, 1.0)) });
    txt(ctx, S.title, W / 2, y, { font: 'Cinzel', size: S.title.length > 24 ? 74 : 88, weight: 700, spacing: 4, gold: true, alpha: easeOut(prog(T, 0.4, 1.4)) * a, shadow: 24 });
    shine(ctx, c2 => txt(c2, S.title, W / 2, y, { font: 'Cinzel', size: S.title.length > 24 ? 74 : 88, weight: 700, spacing: 4, color: '#fff' }), W * 0.2, W * 0.8, prog(T, 1.3, 3.0), 180, 0.45);
    divider(ctx, W / 2, y + 84, 520, prog(T, 0.8, 2.0), 1);
    txt(ctx, S.years, W / 2, y + 140, { size: 42, italic: true, weight: 500, color: CREAM, alpha: easeOut(prog(T, 1.0, 2.0)) });
  },
};

// ---------- 3. Mekke ve Kâbe ----------
function kaabaScene(ctx, t, o = {}) {
  const mood = o.mood || 0;            // 0: gece-huzur, 1: karanlık (cahiliye)
  const dawn = o.dawn || 0;            // 0: gece, 1: sabah aydınlığı
  const skyTop = dawn > 0 ? '#1a2240' : '#03050c';
  nightSky(ctx, t, { t0: o.t0 || 0, top: skyTop, mid: dawn > 0 ? '#3b3a5a' : '#0a1028', hor: dawn > 0 ? '#c98a5a' : '#2c2236', glow: dawn > 0 ? `rgba(255,190,120,${0.5 * dawn})` : 'rgba(110,70,70,0.35)', starAlpha: 1 - dawn * 0.85, milkyAlpha: 0.6 * (1 - dawn) });
  if (dawn > 0) {
    const g = ctx.createRadialGradient(W * 0.3, H * 0.62, 10, W * 0.3, H * 0.62, W * 0.7);
    g.addColorStop(0, `rgba(255,214,150,${0.55 * dawn})`); g.addColorStop(1, 'rgba(255,170,110,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const back = ART.ridges.kaaba;
  fillRidge(ctx, back[0], dawn > 0 ? '#3b2b2c' : '#14121a', dawn > 0 ? `rgba(255,200,150,${0.25 * dawn})` : null);
  fillRidge(ctx, back[1], dawn > 0 ? '#251a1a' : '#0b0a0f');
  // şehir (evler) silueti
  houses(ctx, -20, W + 20, H * 0.73, 21, dawn > 0 ? '#1d1414' : '#08070a', 0.6 * (1 - dawn));
  // avlu zemini
  const fg = ctx.createLinearGradient(0, H * 0.70, 0, H);
  fg.addColorStop(0, dawn > 0 ? '#6b5b4c' : '#2a2620'); fg.addColorStop(1, dawn > 0 ? '#3b322a' : '#0d0b09');
  ctx.fillStyle = fg; ctx.fillRect(0, H * 0.72, W, H * 0.28);
  const s = o.scale || 1;
  kaaba(ctx, W / 2 + 70, H * 0.86, s * 1.32, { light: o.light == null ? 1 : o.light });
  if (mood > 0) {
    ctx.fillStyle = `rgba(40,8,8,${0.42 * mood})`; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = `rgba(128,128,128,${0.6 * mood})`; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  motes(ctx, t, 0.5 + dawn * 0.4, { n: 50, seed: 4 });
}

SCENES.mecca = {
  xin: 1.0,
  cams(S) {
    return [[S.start + 0.2, 40.2, 22.3, 6.6], [S.L(0) + 1, 40.0, 22.0, 7.2], [S.E(0) + 0.5, 39.83, 21.45, 8.3]];
  },
  draw(ctx, t, S) {
    const k = smooth(S.L(1) - 1.0, S.L(1) + 0.4, t);
    if (k < 1) {
      const c = mapBase(ctx, t, { dark: 0.08 });
      route(ctx, c, ['sana', 'necran', 'taif', 'mekke', 'medine', 'hayber', 'tebuk', 'petra', 'busra', 'sam'], 1, { alpha: 0.85, t, width: 3.5, headGlow: false });
      regionLabel(ctx, c, 40.9, 23.6, 'HİCAZ', fade(t, S.start + 0.5, S.end, 1.2, 1), { size: 48, spacing: 18 });
      cityMark(ctx, c, 'mekke', 1, { size: 38, glow: true, pulse: prog(t, S.L(0) + 0.5, S.L(0) + 2.5), side: 'left' });
      cityMark(ctx, c, 'taif', fade(t, S.L(0) + 1, S.end, 0.8, 1), { size: 28, side: 'right' });
      cityMark(ctx, c, 'medine', fade(t, S.L(0) + 1.4, S.end, 0.8, 1), { size: 28, name: 'Yesrib', side: 'right' });
      // yön işaretleri
      const ya = fade(t, S.L(0) + 1.8, S.L(1), 0.8, 0.6);
      const [mx, my] = PK(c, 'mekke');
      txt(ctx, "↑  Şam'a", mx + 260, my - 330, { size: 30, weight: 600, color: CREAM, alpha: ya, stroke: 4 });
      txt(ctx, "Yemen'e  ↓", mx + 160, my + 300, { size: 30, weight: 600, color: CREAM, alpha: ya, stroke: 4 });
    }
    if (k > 0) {
      ctx.save();
      ctx.globalAlpha = k;
      const mood = smooth(S.L(2), S.L(2) + 2.5, t);
      kaabaScene(ctx, t, { mood, scale: 1 + 0.06 * prog(t, S.L(1), S.end), t0: S.start });
      ctx.restore();
      txt(ctx, 'Kâbe', W / 2 + 40, 150, { font: 'Cinzel', size: 52, weight: 700, spacing: 10, gold: true, alpha: fade(t, S.L(1) + 0.6, S.L(2) + 0.5, 1, 1), shadow: 16 });
      txt(ctx, 'Beytullah · Mekke', W / 2 + 40, 210, { size: 32, italic: true, weight: 500, color: CREAM, alpha: fade(t, S.L(1) + 1, S.L(2) + 0.5, 1, 1), shadow: 10 });
      centerTitle(ctx, t, S.L(3) + 0.2, S.end + 0.6, 'CÂHİLİYE', 'kabile gururu ve bilgisizlik çağı', { y: 210, size: 74, subSize: 36 });
    }
  },
};

// ---------- 4. Doğum ve gençlik ----------
SCENES.birth = {
  xin: 1.2,
  draw(ctx, t, S) {
    const T = t - S.start;
    // Mekke'de şafak
    const dawn = 0.6 + 0.4 * prog(t, S.start, S.L(1));
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1b1f3a'); g.addColorStop(0.5, '#6a4a5c'); g.addColorStop(0.78, '#e39a62'); g.addColorStop(1, '#f2c48a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    nightSky(ctx, t, { t0: S.start, top: 'rgba(0,0,0,0)', mid: 'rgba(0,0,0,0)', hor: 'rgba(0,0,0,0)', glow: 'rgba(0,0,0,0)', starAlpha: 0.35 * (1 - dawn), milky: false });
    const sunY = H * 0.74 - 120 * prog(t, S.start, S.end);
    const sg = ctx.createRadialGradient(W * 0.62, sunY, 10, W * 0.62, sunY, 520);
    sg.addColorStop(0, 'rgba(255,240,200,0.95)'); sg.addColorStop(0.08, 'rgba(255,214,150,0.8)'); sg.addColorStop(0.4, 'rgba(255,170,100,0.25)'); sg.addColorStop(1, 'rgba(255,150,90,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    const rg = ART.ridges.birth;
    fillRidge(ctx, rg[0], '#5a3a3e', 'rgba(255,210,160,0.35)');
    fillRidge(ctx, rg[1], '#3a2428');
    houses(ctx, -20, W + 20, H * 0.86, 33, '#24171a', 0);
    fillRidge(ctx, rg[2], '#1a1012');
    motes(ctx, t, 0.6, { n: 45, seed: 12 });
    // kısım A: 571 + isim madalyonu
    const aA = fade(t, S.L(0) - 0.6, S.L(1) + 0.4, 1.0, 0.8);
    if (aA > 0) {
      ctx.save(); ctx.globalAlpha = aA;
      ctx.fillStyle = 'rgba(10,6,6,0.28)'; ctx.fillRect(0, 0, W, H);
      medallion(ctx, W / 2, H * 0.40, 150, 'مُحَمَّد', easeOut(prog(t, S.L(0) + 1.2, S.L(0) + 2.6)), { size: 104, dy: 8 });
      txt(ctx, '571', W / 2, H * 0.40 + 250, { font: 'Cinzel', size: 82, weight: 700, gold: true, alpha: easeOut(prog(t, S.L(0) - 0.3, S.L(0) + 0.8)), shadow: 18 });
      txt(ctx, 'Fil Yılı · Mekke', W / 2, H * 0.40 + 320, { size: 40, italic: true, weight: 500, color: CREAM, alpha: easeOut(prog(t, S.L(0) + 0.5, S.L(0) + 1.5)), shadow: 12 });
      ctx.restore();
    }
    // kısım B: aile ağacı
    const aB = fade(t, S.L(1) - 0.3, S.L(2) + 0.2, 0.8, 0.8);
    if (aB > 0) {
      ctx.save(); ctx.globalAlpha = aB;
      ctx.fillStyle = 'rgba(8,5,6,0.55)'; ctx.fillRect(0, 0, W, H);
      const d = S.D(1), t1 = S.L(1);
      const node = (x, y, name, role, a, dim = 0) => {
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha *= a;
        ctx.fillStyle = `rgba(14,10,6,${0.85})`; ctx.strokeStyle = rgba(GOLD, 0.8 - dim * 0.4); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(x - 170, y - 50, 340, 100, 10); ctx.fill(); ctx.stroke();
        txt(ctx, name, x, y - 10, { size: 40, weight: 700, color: dim ? '#a89c86' : CREAM });
        txt(ctx, role, x, y + 28, { size: 26, italic: true, weight: 500, color: dim ? '#8c7f68' : '#dcc08a' });
        ctx.restore();
      };
      const link = (x0, y0, x1, y1, p, dash) => {
        if (p <= 0) return;
        ctx.save(); ctx.strokeStyle = rgba(GOLD, 0.8); ctx.lineWidth = 2.5; if (dash) ctx.setLineDash([8, 8]);
        const pts = [[x0, y0], [x0, (y0 + y1) / 2], [x1, (y0 + y1) / 2], [x1, y1]];
        partialPolyline(ctx, pts, p); ctx.stroke(); ctx.restore();
      };
      const yA = 250, yB = 520, yC = 800;
      node(W / 2 - 420, yA, 'Abdülmuttalib', 'dede', prog(t, t1, t1 + 0.8));
      node(W / 2 - 520, yB, 'Abdullah', 'baba · doğumundan önce vefat', prog(t, t1 + 0.3, t1 + 1.1), smooth(t1 + 0.8, t1 + 1.6, t));
      node(W / 2 - 120, yB, 'Âmine', 'anne · 6 yaşında', prog(t, t1 + d * 0.2, t1 + d * 0.2 + 0.8), smooth(t1 + d * 0.25, t1 + d * 0.35, t));
      node(W / 2 + 420, yA, 'Ebu Talib', 'amca', prog(t, t1 + d * 0.55, t1 + d * 0.55 + 0.8));
      link(W / 2 - 420, yA + 50, W / 2 - 520, yB - 50, prog(t, t1 + 0.4, t1 + 1.2));
      link(W / 2 - 520, yB + 50, W / 2, yC - 60, prog(t, t1 + 0.8, t1 + 1.8));
      link(W / 2 - 120, yB + 50, W / 2, yC - 60, prog(t, t1 + d * 0.25, t1 + d * 0.25 + 1));
      link(W / 2 - 420, yA + 50, W / 2, yC - 60, prog(t, t1 + d * 0.45, t1 + d * 0.45 + 1.2), true);
      link(W / 2 + 420, yA + 50, W / 2, yC - 60, prog(t, t1 + d * 0.7, t1 + d * 0.7 + 1.2), true);
      medallion(ctx, W / 2, yC + 10, 70, 'مُحَمَّد', prog(t, t1 + 0.6, t1 + 1.6), { size: 52, dy: 4 });
      const ha = prog(t, t1 + d * 0.5, t1 + d * 0.5 + 0.8);
      txt(ctx, 'himaye', W / 2 + 210, yC - 160, { size: 28, italic: true, color: '#dcc08a', alpha: ha });
      ctx.restore();
    }
    // kısım C: el-Emin
    const aC = fade(t, S.L(2) - 0.4, S.L(3) + 0.2, 0.8, 0.8);
    if (aC > 0) {
      ctx.save(); ctx.globalAlpha = aC;
      ctx.fillStyle = 'rgba(8,5,6,0.5)'; ctx.fillRect(0, 0, W, H);
      calligraphy(ctx, 'ٱلْأَمِين', W / 2, H * 0.42, prog(t, S.L(2) + 0.6, S.L(2) + 2.6), { size: 230, glow: 40 });
      txt(ctx, 'el-Emîn', W / 2, H * 0.42 + 190, { font: 'Cinzel', size: 56, weight: 700, gold: true, spacing: 8, alpha: prog(t, S.L(2) + 1.8, S.L(2) + 2.8) });
      txt(ctx, 'güvenilir kişi', W / 2, H * 0.42 + 250, { size: 38, italic: true, weight: 500, color: CREAM, alpha: prog(t, S.L(2) + 2.2, S.L(2) + 3.2) });
      ctx.restore();
    }
    // kısım D: kervan
    const aD = fade(t, S.L(3) - 0.5, S.end + 1, 0.9, 0.8);
    if (aD > 0) {
      ctx.save(); ctx.globalAlpha = aD;
      const g2 = ctx.createLinearGradient(0, 0, 0, H);
      g2.addColorStop(0, '#2a1d38'); g2.addColorStop(0.55, '#b0604a'); g2.addColorStop(0.75, '#f0a060'); g2.addColorStop(1, '#ffd29a');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
      const sx = W * 0.5, sy2 = H * 0.70;
      const sg2 = ctx.createRadialGradient(sx, sy2, 10, sx, sy2, 600);
      sg2.addColorStop(0, 'rgba(255,245,210,1)'); sg2.addColorStop(0.06, 'rgba(255,220,160,0.9)'); sg2.addColorStop(0.3, 'rgba(255,170,110,0.3)'); sg2.addColorStop(1, 'rgba(255,150,90,0)');
      ctx.fillStyle = sg2; ctx.fillRect(0, 0, W, H);
      dunes(ctx, t, { layers: [
        { y: 0.76, amp: 34, f: 0.0012, c1: '#6a3a2c', c2: '#3a1f18', sp: 8, seed: 5, rim: 'rgba(255,210,160,0.3)' },
        { y: 0.86, amp: 40, f: 0.0009, c1: '#2a1612', c2: '#140a08', sp: 16, seed: 6 },
      ] });
      const base = H * 0.86 - 40 * (0.6 * Math.sin(1 * 0.0009 * TAU + 6));
      ctx.fillStyle = '#120806'; ctx.strokeStyle = '#120806';
      for (let i = 0; i < 6; i++) {
        const x = ((t - S.L(3)) * 46 + i * 120 + W * 0.18) % (W + 300) - 150;
        ctx.save(); ctx.translate(x, H * 0.80 + Math.sin(i) * 4); ctx.scale(2.3, 2.3); camelShape(ctx, t * 4 + i); ctx.restore();
      }
      ctx.restore();
      dateCard(ctx, t, S.L(3) + 0.2, S.end + 0.4, '595', 'Hz. Hatice ile evlilik', { sub: 'Kervan ticareti · Şam yolu' });
    }
  },
};

// ---------- 5. Hira ve ilk vahiy ----------
SCENES.hira = {
  xin: 1.4,
  draw(ctx, t, S) {
    const T = t - S.start;
    const rev = smooth(S.L(1) + 0.5, S.L(2) - 0.2, t);      // vahiy ışığı
    const settle = smooth(S.L(3), S.end, t);
    nightSky(ctx, t, { t0: S.start, top: '#02030a', mid: '#081028', hor: '#1d2140', glow: `rgba(120,100,140,${0.3 + 0.3 * rev})`, drift: 3 });
    // dağ (Nur Dağı) — yavaş yaklaşma
    const zs = 1 + 0.12 * prog(t, S.start, S.L(2)) - 0.04 * settle;
    ctx.save();
    ctx.translate(W * 0.5, H * 0.95); ctx.scale(zs, zs); ctx.translate(-W * 0.5, -H * 0.95);
    const rg = ART.ridges.hira;
    fillRidge(ctx, rg[0], '#151527');
    fillRidge(ctx, rg[1], '#0b0b16', 'rgba(255,220,170,0.06)');
    // mağara
    const cx = W * 0.565, cy = H * 0.355;
    const glow = 0.35 + 0.65 * rev;
    const cg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 90 + 120 * rev);
    cg.addColorStop(0, `rgba(255,230,170,${0.9 * glow})`); cg.addColorStop(0.3, `rgba(255,190,110,${0.4 * glow})`); cg.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, 210, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,236,190,${0.8 * glow})`;
    ctx.beginPath(); ctx.ellipse(cx, cy, 9, 13, 0, 0, TAU); ctx.fill();
    ctx.restore();
    godRays(ctx, W * 0.565, H * 0.30, t, rev * (1 - 0.5 * settle), { n: 22, len: 1700, core: 260, width: 0.05 });
    // başlık
    txt(ctx, 'Nur Dağı · Hira Mağarası', W / 2, 120, { font: 'Cinzel', size: 44, weight: 600, spacing: 8, color: CREAM, alpha: fade(t, S.start + 0.8, S.L(1), 1.2, 1), shadow: 16 });
    divider(ctx, W / 2, 168, 420, prog(t, S.start + 1.2, S.start + 2.4), fade(t, S.start + 0.8, S.L(1), 1.2, 1));
    dateCard(ctx, t, S.L(1) + 0.2, S.L(2) - 0.4, '610', 'Ramazan · Kadir Gecesi', { sub: 'İlk vahiy' });
    // "Oku!" hattı
    const ia = smooth(S.L(2) - 0.6, S.L(2) + 0.2, t);
    if (ia > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255,240,210,${0.10 * ia * (1 - settle)})`; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      calligraphy(ctx, 'ٱقْرَأْ بِٱسْمِ رَبِّكَ ٱلَّذِى خَلَقَ', W / 2, H * 0.5, prog(t, S.L(2) - 0.4, S.E(2) + 0.6), { size: 112, glow: 40, alpha: 1 - 0.55 * settle });
      txt(ctx, '“Oku! Yaratan Rabbinin adıyla oku!”', W / 2, H * 0.5 + 130, { size: 52, italic: true, weight: 600, color: '#fff3dc', alpha: prog(t, S.L(2) + 0.6, S.L(2) + 1.6) * (1 - 0.5 * settle), shadow: 20 });
      txt(ctx, 'Alak Suresi, 1', W / 2, H * 0.5 + 190, { size: 30, weight: 600, color: '#e3c88c', spacing: 3, alpha: prog(t, S.E(2), S.E(2) + 1) * (1 - 0.5 * settle) });
    }
    txt(ctx, '610 – 632', W / 2, H * 0.83, { font: 'Cinzel', size: 46, weight: 600, spacing: 10, gold: true, alpha: fade(t, S.L(3) + 0.8, S.end + 1, 1, 1) });
    txt(ctx, 'Peygamberlik dönemi', W / 2, H * 0.83 + 52, { size: 34, italic: true, color: CREAM, alpha: fade(t, S.L(3) + 1.2, S.end + 1, 1, 1) });
  },
};

// ---------- 6. Davet ve Mekke yılları ----------
SCENES.dawah = {
  xin: 1.2,
  cams(S) {
    return [
      [S.start - 0.5, 39.85, 21.5, 8.4],
      [S.L(2) + 2, 39.83, 21.45, 8.7],
      [S.L(3) + 0.4, 39.83, 21.45, 8.7],
      [S.L(3) + 3.2, 39.2, 18.2, 6.25],
      [S.E(3) + 0.3, 39.0, 18.0, 6.35],
      [S.L(4) + 1.5, 39.83, 21.45, 8.6],
      [S.end + 0.5, 39.83, 21.6, 8.75],
    ];
  },
  draw(ctx, t, S) {
    const press = fade(t, S.L(2) + 0.5, S.L(3) + 0.5, 1.5, 1.2) + 0.6 * fade(t, S.L(4), S.end, 1, 1);
    const c = mapBase(ctx, t, { dark: 0.15 + 0.2 * press, desat: 0.22 + 0.3 * press });
    if (press > 0) { ctx.fillStyle = `rgba(60,10,6,${0.18 * press})`; ctx.fillRect(0, 0, W, H); }
    // ışık halkaları (açık davet)
    const [mx, my] = PK(c, 'mekke');
    const ra = fade(t, S.L(1), S.L(2) + 1.5, 0.6, 1.2);
    if (ra > 0) {
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const ph = ((t - S.L(1)) * 0.35 + i / 4) % 1;
        ctx.strokeStyle = `rgba(255,226,160,${0.55 * (1 - ph) * ra})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(mx, my, 30 + ph * 420, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
    // boykot çemberi
    const ba = fade(t, S.L(4) + 0.3, S.end + 1, 0.8, 1);
    if (ba > 0) {
      ctx.save(); ctx.strokeStyle = `rgba(220,90,70,${0.8 * ba})`; ctx.lineWidth = 4; ctx.setLineDash([16, 12]); ctx.lineDashOffset = t * 10;
      ctx.beginPath(); ctx.arc(mx, my, 150, -Math.PI / 2, -Math.PI / 2 + TAU * easeInOut(prog(t, S.L(4) + 0.3, S.L(4) + 2))); ctx.stroke(); ctx.restore();
    }
    const qa = fade(t, S.L(2) + 0.3, S.L(3) + 0.3, 1, 1);
    if (qa > 0) {
      for (let i = 0; i < 3; i++) {
        const ph = ((t - S.L(2)) * 0.5 + i / 3) % 1;
        ctx.strokeStyle = `rgba(230,80,60,${0.5 * (1 - ph) * qa})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(mx, my, 260 - ph * 200, 0, TAU); ctx.stroke();
      }
      txt(ctx, 'KUREYŞ', mx + 230, my - 120, { font: 'Cinzel', size: 44, weight: 700, spacing: 10, color: '#ffb59a', alpha: qa, stroke: 6 });
      txt(ctx, 'Mekke\'nin güçlü aileleri', mx + 230, my - 74, { size: 30, italic: true, weight: 600, color: CREAM, alpha: qa, stroke: 5 });
    }
    cityMark(ctx, c, 'mekke', 1, { size: 38, glow: true, side: 'left' });
    cityMark(ctx, c, 'hira', fade(t, S.start, S.L(1) + 1, 0.5, 1), { size: 26, name: 'Hira', side: 'right', r: 4 });
    // Habeşistan hicreti
    const hp = prog(t, S.L(3) + 1.6, S.E(3) + 0.6);
    const ha = fade(t, S.L(3) + 1.0, S.L(4) + 1.5, 0.8, 1.0);
    if (ha > 0) {
      ctx.save(); ctx.globalAlpha = ha;
      arrow(ctx, c, 'mekke', 'aksum', hp, { color: '#ffd27a', width: 6, via: [[39.0, 20.9], [38.5, 17.4]] });
      const pts = smoothPts([place('mekke'), merc(39.0, 20.9), merc(38.5, 17.4), place('aksum')], 16).map(q => P(c, q[0], q[1]));
      ctx.save(); const r = partialPolyline(ctx, pts, clamp(hp * 0.92)); ctx.restore();
      if (r && hp > 0.05 && hp < 0.95) shipIcon(ctx, r.tip[0] + 14, r.tip[1] - 10, r.ang, 1, 1.3);
      cityMark(ctx, c, 'aksum', prog(t, S.L(3) + 2.5, S.L(3) + 3.5), { size: 30, side: 'right', sub: 'Kral Necaşi' });
      regionLabel(ctx, c, 39.5, 12.6, 'HABEŞİSTAN', prog(t, S.L(3) + 2.2, S.L(3) + 3.4), { size: 40, spacing: 10 });
      regionLabel(ctx, c, 38.1, 20.0, 'Kızıldeniz', prog(t, S.L(3) + 2.2, S.L(3) + 3.4) * 0.8, { size: 30, font: 'Cormorant', italic: true, spacing: 4, color: 'rgba(200,230,255,0.85)' });
      ctx.restore();
    }
    // ilk Müslümanlar paneli
    const pa = fade(t, S.L(0) - 0.2, S.L(1) + 1.0, 0.8, 0.8);
    infoBox(ctx, 110, 300, 560, 330, pa, 'İLK MÜSLÜMANLAR', ['Hz. Hatice', 'Hz. Ali', 'Hz. Ebubekir', 'Zeyd bin Hârise'], { lineAlpha: i => prog(t, S.L(0) + 1.4 + i * S.D(0) * 0.16, S.L(0) + 2.2 + i * S.D(0) * 0.16) });
    dateCard(ctx, t, S.L(1) + 0.4, S.L(2) + 1.0, '613', 'Açık davet başlıyor');
    dateCard(ctx, t, S.L(3) + 0.3, S.L(4) - 0.2, '615', 'Habeşistan Hicreti');
    dateCard(ctx, t, S.L(4) + 0.2, S.L(4) + S.D(4) * 0.48, '616 – 619', 'Boykot yılları');
    dateCard(ctx, t, S.L(4) + S.D(4) * 0.5, S.end + 0.4, '619', 'Hüzün Yılı', { sub: 'Hz. Hatice ve Ebu Talib vefat etti' });
  },
};

// ---------- 7. Hicret ----------
const HIJRA = [[39.826, 21.423], [39.849, 21.377], [39.62, 21.5], [39.42, 21.78], [39.36, 21.95], [39.24, 22.3], [39.12, 22.68], [39.05, 22.95], [39.15, 23.3], [39.32, 23.7], [39.48, 24.1], [39.617, 24.44], [39.611, 24.468]];
SCENES.hijra = {
  xin: 1.2,
  cams(S) {
    return [
      [S.start - 0.2, 39.6, 23.0, 7.7],
      [S.L(0) + 3, 39.6, 23.0, 7.85],
      [S.L(1) + 0.4, 39.84, 21.42, 9.6],
      [S.L(2) + 1.6, 39.84, 21.42, 9.7],
      [S.L(2) + 3.2, 39.5, 22.4, 8.6],
      [S.E(2) + 0.4, 39.45, 23.6, 8.5],
      [S.L(3) + 0.8, 39.5, 23.0, 7.9],
      [S.L(4), 39.55, 23.4, 8.0],
      [S.end + 0.6, 39.61, 24.4, 9.0],
    ];
  },
  draw(ctx, t, S) {
    const hc = fade(t, S.L(3) - 0.2, S.L(4) + 0.2, 0.8, 0.8);
    const c = mapBase(ctx, t, { dark: 0.06 + 0.35 * hc });
    // Akabe biatları
    const ak = fade(t, S.L(0) + 0.5, S.L(1) + 1, 0.8, 1);
    if (ak > 0) {
      arrow(ctx, c, 'medine', 'akabe', prog(t, S.L(0) + 0.6, S.L(0) + 3.5), { color: '#cfe8ff', width: 4, alpha: ak, bend: -0.12 });
    }
    cityMark(ctx, c, 'akabe', fade(t, S.L(0) + 1.5, S.L(1) + 1, 0.8, 1), { size: 28, side: 'right', r: 5, dx: 6 });
    // rota
    const p1 = prog(t, S.L(1) + 1.2, S.L(2) + 0.6) * 0.06;
    const p2 = prog(t, S.L(2) + 2.8, S.E(2) + 0.8) * 0.94;
    const rp = p1 + p2;
    const rt = route(ctx, c, HIJRA, rp, { t, width: 5, color: '#ffe7a8' });
    cityMark(ctx, c, 'sevr', fade(t, S.L(1) + 1.6, S.L(3), 0.8, 1), { size: 30, side: 'right', r: 5, sub: '3 gün', dy: 14 });
    cityMark(ctx, c, 'mekke', 1, { size: 36, glow: true, side: 'left', dx: -4 });
    // Yesrib -> Medine
    const morph = smooth(S.L(4) + 0.4, S.L(4) + 1.6, t);
    cityMark(ctx, c, 'medine', 1 - morph, { size: 36, name: 'Yesrib', side: 'right' });
    cityMark(ctx, c, 'medine', morph, { size: 40, name: 'Medine', side: 'right', glow: true, pulse: prog(t, S.L(4) + 0.6, S.L(4) + 2.6), sub: "Medînetü'n-Nebî", labelColor: '#ffe8b0' });
    if (rt && rp > 0.08 && rp < 0.999) {
      const km = Math.round(400 * clamp((rp - 0.06) / 0.94) / 10) * 10;
      txt(ctx, `${km} km`, rt.tip[0] + 40, rt.tip[1] - 30, { size: 30, weight: 700, color: '#fff0c8', align: 'left', stroke: 5 });
    }
    dateCard(ctx, t, S.L(0) + 0.4, S.L(1) - 0.2, '621 – 622', 'Akabe Biatları');
    dateCard(ctx, t, S.L(1) + 0.3, S.L(3) - 0.3, '622', 'Mekke\'den Yesrib\'e', { sub: 'Hz. Ebubekir ile birlikte' });
    centerTitle(ctx, t, S.L(3) - 0.1, S.L(4) + 0.3, 'HİCRET', '622 · Hicrî takvimin başlangıcı', { arabic: 'ٱلْهِجْرَة', size: 104, arSize: 96 });
  },
};

// ---------- 8. Medine ----------
SCENES.medina = {
  xin: 1.3,
  draw(ctx, t, S) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2b2a4a'); g.addColorStop(0.45, '#a8645a'); g.addColorStop(0.72, '#f0a868'); g.addColorStop(1, '#f6d29a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const sg = ctx.createRadialGradient(W * 0.72, H * 0.62, 10, W * 0.72, H * 0.62, 640);
    sg.addColorStop(0, 'rgba(255,248,220,1)'); sg.addColorStop(0.05, 'rgba(255,226,170,0.9)'); sg.addColorStop(0.35, 'rgba(255,180,110,0.3)'); sg.addColorStop(1, 'rgba(255,160,100,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    const rg = ART.ridges.medina;
    fillRidge(ctx, rg[0], '#7a4a40', 'rgba(255,215,170,0.35)');   // Uhud
    // hurmalık (orta plan)
    const pan = (t - S.start) * 6;
    for (let i = 0; i < 16; i++) palm(ctx, (i * 137 + 40 - pan * 0.5) % (W + 200) - 100, H * 0.70 + (i % 3) * 6, 170 + (i * 37) % 90, ((i % 5) - 2) * 0.06, '#3a2220', t, i + 3);
    ctx.fillStyle = '#4a2c22'; ctx.fillRect(0, H * 0.70, W, H * 0.3);
    earlyMosque(ctx, W * 0.46 - pan * 0.8, H * 0.80, 1.15, 1);
    const fg = ctx.createLinearGradient(0, H * 0.8, 0, H);
    fg.addColorStop(0, '#6e4a32'); fg.addColorStop(1, '#2a1a12');
    ctx.fillStyle = fg; ctx.fillRect(0, H * 0.80, W, H * 0.2);
    for (let i = 0; i < 5; i++) palm(ctx, (i * 470 + 120 - pan * 1.6) % (W + 400) - 200, H * 1.02, 420 + (i * 53) % 120, ((i % 3) - 1) * 0.1, '#140c08', t, i + 40);
    motes(ctx, t, 0.8, { n: 60, seed: 21 });
    // metinler
    txt(ctx, 'Mescid-i Nebevî', W / 2, 130, { font: 'Cinzel', size: 56, weight: 700, spacing: 8, gold: true, alpha: fade(t, S.L(0) + 0.2, S.L(1), 1, 1), shadow: 18 });
    divider(ctx, W / 2, 182, 420, prog(t, S.L(0) + 0.6, S.L(0) + 1.8), fade(t, S.L(0) + 0.2, S.L(1), 1, 1));
    const words = ['İbadet', 'Eğitim', 'Yönetim'];
    words.forEach((w, i) => {
      const tt = S.L(0) + S.D(0) * (0.45 + i * 0.14);
      txt(ctx, w, W / 2 + (i - 1) * 300, 250, { size: 44, weight: 600, color: CREAM, alpha: fade(t, tt, S.L(1), 0.6, 1), shadow: 14 });
      if (i < 2) star8(ctx, W / 2 + (i - 0.5) * 300, 250, 8 * fade(t, tt + 0.2, S.L(1), 0.6, 1), GOLD, true, 1);
    });
    // kardeşlik
    const ka = fade(t, S.L(1) - 0.3, S.L(2) + 0.3, 0.8, 0.8);
    if (ka > 0) {
      ctx.save(); ctx.globalAlpha = ka;
      ctx.fillStyle = 'rgba(10,6,6,0.55)'; ctx.fillRect(0, 0, W, H);
      const p = easeInOut(prog(t, S.L(1) + 0.4, S.L(1) + S.D(1) * 0.7));
      const r = rng(8);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 140; i++) {
        const side = i % 2 ? 1 : -1;
        const a0 = r() * TAU, rr = 20 + r() * 110;
        const sx = W / 2 + side * 520 + Math.cos(a0) * rr, sy = H * 0.46 + Math.sin(a0) * rr * 0.7;
        const ang = (i / 140) * TAU * 3 + t * 0.6;
        const ex = W / 2 + Math.cos(ang) * 150, ey = H * 0.46 + Math.sin(ang) * 150;
        const x = lerp(sx, ex, p), y = lerp(sy, ey, p);
        ctx.fillStyle = side < 0 ? 'rgba(255,214,140,0.65)' : 'rgba(140,230,210,0.65)';
        ctx.beginPath(); ctx.arc(x, y, 3 + r() * 2, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      txt(ctx, 'Muhâcirler', W / 2 - 520, H * 0.46 - 190, { font: 'Cinzel', size: 40, weight: 600, color: '#ffd98f', alpha: 1 - p * 0.6 });
      txt(ctx, "Mekke'den göç edenler", W / 2 - 520, H * 0.46 - 145, { size: 30, italic: true, color: CREAM, alpha: 1 - p * 0.6 });
      txt(ctx, 'Ensâr', W / 2 + 520, H * 0.46 - 190, { font: 'Cinzel', size: 40, weight: 600, color: '#9fe8d6', alpha: 1 - p * 0.6 });
      txt(ctx, 'Medineli yardımcılar', W / 2 + 520, H * 0.46 - 145, { size: 30, italic: true, color: CREAM, alpha: 1 - p * 0.6 });
      star8(ctx, W / 2, H * 0.46, 70 * smooth(0.7, 1, p), GOLD, false, 2.5, t * 0.2);
      txt(ctx, 'Muâhât · Kardeşlik', W / 2, H * 0.46 + 230, { font: 'Cinzel', size: 50, weight: 700, gold: true, spacing: 6, alpha: smooth(0.75, 1, p) });
      ctx.restore();
    }
    // Medine Sözleşmesi
    const sa = fade(t, S.L(2) - 0.3, S.end + 1, 0.8, 0.8);
    if (sa > 0) {
      ctx.save(); ctx.globalAlpha = sa;
      ctx.fillStyle = 'rgba(10,6,6,0.6)'; ctx.fillRect(0, 0, W, H);
      parchment(ctx, W / 2, H * 0.47, 1100, 560, prog(t, S.L(2) + 0.1, S.L(2) + 1.6), {
        write: prog(t, S.L(2) + 1.2, S.E(2) + 0.5), lh: 66,
        lines: ['بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', 'هَٰذَا كِتَابٌ مِنْ مُحَمَّدٍ ٱلنَّبِيِّ', 'بَيْنَ ٱلْمُؤْمِنِينَ وَٱلْمُسْلِمِينَ مِنْ قُرَيْشٍ وَيَثْرِبَ', 'وَمَنْ تَبِعَهُمْ فَلَحِقَ بِهِمْ وَجَاهَدَ مَعَهُمْ', 'إِنَّهُمْ أُمَّةٌ وَاحِدَةٌ مِنْ دُونِ ٱلنَّاسِ', '· · ·'] });
      txt(ctx, 'Medine Sözleşmesi', W / 2, H * 0.47 + 340, { font: 'Cinzel', size: 50, weight: 700, gold: true, spacing: 6, alpha: prog(t, S.L(2) + 1.4, S.L(2) + 2.4), shadow: 16 });
      ctx.restore();
    }
  },
};

// ---------- 9. Savaşlar ve Hudeybiye ----------
SCENES.battles = {
  xin: 1.2,
  cams(S) {
    return [
      [S.start - 0.3, 39.4, 23.0, 7.6],
      [S.L(1) + 0.3, 39.1, 23.5, 8.2],
      [S.E(1), 39.0, 23.6, 8.4],
      [S.L(2) + 1.9, 39.6, 24.48, 10.0],
      [S.E(2) + 0.2, 39.6, 24.48, 10.15],
      [S.L(3) + 1.2, 39.7, 21.5, 9.0],
      [S.E(3), 39.7, 21.5, 9.1],
      [S.L(4) + 2.9, 37.0, 28.5, 5.0],
      [S.end - 0.1, 37.5, 28.0, 5.1],
    ];
  },
  draw(ctx, t, S) {
    const c = mapBase(ctx, t, { dark: 0.1 });
    // tehdit oku
    arrow(ctx, c, 'mekke', 'medine', prog(t, S.L(0) + 0.4, S.L(0) + 2.6), { color: '#e86a50', width: 6, alpha: fade(t, S.L(0), S.L(1) + 0.5, 0.5, 0.8), bend: 0.12 });
    cityMark(ctx, c, 'mekke', fade(t, S.start, S.L(4) + 1.5, 0.5, 1), { size: 34, side: 'left' });
    cityMark(ctx, c, 'medine', fade(t, S.start, S.L(4) + 1.5, 0.5, 1), { size: 34, side: 'right', glow: true });
    // Bedir
    const ba = fade(t, S.L(1) + 0.4, S.L(2) + 0.6, 0.6, 0.8);
    const [bx, by] = PK(c, 'bedir');
    battleIcon(ctx, bx, by, ba, 1.3);
    txt(ctx, 'Bedir', bx, by - 58, { font: 'Cinzel', size: 38, weight: 700, color: CREAM, alpha: ba, stroke: 5 });
    txt(ctx, '313', bx - 90, by + 70, { font: 'Cinzel', size: 40, weight: 700, color: '#ffe0a0', alpha: ba * prog(t, S.L(1) + 1.6, S.L(1) + 2.4), stroke: 5 });
    txt(ctx, 'vs', bx, by + 70, { size: 30, italic: true, color: CREAM, alpha: ba * prog(t, S.L(1) + 1.9, S.L(1) + 2.6), stroke: 4 });
    txt(ctx, '~1000', bx + 100, by + 70, { font: 'Cinzel', size: 40, weight: 700, color: '#ff9a80', alpha: ba * prog(t, S.L(1) + 2.2, S.L(1) + 3.0), stroke: 5 });
    // Uhud ve Hendek
    const ua = fade(t, S.L(2) + 0.6, S.L(3) + 0.4, 0.6, 0.8);
    const [ux, uy] = PK(c, 'uhud');
    battleIcon(ctx, ux + 10, uy - 60, ua * prog(t, S.L(2) + 1.4, S.L(2) + 2.2), 1.2);
    txt(ctx, 'Uhud · 625', ux + 10, uy - 120, { font: 'Cinzel', size: 34, weight: 700, color: CREAM, alpha: ua * prog(t, S.L(2) + 1.6, S.L(2) + 2.4), stroke: 5 });
    const tr = prog(t, S.L(2) + S.D(2) * 0.45, S.L(2) + S.D(2) * 0.85);
    if (ua > 0 && tr > 0) {
      const tp = [[39.535, 24.488], [39.56, 24.497], [39.59, 24.502], [39.62, 24.50], [39.65, 24.493], [39.67, 24.482]].map(q => PL(c, q[0], q[1]));
      ctx.save(); ctx.globalAlpha = ua; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(30,18,8,0.8)'; ctx.lineWidth = 16; partialPolyline(ctx, tp, tr); ctx.stroke();
      ctx.strokeStyle = '#ffcc70'; ctx.lineWidth = 6; ctx.setLineDash([6, 8]); partialPolyline(ctx, tp, tr); ctx.stroke();
      ctx.restore();
      txt(ctx, 'Hendek · 627', tp[3][0], tp[3][1] + 70, { font: 'Cinzel', size: 34, weight: 700, color: '#ffe3a8', alpha: ua * tr, stroke: 5 });
    }
    // Hudeybiye
    const hu = fade(t, S.L(3) + 0.8, S.L(4) + 0.8, 0.6, 0.8);
    const [hx, hy] = PK(c, 'hudeybiye');
    scrollIcon(ctx, hx, hy - 10, hu, 2.2);
    txt(ctx, 'Hudeybiye', hx, hy - 70, { font: 'Cinzel', size: 36, weight: 700, color: CREAM, alpha: hu, stroke: 5 });
    quoteCard(ctx, t, S.L(3) + S.D(3) * 0.62, S.L(4) + 0.4, 'Şüphesiz biz sana apaçık bir fetih verdik.', 'Fetih Suresi, 1', { size: 56, backdrop: true });
    // mektuplar
    const la = fade(t, S.L(4) + 2.2, S.end + 1, 0.6, 1);
    if (la > 0) {
      const targets = [['busra', 'Herakleios', 'Bizans', -0.15], ['medain', 'Hüsrev', 'İran', 0.15], ['iskenderiye', 'Mukavkıs', 'Mısır', -0.2]];
      targets.forEach(([k, who, land], i) => {
        const p = prog(t, S.L(4) + 2.6 + i * 0.6, S.L(4) + 4.6 + i * 0.6);
        arrow(ctx, c, 'medine', k, p, { color: '#f3e0b0', width: 4, alpha: la, bend: land === 'İran' ? 0.15 : -0.15, head: false });
        const A = place('medine'), B = place(k);
        const pts = quadPts(A, B, land === 'İran' ? 0.15 : -0.15).map(q => P(c, q[0], q[1]));
        ctx.save(); const r = partialPolyline(ctx, pts, p); ctx.restore();
        if (r) scrollIcon(ctx, r.tip[0], r.tip[1], la, 1.5);
        cityMark(ctx, c, k, la * prog(t, S.L(4) + 4.2 + i * 0.6, S.L(4) + 5 + i * 0.6), { size: 30, name: land, sub: who, side: land === 'İran' ? 'right' : 'left' });
      });
    }
    dateCard(ctx, t, S.L(1) + 0.3, S.L(2) + 0.2, '624', 'Bedir Savaşı');
    dateCard(ctx, t, S.L(2) + 0.4, S.L(3) - 0.1, '625 – 627', 'Uhud ve Hendek');
    dateCard(ctx, t, S.L(3) + 0.3, S.L(3) + S.D(3) * 0.6, '628', 'Hudeybiye Antlaşması');
    dateCard(ctx, t, S.L(4) + 0.6, S.end + 0.4, '628 – 629', 'Hükümdarlara davet mektupları');
  },
};

// ---------- 10. Mekke'nin fethi ----------
SCENES.conquest = {
  xin: 1.2,
  cams(S) {
    return [[S.start + 0.3, 37.5, 28.0, 5.1], [S.L(0) + 1.4, 39.6, 23.2, 7.5], [S.E(0) + 0.6, 39.8, 21.8, 8.6]];
  },
  draw(ctx, t, S) {
    const k = smooth(S.L(1) - 0.8, S.L(1) + 0.5, t);
    if (k < 1) {
      const c = mapBase(ctx, t, { dark: 0.08 });
      arrow(ctx, c, 'medine', 'mekke', prog(t, S.L(0) + 0.6, S.E(0) + 0.2), { color: '#ffd27a', width: 12, via: [[39.4, 23.4], [39.6, 22.4]] });
      cityMark(ctx, c, 'medine', 1, { size: 34, side: 'right' });
      cityMark(ctx, c, 'mekke', 1, { size: 38, side: 'left', glow: true, pulse: prog(t, S.E(0) - 0.4, S.E(0) + 1.6) });
      const pts = smoothPts([place('medine'), merc(39.4, 23.4), merc(39.6, 22.4), place('mekke')], 16).map(q => P(c, q[0], q[1]));
      ctx.save(); const r = partialPolyline(ctx, pts, prog(t, S.L(0) + 0.6, S.E(0) + 0.2)); ctx.restore();
      if (r) txt(ctx, '10.000', r.tip[0] + 60, r.tip[1] - 20, { font: 'Cinzel', size: 44, weight: 700, color: '#ffe8b8', align: 'left', stroke: 6, alpha: prog(t, S.L(0) + 1.2, S.L(0) + 2) });
    }
    if (k > 0) {
      ctx.save(); ctx.globalAlpha = k;
      kaabaScene(ctx, t, { dawn: 1, scale: 1.02 + 0.05 * prog(t, S.L(1), S.end), light: 0.6, t0: S.start });
      godRays(ctx, W / 2 + 70, H * 0.36, t, 0.55 * fade(t, S.L(1), S.end + 1, 1.5, 1), { n: 16, len: 1500, core: 180, width: 0.05 });
      ctx.restore();
    }
    dateCard(ctx, t, S.L(0) + 0.3, S.L(2) - 0.2, '630', "Mekke'nin Fethi", { sub: 'Kan dökülmeden, genel af ile' });
    quoteCard(ctx, t, S.L(2) + S.D(2) * 0.38, S.end + 0.8, 'Bugün size kınama yok. Gidin, hepiniz serbestsiniz.', 'Mekke halkına genel af', { size: 64 });
  },
};

// ---------- 11. Veda Haccı ve vefat ----------
SCENES.farewell = {
  xin: 1.3,
  cams(S) {
    return [[S.L(2) - 1.5, 41.0, 22.8, 6.6], [S.L(2) + 2, 44.5, 23.5, 5.6], [S.end + 0.5, 45, 24, 5.45]];
  },
  draw(ctx, t, S) {
    const k = smooth(S.L(2) - 1.0, S.L(2) + 0.4, t);
    if (k < 1) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#2c2648'); g.addColorStop(0.5, '#c06a52'); g.addColorStop(0.75, '#f4ad6a'); g.addColorStop(1, '#ffd9a0');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const sy = H * 0.66 + 40 * prog(t, S.start, S.L(2));
      const sg = ctx.createRadialGradient(W * 0.3, sy, 10, W * 0.3, sy, 600);
      sg.addColorStop(0, 'rgba(255,248,220,1)'); sg.addColorStop(0.06, 'rgba(255,220,160,0.9)'); sg.addColorStop(0.3, 'rgba(255,170,110,0.35)'); sg.addColorStop(1, 'rgba(255,150,90,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
      const rg = ART.ridges.arafat;
      fillRidge(ctx, rg[0], '#7a4a48', 'rgba(255,215,170,0.3)');
      fillRidge(ctx, rg[1], '#4a2a28');
      // Rahmet Dağı ve sütun
      fillRidge(ctx, ART.ridges.rahma, '#2a1714', 'rgba(255,200,160,0.25)');
      ctx.fillStyle = '#efe6d6'; ctx.fillRect(W * 0.6 - 5, H * 0.655 - 50, 10, 52);
      ctx.fillStyle = 'rgba(255,230,200,0.5)'; ctx.fillRect(W * 0.6 - 5, H * 0.655 - 50, 3, 52);
      // çadırlar
      const r = rng(31);
      for (let i = 0; i < 70; i++) {
        const x = r() * W, y = H * 0.80 + r() * 60, s = 8 + r() * 10;
        ctx.fillStyle = `rgba(250,240,225,${0.5 + r() * 0.4})`;
        ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y - s * 0.9); ctx.lineTo(x + s, y); ctx.fill();
      }
      const fg = ctx.createLinearGradient(0, H * 0.84, 0, H);
      fg.addColorStop(0, '#3a2018'); fg.addColorStop(1, '#170c08');
      ctx.fillStyle = fg; ctx.fillRect(0, H * 0.86, W, H * 0.14);
      motes(ctx, t, 0.7, { n: 50, seed: 41 });
      txt(ctx, 'Arafat', W / 2, 140, { font: 'Cinzel', size: 52, weight: 700, spacing: 10, gold: true, alpha: fade(t, S.start + 0.6, S.L(1), 1, 1), shadow: 16 });
      dateCard(ctx, t, S.L(0) + 0.2, S.L(1) - 0.1, '632', 'Veda Haccı', { sub: 'Veda Hutbesi' });
      quoteCard(ctx, t, S.L(1) - 0.3, S.L(2) - 0.4, "Arap'ın Arap olmayana, Arap olmayanın da Arap'a üstünlüğü yoktur. Üstünlük ancak takvadadır.", 'Veda Hutbesi', { size: 58, maxW: 1400, revealDur: S.D(1) * 0.7 });
    }
    if (k > 0) {
      ctx.save(); ctx.globalAlpha = k;
      const c = mapBase(ctx, t, { dark: 0.1 });
      territory(ctx, c, 't632', { reveal: [spread('medine', t, S.L(2) + 0.8, S.E(2) - 0.5, 22)], front: true, fill: 'rgba(214,160,60,0.45)', glow: 'rgba(255,215,130,0.4)', stroke: 'rgba(255,226,160,0.95)' });
      cityMark(ctx, c, 'medine', 1, { size: 30, side: 'right', glow: true });
      cityMark(ctx, c, 'mekke', 1, { size: 30, side: 'left' });
      regionLabel(ctx, c, 47.5, 20.5, 'ARABİSTAN', prog(t, S.E(2) - 2, S.E(2)), { size: 46, spacing: 14 });
      ctx.restore();
      dateCard(ctx, t, S.L(2) + 0.5, S.end + 0.6, '632', 'Peygamber Efendimizin vefatı', { sub: 'Arabistan tek inanç etrafında' });
    }
  },
};

// ---------- 12. Dört Halife ----------
const CALIPHS = [['أَبُو بَكْر', 'Hz. Ebubekir', '632 – 634'], ['عُمَر', 'Hz. Ömer', '634 – 644'], ['عُثْمَان', 'Hz. Osman', '644 – 656'], ['عَلِيّ', 'Hz. Ali', '656 – 661']];
SCENES.caliphs = {
  xin: 1.2,
  cams(S) {
    return [
      [S.start - 0.3, 45, 24, 5.45],
      [S.L(2) - 0.2, 45, 25.5, 5.3],
      [S.L(2) + 2.5, 44, 30.5, 5.15],
      [S.L(3) + 0.5, 39, 30.5, 5.25],
      [S.L(4) + 1.0, 45, 31.5, 4.85],
      [S.L(6), 47, 32, 4.75],
      [S.end + 0.5, 47, 32, 4.7],
    ];
  },
  draw(ctx, t, S) {
    const panel = fade(t, S.L(0) - 0.4, S.L(2) + 0.4, 0.8, 0.9);
    const c = mapBase(ctx, t, { dark: 0.12 + 0.4 * panel });
    // bölgeler
    territory(ctx, c, 't632', { fill: 'rgba(214,160,60,0.42)', glow: 'rgba(255,215,130,0.35)', stroke: 'rgba(255,226,160,0.9)' });
    const fr = [
      spread('medine', t, S.L(2) + 0.6, S.L(2) + 4.5, 11),
      spread('yermuk', t, S.L(2) + 1.2, S.L(2) + 5.0, 9),
      spread('kadisiye', t, S.L(2) + 1.8, S.L(2) + 5.5, 10),
      spread('nihavend', t, S.L(2) + 3.0, S.L(3) + 1.0, 14),
      spread('kudus', t, S.L(3) + 0.1, S.L(3) + 2, 5),
      spread('fustat', t, S.L(3) + 1.0, S.L(3) + 4.0, 13),
      spread('nisabur', t, S.L(4) + 0.5, S.L(4) + 4.5, 14),
      spread('trablus', t, S.L(4) + 1.0, S.L(4) + 4.5, 12),
      spread('ani', t, S.L(4) + 1.5, S.L(4) + 4.5, 8),
    ];
    territory(ctx, c, 't661', { reveal: fr, front: true, fill: 'rgba(46,140,96,0.44)', glow: 'rgba(140,235,170,0.35)', stroke: 'rgba(200,255,215,0.9)' });
    // savaşlar ve şehirler
    const bt = (key, t0, label, yr) => {
      const a = fade(t, t0, S.L(4) + 0.3, 0.6, 1);
      if (a <= 0) return;
      const [x, y] = PK(c, key);
      battleIcon(ctx, x, y, a, 0.95);
      txt(ctx, label, x, y - 46, { font: 'Cinzel', size: 28, weight: 700, color: CREAM, alpha: a, stroke: 5 });
      txt(ctx, yr, x, y + 44, { size: 26, weight: 700, color: '#ffe0a0', alpha: a, stroke: 4 });
    };
    bt('yermuk', S.L(2) + S.D(2) * 0.38, 'Yermük', '636');
    bt('kadisiye', S.L(2) + S.D(2) * 0.55, 'Kadisiye', '636');
    bt('nihavend', S.L(2) + S.D(2) * 0.9, 'Nihavend', '642');
    cityMark(ctx, c, 'kudus', fade(t, S.L(3), S.end + 1, 0.6, 1), { size: 30, side: 'left', sub: '638 · barışla', glow: true, pulse: prog(t, S.L(3) + 0.2, S.L(3) + 2.2) });
    cityMark(ctx, c, 'fustat', fade(t, S.L(3) + S.D(3) * 0.5, S.end + 1, 0.6, 1), { size: 30, side: 'left', name: 'Mısır', sub: '641' });
    cityMark(ctx, c, 'medine', 1, { size: 28, side: 'right' });
    // Mushaf nüshaları
    const mp = fade(t, S.L(4) + 0.3, S.L(5) + 0.5, 0.6, 0.8);
    if (mp > 0) {
      ['kufe', 'basra', 'sam', 'mekke'].forEach((k, i) => {
        const p = prog(t, S.L(4) + 0.5 + i * 0.25, S.L(4) + 2.6 + i * 0.25);
        arrow(ctx, c, 'medine', k, p, { color: '#f3e0b0', width: 3.5, alpha: mp, bend: i % 2 ? 0.12 : -0.12 });
        cityMark(ctx, c, k, mp * prog(t, S.L(4) + 2 + i * 0.25, S.L(4) + 2.8 + i * 0.25), { size: 26, side: k === 'mekke' ? 'left' : 'right', r: 5 });
      });
      const [cx2, cy2] = PK(c, 'kibris');
      const sp2 = prog(t, S.L(4) + S.D(4) * 0.55, S.L(4) + S.D(4) * 0.95);
      const [sx0, sy0] = PL(c, 35.2, 34.2);
      if (sp2 > 0) shipIcon(ctx, lerp(sx0, cx2, sp2), lerp(sy0, cy2, sp2), -1, mp, 1.5);
      cityMark(ctx, c, 'kibris', mp * prog(t, S.L(4) + S.D(4) * 0.8, S.E(4)), { size: 28, side: 'top', r: 5, sub: '649' });
    }
    // Hz. Ali: Kûfe merkez
    cityMark(ctx, c, 'kufe', fade(t, S.L(5), S.end + 1, 0.6, 1), { size: 30, capital: true, side: 'right', sub: 'Hz. Ali döneminde merkez' });
    // sınır bölgeleri etiketleri
    const ea = fade(t, S.L(6) + 0.3, S.end + 1, 0.8, 1);
    regionLabel(ctx, c, 18, 30.2, 'LİBYA', ea * prog(t, S.L(6) + 0.6, S.L(6) + 1.4), { size: 34, spacing: 8 });
    regionLabel(ctx, c, 64.2, 39.6, 'CEYHUN', ea * prog(t, S.L(6) + 1.4, S.L(6) + 2.2), { size: 32, spacing: 8, color: 'rgba(190,230,255,0.95)' });
    regionLabel(ctx, c, 45.5, 43.2, 'KAFKASYA', ea * prog(t, S.L(6) + 2.2, S.L(6) + 3.0), { size: 34, spacing: 8 });
    regionLabel(ctx, c, 62, 18.5, 'HİNT OKYANUSU', ea * prog(t, S.L(6) + 3.0, S.L(6) + 3.8), { size: 32, spacing: 8, color: 'rgba(200,225,255,0.9)', font: 'Cormorant', italic: true });
    // halife paneli
    if (panel > 0) {
      ctx.save(); ctx.globalAlpha = panel;
      txt(ctx, 'DÖRT HALİFE DÖNEMİ', W / 2, 190, { font: 'Cinzel', size: 50, weight: 700, spacing: 10, gold: true, shadow: 16 });
      txt(ctx, 'Hulefâ-yi Râşidîn', W / 2, 245, { size: 36, italic: true, color: CREAM });
      CALIPHS.forEach(([ar, tr, yrs], i) => {
        const x = W / 2 + (i - 1.5) * 380, y = H * 0.55;
        const a = prog(t, S.L(0) + 0.3 + i * 0.35, S.L(0) + 1.1 + i * 0.35);
        const hi = i === 0 ? smooth(S.L(1), S.L(1) + 0.6, t) : 0;
        const dim = 1 - 0.55 * smooth(S.L(1), S.L(1) + 0.6, t) * (i === 0 ? 0 : 1);
        ctx.save(); ctx.globalAlpha *= dim;
        medallion(ctx, x, y, 115 + 10 * hi, ar, a, { size: ar.length > 6 ? 54 : 64 });
        txt(ctx, tr, x, y + 180, { size: 40, weight: 700, color: CREAM, alpha: a });
        txt(ctx, yrs, x, y + 225, { size: 30, italic: true, color: '#e3c88c', alpha: a });
        ctx.restore();
      });
      const ka = fade(t, S.L(1) + 1.0, S.L(2) + 0.4, 0.6, 0.8);
      txt(ctx, "Kur'an-ı Kerîm tek mushafta toplandı", W / 2 - 570, H * 0.55 + 290, { size: 30, italic: true, weight: 600, color: '#ffe3a8', alpha: ka });
      ctx.restore();
    }
    // küçük halife göstergesi (sol alt)
    const mini = fade(t, S.L(2) + 0.4, S.end + 1, 0.8, 1);
    if (mini > 0) {
      const cur = t < S.L(4) ? 1 : t < S.L(5) ? 2 : 3;
      CALIPHS.forEach(([ar, tr], i) => {
        const x = 120 + i * 150, y = H - 210;
        const on = i === cur ? 1 : 0.35;
        medallion(ctx, x, y, 52, ar, mini * on, { size: ar.length > 6 ? 24 : 30 });
        txt(ctx, tr.replace('Hz. ', ''), x, y + 78, { size: 24, weight: 600, color: CREAM, alpha: mini * on, stroke: 4 });
      });
    }
    dateCard(ctx, t, S.L(6) + 0.2, S.end + 0.4, '661', 'Dört Halife Dönemi sonu', { sub: '≈ 6,4 milyon km²' });
  },
};

// ---------- 13. Emeviler ----------
SCENES.umayyad = {
  xin: 1.2,
  cams(S) {
    return [
      [S.start - 0.3, 40, 33, 5.2],
      [S.L(0) + 2, 37.5, 33.5, 5.6],
      [S.L(1) + 0.4, 25, 32, 4.9],
      [S.L(1) + S.D(1) * 0.55, 5, 33.5, 5.0],
      [S.E(1), -5.0, 36.2, 6.6],
      [S.E(2) + 0.2, -5.35, 36.1, 7.6],
      [S.L(3) + 2.6, 62, 35, 5.0],
      [S.E(3) + 0.3, 64, 34, 5.1],
      [S.L(4) + 1.8, 29.0, 40.9, 7.4],
      [S.E(4) + 0.2, 29.0, 41.0, 7.6],
      [S.L(5) + 1.6, 1.0, 43.5, 5.9],
      [S.E(5) + 0.2, 1.0, 43.8, 6.0],
      [S.L(6) + 1.8, 31, 33, 4.18],
      [S.end + 0.6, 31, 33, 4.12],
    ];
  },
  draw(ctx, t, S) {
    const c = mapBase(ctx, t, { dark: 0.1 });
    territory(ctx, c, 't661', { fill: 'rgba(46,140,96,0.40)', glow: 'rgba(140,235,170,0.3)', stroke: 'rgba(200,255,215,0.85)' });
    const fr = [
      spread('berka', t, S.L(1) + 0.2, S.L(1) + 3.2, 14),
      spread('kayrevan', t, S.L(1) + 1.2, S.L(1) + 4.0, 14),
      spread([-2.5, 33.5], t, S.L(1) + 2.4, S.L(1) + 5.2, 16),
      spread('cebelitarik', t, S.E(1) - 0.6, S.E(2) + 1.0, 13),
      spread('narbonne', t, S.E(2), S.L(3) + 1.5, 5),
      spread('merv', t, S.L(3) + 1.6, S.L(3) + 4.6, 14),
      spread('debul', t, S.L(3) + 2.2, S.E(3), 9),
      spread('derbent', t, S.L(3), S.L(3) + 2, 5),
    ];
    territory(ctx, c, 't750', { reveal: fr, front: true, fill: 'rgba(196,150,60,0.42)', glow: 'rgba(255,220,140,0.35)', stroke: 'rgba(255,232,170,0.92)' });
    cityMark(ctx, c, 'sam', fade(t, S.L(0) + 0.3, S.end + 1, 0.6, 1), { size: 32, capital: true, side: 'right', sub: 'Başkent', glow: true, pulse: prog(t, S.L(0) + 0.5, S.L(0) + 2.5) });
    cityMark(ctx, c, 'kayrevan', fade(t, S.L(1) + 1.6, S.L(2) + 1, 0.6, 1), { size: 28, side: 'top', sub: '670' });
    // Tarık bin Ziyad
    arrow(ctx, c, 'tanca', [-5.6, 36.6], prog(t, S.L(1) + S.D(1) * 0.65, S.E(1) + 0.4), { color: '#ffd27a', width: 9, alpha: fade(t, S.L(1) + S.D(1) * 0.6, S.L(3), 0.4, 1), bend: -0.3 });
    const gk = fade(t, S.L(2) - 0.4, S.L(3) + 0.6, 0.6, 1);
    if (gk > 0) {
      const [gx, gy] = PK(c, 'cebelitarik');
      cityMark(ctx, c, 'cebelitarik', gk, { size: 38, side: 'right', glow: true, dx: 6 });
      calligraphy(ctx, 'جَبَلُ طَارِق', gx + 300, gy - 200, prog(t, S.L(2) + 0.2, S.L(2) + 2.0), { size: 86, glow: 24, alpha: gk });
      txt(ctx, "Cebel-i Târık · Târık'ın Dağı", gx + 300, gy - 110, { size: 34, italic: true, weight: 600, color: CREAM, alpha: gk * prog(t, S.L(2) + 1.2, S.L(2) + 2.2), stroke: 5 });
    }
    regionLabel(ctx, c, -4.0, 39.5, 'ENDÜLÜS', fade(t, S.E(1) + 0.4, S.L(3) + 0.6, 1, 1), { size: 44, spacing: 12 });
    // doğu
    const ea = fade(t, S.L(3) + 1.2, S.L(4) + 0.8, 0.8, 1);
    if (ea > 0) {
      arrow(ctx, c, 'merv', 'semerkant', prog(t, S.L(3) + 2.4, S.L(3) + 4.2), { color: '#ffd27a', width: 6, alpha: ea, via: ['buhara'] });
      arrow(ctx, c, [61.5, 25.6], 'multan', prog(t, S.L(3) + S.D(3) * 0.55, S.E(3)), { color: '#ffd27a', width: 6, alpha: ea, via: ['debul'] });
      regionLabel(ctx, c, 66.5, 41.3, 'MAVERAÜNNEHİR', ea * prog(t, S.L(3) + 2.4, S.L(3) + 3.4), { size: 32, spacing: 6 });
      regionLabel(ctx, c, 69.5, 27.0, 'SİND', ea * prog(t, S.L(3) + S.D(3) * 0.75, S.E(3) + 0.5), { size: 36, spacing: 10 });
      cityMark(ctx, c, 'buhara', ea * prog(t, S.L(3) + 2.4, S.L(3) + 3), { size: 26, side: 'left', r: 5 });
      cityMark(ctx, c, 'semerkant', ea * prog(t, S.L(3) + 3, S.L(3) + 3.6), { size: 26, side: 'right', r: 5 });
      cityMark(ctx, c, 'multan', ea * prog(t, S.E(3) - 0.6, S.E(3)), { size: 26, side: 'right', r: 5 });
    }
    // İstanbul kuşatmaları
    const ia = fade(t, S.L(4) + 1.0, S.L(5) + 0.6, 0.8, 1);
    if (ia > 0) {
      const [ix, iy] = PK(c, 'istanbul');
      ctx.save(); ctx.globalAlpha = ia;
      ctx.strokeStyle = 'rgba(255,160,110,0.9)'; ctx.lineWidth = 5; ctx.setLineDash([18, 12]); ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); ctx.arc(ix, iy, 120, -Math.PI / 2, -Math.PI / 2 + TAU * easeInOut(prog(t, S.L(4) + 1.2, S.L(4) + 3))); ctx.stroke();
      ctx.restore();
      [[28.62, 40.86], [28.42, 40.80], [28.20, 40.74], [28.85, 40.92]].forEach((q, i) => { const [sx, sy] = PL(c, q[0], q[1]); shipIcon(ctx, sx + Math.sin(t * 0.8 + i) * 4, sy, -1, ia * prog(t, S.L(4) + 1.8 + i * 0.2, S.L(4) + 2.6 + i * 0.2), 1.4); });
      cityMark(ctx, c, 'istanbul', ia, { size: 36, side: 'left', dx: -110, glow: true });
      cityMark(ctx, c, 'eyup', ia * prog(t, S.L(4) + S.D(4) * 0.45, S.L(4) + S.D(4) * 0.6), { size: 30, side: 'right', name: 'Eyüp Sultan', sub: 'Ebu Eyyub el-Ensârî', dx: 60, dy: -60, r: 6 });
    }
    // Puvatya
    const pa = fade(t, S.L(5) + 1.0, S.L(6) + 0.8, 0.6, 1);
    if (pa > 0) {
      const [px, py] = PK(c, 'puvatya');
      battleIcon(ctx, px, py, pa, 1.3);
      txt(ctx, 'Puvatya · 732', px, py - 62, { font: 'Cinzel', size: 38, weight: 700, color: CREAM, alpha: pa, stroke: 5 });
      ctx.save(); ctx.globalAlpha = pa * prog(t, S.L(5) + 1.6, S.L(5) + 2.6);
      ctx.strokeStyle = 'rgba(255,120,90,0.85)'; ctx.lineWidth = 4; ctx.setLineDash([10, 10]);
      const a1 = PL(c, -2.5, 45.6), a2 = PL(c, 4.5, 45.9);
      ctx.beginPath(); ctx.moveTo(...a1); ctx.lineTo(...a2); ctx.stroke(); ctx.restore();
    }
    // genel
    const ga = fade(t, S.L(6) + 1.6, S.end + 1, 1, 1);
    regionLabel(ctx, c, 30, 27.2, 'EMEVÎ DEVLETİ', ga, { size: 50, spacing: 16 });
    txt(ctx, "İspanya'dan İndus'a · ≈ 11 milyon km²", PL(c, 30, 27.2)[0], PL(c, 30, 27.2)[1] + 60, { size: 34, italic: true, weight: 600, color: CREAM, alpha: ga * prog(t, S.L(6) + 2.2, S.L(6) + 3.2), stroke: 5 });
    dateCard(ctx, t, S.L(0) + 0.2, S.L(1) - 0.1, '661', 'Emevîler', { sub: 'Başkent: Şam' });
    dateCard(ctx, t, S.L(1) + S.D(1) * 0.58, S.L(3) - 0.2, '711', "Endülüs'e geçiş", { sub: 'Tarık bin Ziyad' });
    dateCard(ctx, t, S.L(3) + 0.4, S.L(4) - 0.2, '705 – 715', 'Doğuda fetihler', { sub: 'Kuteybe bin Müslim · Muhammed bin Kasım' });
    dateCard(ctx, t, S.L(4) + 0.4, S.L(5) - 0.2, '674 · 717', 'İstanbul kuşatmaları');
    dateCard(ctx, t, S.L(5) + 0.4, S.L(6) - 0.2, '732', 'Puvatya Savaşı');
  },
};

// ---------- 14. Abbasiler ve ilim ----------
SCENES.abbasid = {
  xin: 1.2,
  cams(S) {
    return [
      [S.start - 0.3, 31, 33, 4.15],
      [S.L(0) + 1.5, 40, 33, 4.5],
      [S.L(1) + 2.0, 70, 40.5, 5.9],
      [S.E(1), 71, 41.5, 6.1],
      [S.L(2) + 1.6, 44.4, 33.3, 7.4],
      [S.L(2) + 4, 44.4, 33.3, 7.8],
    ];
  },
  draw(ctx, t, S) {
    const mapA = 1 - smooth(S.L(2) + 2.2, S.L(2) + 3.4, t);
    if (mapA > 0) {
      const c = mapBase(ctx, t, { dark: 0.1 });
      const rec = smooth(S.L(0) + 0.4, S.L(0) + 2.4, t);
      territory(ctx, c, 't750', { alpha: 1 - rec, fill: 'rgba(196,150,60,0.42)', glow: 'rgba(255,220,140,0.35)', stroke: 'rgba(255,232,170,0.92)' });
      territory(ctx, c, 't800', { alpha: rec, fill: 'rgba(38,62,120,0.50)', glow: 'rgba(150,190,255,0.35)', stroke: 'rgba(230,205,140,0.95)' });
      regionLabel(ctx, c, 47, 30.5, 'ABBÂSÎLER', fade(t, S.L(0) + 1.2, S.L(1) + 1.5, 1, 1), { size: 52, spacing: 16 });
      // Talas
      const ta = fade(t, S.L(1) + 1.2, S.L(2) + 0.8, 0.8, 1);
      if (ta > 0) {
        const [tx, ty] = PK(c, 'talas');
        arrow(ctx, c, 'semerkant', [71.7, 42.3], prog(t, S.L(1) + 1.6, S.L(1) + 3.6), { color: '#ffd27a', width: 7, alpha: ta, via: ['taskent'] });
        arrow(ctx, c, [79.5, 41.0], [72.9, 42.55], prog(t, S.L(1) + 2.0, S.L(1) + 3.8), { color: '#e86a50', width: 7, alpha: ta, bend: 0.1 });
        battleIcon(ctx, tx, ty, ta * prog(t, S.L(1) + 3.4, S.L(1) + 4.2), 1.3);
        txt(ctx, 'Talas · 751', tx, ty - 62, { font: 'Cinzel', size: 38, weight: 700, color: CREAM, alpha: ta * prog(t, S.L(1) + 3.4, S.L(1) + 4.2), stroke: 5 });
        regionLabel(ctx, c, 76.5, 44.2, 'KARLUKLAR', ta * prog(t, S.L(1) + S.D(1) * 0.35, S.L(1) + S.D(1) * 0.5), { size: 34, spacing: 8, color: 'rgba(170,230,255,0.95)' });
        regionLabel(ctx, c, 80.5, 39.2, 'TANG ÇİNİ', ta * prog(t, S.L(1) + 2.2, S.L(1) + 3.2), { size: 34, spacing: 8, color: 'rgba(255,190,170,0.95)' });
      }
      cityMark(ctx, c, 'bagdat', fade(t, S.L(2) + 0.2, S.end, 0.6, 1), { size: 38, capital: true, side: 'right', glow: true, pulse: prog(t, S.L(2) + 0.8, S.L(2) + 2.8) });
      if (mapA < 1) { ctx.fillStyle = `rgba(4,6,10,${1 - mapA})`; ctx.fillRect(0, 0, W, H); }
    }
    // Bağdat yuvarlak şehir
    const rcA = fade(t, S.L(2) + 2.2, S.L(3) + 0.4, 1.0, 0.8);
    if (rcA > 0) {
      ctx.save(); ctx.globalAlpha = rcA;
      ctx.fillStyle = '#060a12'; ctx.fillRect(0, 0, W, H);
      patternLayer(ctx, t, 1, { alpha: 0.05, cell: 220 });
      roundCity(ctx, W / 2 - 120, H / 2 + 20, 330, prog(t, S.L(2) + 2.4, S.L(3) + 0.2), t);
      txt(ctx, 'Bağdat · 762', W / 2 + 560, 200, { font: 'Cinzel', size: 50, weight: 700, gold: true, spacing: 6, align: 'center' });
      txt(ctx, "Medînetü's-Selâm", W / 2 + 560, 254, { size: 36, italic: true, color: CREAM });
      txt(ctx, 'Barış Şehri', W / 2 + 560, 296, { size: 30, italic: true, color: '#d8c49a' });
      txt(ctx, 'Dicle', W / 2 + 330, H - 120, { size: 32, italic: true, color: 'rgba(190,225,245,0.9)' });
      ctx.restore();
    }
    // Beytü'l-Hikme
    const bh = fade(t, S.L(3) - 0.4, S.L(4) + 0.4, 0.9, 0.8);
    if (bh > 0) {
      ctx.save(); ctx.globalAlpha = bh;
      const g = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.7);
      g.addColorStop(0, '#2a1c0e'); g.addColorStop(1, '#070504');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      bookshelves(ctx, t);
      motes(ctx, t, 0.8, { n: 60, seed: 51 });
      calligraphy(ctx, 'بَيْتُ ٱلْحِكْمَة', W / 2, 190, prog(t, S.L(3), S.L(3) + 1.8), { size: 100, glow: 26 });
      txt(ctx, "Beytü'l-Hikme · Bilgelik Evi", W / 2, 290, { size: 38, italic: true, weight: 600, color: CREAM, alpha: prog(t, S.L(3) + 1, S.L(3) + 2) });
      const mp = easeInOut(prog(t, S.L(3) + 1.0, S.E(3) + 0.4));
      const src = [['gr', 'Yunanca', -1], ['in', 'Sanskritçe', 0], ['fa', 'Farsça', 1]];
      src.forEach(([sc, lb, i], k) => {
        const x0 = W / 2 - 600, y0 = H / 2 + 120 + i * 190;
        const x = lerp(x0, W / 2 + 120, mp), y = lerp(y0, H / 2 + 140, mp);
        manuscript(ctx, x, y, 200, 250, lerp(i * 0.12, 0, mp), 1 - smooth(0.85, 1, mp), k + 1, sc);
        txt(ctx, lb, x0 - 140, y0, { font: 'Cinzel', size: 34, weight: 600, color: CREAM, alpha: 1 - mp, align: 'right', shadow: 10 });
      });
      manuscript(ctx, W / 2 + 380, H / 2 + 130, 320, 400, 0, smooth(0.75, 1, mp), 9, 'ar');
      txt(ctx, 'Arapça', W / 2 + 380, H / 2 + 360, { font: 'Cinzel', size: 40, weight: 700, gold: true, alpha: smooth(0.85, 1, mp) });
      ctx.restore();
    }
    // Harezmi, cebir, rakamlar
    const hz = fade(t, S.L(4) - 0.4, S.L(5) + 0.4, 0.9, 0.8);
    if (hz > 0) {
      ctx.save(); ctx.globalAlpha = hz;
      ctx.fillStyle = '#07090c'; ctx.fillRect(0, 0, W, H);
      patternLayer(ctx, t, 1, { alpha: 0.06, cell: 200 });
      calligraphy(ctx, 'ٱلْجَبْر', W / 2, 220, prog(t, S.L(4), S.L(4) + 1.6), { size: 150, glow: 30 });
      txt(ctx, 'Hârizmî · el-Cebr', W / 2, 350, { font: 'Cinzel', size: 46, weight: 700, gold: true, spacing: 4, alpha: prog(t, S.L(4) + 0.8, S.L(4) + 1.8) });
      const eq = 'x² + 10x = 39';
      const ep = prog(t, S.L(4) + 1.4, S.L(4) + 3.0);
      txt(ctx, eq.slice(0, Math.round(eq.length * ep)), W / 2, 480, { size: 64, weight: 600, italic: true, color: CREAM });
      // rakam dönüşümü
      const ea = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      const mp = smooth(S.L(4) + S.D(4) * 0.55, S.L(4) + S.D(4) * 0.85, t);
      const ra = prog(t, S.L(4) + S.D(4) * 0.35, S.L(4) + S.D(4) * 0.5);
      for (let i = 0; i < 10; i++) {
        const x = W / 2 + (i - 4.5) * 120, y = 720;
        txt(ctx, ea[i], x, y - 6, { font: 'Amiri', size: 96, weight: 700, color: '#f1d48c', alpha: ra * (1 - mp) });
        txt(ctx, String(i), x, y, { font: 'Cormorant', size: 104, weight: 600, color: '#fff1d0', alpha: ra * mp });
      }
      txt(ctx, 'Hint–Arap rakamları ve sıfır', W / 2, 840, { size: 38, italic: true, weight: 600, color: CREAM, alpha: ra });
      ctx.restore();
    }
    // âlimler
    const al = fade(t, S.L(5) - 0.4, S.end + 1, 0.9, 0.8);
    if (al > 0) {
      ctx.save(); ctx.globalAlpha = al;
      const g = ctx.createRadialGradient(W * 0.3, H / 2, 50, W * 0.3, H / 2, W * 0.7);
      g.addColorStop(0, '#1a2230'); g.addColorStop(1, '#05070a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      astrolabe(ctx, W * 0.3, H * 0.53, 300, t, prog(t, S.L(5) - 0.2, S.L(5) + 3.0), 1);
      const sch = [['Fârâbî', 'Felsefe ve mantık'], ['İbn Sînâ', 'Tıp · el-Kânûn'], ['Bîrûnî', 'Astronomi ve coğrafya']];
      sch.forEach(([n, f], i) => {
        const a = prog(t, S.L(5) + 0.4 + i * 0.9, S.L(5) + 1.3 + i * 0.9);
        const y = H * 0.33 + i * 170;
        txt(ctx, n, W * 0.58, y, { font: 'Cinzel', size: 56, weight: 700, gold: true, align: 'left', alpha: a, spacing: 3 });
        txt(ctx, f, W * 0.58, y + 56, { size: 36, italic: true, weight: 500, color: CREAM, align: 'left', alpha: a });
      });
      ctx.restore();
    }
    dateCard(ctx, t, S.L(0) + 0.2, S.L(1) - 0.1, '750', 'Abbâsîler', { sub: 'Başkent: Bağdat (762)' });
    dateCard(ctx, t, S.L(1) + 0.4, S.L(2) - 0.2, '751', 'Talas Savaşı', { sub: 'Karluk Türklerinin desteğiyle' });
  },
};

// ---------- 15. Türkler ----------
SCENES.turks = {
  xin: 1.2,
  cams(S) {
    return [
      [S.start - 0.3, 68, 39.5, 5.2],
      [S.L(1) + 0.5, 72, 40.5, 5.45],
      [S.L(2) + 0.6, 66, 36.5, 5.05],
      [S.E(2), 58, 36.5, 5.0],
      [S.L(3) + 1.6, 40, 39.2, 5.85],
      [S.end + 0.6, 37, 39.0, 5.7],
    ];
  },
  draw(ctx, t, S) {
    const c = mapBase(ctx, t, { dark: 0.12 });
    territory(ctx, c, 't800', { alpha: 0.5, fill: 'rgba(38,62,120,0.40)', glow: 'rgba(150,190,255,0.25)', stroke: 'rgba(230,205,140,0.6)' });
    // ışık yayılması (Türkistan)
    const ga = fade(t, S.L(0) + 0.3, S.L(1) + 1, 1, 1);
    if (ga > 0) {
      const [x, y] = PL(c, 70, 42);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 520);
      g.addColorStop(0, `rgba(255,220,150,${0.32 * ga})`); g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 520, 0, TAU); ctx.fill();
      regionLabel(ctx, c, 70, 44.5, 'TÜRKİSTAN', ga, { size: 46, spacing: 14 });
    }
    territory(ctx, c, 'karahan', { reveal: [spread('kasgar', t, S.L(1) + 0.5, S.L(1) + 4.5, 14)], front: true, fill: 'rgba(60,150,170,0.45)', glow: 'rgba(150,230,255,0.35)', stroke: 'rgba(190,240,255,0.95)' });
    const ka = fade(t, S.L(1) + 1.5, S.end + 1, 0.8, 1);
    regionLabel(ctx, c, 74.5, 41.0, 'KARAHANLILAR', ka, { size: 34, spacing: 6 });
    cityMark(ctx, c, 'kasgar', ka, { size: 26, side: 'bottom', r: 5 });
    cityMark(ctx, c, 'balasagun', ka, { size: 26, side: 'top', r: 5 });
    territory(ctx, c, 'gazne', { reveal: [spread('gazne', t, S.L(2) + 0.2, S.L(2) + 3.2, 14)], front: true, fill: 'rgba(170,110,60,0.45)', glow: 'rgba(255,200,140,0.35)', stroke: 'rgba(255,215,170,0.95)' });
    const gz = fade(t, S.L(2) + 0.8, S.end + 1, 0.8, 1);
    regionLabel(ctx, c, 66.5, 31.5, 'GAZNELİLER', gz, { size: 32, spacing: 6 });
    arrow(ctx, c, 'lahor', [79.9, 27.1], prog(t, S.L(2) + 1.6, S.L(2) + 3.6), { color: '#ffd27a', width: 6, alpha: gz, bend: 0.1 });
    territory(ctx, c, 'selcuk', { reveal: [spread('dandanakan', t, S.L(2) + S.D(2) * 0.5, S.E(2) + 1.5, 26)], front: true, fill: 'rgba(170,60,60,0.42)', glow: 'rgba(255,160,150,0.3)', stroke: 'rgba(255,190,180,0.95)' });
    const sa = fade(t, S.L(2) + S.D(2) * 0.6, S.end + 1, 0.8, 1);
    regionLabel(ctx, c, 55.5, 33.6, 'BÜYÜK SELÇUKLU', sa, { size: 38, spacing: 8 });
    cityMark(ctx, c, 'bagdat', sa, { size: 28, side: 'left', sub: '1055' });
    // Malazgirt
    const ma = fade(t, S.L(3) + 1.0, S.end + 1, 0.6, 1);
    if (ma > 0) {
      const [mx, my] = PK(c, 'malazgirt');
      battleIcon(ctx, mx, my, ma, 1.4);
      txt(ctx, 'Malazgirt', mx, my - 64, { font: 'Cinzel', size: 40, weight: 700, color: CREAM, alpha: ma, stroke: 5 });
      const targets = [[30.5, 40.5], [32.5, 37.6], [35.5, 41.2], [37, 37.4]];
      targets.forEach((q, i) => arrow(ctx, c, 'malazgirt', q, prog(t, S.L(3) + 2.4 + i * 0.3, S.L(3) + 4.4 + i * 0.3), { color: '#ffd27a', width: 5, alpha: ma, bend: (i % 2 ? 0.1 : -0.1) }));
      territory(ctx, c, 'anadolu', { reveal: [spread('malazgirt', t, S.L(3) + 2.6, S.end, 16)], front: true, fill: 'rgba(170,60,60,0.32)', glow: 'rgba(255,160,150,0.25)', stroke: 'rgba(255,190,180,0.7)', dash: [10, 8] });
      regionLabel(ctx, c, 33, 39.2, 'ANADOLU', ma * prog(t, S.L(3) + 3.5, S.L(3) + 4.5), { size: 46, spacing: 14 });
    }
    dateCard(ctx, t, S.L(0) + 0.2, S.L(1) + 0.4, 'X. Yüzyıl', 'Türkler İslam\'la buluşuyor');
    dateCard(ctx, t, S.L(1) + 0.6, S.L(2) - 0.2, 'Karahanlılar', 'Satuk Buğra Han', { size: 54 });
    dateCard(ctx, t, S.L(2) + 0.3, S.L(3) - 0.2, '1040', 'Dandanakan', { sub: 'Büyük Selçuklu Devleti' });
    dateCard(ctx, t, S.L(3) + 0.4, S.end + 0.4, '1071', 'Malazgirt Zaferi', { sub: 'Sultan Alparslan' });
  },
};

// ---------- 16. Ticaret yolları ----------
SCENES.trade = {
  xin: 1.2,
  cams(S) {
    return [
      [S.start - 0.3, 62, 16, 3.85],
      [S.L(1) + 0.4, 70, 10, 3.8],
      [S.L(2) + 1.4, 108, 1, 4.7],
      [S.E(2), 108, 0, 4.8],
      [S.L(3) + 1.8, 2, 20, 4.85],
      [S.end - 0.1, 2, 19, 4.95],
    ];
  },
  draw(ctx, t, S) {
    const c = mapBase(ctx, t, { dark: 0.1 });
    territory(ctx, c, 't800', { alpha: 0.6, fill: 'rgba(214,170,80,0.35)', glow: 'rgba(255,220,150,0.25)', stroke: 'rgba(255,226,160,0.6)' });
    territory(ctx, c, 'selcuk', { alpha: 0.4, fill: 'rgba(214,170,80,0.25)', stroke: 'rgba(255,226,160,0.4)' });
    txt(ctx, 'Ticaret, ilim ve gönül yolları', W / 2, 140, { font: 'Cinzel', size: 46, weight: 600, spacing: 6, color: CREAM, alpha: fade(t, S.L(0) + 0.3, S.L(1) + 0.6, 1, 1), shadow: 16 });
    divider(ctx, W / 2, 188, 460, prog(t, S.L(0) + 0.8, S.L(0) + 2), fade(t, S.L(0) + 0.3, S.L(1) + 0.6, 1, 1));
    // deniz yolları
    const sea = fade(t, S.L(1), S.end + 1, 0.6, 1) * (1 - 0.5 * smooth(S.L(3), S.L(3) + 2, t));
    const r1 = ['basra', 'siraf', 'suhar', [62, 20], 'kalikut', [79, 5.6], [88, 6], [96, 6.5], 'malakka', [106, 3], [110, 10], [112, 18], 'kanton'];
    const r2 = ['aden', [50, 11.5], 'mogadisu', 'mombasa', 'zengibar', 'kilva'];
    const r3 = ['kalikut', [80, 0], [95, -3], [104, -5], 'cava'];
    const p1 = prog(t, S.L(1) + 0.4, S.L(1) + S.D(1) + 1.5), p2 = prog(t, S.L(1) + 1.0, S.L(1) + S.D(1) * 0.8), p3 = prog(t, S.L(1) + S.D(1) * 0.5, S.E(1) + 2.0);
    const rr = [[r1, p1], [r2, p2], [r3, p3]].map(([r, p]) => route(ctx, c, r, p, { alpha: sea, t, width: 3.5, color: '#bfe6ff', dash: [10, 8] }));
    rr.forEach((r, i) => { if (r && [p1, p2, p3][i] < 1) shipIcon(ctx, r.tip[0], r.tip[1] - 8, r.ang, sea, 1.2); });
    const ports = [['basra', 'right'], ['siraf', 'right'], ['suhar', 'right'], ['aden', 'left'], ['kalikut', 'left'], ['malakka', 'left'], ['kanton', 'right'], ['mogadisu', 'right'], ['kilva', 'right'], ['cava', 'bottom']];
    ports.forEach(([k, side], i) => cityMark(ctx, c, k, sea * prog(t, S.L(1) + 0.6 + i * 0.35, S.L(1) + 1.2 + i * 0.35), { size: 24, side, r: 4.5 }));
    regionLabel(ctx, c, 70, -5, 'HİNT OKYANUSU', sea * 0.9, { size: 34, spacing: 10, font: 'Cormorant', italic: true, color: 'rgba(200,230,255,0.9)' });
    // Endonezya
    const ia = fade(t, S.L(2) + 0.6, S.L(3) + 0.6, 1, 1);
    if (ia > 0) {
      withCam(ctx, c, s => {
        ctx.save(); ctx.globalAlpha = ia;
        ctx.fillStyle = 'rgba(80,200,140,0.45)'; ctx.fill(MAP.paths.idn, 'evenodd');
        ctx.strokeStyle = 'rgba(200,255,220,0.95)'; ctx.lineWidth = 2 / s; ctx.stroke(MAP.paths.idn);
        ctx.restore();
      });
      regionLabel(ctx, c, 117, 3.5, 'ENDONEZYA', ia, { size: 46, spacing: 12 });
      regionLabel(ctx, c, 117, 1.0, '≈ 240 milyon Müslüman', ia * prog(t, S.L(2) + 1.8, S.L(2) + 2.8), { size: 32, spacing: 1, font: 'Cormorant', italic: true });
      cityMark(ctx, c, 'pasai', ia, { size: 26, side: 'left', sub: 'XIII. yüzyıl', r: 5 });
    }
    // Sahra kervanları ve Mansa Musa
    const sh = fade(t, S.L(3) + 0.6, S.end + 1, 0.8, 1);
    if (sh > 0) {
      route(ctx, c, ['sicilmasa', [-5, 25], 'timbuktu'], prog(t, S.L(3) + 1.2, S.L(3) + 3.6), { alpha: sh, t, width: 4, color: '#ffe7a8' });
      const hp = prog(t, S.L(3) + S.D(3) * 0.35, S.E(3) + 0.5);
      const hr = route(ctx, c, ['niani', 'timbuktu', 'gao', [8, 17], [18, 19], [26, 24], 'kahire', [34, 28], 'mekke'], hp, { alpha: sh, t, width: 5, color: '#ffd27a', dash: [16, 8] });
      if (hr && hp < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const r = rng(Math.floor(t * 12));
        for (let i = 0; i < 24; i++) { ctx.fillStyle = `rgba(255,220,120,${r() * 0.8})`; ctx.fillRect(hr.tip[0] - 40 + r() * 80, hr.tip[1] - 30 + r() * 60, 3, 3); }
        ctx.restore();
      }
      cityMark(ctx, c, 'timbuktu', sh, { size: 34, side: 'top', glow: true, sub: 'ilim şehri', pulse: prog(t, S.E(3) - 2.5, S.E(3) - 0.5) });
      cityMark(ctx, c, 'niani', sh * prog(t, S.L(3) + 2, S.L(3) + 3), { size: 26, side: 'left', name: 'Mali (Niani)', r: 5 });
      cityMark(ctx, c, 'kahire', sh * prog(t, S.L(3) + S.D(3) * 0.6, S.L(3) + S.D(3) * 0.7), { size: 26, side: 'top', r: 5 });
      cityMark(ctx, c, 'mekke', sh * prog(t, S.L(3) + S.D(3) * 0.75, S.L(3) + S.D(3) * 0.85), { size: 26, side: 'right', r: 5 });
      regionLabel(ctx, c, -2, 21.5, 'SAHRA', sh * 0.85, { size: 40, spacing: 18, font: 'Cormorant', italic: true });
    }
    dateCard(ctx, t, S.L(3) + S.D(3) * 0.3, S.end + 0.4, '1324', "Mansa Musa'nın haccı", { sub: 'Mali Sultanlığı' });
  },
};

// ---------- 17. Final ----------
SCENES.finale = {
  xin: 1.2,
  cams(S) {
    return [[S.start + 0.3, 2, 19, 4.95], [S.L(0) + 1.6, 45, 22, 4.3], [S.L(1), 50, 20, 3.75], [S.E(1) + 0.5, 50, 20, 3.7]];
  },
  draw(ctx, t, S) {
    const mapA = 1 - smooth(S.L(2) - 0.8, S.L(2) + 0.6, t);
    if (mapA > 0) {
      const c = mapBase(ctx, t, { dark: 0.2 });
      const eras = [['t632', S.start + 0.2], ['t661', S.start + 1.2], ['t750', S.start + 2.2], ['t800', S.start + 3.2], ['selcuk', S.start + 4.0], ['karahan', S.start + 4.4], ['gazne', S.start + 4.4], ['anadolu', S.start + 4.8]];
      const fadeEras = 1 - smooth(S.L(1) - 0.2, S.L(1) + 1.2, t);
      eras.forEach(([k, t0]) => territory(ctx, c, k, { alpha: 0.5 * smooth(t0, t0 + 1.2, t) * fadeEras, fill: 'rgba(214,170,80,0.35)', glow: 'rgba(255,220,150,0.2)', stroke: 'rgba(255,226,160,0.5)' }));
      const yr = Math.round(lerp(610, 2025, easeInOut(prog(t, S.L(0) + 0.2, S.E(0) + 0.4))));
      txt(ctx, String(yr), W / 2, 150, { font: 'Cinzel', size: 72, weight: 700, gold: true, alpha: fade(t, S.L(0), S.L(1) + 0.5, 0.8, 0.8), shadow: 18 });
      const mo = smooth(S.L(1) - 0.2, S.L(1) + 1.4, t);
      territory(ctx, c, 'modern', { alpha: mo, fill: 'rgba(70,190,130,0.5)', glow: 'rgba(170,255,200,0.4)', stroke: 'rgba(210,255,225,0.95)' });
      const ba = fade(t, S.L(1) + 0.4, S.L(2), 0.8, 0.6);
      if (ba > 0) {
        const g = ctx.createLinearGradient(0, H - 330, 0, H);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, `rgba(3,6,10,${0.55 * ba})`); g.addColorStop(1, `rgba(3,6,10,${0.55 * ba})`);
        ctx.fillStyle = g; ctx.fillRect(0, H - 330, W, 330);
      }
      txt(ctx, '≈ 2 milyar Müslüman', W / 2, H - 230, { font: 'Cinzel', size: 64, weight: 700, gold: true, alpha: ba, shadow: 18 });
      txt(ctx, 'dünya nüfusunun yaklaşık dörtte biri', W / 2, H - 165, { size: 38, italic: true, color: CREAM, alpha: fade(t, S.L(1) + 1.0, S.L(2), 0.8, 0.6), shadow: 12 });
      if (mapA < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - mapA})`; ctx.fillRect(0, 0, W, H); }
    }
    const nA = smooth(S.L(2) - 0.8, S.L(2) + 0.6, t);
    if (nA > 0) {
      ctx.save(); ctx.globalAlpha = nA;
      nightSky(ctx, t, { t0: S.start, top: '#02030a', mid: '#081028', hor: '#1d2140', drift: 3 });
      const rg = ART.ridges.hira;
      fillRidge(ctx, rg[0], '#151527');
      fillRidge(ctx, rg[1], '#0b0b16');
      const glow = 0.4 + 0.6 * smooth(S.L(3), S.E(3), t);
      const cx = W * 0.565, cy = H * 0.355;
      const cg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 220);
      cg.addColorStop(0, `rgba(255,230,170,${0.9 * glow})`); cg.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, 220, 0, TAU); ctx.fill();
      ['İlim', 'Adalet', 'Merhamet'].forEach((w, i) => {
        const tt = S.L(2) + S.D(2) * (0.45 + i * 0.13);
        txt(ctx, w, W / 2 + (i - 1) * 360, H * 0.68, { font: 'Cinzel', size: 60, weight: 700, gold: true, spacing: 6, alpha: fade(t, tt, S.L(3) + 0.4, 0.8, 0.8), shadow: 16 });
        if (i < 2) star8(ctx, W / 2 + (i - 0.5) * 360, H * 0.68, 10 * fade(t, tt + 0.3, S.L(3) + 0.4, 0.6, 0.8), GOLD, true, 1);
      });
      const ok = smooth(S.E(3) - 1.0, S.E(3) + 0.2, t);
      godRays(ctx, cx, H * 0.30, t, ok, { n: 22, len: 1800, core: 300 });
      calligraphy(ctx, 'ٱقْرَأْ', W / 2, H * 0.47, prog(t, S.E(3) - 1.0, S.E(3) + 0.8), { size: 300, glow: 50 });
      ctx.restore();
    }
  },
};

// ---------- 18. Kapanış ----------
SCENES.end = {
  xin: 1.6,
  draw(ctx, t, S) {
    const T = t - S.start, D = S.end - S.start;
    ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, W, H);
    patternLayer(ctx, T, 1, { alpha: 0.07, cell: 180, fadeEdge: true });
    const a = 1 - smooth(D - 2.2, D - 0.8, T);
    ctx.save(); ctx.globalAlpha = a;
    calligraphy(ctx, 'ٱقْرَأْ', W / 2, 250, 1, { size: 150, glow: 30, alpha: 1 - smooth(0, 1.5, T) * 0.5 });
    txt(ctx, "İSLAM'IN DOĞUŞU VE YAYILIŞI", W / 2, 420, { font: 'Cinzel', size: 56, weight: 700, spacing: 8, gold: true, alpha: prog(T, 0.3, 1.3) });
    divider(ctx, W / 2, 470, 560, prog(T, 0.6, 1.8), 1);
    const credits = [
      ['Senaryo, animasyon, seslendirme ve müzik', 'yapay zekâ ile üretildi (Claude · Anthropic)'],
      ['Ses', 'Piper TTS · “Fahrettin” Türkçe sesi'],
      ['Harita verileri', 'Natural Earth · AWS Terrain Tiles · NASA Blue Marble · historical-basemaps'],
      ['Not', 'Haritalardaki sınırlar ve bazı tarihler yaklaşıktır.'],
    ];
    credits.forEach(([k, v], i) => {
      const ca = prog(T, 1.2 + i * 0.5, 2.0 + i * 0.5);
      txt(ctx, k, W / 2, 560 + i * 92, { font: 'Cinzel', size: 26, weight: 600, spacing: 4, color: '#cdb27a', alpha: ca });
      txt(ctx, v, W / 2, 560 + i * 92 + 38, { size: 34, weight: 500, color: CREAM, alpha: ca });
    });
    ctx.restore();
    txt(ctx, 'وَٱللَّهُ أَعْلَمُ', W / 2, H / 2, { font: 'Amiri', size: 90, weight: 700, gold: true, alpha: fade(T, D - 2.4, D, 0.8, 0.9), dir: 'rtl', glow: 20 });
  },
};

// Sahne hazırlıkları (önceden üretilen siluetler)
function prepArt() {
  ART.ridges = {
    kaaba: [ridgePath(101, H * 0.62, 120, 0.55, [{ x: W * 0.15, h: 120, w: 260 }, { x: W * 0.86, h: 90, w: 300 }]), ridgePath(102, H * 0.70, 70, 0.5)],
    birth: [ridgePath(201, H * 0.66, 140, 0.55, [{ x: W * 0.2, h: 110, w: 300 }]), ridgePath(202, H * 0.76, 80, 0.5), ridgePath(203, H * 0.92, 40, 0.45)],
    hira: [ridgePath(301, H * 0.80, 110, 0.55), ridgePath(302, H * 0.98, 150, 0.62, [{ x: W * 0.565, h: 600, w: 190, jag: 120 }, { x: W * 0.47, h: 230, w: 120, jag: 60 }, { x: W * 0.66, h: 300, w: 150, jag: 80 }, { x: W * 0.80, h: 160, w: 200, jag: 50 }])],
    medina: [ridgePath(401, H * 0.66, 110, 0.5, [{ x: W * 0.35, h: 120, w: 380 }, { x: W * 0.62, h: 90, w: 260 }])],
    arafat: [ridgePath(501, H * 0.70, 120, 0.55, [{ x: W * 0.8, h: 140, w: 300 }]), ridgePath(502, H * 0.79, 60, 0.5)],
    rahma: ridgePath(503, H * 0.86, 30, 0.6, [{ x: W * 0.6, h: 150, w: 120 }]),
  };
}
