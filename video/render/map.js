// Harita motoru: çok seviyeli taban harita, kamera, bölgeler, etiketler, oklar, rotalar, simgeler.
const MAP = { levels: [], geo: null, paths: {}, rivers: [] };

function merc(lon, lat) {
  lat = clamp(lat, -85, 85);
  const r = lat * Math.PI / 180;
  return [(lon + 180) / 360 * 256, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 256];
}
// Kamera: {lon, lat, zoom} -> {x, y, zoom}
function cam(lon, lat, zoom) { const [x, y] = merc(lon, lat); return { x, y, zoom }; }

async function loadBitmap(url) {
  const r = await fetch(url);
  const b = await r.blob();
  return await createImageBitmap(b);
}

async function loadMap() {
  for (const [z, file] of [[4, 'base_z4.jpg'], [5, 'base_z5_b.jpg'], [6, 'base_z6_b.jpg'], [7, 'base_z7_b.jpg'], [9, 'base_z9_b.jpg']]) {
    const meta = await (await fetch(`../assets/base_z${z}.json`)).json();
    const img = await loadBitmap(`../assets/${file}`);
    const k = Math.pow(2, z);
    MAP.levels.push({ z, img, k, ox: meta.ox, oy: meta.oy, w: meta.w, h: meta.h,
      x0: meta.ox / k, y0: meta.oy / k, x1: (meta.ox + meta.w) / k, y1: (meta.oy + meta.h) / k });
  }
  MAP.geo = await (await fetch('../assets/geo.json')).json();
  const mk = polys => {
    const p = new Path2D();
    for (const poly of polys) for (const ring of poly) {
      for (let i = 0; i < ring.length; i += 2) i === 0 ? p.moveTo(ring[i], ring[i + 1]) : p.lineTo(ring[i], ring[i + 1]);
      p.closePath();
    }
    return p;
  };
  for (const [k, v] of Object.entries(MAP.geo.terr)) MAP.paths[k] = mk(v);
  MAP.paths.byz = mk(MAP.geo.h600.byz);
  MAP.paths.sas = mk(MAP.geo.h600.sas);
  MAP.paths.modern = mk(MAP.geo.modern);
  MAP.paths.idn = mk(MAP.geo.idn);
  const rv = new Path2D();
  for (const lines of Object.values(MAP.geo.rivers)) for (const l of lines) {
    for (let i = 0; i < l.length; i += 2) i === 0 ? rv.moveTo(l[i], l[i + 1]) : rv.lineTo(l[i], l[i + 1]);
  }
  MAP.paths.rivers = rv;
}

function place(key) { return MAP.geo.places[key].xy; }
function placeName(key) { return MAP.geo.places[key].name; }

// Dünya (z0) -> ekran
function P(c, x, y) {
  const s = Math.pow(2, c.zoom);
  return [W / 2 + (x - c.x) * s, H / 2 + (y - c.y) * s];
}
function PL(c, lon, lat) { const [x, y] = merc(lon, lat); return P(c, x, y); }
function PK(c, key) { const [x, y] = place(key); return P(c, x, y); }

function withCam(ctx, c, fn) {
  const s = Math.pow(2, c.zoom);
  ctx.save();
  ctx.setTransform(s, 0, 0, s, W / 2 - c.x * s, H / 2 - c.y * s);
  fn(s);
  ctx.restore();
}

// --- van Wijk & Nuij yumuşak yakınlaştırma-kaydırma enterpolasyonu ---
function interpZoom(p0, p1, rho = 1.25) {
  const rho2 = rho * rho, rho4 = rho2 * rho2;
  const [ux0, uy0, w0] = p0, [ux1, uy1, w1] = p1;
  const dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy;
  const cosh = x => (Math.exp(x) + Math.exp(-x)) / 2, sinh = x => (Math.exp(x) - Math.exp(-x)) / 2, tanh = x => sinh(x) / cosh(x);
  if (d2 < 1e-12) {
    const S = Math.log(w1 / w0) / rho;
    return t => [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(rho * t * S)];
  }
  const d1 = Math.sqrt(d2);
  const b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1);
  const b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / rho;
  return t => {
    const s = t * S, c0 = cosh(r0);
    const u = w0 / (rho2 * d1) * (c0 * tanh(rho * s + r0) - sinh(r0));
    return [ux0 + u * dx, uy0 + u * dy, w0 * c0 / cosh(rho * s + r0)];
  };
}

