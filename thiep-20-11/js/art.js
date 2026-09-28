// Hình vẽ bằng canvas: bảng đen, chữ phấn, hoa cúc họa mi, gạch lát nền, băng rôn, mặt đồng hồ...
import { splitLabel } from './words.js';

export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

export const CHALK_FONT = "'Patrick Hand', 'Comic Sans MS', 'Segoe Print', cursive";
export const CHALK = { white: '#f3f1e8', yellow: '#f7dc6f', pink: '#f5a3b5', blue: '#9fd3f0', green: '#b7e4a0' };

let noise = null;
function noiseCanvas() {
  if (noise) return noise;
  noise = canvas(128);
  const g = noise.getContext('2d'), R = rng(42);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(0,0,0,${0.25 + R() * 0.75})`;
    g.fillRect(R() * 128, R() * 128, 0.6 + R() * 1.6, 0.6 + R() * 1.2);
  }
  return noise;
}

// Nền bảng xanh: vệt lau bảng mờ, bụi phấn li ti, viền tối
export function makeBoardBase(w, h, seed = 11) {
  const c = canvas(w, h), g = c.getContext('2d'), R = rng(seed);
  const gr = g.createLinearGradient(0, 0, w * 0.35, h);
  gr.addColorStop(0, '#2b5445'); gr.addColorStop(0.55, '#234838'); gr.addColorStop(1, '#1b3a2e');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.lineCap = 'round';
  for (let i = 0; i < 24; i++) {
    g.strokeStyle = `rgba(235,240,228,${0.016 + R() * 0.03})`;
    g.lineWidth = (0.04 + R() * 0.1) * Math.min(w, h);
    const x = R() * w, y = R() * h;
    g.beginPath(); g.moveTo(x, y);
    g.bezierCurveTo(x + (R() - 0.5) * w * 0.5, y + (R() - 0.5) * h * 0.2, x + (R() - 0.5) * w * 0.6, y + (R() - 0.5) * h * 0.2, x + (R() - 0.5) * w * 0.8, y + (R() - 0.5) * h * 0.1);
    g.stroke();
  }
  const dots = Math.min(4000, (w * h) / 900);
  for (let i = 0; i < dots; i++) { g.fillStyle = `rgba(240,240,230,${R() * 0.07})`; g.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); }
  const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.32)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
  return c;
}

// Viết một đoạn chữ phấn (nhiều màu) ra canvas riêng, có vết rỗ như phấn thật
export function chalkRun(segments, px) {
  const m = canvas(4).getContext('2d');
  const font = `${px}px ${CHALK_FONT}`;
  m.font = font;
  const pad = Math.ceil(px * 0.25);
  const widths = segments.map((s) => m.measureText(s.text).width);
  const w = widths.reduce((a, b) => a + b, 0) + pad * 2, h = Math.ceil(px * 1.45) + pad;
  const c = canvas(w, h), g = c.getContext('2d');
  g.font = font; g.textBaseline = 'middle';
  let x = pad;
  segments.forEach((s, i) => {
    g.fillStyle = s.color; g.shadowColor = s.color; g.shadowBlur = px * 0.12;
    g.fillText(s.text, x, h / 2); x += widths[i];
  });
  g.shadowBlur = 0;
  g.globalCompositeOperation = 'destination-out';
  g.globalAlpha = 0.5; g.fillStyle = g.createPattern(noiseCanvas(), 'repeat'); g.fillRect(0, 0, w, h);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  return { canvas: c, pad, width: w - pad * 2, height: h };
}

// Ngắt dòng theo chiều rộng, giữ nhãn "Bài toán:" màu vàng ở dòng đầu
export function layoutChalk(lines, px, maxWidth) {
  const m = canvas(4).getContext('2d');
  m.font = `${px}px ${CHALK_FONT}`;
  const out = [];
  lines.forEach((line, li) => {
    const [label, rest] = splitLabel(line);
    const words = (label + rest).split(' ');
    let cur = '';
    const rows = [];
    words.forEach((wd) => {
      const test = cur ? cur + ' ' + wd : wd;
      if (m.measureText(test).width > maxWidth && cur) { rows.push(cur); cur = wd; } else cur = test;
    });
    if (cur) rows.push(cur);
    rows.forEach((row, ri) => {
      const segs = [];
      if (ri === 0 && label && row.startsWith(label.trimEnd())) {
        const lab = row.slice(0, Math.min(row.length, label.length));
        segs.push({ text: lab, color: CHALK.yellow });
        if (row.length > lab.length) segs.push({ text: row.slice(lab.length), color: CHALK.white });
      } else segs.push({ text: row, color: CHALK.white });
      out.push({ line: li, first: ri === 0, text: row, run: chalkRun(segs, px) });
    });
  });
  return out;
}

// Tấm bảng trong lớp học 3D: ngày tháng, lời giải, lời chào mừng 20/11 bằng phấn màu và vài công thức
export function makeBoardCanvas(lines, dateText) {
  const W = 2048, H = 740, c = makeBoardBase(W, H, 5), g = c.getContext('2d');
  const put = (segs, px, x, y) => { const r = chalkRun(segs, px); g.drawImage(r.canvas, x - r.pad, y - r.height / 2); return r; };
  put([{ text: dateText, color: CHALK.white }], 40, 60, 62);
  const rows = layoutChalk(lines, 46, 1060);
  rows.forEach((r, i) => g.drawImage(r.run.canvas, 60 - r.run.pad, 150 + i * 68 - r.run.height / 2));
  const title1 = chalkRun([{ text: 'Chào mừng ngày', color: CHALK.pink }], 64);
  const title2 = chalkRun([{ text: 'Nhà giáo Việt Nam', color: CHALK.yellow }], 86);
  const title3 = chalkRun([{ text: '20 - 11', color: CHALK.blue }], 110);
  const cx = 1600;
  [[title1, 150], [title2, 250], [title3, 380]].forEach(([r, y]) => g.drawImage(r.canvas, cx - r.width / 2 - r.pad, y - r.height / 2));
  drawChalkFlower(g, 1260, 560, 70, CHALK.pink);
  drawChalkFlower(g, 1400, 610, 50, CHALK.yellow);
  drawChalkFlower(g, 1880, 560, 66, CHALK.white);
  drawChalkFlower(g, 1760, 620, 44, CHALK.pink);
  put([{ text: 'sin²x + cos²x = 1', color: CHALK.green }], 38, 1180, 690);
  put([{ text: 'a² + b² = c²', color: CHALK.blue }], 38, 1560, 690);
  put([{ text: 'π ≈ 3,14159', color: CHALK.white }], 34, 60, 690);
  return c;
}

function drawChalkFlower(g, x, y, r, color) {
  g.save(); g.strokeStyle = color; g.lineWidth = r * 0.07; g.lineCap = 'round';
  g.globalAlpha = 0.85; g.shadowColor = color; g.shadowBlur = 6;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.42, r * 0.18, a, 0, Math.PI * 2); g.stroke();
  }
  g.fillStyle = CHALK.yellow; g.beginPath(); g.arc(x, y, r * 0.16, 0, Math.PI * 2); g.fill();
  g.strokeStyle = CHALK.green; g.beginPath(); g.moveTo(x, y + r * 0.9); g.quadraticCurveTo(x + r * 0.2, y + r * 1.4, x - r * 0.1, y + r * 1.9); g.stroke();
  g.restore();
}

export function makeGlowCanvas(size = 128, soft = false) {
  const c = canvas(size), g = c.getContext('2d'), r = size / 2;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  if (soft) {
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.35)');
    gr.addColorStop(0.65, 'rgba(255,255,255,0.08)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  } else {
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.16, 'rgba(255,255,255,0.6)');
    gr.addColorStop(0.42, 'rgba(255,255,255,0.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  }
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return c;
}

export function makeSparkleCanvas(size = 128) {
  const c = canvas(size), g = c.getContext('2d'), r = size / 2;
  const glow = g.createRadialGradient(r, r, 0, r, r, r * 0.5);
  glow.addColorStop(0, 'rgba(255,255,255,0.9)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow; g.fillRect(0, 0, size, size);
  g.fillStyle = '#fff'; g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2, rr = i % 2 === 0 ? r * 0.96 : r * 0.1;
    g.lineTo(r + Math.cos(a) * rr, r + Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
  return c;
}

// Cúc họa mi: hoa của tháng 11
export function makeDaisyCanvas(size = 128) {
  const c = canvas(size), g = c.getContext('2d'), r = size / 2;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.save(); g.translate(r, r); g.rotate(a);
    const gr = g.createLinearGradient(0, 0, r * 0.95, 0);
    gr.addColorStop(0, '#f2efe6'); gr.addColorStop(1, '#ffffff');
    g.fillStyle = gr; g.beginPath(); g.ellipse(r * 0.52, 0, r * 0.44, r * 0.1, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  const cg = g.createRadialGradient(r, r, 0, r, r, r * 0.24);
  cg.addColorStop(0, '#ffe066'); cg.addColorStop(1, '#e8a317');
  g.fillStyle = cg; g.beginPath(); g.arc(r, r, r * 0.22, 0, Math.PI * 2); g.fill();
  return c;
}

export function makePetalCanvas(size = 48) {
  const c = canvas(size), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, size / 2, size, size / 2);
  gr.addColorStop(0, 'rgba(240,236,226,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(size / 2, size / 2, size * 0.46, size * 0.14, 0, 0, Math.PI * 2); g.fill();
  return c;
}

export function makeHeartCanvas(size = 128) {
  const c = canvas(size), g = c.getContext('2d'), s = size / 128;
  g.translate(size / 2, size / 2 + 6 * s); g.scale(s, s);
  g.shadowColor = 'rgba(255,120,150,0.9)'; g.shadowBlur = 16; g.fillStyle = '#ff7a9a';
  g.beginPath(); g.moveTo(0, 34);
  g.bezierCurveTo(-58, -4, -36, -52, 0, -22); g.bezierCurveTo(36, -52, 58, -4, 0, 34);
  g.fill();
  return c;
}

// Gạch lát nền lớp học
export function makeTileCanvas(size = 512) {
  const c = canvas(size), g = c.getContext('2d'), R = rng(3), n = 4, s = size / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const k = 0.93 + R() * 0.07;
    g.fillStyle = `rgb(${Math.round(226 * k)},${Math.round(214 * k)},${Math.round(190 * k)})`;
    g.fillRect(x * s, y * s, s, s);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,100,70,${R() * 0.08})`; g.fillRect(x * s + R() * s, y * s + R() * s, 2 + R() * 3, 2 + R() * 3); }
  }
  g.strokeStyle = 'rgba(120,104,80,0.45)'; g.lineWidth = 3;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, size); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(size, i * s); g.stroke(); }
  return c;
}

