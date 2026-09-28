// Màn mở đầu: chạm trống vào lớp → giữ tay để viết lời giải lên bảng → khoanh "(đpcm)" → bụi phấn hóa cánh hoa
import { Sound } from './audio.js';
import { rng, makeBoardBase, chalkRun, layoutChalk, CHALK, makePetalCanvas } from './art.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const vibrate = (p) => {
  try { const ua = navigator.userActivation; if (navigator.vibrate && (!ua || ua.hasBeenActive)) navigator.vibrate(p); } catch (e) { /* máy không rung được */ }
};

export function createIntro({ canvas: cv, ui, sealBtn, flash, lines, greeting, dateText, song, onOpen, onComplete }) {
  const g = cv.getContext('2d'), R = rng(20), petalArt = makePetalCanvas(48);
  let w = 0, h = 0, dpr = 1, base = null, rows = [], dateRun = null, greetRun = null;
  let px = 22, left = 20, lineH = 30, blockTop = 0, greetY = 0;
  let phase = 'seal', progress = 0, holding = false, t = 0, openT = 0, fullT = 0, burstT = 0, reveal = 0;
  const pointers = new Set(), dust = [], petals = [];
  const totalChars = Math.max(1, lines.join('').length);
  const HOLD = clamp(totalChars / 30, 4.5, 8.5);
  const lastLine = lines[lines.length - 1] || '';
  const PAUSE = clamp(1.8 + lastLine.length * 0.04, 2.4, 4);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    base = makeBoardBase(cv.width, cv.height, 11);
    px = Math.round(clamp(w * 0.058, 18, 30));
    left = Math.max(20, w * 0.075);
    lineH = px * 1.5;
    rows = layoutChalk(lines, px * dpr, (w - left * 2) * dpr);
    let acc = 0;
    rows.forEach((r) => { r.start = acc; acc += r.text.length + 1; r.end = acc; });
    rows.total = acc;
    dateRun = chalkRun([{ text: dateText, color: CHALK.white }], Math.round(px * 0.72 * dpr));
    greetRun = chalkRun([{ text: greeting, color: CHALK.yellow }], Math.round(px * 1.6 * dpr));
    const gaps = rows.filter((r, i) => i > 0 && r.first).length;
    const blockH = rows.length * lineH + gaps * lineH * 0.35;
    greetY = h * 0.15;
    blockTop = Math.max(greetY + px * 2.6, (h * 0.8 - blockH) / 2 + h * 0.06);
    let y = blockTop;
    rows.forEach((r, i) => { if (i > 0 && r.first) y += lineH * 0.35; r.y = y; y += lineH; });
  }

  // ---------- Điều khiển ----------
  function open() {
    if (phase !== 'seal') return;
    Sound.init(); Sound.prepareSong(song);
    phase = 'opening'; openT = 0;
    document.body.classList.add('opened');
    const beats = Sound.schoolDrum();
    beats.forEach((b) => setTimeout(() => { sealBtn.classList.remove('beat'); void sealBtn.offsetWidth; sealBtn.classList.add('beat'); vibrate(25); }, b * 1000));
    setTimeout(() => { phase = 'hold'; document.body.classList.add('writing-ready'); }, 1900);
    onOpen && onOpen();
  }
  function setHolding(v) {
    if (holding === v) return;
    holding = v;
    document.body.classList.toggle('holding', v);
    Sound.chalk(v && phase === 'hold');
    if (v) document.body.classList.remove('released');
    else if (phase === 'hold' && progress > 0.02) document.body.classList.add('released');
  }
  function down(e) {
    e.preventDefault();
    if (phase !== 'hold') return;
    pointers.add(e.pointerId);
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
    setHolding(true);
  }
  function up(e) {
    if (phase === 'seal' && e.type === 'pointerup') { open(); return; }
    pointers.delete(e.pointerId);
    if (!pointers.size) setHolding(false);
  }
  cv.addEventListener('pointerdown', down);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('lostpointercapture', up);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('touchend', () => { if (phase === 'seal') open(); }, { passive: true });
  cv.addEventListener('touchstart', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  sealBtn.addEventListener('click', (e) => { e.stopPropagation(); open(); });
  const onKey = (e) => {
    if (e.code !== 'Space' && e.code !== 'Enter') return;
    if (phase === 'seal' && e.type === 'keyup') { open(); return; }
    if (phase === 'hold') { e.preventDefault(); if (!e.repeat) setHolding(e.type === 'keydown'); }
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);

  function reachFull() {
    phase = 'full'; fullT = 0;
    setHolding(false); Sound.chalk(false);
    document.body.classList.remove('released');
    document.body.classList.add('solved');
    Sound.chime(); vibrate(15);
  }
  function startBurst() {
    phase = 'burst'; burstT = 0;
    Sound.bloom(); Sound.whoosh(1.4); vibrate([20, 50, 70]);
    ui.classList.add('bursting');
    rows.forEach((r) => {
      const n = Math.round(r.run.width / dpr / 7);
      for (let i = 0; i < n; i++) spawnDust(left + R() * (r.run.width / dpr), r.y + (R() - 0.5) * lineH * 0.5, true);
    });
  }
  function spawnDust(x, y, rising = false) {
    dust.push({ x, y, vx: (R() - 0.5) * (rising ? 60 : 14), vy: rising ? -(40 + R() * 120) : 20 + R() * 40,
      life: 0, max: rising ? 1.1 + R() * 0.6 : 0.8 + R() * 0.7, s: 0.7 + R() * 1.4, rising, rot: R() * 6, vr: (R() - 0.5) * 6 });
  }

  // ---------- Vẽ ----------
  const drawRun = (run, x, y, frac = 1) => {
    const sw = run.pad + run.width * frac;
    if (sw <= run.pad) return;
    g.drawImage(run.canvas, 0, 0, sw, run.height, x - run.pad / dpr, y - run.height / dpr / 2, sw / dpr, run.height / dpr);
  };

  function draw(dt) {
    g.drawImage(base, 0, 0, w, h);
    const fade = phase === 'seal' ? 0 : clamp(openT / 1.2, 0, 1);
    if (fade > 0) {
      g.globalAlpha = fade * (phase === 'burst' ? Math.max(0, 1 - burstT * 1.6) : 1);
      drawRun(dateRun, left, Math.max(34, h * 0.055));
      drawRun(greetRun, left, greetY);
      g.globalAlpha = 1;
    }
    // lời giải viết dần theo tiến trình
    const written = progress * rows.total;
    let tip = null;
    const textAlpha = phase === 'burst' ? Math.max(0, 1 - burstT * 1.8) : 1;
    g.globalAlpha = textAlpha;
    rows.forEach((r) => {
      if (written <= r.start) return;
      const f = clamp((written - r.start) / (r.end - r.start), 0, 1);
      drawRun(r.run, left, r.y, f);
      if (f < 1) tip = { x: left + (r.run.width * f) / dpr, y: r.y };
    });
    g.globalAlpha = 1;
    if (tip && holding) {
      g.fillStyle = '#ffffff'; g.shadowColor = '#ffffff'; g.shadowBlur = 8;
      g.beginPath(); g.arc(tip.x, tip.y + px * 0.2, 2.4, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
      if (R() < dt * 45) spawnDust(tip.x, tip.y + px * 0.25);
    }
    // khoanh tròn "(đpcm)" khi viết xong
    if ((phase === 'full' || phase === 'burst') && rows.length) {
      const last = rows[rows.length - 1];
      const words = last.text.split(' ');
      const tail = words[words.length - 1];
      const m = g; m.font = `${px}px 'Patrick Hand', cursive`;
      const tw = m.measureText(tail).width, x1 = left + last.run.width / dpr - tw / 2 - 2;
      const k = clamp(fullT / 0.6, 0, 1);
      g.save(); g.globalAlpha = textAlpha; g.strokeStyle = CHALK.pink; g.lineWidth = 2.6; g.lineCap = 'round';
      g.shadowColor = CHALK.pink; g.shadowBlur = 6;
      g.beginPath(); g.ellipse(x1, last.y + 1, tw / 2 + 12, px * 0.72, -0.08, -Math.PI * 0.6, -Math.PI * 0.6 + Math.PI * 2.1 * k); g.stroke();
      g.restore();
    }
    // bụi phấn và cánh hoa
    for (let i = dust.length - 1; i >= 0; i--) {
      const d = dust[i];
      d.life += dt;
      if (d.life > d.max) { if (d.rising && petals.length < 160) petals.push({ x: d.x, y: d.y, vx: d.vx * 0.6 + (R() - 0.5) * 40, vy: d.vy * 0.5 - 20, rot: d.rot, vr: d.vr, life: 0, s: 10 + R() * 12 }); dust.splice(i, 1); continue; }
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (!d.rising) d.vy += 30 * dt;
      g.globalAlpha = (1 - d.life / d.max) * 0.9;
      g.fillStyle = '#f5f3ea'; g.fillRect(d.x, d.y, d.s, d.s);
    }
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 10 * dt; p.rot += p.vr * dt;
      if (p.life > 2.2) { petals.splice(i, 1); continue; }
      g.globalAlpha = Math.min(1, p.life * 3) * Math.max(0, 1 - p.life / 2.2);
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.drawImage(petalArt, -p.s / 2, -p.s / 2, p.s, p.s); g.restore();
    }
    g.globalAlpha = 1;
    // khung gỗ và máng phấn
    g.fillStyle = '#6b4526'; g.fillRect(0, 0, w, 6); g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h);
    const trayY = h - 16;
    const wood = g.createLinearGradient(0, trayY, 0, h);
    wood.addColorStop(0, '#9a6a43'); wood.addColorStop(1, '#5e3b20');
    g.fillStyle = wood; g.fillRect(0, trayY, w, 16);
    [[w * 0.62, CHALK.white], [w * 0.68, CHALK.yellow], [w * 0.73, CHALK.pink]].forEach(([x, col]) => { g.fillStyle = col; g.fillRect(x, trayY - 5, 22, 6); });
    g.fillStyle = '#3d3b37'; g.fillRect(w * 0.2, trayY - 10, 46, 11); g.fillStyle = '#c9b48e'; g.fillRect(w * 0.2, trayY - 3, 46, 4);
  }

  function frame(dt) {
    if (phase === 'done') return;
    t += dt;
    if (phase !== 'seal') openT += dt;
    if (phase === 'hold') {
      if (holding) progress = Math.min(1, progress + dt / HOLD);
      if (progress >= 1) reachFull();
    } else if (phase === 'full') {
      fullT += dt;
      if (fullT >= PAUSE) startBurst();
    } else if (phase === 'burst') {
      burstT += dt;
      if (burstT > 0.9 && !flash.dataset.on) {
        flash.dataset.on = '1';
        flash.style.transition = 'opacity .6s ease';
        flash.style.opacity = '1';
      }
      if (burstT > 1.6) {
        phase = 'done';
        cv.style.display = 'none';
        ui.hidden = true;
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
        onComplete && onComplete();
        return;
      }
    }
    draw(dt);
  }

  resize();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => resize());
  return {
    frame, resize,
    active: () => phase !== 'done',
    skip() { if (phase === 'seal') { Sound.init(); document.body.classList.add('opened'); } phase = 'full'; progress = 1; fullT = PAUSE; openT = 2; startBurst(); },
  };
}
