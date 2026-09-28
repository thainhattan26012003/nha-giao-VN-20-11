// Giao diện: thẻ lời nhắn, bầu trời sao học trò, bài kiểm tra của con, máy bay giấy, giấy khen
import { Sound } from './audio.js';
import { fill } from './words.js';

const ORDER = ['board', 'tests', 'glasses', 'flowers', 'tools', 'drum'];
const ICONS = {
  board: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M7 12l3-4 3 3 4-4M8 20l2-4M16 20l-2-4"/></svg>',
  tests: '<svg viewBox="0 0 24 24"><path d="M7 3h8l3 3v13H7z"/><path d="M5 6v15h11"/><path d="M10 11l2 2 4-4"/></svg>',
  glasses: '<svg viewBox="0 0 24 24"><circle cx="7" cy="14" r="3.5"/><circle cx="17" cy="14" r="3.5"/><path d="M10.5 14c1-1 2-1 3 0M3.5 13l-1-4M20.5 13l1-4"/></svg>',
  flowers: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="1.6"/><circle cx="12" cy="4.6" r="2"/><circle cx="15.4" cy="8" r="2"/><circle cx="12" cy="11.4" r="2"/><circle cx="8.6" cy="8" r="2"/><path d="M12 13.5V21M12 17c-2-2-4-2-5-1M12 18.5c2-2 4-2 5-1"/></svg>',
  tools: '<svg viewBox="0 0 24 24"><path d="M3 20L3 6l12 14z"/><path d="M6 17v-4l4 4z"/><path d="M18 3v3M18 6l-3 12M18 6l3 12"/></svg>',
  drum: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="8" rx="7" ry="2.6"/><path d="M5 8v8.5c0 1.5 3.1 2.7 7 2.7s7-1.2 7-2.7V8"/><path d="M7.5 3l3 4M16.5 3l-3 4"/></svg>',
  wish: '<svg viewBox="0 0 24 24"><path d="M3 11l18-7-6 17-3-7z"/><path d="M12 14l9-10"/></svg>',
  stars: '<svg viewBox="0 0 24 24"><path d="M12 3l2 5 5 .5-4 3.5 1.3 5L12 14.5 7.7 17l1.3-5-4-3.5 5-.5z"/></svg>',
};