// Anahtar karelerden kamera: kf = [[t, lon, lat, zoom], ...] (t mutlak saniye)
function camPath(kf, t) {
  if (t <= kf[0][0]) return cam(kf[0][1], kf[0][2], kf[0][3]);
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i], b = kf[i + 1];
    if (t <= b[0]) {
      const ca = cam(a[1], a[2], a[3]), cb = cam(b[1], b[2], b[3]);
      const f = interpZoom([ca.x, ca.y, W / Math.pow(2, ca.zoom)], [cb.x, cb.y, W / Math.pow(2, cb.zoom)], b[4] || 1.25);
      const e = (b[5] || easeInOut)(prog(t, a[0], b[0]));
      const [x, y, w] = f(e);
      return { x, y, zoom: Math.log2(W / w) };
    }
  }
  const l = kf[kf.length - 1];
  return cam(l[1], l[2], l[3]);
}

// Taban harita: düşük seviyeden yükseğe, görünür alan kırpılarak çizilir
function drawBase(ctx, c, opt = {}) {
  const s = Math.pow(2, c.zoom);
  const vx0 = c.x - W / 2 / s, vy0 = c.y - H / 2 / s, vx1 = c.x + W / 2 / s, vy1 = c.y + H / 2 / s;
  ctx.save();
  ctx.fillStyle = '#071521';
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Hangi seviyeler gerekli? Görünümü tamamen kaplayan en yüksek opak seviyenin altındakileri atla.
  const alphaOf = L => L.z <= 5 ? 1 : L.z === 6 ? smooth(4.6, 5.2, c.zoom) : L.z === 7 ? smooth(5.7, 6.3, c.zoom) : smooth(7.3, 7.9, c.zoom);
  const lv = MAP.levels.filter(L => alphaOf(L) > 0.001 && L.x1 > vx0 && L.x0 < vx1 && L.y1 > vy0 && L.y0 < vy1);
  let startIdx = 0;
  for (let i = lv.length - 1; i >= 0; i--) {
    const L = lv[i];
    const band = (L.z === 9 ? 300 : L.z === 7 ? 500 : L.z === 5 ? 160 : 250) / L.k;
    if (alphaOf(L) >= 0.999 && L.x0 + band <= vx0 && L.x1 - band >= vx1 && L.y0 + band <= vy0 && L.y1 - band >= vy1) { startIdx = i; break; }
  }
  for (let i = startIdx; i < lv.length; i++) {
    const L = lv[i];
    const ix0 = Math.max(vx0, L.x0), iy0 = Math.max(vy0, L.y0), ix1 = Math.min(vx1, L.x1), iy1 = Math.min(vy1, L.y1);
    const sx = ix0 * L.k - L.ox, sy = iy0 * L.k - L.oy, sw = (ix1 - ix0) * L.k, sh = (iy1 - iy0) * L.k;
    const [dx, dy] = P(c, ix0, iy0);
    ctx.globalAlpha = alphaOf(L);
    ctx.drawImage(L.img, sx, sy, sw, sh, dx, dy, (ix1 - ix0) * s, (iy1 - iy0) * s);
  }
  ctx.globalAlpha = 1;
  // Renk düzenlemesi: sıcak, hafif soluk "tarihî atlas" tonu
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = opt.tint || 'rgb(255,238,214)';
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = `rgba(128,128,128,${opt.desat == null ? 0.22 : opt.desat})`;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  if (opt.dark) { ctx.fillStyle = `rgba(6,8,12,${opt.dark})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
  // Nehirler
  if (opt.rivers !== false) {
    withCam(ctx, c, k => {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = `rgba(120,185,215,${0.55 * (opt.riverAlpha == null ? 1 : opt.riverAlpha)})`;
      ctx.lineWidth = clamp(0.6 + (c.zoom - 4) * 0.35, 0.8, 2.6) / k;
      ctx.stroke(MAP.paths.rivers);
    });
  }
}

const LAYER = { a: null, m: null };

// Bölge çizimi. reveal: [{x,y,r,soft}] (z0 birimi) ile yayılma maskesi; front: yayılma cephesinde ışık
function territory(ctx, c, key, o = {}) {
  const path = MAP.paths[key];
  if (!path || (o.alpha != null && o.alpha <= 0.002)) return;
  const L = LAYER.a, lc = L.getContext('2d');
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.clearRect(0, 0, W, H);
  withCam(lc, c, s => {
    lc.fillStyle = o.fill || 'rgba(46,140,96,0.42)';
    lc.fill(path, 'evenodd');
    // iç kenar ışıması
    lc.save();
    lc.clip(path, 'evenodd');
    lc.strokeStyle = o.glow || 'rgba(140,235,170,0.35)';
    lc.lineWidth = 16 / s;
    lc.stroke(path);
    lc.restore();
    lc.strokeStyle = o.stroke || 'rgba(190,255,205,0.9)';
    lc.lineWidth = (o.lw || 2.0) / s;
    lc.lineJoin = 'round';
    if (o.dash) lc.setLineDash(o.dash.map(d => d / s));
    lc.stroke(path);
    lc.setLineDash([]);
  });
  if (o.reveal) {
    const M = LAYER.m, mc = M.getContext('2d');
    mc.setTransform(1, 0, 0, 1, 0, 0);
    mc.clearRect(0, 0, W, H);
    const s = Math.pow(2, c.zoom);
    for (const r of o.reveal) {
      if (r.r <= 0) continue;
      const [sx, sy] = P(c, r.x, r.y);
      const R = r.r * s, soft = r.soft == null ? 0.25 : r.soft;
      const g = mc.createRadialGradient(sx, sy, Math.max(0, R * (1 - soft)), sx, sy, R);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      mc.fillStyle = g;
      mc.beginPath(); mc.arc(sx, sy, R, 0, TAU); mc.fill();
      if (o.front && r.front !== false && r.r < (r.max || 1e9)) {
        // ilerleyen cephede parlak halka
        lc.save();
        lc.globalCompositeOperation = 'source-atop';
        const g2 = lc.createRadialGradient(sx, sy, R * (1 - soft * 1.6), sx, sy, R);
        g2.addColorStop(0, 'rgba(255,240,190,0)');
        g2.addColorStop(0.7, `rgba(255,240,190,${0.55 * (o.frontAlpha == null ? 1 : o.frontAlpha)})`);
        g2.addColorStop(1, 'rgba(255,240,190,0)');
        lc.fillStyle = g2;
        lc.fillRect(0, 0, W, H);
        lc.restore();
      }
    }
    lc.globalCompositeOperation = 'destination-in';
    lc.drawImage(M, 0, 0);
    lc.globalCompositeOperation = 'source-over';
  }
  ctx.save();
  ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
  ctx.drawImage(L, 0, 0);
  ctx.restore();
}

// Yayılma halkası tanımı yardımcı: merkezden, t0..t1 arasında 0..rmax yarıçapa büyür
function spread(keyOrLonLat, t, t0, t1, rmaxDeg, o = {}) {
  const [x, y] = typeof keyOrLonLat === 'string' ? place(keyOrLonLat) : merc(keyOrLonLat[0], keyOrLonLat[1]);
  const p = (o.ease || easeInOut)(prog(t, t0, t1));
  const rmax = rmaxDeg / 360 * 256;
  return { x, y, r: rmax * p, max: rmax * 0.999, soft: o.soft == null ? 0.22 : o.soft };
}

// Şehir işareti + etiket
function cityMark(ctx, c, key, a = 1, o = {}) {
  if (a <= 0) return;
  const [x, y] = o.xy ? P(c, o.xy[0], o.xy[1]) : PK(c, key);
  const name = o.name || placeName(key);
  ctx.save();
  ctx.globalAlpha *= a;
  const r = (o.r || 6) * (0.6 + 0.4 * easeOutBack(clamp(a)));
  if (o.pulse != null && o.pulse > 0 && o.pulse < 1) {
    const pr = r + 40 * easeOut(o.pulse);
    ctx.strokeStyle = `rgba(255,226,160,${0.8 * (1 - o.pulse)})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(x, y, pr, 0, TAU); ctx.stroke();
  }
  if (o.glow) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
    g.addColorStop(0, 'rgba(255,220,150,0.55)');
    g.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 6, 0, TAU); ctx.fill();
  }
  if (o.capital) {
    star8(ctx, x, y, r * 1.7, '#ffe2a0', true, 1.2);
    ctx.fillStyle = '#2b1d0b'; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(20,14,6,0.75)';
    ctx.beginPath(); ctx.arc(x, y, r + 2.4, 0, TAU); ctx.fill();
    ctx.fillStyle = o.color || '#f5d58e';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, TAU); ctx.fill();
  }
  if (name && !o.noLabel) {
    const side = o.side || 'right';
    const dx = side === 'right' ? r + 12 : side === 'left' ? -(r + 12) : 0;
    const dy = side === 'top' ? -(r + 22) : side === 'bottom' ? r + 24 : 0;
    const al = side === 'right' ? 'left' : side === 'left' ? 'right' : 'center';
    txt(ctx, name, x + dx + (o.dx || 0), y + dy + (o.dy || 0), { size: o.size || 30, weight: 600, align: al, color: o.labelColor || '#fbf0d6',
      stroke: 5, strokeColor: 'rgba(12,9,5,0.72)', spacing: 0.5 });
    if (o.sub) txt(ctx, o.sub, x + dx + (o.dx || 0), y + dy + (o.dy || 0) + (o.size || 30) * 0.85, { size: (o.size || 30) * 0.62, weight: 600, align: al,
      color: '#e9cf95', stroke: 4, strokeColor: 'rgba(12,9,5,0.7)', italic: true });
  }
  ctx.restore();
}

