// Ortak yardımcılar: matematik, zamanlama, metin, rastgelelik, ekran dışı tuvaller.
const W = 1920, H = 1080;
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const prog = (t, a, b) => clamp((t - a) / (b - a));
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const easeOutBack = t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
// a..b aralığında görünür; girişte fin, çıkışta fout saniyelik yumuşak geçiş
const fade = (t, a, b, fin = 0.6, fout = 0.6) => smooth(a, a + fin, t) * (1 - smooth(b - fout, b, t));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1B değer gürültüsü (pürüzsüz)
function noise1(x, seed = 0) {
  const h = n => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}
function fbm1(x, seed = 0, oct = 4) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += a * noise1(x * f, seed + i * 17); f *= 2; a *= 0.5; }
  return v;
}

function makeCanvas(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const GOLD = '#d9b36a', GOLD2 = '#f3dca0', CREAM = '#f4ead6', INK = '#0b0f14';

function goldGradient(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x0 + (x1 - x0) * 0.15, y1);
  g.addColorStop(0, '#fff2cc');
  g.addColorStop(0.38, '#f2d184');
  g.addColorStop(0.62, '#d4a650');
  g.addColorStop(0.8, '#b8862f');
  g.addColorStop(1, '#8c6223');
  return g;
}

// Metin çizimi. opts: font, size, weight, color, align, baseline, alpha, spacing, shadow, glow, stroke, italic
function txt(ctx, s, x, y, o = {}) {
  ctx.save();
  const size = o.size || 32;
  ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || 500} ${size}px ${o.font || 'Cormorant'}`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.baseline || 'middle';
  ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
  if (o.spacing) ctx.letterSpacing = `${o.spacing}px`;
  if (o.dir) ctx.direction = o.dir;
  if (o.stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = o.stroke;
    ctx.strokeStyle = o.strokeColor || 'rgba(0,0,0,0.55)';
    ctx.strokeText(s, x, y);
  }
  if (o.shadow) {
    ctx.shadowColor = o.shadowColor || 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = o.shadow;
    ctx.shadowOffsetY = o.shadowY || 0;
  }
  if (o.glow) {
    ctx.shadowColor = o.glowColor || 'rgba(255,214,140,0.8)';
    ctx.shadowBlur = o.glow;
  }
  ctx.fillStyle = o.color || CREAM;
  if (o.gold) {
    const m = ctx.measureText(s);
    const wdt = m.width;
    const x0 = ctx.textAlign === 'center' ? x - wdt / 2 : ctx.textAlign === 'right' ? x - wdt : x;
    ctx.fillStyle = goldGradient(ctx, x0, y - size * 0.6, x0 + wdt * 0.3, y + size * 0.6);
  }
  ctx.fillText(s, x, y);
  ctx.restore();
}

function measure(ctx, s, o = {}) {
  ctx.save();
  ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || 500} ${o.size || 32}px ${o.font || 'Cormorant'}`;
  if (o.spacing) ctx.letterSpacing = `${o.spacing}px`;
  const m = ctx.measureText(s).width;
  ctx.restore();
  return m;
}

// Metni kelime kelime satırlara böler
function wrap(ctx, s, maxW, o) {
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const tryS = cur ? cur + ' ' + w : w;
    if (measure(ctx, tryS, o) > maxW && cur) { lines.push(cur); cur = w; } else cur = tryS;
  }
  if (cur) lines.push(cur);
  return lines;
}

// Parlak süpürme efekti: verilen çizim fonksiyonunu ışıklı bir bant ile tekrar boyar
function shine(ctx, drawFn, x0, x1, p, width = 160, alpha = 0.7) {
  if (p <= 0 || p >= 1) return;
  const L = SHINE_LAYER;
  const c = L.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, H);
  drawFn(c);
  c.globalCompositeOperation = 'source-in';
  const cx = lerp(x0 - width, x1 + width, p);
  const g = c.createLinearGradient(cx - width, 0, cx + width, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, `rgba(255,250,230,${alpha})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(L, 0, 0);
  ctx.restore();
}
let SHINE_LAYER;

function vignette(ctx, strength = 0.55, inner = 0.45) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * inner, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Dekoratif ayraç: ortada sekiz köşeli yıldız, iki yanda incelen çizgiler
function divider(ctx, x, y, w, p = 1, alpha = 1, color = GOLD) {
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  const hw = (w / 2) * easeOut(p);
  for (const s of [-1, 1]) {
    const g = ctx.createLinearGradient(x, 0, x + s * hw, 0);
    g.addColorStop(0, rgba(color, 1));
    g.addColorStop(1, rgba(color, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x + s * 18, y); ctx.lineTo(x + s * (18 + hw), y); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + s * (26 + hw * 0.18), y, 2.2, 0, TAU); ctx.fillStyle = rgba(color, 0.9); ctx.fill();
  }
  star8(ctx, x, y, 11 * easeOutBack(clamp(p * 1.5)), color, true);
  ctx.restore();
}

// Sekiz köşeli yıldız (Hatem-i Süleyman motifi)
function star8(ctx, x, y, r, color = GOLD, fill = false, lw = 1.5, rot = 0) {
  if (r <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let k = 0; k < 2; k++) {
    const a0 = k * Math.PI / 4;
    for (let i = 0; i < 4; i++) {
      const a = a0 + i * Math.PI / 2;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  if (fill) { ctx.fillStyle = color; ctx.fill('nonzero'); }
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
  ctx.restore();
}

// Kısmi çoklu çizgi (0..p oranında) çizer; uç noktasını döndürür
function partialPolyline(ctx, pts, p) {
  if (pts.length < 2 || p <= 0) return null;
  let total = 0;
  const seg = [];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(d); total += d;
  }
  let rem = total * clamp(p);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  let tip = pts[0], ang = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = seg[i - 1];
    ang = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
    if (rem >= d) { ctx.lineTo(pts[i][0], pts[i][1]); rem -= d; tip = pts[i]; }
    else {
      const f = d > 0 ? rem / d : 0;
      tip = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
      ctx.lineTo(tip[0], tip[1]);
      break;
    }
  }
  return { tip, ang, total };
}

function quadPts(a, b, bend = 0.2, n = 64) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const cx = mx - dy * bend, cy = my + dx * bend;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * cx + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * cy + t * t * b[1]]);
  }
  return pts;
}

// Catmull-Rom ile pürüzsüz eğri noktaları
function smoothPts(pts, n = 12) {
  if (pts.length < 3) return pts;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