export function createUI({ config, vars, getWorld }) {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const F = (s) => fill(s, vars);
  const found = new Set();
  const to = config.to || 'Ba';
  let letterUnlocked = false, starsDone = false, wishText = '', toastTimer = 0, hintShown = false;

  function open(el) { el.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open'))); }
  function close(el, cb) {
    if (el.hidden) return;
    el.classList.remove('open');
    setTimeout(() => { el.hidden = true; cb && cb(); }, 460);
  }
  function toast(msg, ms = 3600) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }
  function button(label, cls, onClick) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (cls || ''); b.textContent = label;
    b.addEventListener('click', onClick); return b;
  }
  document.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => {
    const box = el.closest('.sheet, .modal');
    if (box.id === 'sheet') closeSheet(); else if (box.id === 'gift') closeGift(); else close(box);
  }));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close($('wish')); close($('letter')); closeGift(); closeSheet(); } });

  // ---------- Thẻ lời nhắn ----------
  let sheetAfter = null;
  function showSheet({ icon, eyebrow, title, text, actions }) {
    $('sheetIcon').innerHTML = icon || ''; $('sheetEyebrow').textContent = eyebrow || '';
    $('sheetTitle').textContent = title; $('sheetText').textContent = text;
    const box = $('sheetActions'); box.innerHTML = ''; actions.forEach((a) => box.appendChild(a));
    open($('sheet'));
  }
  function closeSheet(cb) {
    close($('sheet'), () => { const w = getWorld(); if (w) w.unfocus(); const fn = sheetAfter; sheetAfter = null; fn && fn(); cb && cb(); });
  }
  function showSecret(key, isNew) {
    const s = config.secrets[key] || { title: '', text: '' };
    const all = found.size === ORDER.length, actions = [];
    if (all && isNew && !starsDone) {
      actions.push(button('Tắt đèn lớp một chút', 'btn-sun', () => closeSheet(beginStars)));
      actions.push(button('Để sau', '', () => { closeSheet(); toast('Khi nào sẵn sàng thì bấm nút bài kiểm tra ở trên cùng nha'); $('btnLetter').classList.add('pulse'); }));
    } else {
      const left = ORDER.length - found.size;
      actions.push(button(left ? `Tìm tiếp (còn ${left})` : 'Đóng', '', () => closeSheet()));
    }
    showSheet({ icon: ICONS[key], eyebrow: isNew ? `Điều bí mật ${found.size}/${ORDER.length}` : 'Điều bí mật', title: F(s.title), text: F(s.text), actions });
  }
  function updateCounter() {
    $('foundN').textContent = found.size;
    const c = $('counter'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
  }
  function handleTap(key) {
    const w = getWorld();
    if (!hintShown) { hintShown = true; $('hudHint').classList.remove('on'); }
    if (key === 'letter') { Sound.tick(); openLetter(); return; }
    const isNew = !found.has(key);
    if (isNew) { found.add(key); if (w) w.setFound(key); updateCounter(); Sound.chime(); } else Sound.tick();
    if (w) { w.react(key); w.focus(key); }
    showSecret(key, isNew);
  }

  // ---------- Tắt đèn: mỗi học trò là một vì sao ----------
  function beginStars() {
    if (starsDone) return;
    starsDone = true;
    $('btnLetter').classList.remove('pulse');
    const w = getWorld(); if (w) w.starsMoment();
    const note = $('starsNote'), num = $('starsNum');
    $('starsCap').textContent = `học trò đã ngồi dưới bảng của ${to}. Mỗi người là một vì sao.`;
    num.textContent = '0';
    setTimeout(() => note.classList.add('on'), 1400);
    const t0 = performance.now() + 1400, dur = 5200, total = vars.students;
    const tick = () => {
      const k = Math.min(1, Math.max(0, (performance.now() - t0) / dur));
      num.textContent = Math.round(total * (1 - Math.pow(1 - k, 3))).toLocaleString('vi-VN');
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => {
      note.classList.remove('on');
      unlockLetter();
      if (w) w.showLetter();
      toast(`Có một bài kiểm tra trên bàn giáo viên, ${to} mở ra xem nha`, 5000);
    }, 9800);
  }
  function unlockLetter() {
    if (letterUnlocked) return;
    letterUnlocked = true;
    const b = $('btnLetter'); b.classList.remove('locked'); b.classList.add('pulse'); b.setAttribute('aria-label', 'Bài kiểm tra của con');
  }

  // ---------- Bài kiểm tra (lá thư) ----------
  function openLetter() {
    if (!letterUnlocked) {
      if (found.size === ORDER.length && !starsDone) { beginStars(); return; }
      toast(`Tìm đủ ${ORDER.length} điều bí mật trong lớp để mở bài kiểm tra nha (còn ${ORDER.length - found.size})`); return;
    }
    $('btnLetter').classList.remove('pulse');
    const w = getWorld(); if (w) w.dayMode();
    $('examName').textContent = to;
    $('examGrade').textContent = config.grade || '10';
    $('examRemark').textContent = F(config.remark);
    const body = $('letterBody'); body.innerHTML = '';
    const paras = F(config.letter).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    paras.forEach((p, i) => { const el = document.createElement('p'); el.textContent = p; el.style.animationDelay = `${0.35 + i * 0.55}s`; body.appendChild(el); });
    const from = (config.from || '').trim();
    $('letterSign').innerHTML = from && from.toLowerCase() !== 'con' ? `Con của ${esc(to)},<br>${esc(from)}` : `Con của ${esc(to)}`;
    $('letterSign').style.animationDelay = `${0.35 + paras.length * 0.55}s`;
    $('letter').querySelector('.modal-body').scrollTop = 0;
    open($('letter'));
  }
  $('btnWish').addEventListener('click', () => close($('letter'), () => { open($('wish')); setTimeout(() => $('wishInput').focus(), 450); }));

  // ---------- Máy bay giấy ước nguyện ----------
  $('wishTitle').textContent = `${to} có điều ước gì không?`;
  $('wishInput').placeholder = `${to} ước…`;
  $('wishForm').addEventListener('submit', (e) => {
    e.preventDefault();
    wishText = $('wishInput').value.trim(); $('wishInput').blur();
    close($('wish'), () => { const w = getWorld(); if (w) w.launchPlanes(); setTimeout(showAfterWish, 7600); });
  });
  function showAfterWish() {
    showSheet({
      icon: ICONS.wish, eyebrow: 'Máy bay đã cất cánh', title: 'Điều ước đã bay qua cửa sổ',
      text: wishText ? `“${wishText}”\n\nCùng bay với nó là lời cảm ơn của hàng nghìn học trò.` : 'Cùng bay với nó là lời cảm ơn của hàng nghìn học trò.',
      actions: [button('Gửi điều ước cho con', 'btn-sun', shareWish), button('Còn một phần thưởng nữa', '', () => closeSheet(openGift))],
    });
    $('btnGift').classList.add('pulse');
  }
  async function shareWish() {
    const msg = wishText ? `Điều ước ngày 20/11 của ${to}: “${wishText}”` : `${to} đã phóng máy bay giấy ước nguyện rồi nè`;
    try { if (navigator.share) { await navigator.share({ text: msg }); return; } } catch (err) { if (err && err.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(msg); toast('Đã chép điều ước, dán vào tin nhắn gửi con nha'); }
    catch (err) { toast(`${to} chụp màn hình gửi con cũng được nha`); }
  }

  // ---------- Giấy khen ----------
  function openGift() {
    $('btnGift').classList.remove('pulse');
    const G = config.gift || {};
    $('awardName').textContent = to;
    $('awardTitleText').textContent = F(G.title || 'Nhà giáo được yêu thương nhất nhà');
    $('awardWhy').textContent = F(G.reason || '');
    $('awardWhy').hidden = !G.reason;
    $('giftIntro').textContent = F(G.intro || '');
    $('giftIntro').hidden = !G.intro;
    open($('gift'));
  }
  function closeGift() { close($('gift')); }

  // ---------- Thanh trên cùng ----------
  $('totalN').textContent = ORDER.length;
  const soundBtn = $('btnSound');
  const paintSound = () => {
    const m = Sound.isMuted();
    soundBtn.querySelector('.wave').style.display = m ? 'none' : '';
    soundBtn.querySelector('.mute').style.display = m ? '' : 'none';
    soundBtn.setAttribute('aria-label', m ? 'Bật âm thanh' : 'Tắt âm thanh');
  };
  soundBtn.addEventListener('click', () => { Sound.init(); Sound.setMuted(!Sound.isMuted()); if (!Sound.isMuted()) Sound.startMusic(); paintSound(); });
  paintSound();
  $('btnLetter').addEventListener('click', () => { Sound.tick(); openLetter(); });
  $('btnGift').addEventListener('click', () => { Sound.tick(); openGift(); });
  $('btnTilt').addEventListener('click', async () => {
    const w = getWorld(); if (!w) return;
    const r = await w.toggleTilt();
    $('btnTilt').classList.toggle('pulse', r === 'on');
    toast({ on: 'Nghiêng điện thoại để nhìn quanh lớp nha', off: 'Đã tắt nghiêng máy', denied: 'Máy chưa cho dùng cảm biến nghiêng, kéo tay để nhìn quanh nha' }[r], 2600);
  });

  function enterWorld() {
    const w = getWorld();
    $('hud').hidden = false;
    if (w && w.tiltSupported) $('btnTilt').hidden = false;
    const top = document.querySelector('.hud-top'); top.style.opacity = '0';
    setTimeout(() => $('titleCard').classList.add('on'), 2600);
    setTimeout(() => { $('titleCard').classList.remove('on'); top.style.opacity = '1'; }, 7400);
    setTimeout(() => { if (!hintShown) $('hudHint').classList.add('on'); }, 8000);
    setTimeout(() => $('hudHint').classList.remove('on'), 18000);
  }

  function showFallback() {
    ORDER.forEach((k) => found.add(k)); letterUnlocked = true; starsDone = true;
    const f = $('fallback');
    f.innerHTML = `<div class="fallback-inner"><p class="eyebrow" style="text-align:center">20 · 11 · 2026</p><h2>Mừng ngày Nhà giáo Việt Nam</h2>
      ${ORDER.map((k) => `<div class="item glass"><h3>${esc(F(config.secrets[k].title))}</h3><p>${esc(F(config.secrets[k].text))}</p></div>`).join('')}
      <button class="btn btn-sun" id="fbLetter">Mở bài kiểm tra của con</button><button class="btn" id="fbGift">Phần thưởng</button></div>`;
    f.hidden = false;
    $('fbLetter').addEventListener('click', openLetter);
    $('fbGift').addEventListener('click', openGift);
  }

  return {
    handleTap, enterWorld, showFallback, toast,
    debugFindAll() { ORDER.forEach((k) => { found.add(k); const w = getWorld(); if (w) w.setFound(k); }); updateCounter(); },
    debugStars: beginStars,
  };
}