// Bölge/ülke adı (geniş, aralıklı büyük harf)
function regionLabel(ctx, c, lon, lat, s, a = 1, o = {}) {
  if (a <= 0) return;
  const [x, y] = PL(c, lon, lat);
  txt(ctx, s, x, y, { size: o.size || 34, weight: o.weight || 600, font: o.font || 'Cinzel', spacing: o.spacing == null ? 6 : o.spacing,
    color: o.color || 'rgba(255,240,210,0.92)', alpha: a, stroke: o.stroke == null ? 6 : o.stroke, strokeColor: o.strokeColor || 'rgba(10,8,4,0.55)', italic: o.italic });
  if (o.sub) txt(ctx, o.sub, x, y + (o.size || 34) * 0.62 + 20, { size: o.subSize || 24, weight: 600, font: 'Cinzel', spacing: 8,
    color: o.color || 'rgba(255,240,210,0.85)', alpha: a, stroke: 5, strokeColor: 'rgba(10,8,4,0.55)' });
}

// Animasyonlu ok (z0 noktaları veya yer anahtarları arasında eğri)
function arrow(ctx, c, from, to, p, o = {}) {
  if (p <= 0) return;
  const A = typeof from === 'string' ? place(from) : merc(from[0], from[1]);
  const B = typeof to === 'string' ? place(to) : merc(to[0], to[1]);
  let pts = o.via ? smoothPts([A, ...o.via.map(v => typeof v === 'string' ? place(v) : merc(v[0], v[1])), B], 16) : quadPts(A, B, o.bend == null ? 0.18 : o.bend);
  pts = pts.map(q => P(c, q[0], q[1]));
  const col = o.color || '#ffd27a';
  const wdt = o.width || 7;
  ctx.save();
  ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(15,10,4,0.45)';
  ctx.lineWidth = wdt + 5;
  let r = partialPolyline(ctx, pts, p); ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = wdt;
  ctx.shadowColor = rgba(col, 0.8); ctx.shadowBlur = 14;
  r = partialPolyline(ctx, pts, p); ctx.stroke();
  ctx.shadowBlur = 0;
  if (r && o.head !== false) {
    const [tx, ty] = r.tip, a = r.ang, hs = wdt * 2.6;
    ctx.translate(tx, ty); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(hs * 0.9, 0); ctx.lineTo(-hs * 0.7, -hs * 0.75); ctx.lineTo(-hs * 0.35, 0); ctx.lineTo(-hs * 0.7, hs * 0.75); ctx.closePath();
    ctx.fillStyle = 'rgba(15,10,4,0.5)'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(15,10,4,0.5)'; ctx.stroke();
    ctx.fillStyle = col; ctx.fill();
  }
  ctx.restore();
}