export function makeBannerCanvas(text) {
  const c = canvas(1600, 170), g = c.getContext('2d');
  g.fillStyle = '#c0281f'; g.fillRect(0, 0, 1600, 170);
  g.strokeStyle = '#f2c14e'; g.lineWidth = 6; g.strokeRect(12, 12, 1576, 146);
  g.fillStyle = '#ffd54a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = "700 88px 'Be Vietnam Pro', 'Segoe UI', sans-serif";
  if ('letterSpacing' in g) g.letterSpacing = '6px';
  g.fillText(text, 800, 90);
  return c;
}

export function makeClockCanvas(size = 256) {
  const c = canvas(size), g = c.getContext('2d'), r = size / 2;
  g.fillStyle = '#fbfaf5'; g.beginPath(); g.arc(r, r, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#222'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${size * 0.11}px 'Be Vietnam Pro', sans-serif`;
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    g.fillText(String(i), r + Math.cos(a) * r * 0.76, r + Math.sin(a) * r * 0.76);
  }
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, l = i % 5 === 0 ? 0.1 : 0.05;
    g.strokeStyle = '#444'; g.lineWidth = i % 5 === 0 ? 3 : 1.5;
    g.beginPath(); g.moveTo(r + Math.cos(a) * r * (0.94 - l), r + Math.sin(a) * r * (0.94 - l)); g.lineTo(r + Math.cos(a) * r * 0.94, r + Math.sin(a) * r * 0.94); g.stroke();
  }
  return c;
}

