// Nối các phần: màn bảng đen → lớp học 3D → giao diện
import { CONFIG } from '../config.js';
import { Sound, IOS } from './audio.js';
import { makeVars, fill, boardDate } from './words.js';
import { createIntro } from './intro.js';
import { createWorld } from './world.js';
import { createUI } from './ui.js';

const $ = (id) => document.getElementById(id);
const hash = location.hash.replace('#', '');
const query = new URLSearchParams(location.search);
const SKIP = query.has('skip') || query.has('all') || hash === 'skip' || hash === 'all';
const ALL = query.has('all') || hash === 'all';

const vars = makeVars(CONFIG);
const to = CONFIG.to || 'Ba';
const lines = (CONFIG.board || []).map((l) => fill(l, vars)).filter((l) => l.trim());
const dateText = boardDate(2026);

$('sealTo').textContent = to;
$('titleTo').textContent = `Kính tặng ${to}`;
document.title = `Lớp Học Của ${to}`;
if (IOS) $('soundHint').textContent = 'Tắt chế độ im lặng để nghe tiếng trống trường nha';

let world = null, worldOn = false;
const worldReady = createWorld({ canvas: $('world'), boardLines: lines, dateText, students: vars.students, onTap: (key) => ui.handleTap(key) })
  .then((w) => { world = w; return w; })
  .catch((e) => { console.error(e); return null; });

const ui = createUI({ config: CONFIG, vars, getWorld: () => world });
const flash = $('flash');

const intro = createIntro({
  canvas: $('intro'), ui: $('introUI'), sealBtn: $('seal'), flash, lines,
  greeting: `Kính gửi ${to},`, dateText, song: CONFIG.music, onComplete: enterWorld,
});

async function enterWorld() {
  const slow = setTimeout(() => { $('loading').hidden = false; }, 500);
  const w = await Promise.race([worldReady, new Promise((r) => setTimeout(() => r(null), 15000))]);
  clearTimeout(slow); $('loading').hidden = true;
  Sound.startMusic();
  if (!w) { ui.showFallback(); fadeFlash(); return; }
  w.start(); worldOn = true;
  fadeFlash();
  ui.enterWorld();
  if (ALL) setTimeout(() => ui.debugFindAll(), 600);
}

function fadeFlash() {
  flash.style.transition = 'opacity 1.6s ease';
  requestAnimationFrame(() => requestAnimationFrame(() => { flash.style.opacity = '0'; }));
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  if (intro.active()) intro.frame(dt);
  if (worldOn && world && !document.hidden) world.frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

let rt = 0;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { intro.resize(); if (world) world.resize(); }, 120); });
document.addEventListener('gesturestart', (e) => e.preventDefault());

if (SKIP) intro.skip();
window.__thiep = { ui, intro, get world() { return world; } };