// Kesikli yolculuk rotası ve ilerleyen ışık başı
function route(ctx, c, ptsLL, p, o = {}) {
  if (p <= 0) return null;
  let pts = ptsLL.map(q => typeof q === 'string' ? place(q) : merc(q[0], q[1]));
  pts = smoothPts(pts, 14).map(q => P(c, q[0], q[1]));
  ctx.save();
  ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20,12,4,0.5)'; ctx.lineWidth = (o.width || 4) + 4;
  partialPolyline(ctx, pts, p); ctx.stroke();
  ctx.setLineDash(o.dash || [14, 10]);
  ctx.lineDashOffset = -(o.t || 0) * 30;
  ctx.strokeStyle = o.color || '#ffe7a8'; ctx.lineWidth = o.width || 4;
  const r = partialPolyline(ctx, pts, p); ctx.stroke();
  ctx.setLineDash([]);
  if (r && p < 1 && o.headGlow !== false) {
    const [x, y] = r.tip;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 36);
    g.addColorStop(0, 'rgba(255,250,225,0.95)');
    g.addColorStop(0.25, 'rgba(255,215,140,0.6)');
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 36, 0, TAU); ctx.fill();
  }
  ctx.restore();
  return r;
}

// Çapraz kılıç rozeti (savaş simgesi)
function battleIcon(ctx, x, y, a = 1, size = 1) {
  if (a <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= a;
  const sc = size * (0.7 + 0.3 * easeOutBack(clamp(a)));
  ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(28,14,10,0.88)';
  ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#e8c27a'; ctx.lineWidth = 2.2; ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.rotate(s * Math.PI / 4);
    ctx.fillStyle = '#f4ead6';
    ctx.beginPath(); ctx.moveTo(-2.2, 8); ctx.lineTo(-2.2, -14); ctx.lineTo(0, -19); ctx.lineTo(2.2, -14); ctx.lineTo(2.2, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e0b866';
    ctx.fillRect(-7, 8, 14, 3);
    ctx.fillRect(-1.6, 11, 3.2, 7);
    ctx.beginPath(); ctx.arc(0, 19.5, 2.4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// Basit gemi (yelkenli/dhow) simgesi
function shipIcon(ctx, x, y, ang = 0, a = 1, size = 1) {
  if (a <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= a;
  ctx.scale(size * (Math.cos(ang) < 0 ? -1 : 1), size);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 9, 22, 4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5a3b1f';
  ctx.beginPath(); ctx.moveTo(-20, 0); ctx.quadraticCurveTo(0, 12, 22, -2); ctx.lineTo(16, 5); ctx.quadraticCurveTo(0, 10, -16, 5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-2, -24); ctx.stroke();
  ctx.fillStyle = '#f2e6cc';
  ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(10, -28); ctx.quadraticCurveTo(8, -12, 12, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Deve kervanı simgesi (siluet)
function camelShape(ctx, phase = 0) {
  const leg = (bx, ph) => {
    const sw = Math.sin(phase + ph) * 4;
    ctx.beginPath(); ctx.moveTo(bx, -14); ctx.lineTo(bx + sw * 0.5, -4); ctx.lineTo(bx + sw, 8); ctx.stroke();
  };
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.6;
  leg(-10, 0); leg(-6, Math.PI); leg(8, Math.PI); leg(12, 0);
  ctx.beginPath();
  ctx.moveTo(-15, -14);
  ctx.bezierCurveTo(-16, -22, -10, -24, -7, -27);
  ctx.bezierCurveTo(-3, -31, 3, -31, 6, -26);
  ctx.bezierCurveTo(9, -22, 12, -21, 15, -19);
  ctx.bezierCurveTo(18, -23, 19, -30, 21, -34);
  ctx.lineTo(26, -35); ctx.lineTo(27, -32); ctx.lineTo(23, -31);
  ctx.bezierCurveTo(22, -24, 20, -16, 15, -13);
  ctx.closePath();
  ctx.fill();
}

// Tarih kartı (sol üst): büyük yıl + açıklama
function dateCard(ctx, t, t0, t1, year, label, o = {}) {
  const a = fade(t, t0, t1, 0.7, 0.7);
  if (a <= 0) return;
  const x = o.x || 110, y = o.y || 120;
  const sl = (1 - easeOut(prog(t, t0, t0 + 0.9))) * -40;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(sl, 0);
  const g = ctx.createLinearGradient(x - 40, 0, x + 560, 0);
  g.addColorStop(0, 'rgba(8,6,3,0.62)'); g.addColorStop(1, 'rgba(8,6,3,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 40, y - 70, 620, o.sub ? 190 : 160);
  ctx.fillStyle = GOLD; ctx.fillRect(x - 40, y - 70, 3, o.sub ? 190 : 160);
  txt(ctx, year, x, y, { font: 'Cinzel', size: o.size || 72, weight: 700, align: 'left', gold: true, shadow: 12 });
  txt(ctx, label, x + 2, y + 62, { size: 34, weight: 600, align: 'left', color: CREAM, spacing: 1, shadow: 8 });
  if (o.sub) txt(ctx, o.sub, x + 2, y + 102, { size: 26, weight: 500, align: 'left', color: '#d9c39a', italic: true, shadow: 8 });
  ctx.restore();
}

// Ekran altı bilgi şeridi (sağ alt köşe değil; alt yazı alanının üstünde ortada)
function caption(ctx, t, t0, t1, s, o = {}) {
  const a = fade(t, t0, t1, 0.6, 0.6);
  if (a <= 0) return;
  const y = o.y || 150;
  txt(ctx, s, W / 2, y, { font: 'Cinzel', size: o.size || 40, weight: 600, spacing: 6, color: CREAM, alpha: a, shadow: 14 });
  divider(ctx, W / 2, y + 40, 420, prog(t, t0, t0 + 1.2), a);
}