// Tờ bài kiểm tra trên cùng của chồng bài: có điểm 10 đỏ và dấu tích
export function makeTestPaperCanvas() {
  const c = canvas(300, 420), g = c.getContext('2d');
  g.fillStyle = '#fdfcf7'; g.fillRect(0, 0, 300, 420);
  g.strokeStyle = 'rgba(40,60,120,0.25)'; g.lineWidth = 1.5;
  for (let y = 110; y < 410; y += 22) { g.beginPath(); g.moveTo(16, y); g.lineTo(284, y); g.stroke(); }
  g.fillStyle = '#2b2a26'; g.font = "600 20px 'Be Vietnam Pro', sans-serif"; g.fillText('BÀI KIỂM TRA', 24, 38);
  g.font = "400 14px 'Be Vietnam Pro', sans-serif"; g.fillText('Môn: Toán', 24, 62);
  g.strokeStyle = '#d23b2c'; g.lineWidth = 3; g.beginPath(); g.arc(240, 52, 30, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#d23b2c'; g.font = "700 34px 'Dancing Script', cursive"; g.textAlign = 'center'; g.fillText('10', 240, 64);
  g.strokeStyle = '#d23b2c'; g.lineWidth = 3;
  [[160, 150], [200, 238], [120, 326]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10, y + 12); g.lineTo(x + 30, y - 14); g.stroke(); });
  return c;
}

export function makeCalculatorCanvas() {
  const c = canvas(160, 280), g = c.getContext('2d');
  g.fillStyle = '#2f3237'; g.fillRect(0, 0, 160, 280);
  g.fillStyle = '#b9c7a8'; g.fillRect(16, 18, 128, 46);
  g.fillStyle = '#23301f'; g.font = "600 26px 'Be Vietnam Pro', monospace"; g.textAlign = 'right'; g.fillText('20.11', 136, 52);
  const cols = ['#50555c', '#50555c', '#50555c', '#50555c', '#e0763b'];
  for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) {
    g.fillStyle = cols[r === 4 && k === 3 ? 4 : r]; g.fillRect(18 + k * 32, 86 + r * 36, 24, 24);
  }
  return c;
}

export function makeBookCanvas() {
  const c = canvas(256, 340), g = c.getContext('2d');
  g.fillStyle = '#7d1f1a'; g.fillRect(0, 0, 256, 340);
  g.strokeStyle = '#d8b35a'; g.lineWidth = 4; g.strokeRect(14, 14, 228, 312);
  g.fillStyle = '#e9c46a'; g.textAlign = 'center'; g.font = "700 38px 'Be Vietnam Pro', sans-serif"; g.fillText('SỔ ĐIỂM', 128, 150);
  g.font = "400 20px 'Be Vietnam Pro', sans-serif"; g.fillText('Môn Toán', 128, 190);
  return c;
}
