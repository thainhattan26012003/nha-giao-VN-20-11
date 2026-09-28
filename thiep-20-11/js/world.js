// Lớp học 3D: ngồi ở bàn cuối lớp nhìn quanh, chạm đồ vật để mở lời nhắn, tắt đèn thấy sao, phóng máy bay giấy
import { Sound } from './audio.js';
import { rng, makeGlowCanvas, makeSparkleCanvas, makeHeartCanvas } from './art.js';
import { setup, TX, std } from './kit.js';
import { ROOM, makeRoom, makeBeams, makeMotes } from './room.js';
import { makeTeacherDesk, makeStudentDesks, makeDrum, planeGeometry, makeStudentStars, makeLetterSprite, makeHearts } from './props.js';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const lerp = (a, b, t) => a + (b - a) * t;

export async function createWorld({ canvas, boardLines, dateText, students, onTap }) {
  let THREE;
  try { THREE = await import(THREE_URL); } catch (e) { console.warn('Không tải được three.js', e); return null; }
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { console.warn('Máy không hỗ trợ WebGL', e); return null; }
  const T = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  setup(THREE, { glow: T(makeGlowCanvas(128)), glowSoft: T(makeGlowCanvas(128, true)), sparkle: T(makeSparkleCanvas(128)), heart: T(makeHeartCanvas(128)) });
  try {
    await Promise.race([Promise.all([document.fonts.load("46px 'Patrick Hand'"), document.fonts.load("700 88px 'Be Vietnam Pro'"), document.fonts.load("700 34px 'Dancing Script'")]),
      new Promise((r) => setTimeout(r, 2500))]);
  } catch (e) { /* dùng phông dự phòng */ }

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const baseFov = () => clamp((2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(16.5)) / (window.innerWidth / window.innerHeight)) * 180) / Math.PI, 50, 72);
  const camera = new THREE.PerspectiveCamera(baseFov(), window.innerWidth / window.innerHeight, 0.05, 200);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const breathe = () => new Promise((r) => setTimeout(r, 0));

  // ---------- Ánh sáng buổi chiều ----------
  const sunDir = V(12, -9, -3).normalize();
  const sun = new THREE.DirectionalLight('#ffe2ae', 3.2);
  sun.position.copy(sunDir).multiplyScalar(-14).add(V(0, 0, -0.5));
  sun.target.position.set(0, 0, -0.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#dfe9ff', '#b9a37c', 0.95); scene.add(hemi);
  const amb = new THREE.AmbientLight('#fff1dc', 0.35); scene.add(amb);
  const fill = new THREE.DirectionalLight('#fff4e0', 0.45); fill.position.set(2, 3, 6); scene.add(fill);

  // ---------- Căn phòng và đồ vật ----------
  const room = makeRoom({ boardLines, dateText }); scene.add(room.group);
  await breathe();
  const beams = makeBeams(); scene.add(beams.group);
  const motes = makeMotes(rng(4)); scene.add(motes);
  const desk = makeTeacherDesk(); scene.add(desk.group);
  const desks = makeStudentDesks(); scene.add(desks);
  const drum = makeDrum(); scene.add(drum.group);
  await breathe();
  const stars = makeStudentStars(Math.min(students || 3000, 6000)); scene.add(stars);
  const letter = makeLetterSprite(); scene.add(letter);
  const hearts = makeHearts(); scene.add(hearts.group);
  const planeMesh = new THREE.InstancedMesh(planeGeometry(), std('#fbfaf5', { side: THREE.DoubleSide, roughness: 0.8 }), 90);
  planeMesh.count = 0; planeMesh.frustumCulled = false; scene.add(planeMesh);
  const wishGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow, color: '#ffe3a3', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  wishGlow.scale.setScalar(0.7); wishGlow.visible = false; scene.add(wishGlow);

  const P = desk.deskTop, X = P.x, Y = P.y, Z = P.z;
  letter.position.set(X - 0.1, Y + 0.45, Z + 0.15);
  const doorDrum = drum.group.position;

  // ---------- Vùng chạm, dấu lấp lánh, góc nhìn khi chạm ----------
  const proxies = [];
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const addProxy = (key, p, r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), hitMat); m.position.copy(p); m.userData.key = key; scene.add(m); proxies.push(m); return m; };
  [-1.2, 0, 1.2].forEach((x) => addProxy('board', V(x, 1.72, -4.35), 0.72));
  addProxy('tests', V(X + 0.1, Y + 0.05, Z + 0.02), 0.26);
  addProxy('glasses', V(X - 0.12, Y + 0.03, Z + 0.22), 0.17);
  addProxy('flowers', V(X - 0.45, Y + 0.42, Z - 0.05), 0.3);
  addProxy('tools', V(X + 0.5, Y + 0.05, Z + 0.05), 0.25);
  addProxy('drum', V(doorDrum.x, 1.25, doorDrum.z), 0.72);
  addProxy('drum', V(ROOM.W / 2, 1.2, -0.8), 0.55);
  const letterProxy = addProxy('letter', letter.position, 0.36);
  const views = {
    board: [V(0, 1.55, -0.6), V(0, 1.4, -4.44)],
    tests: [V(X + 0.15, Y + 0.75, Z + 1.0), V(X + 0.1, Y - 0.2, Z + 0.02)],
    glasses: [V(X - 0.1, Y + 0.6, Z + 0.95), V(X - 0.12, Y - 0.2, Z + 0.22)],
    flowers: [V(X - 0.35, Y + 0.65, Z + 1.05), V(X - 0.45, Y + 0.18, Z - 0.05)],
    tools: [V(X + 0.55, Y + 0.65, Z + 0.95), V(X + 0.5, Y - 0.2, Z + 0.05)],
    drum: [V(2.95, 1.45, 0.1), V(doorDrum.x, 1.0, doorDrum.z)],
    letter: [V(X, Y + 0.72, Z + 1.1), V(X - 0.1, Y + 0.22, Z + 0.12)],
  };
  const markers = {};
  [['board', V(1.7, 2.3, -4.3)], ['tests', V(X + 0.1, Y + 0.25, Z)], ['glasses', V(X - 0.12, Y + 0.2, Z + 0.22)],
    ['flowers', V(X - 0.45, Y + 0.82, Z - 0.05)], ['tools', V(X + 0.5, Y + 0.24, Z + 0.05)], ['drum', V(doorDrum.x, 1.85, doorDrum.z)]].forEach(([k, p], i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.sparkle, color: '#ffe08a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    s.position.copy(p); s.userData.i = i; s.userData.base = k === 'board' || k === 'drum' ? 0.34 : 0.22; scene.add(s); markers[k] = s;
  });

  // ---------- Camera: ngồi bàn cuối nhìn quanh ----------
  const SEAT = V(0, 1.25, 2.9), BASE_PITCH = 0.06;
  const cam = { pos: SEAT.clone(), yaw: 0, pitch: BASE_PITCH, fov: baseFov(), tPos: SEAT.clone(), tYaw: 0, tPitch: BASE_PITCH, tFov: baseFov(),
    idle: 0, enabled: false, focused: false, zoomed: false };
  const intro = { t: -1, dur: 3.8, from: V(0, 1.72, -2.5) };
  const gyro = { x: 0, y: 0, tx: 0, ty: 0, base: null, on: false };
  const tmpDir = V(0, 0, -1), tmpLook = V(0, 0, 0);
  function aim(from, to) {
    tmpDir.subVectors(to, from).normalize();
    return { yaw: Math.atan2(tmpDir.x, -tmpDir.z), pitch: Math.asin(clamp(tmpDir.y, -1, 1)) };
  }

  const ptrs = new Map();
  let gesture = null;
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
    if (ptrs.size === 1) gesture = { t: performance.now(), moved: 0, multi: false }; else if (gesture) gesture.multi = true;
    cam.idle = 0;
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (cam.enabled && !cam.focused && ptrs.size === 1) {
      cam.tYaw = clamp(cam.tYaw - dx * 0.005, -1.25, 1.25);
      cam.tPitch = clamp(cam.tPitch + dy * 0.004, -0.45, 0.95);
    } else if (cam.enabled && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const before = Math.hypot(a.x - b.x, a.y - b.y);
      p.x = e.clientX; p.y = e.clientY;
      const after = Math.hypot(a.x - b.x, a.y - b.y);
      if (before > 10) { cam.tFov = clamp(cam.tFov * (before / after), 32, 74); cam.zoomed = true; }
    }
    p.x = e.clientX; p.y = e.clientY;
    if (gesture) gesture.moved += Math.abs(dx) + Math.abs(dy);
    cam.idle = 0;
  });
  const end = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (!ptrs.size && gesture) {
      const gs = gesture; gesture = null;
      if (e.type === 'pointerup' && !gs.multi && gs.moved < 12 && performance.now() - gs.t < 500) tap(e.clientX, e.clientY);
    }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.tFov = clamp(cam.tFov * (1 + e.deltaY * 0.001), 32, 74); cam.zoomed = true; cam.idle = 0; }, { passive: false });

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function tap(x, y) {
    if (!cam.enabled) return;
    ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(proxies.filter((p) => p !== letterProxy || letter.visible), false);
    if (hits.length) onTap && onTap(hits[0].object.userData.key);
  }

  let focusKey = null, letterShown = false;
  function focus(key) {
    const v = views[key]; if (!v) return;
    cam.focused = true; focusKey = key;
    const a = aim(v[0], v[1]);
    cam.tPos.copy(v[0]); cam.tYaw = a.yaw; cam.tPitch = a.pitch; cam.tFov = baseFov() * 0.92;
  }
  function unfocus() {
    cam.focused = false; focusKey = null;
    cam.tPos.copy(SEAT); cam.tYaw = 0; cam.tPitch = night.on ? 0.7 : BASE_PITCH;
    if (!cam.zoomed) cam.tFov = baseFov();
  }

  // ---------- Nghiêng máy ----------
  const tiltSupported = typeof window.DeviceOrientationEvent !== 'undefined' && 'ontouchstart' in window;
  function onOrient(e) {
    if (e.beta == null) return;
    if (!gyro.base) gyro.base = { b: e.beta, g: e.gamma };
    gyro.tx = clamp((e.gamma - gyro.base.g) * 0.015, -0.5, 0.5);
    gyro.ty = clamp((e.beta - gyro.base.b) * -0.012, -0.3, 0.3);
  }
  async function toggleTilt() {
    if (gyro.on) { window.removeEventListener('deviceorientation', onOrient); gyro.on = false; gyro.tx = gyro.ty = 0; return 'off'; }
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function' && (await DeviceOrientationEvent.requestPermission()) !== 'granted') return 'denied';
    } catch (e) { return 'denied'; }
    gyro.base = null; gyro.on = true;
    window.addEventListener('deviceorientation', onOrient);
    return new Promise((res) => setTimeout(() => {
      if (gyro.base) res('on'); else { window.removeEventListener('deviceorientation', onOrient); gyro.on = false; res('denied'); }
    }, 1500));
  }

  // ---------- Phản ứng của đồ vật ----------
  const fx = { drumT: -1, beats: [], bi: 0, drumPulse: 0, papers: -1, glasses: -1, compass: -1, dust: [] };
  const dustMat = new THREE.SpriteMaterial({ map: TX.glowSoft, color: '#f5f3ea', transparent: true, depthWrite: false, opacity: 0 });
  function chalkPuff(at) {
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Sprite(dustMat.clone()); s.position.copy(at).add(V((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.6, 0.05));
      s.scale.setScalar(0.08 + Math.random() * 0.1); scene.add(s);
      fx.dust.push({ s, life: 0, max: 1.2 + Math.random() * 0.8, vy: -0.08 - Math.random() * 0.1 });
    }
  }
  function react(key) {
    if (key === 'board') chalkPuff(V(0, 1.8, -4.35));
    if (key === 'tests') fx.papers = 0;
    if (key === 'glasses') fx.glasses = 0;
    if (key === 'flowers') hearts.burst(V(X - 0.45, Y + 0.7, Z - 0.05));
    if (key === 'tools') fx.compass = 0;
    if (key === 'drum') { fx.drumT = 0; fx.bi = 0; fx.beats = Sound.schoolDrum(); }
  }

  // ---------- Tắt đèn: mỗi học trò là một vì sao ----------
  const night = { on: false, k: 0 };
  const dayCol = { top: room.sky.material.uniforms.top.value.clone(), hor: room.sky.material.uniforms.hor.value.clone() };
  const nightCol = { top: new THREE.Color('#0b1330'), hor: new THREE.Color('#1f2447') };
  const tubeDay = new THREE.Color('#fffaf0'), tubeNight = new THREE.Color('#3a3a44');
  const ambDay = new THREE.Color('#fff1dc'), ambNight = new THREE.Color('#6a78b8');
  function starsMoment() {
    night.on = true; stars.visible = true; room.ceilingMat.transparent = true; room.ceilingMat.needsUpdate = true;
    Sound.wishRise();
    if (!cam.focused) { cam.tPos.copy(SEAT); cam.tYaw = 0; }
    setTimeout(() => { if (night.on && !cam.focused) cam.tPitch = 0.72; }, 1200);
  }
  function dayMode() { night.on = false; if (!cam.focused) cam.tPitch = BASE_PITCH; }

  // ---------- Máy bay giấy ----------
  const planes = [];
  const R = rng(31);
  function launchPlanes() {
    planes.push({ wish: true, t: 0, dur: 5.5,
      path: new THREE.CatmullRomCurve3([V(X, Y + 0.3, Z + 0.4), V(0.4, 1.7, -1.6), V(-1.9, 1.95, -0.5), V(-4.4, 1.85, -0.25), V(-9, 4, 1), V(-16, 9, 3)]) });
    for (let i = 0; i < 60; i++) planes.push({ t: -1.2 - i * 0.06, dur: 8 + R() * 2.5, r: 1.1 + R() * 2.3, h: 1.4 + R() * 1.5, ph: R() * 6.28, sp: 0.45 + R() * 0.35, dir: R() < 0.5 ? 1 : -1 });
    Sound.whoosh(1.6);
    setTimeout(() => Sound.wishRise(), 1400);
    cam.tPos.copy(SEAT); cam.tYaw = -0.25; cam.tPitch = 0.15; cam.focused = false;
  }
  const dummy = new THREE.Object3D(), pA = V(0, 0, 0), pB = V(0, 0, 0);
  function swirlPos(p, t, out) {
    const a = p.ph + t * p.sp * p.dir;
    return out.set(Math.cos(a) * p.r, p.h + Math.sin(t * 2 + p.ph) * 0.18, -1 + Math.sin(a) * p.r * 0.85);
  }

  // ---------- Vòng lặp ----------
  let time = 0, frames = 0, slow = 0;
  function frame(dt) {
    time += dt; const t = time;
    // camera
    if (intro.t >= 0) {
      intro.t += dt;
      const k = ease(clamp(intro.t / intro.dur, 0, 1));
      cam.pos.lerpVectors(intro.from, SEAT, k);
      cam.yaw = 0; cam.pitch = lerp(0, BASE_PITCH, k); cam.fov = lerp(52, baseFov(), k);
      if (intro.t >= intro.dur) { intro.t = -1; cam.enabled = true; }
    } else {
      cam.idle += dt;
      if (cam.idle > 9 && !cam.focused && !night.on && !planes.length) { cam.tYaw = damp(cam.tYaw, Math.sin(t * 0.05) * 0.08, 0.3, dt); cam.tPitch = damp(cam.tPitch, BASE_PITCH, 0.3, dt); }
      cam.pos.x = damp(cam.pos.x, cam.tPos.x, 3, dt); cam.pos.y = damp(cam.pos.y, cam.tPos.y, 3, dt); cam.pos.z = damp(cam.pos.z, cam.tPos.z, 3, dt);
      cam.yaw = damp(cam.yaw, cam.tYaw, 5, dt); cam.pitch = damp(cam.pitch, cam.tPitch, 5, dt); cam.fov = damp(cam.fov, cam.tFov, 4, dt);
    }
    gyro.x = damp(gyro.x, gyro.tx, 4, dt); gyro.y = damp(gyro.y, gyro.ty, 4, dt);
    const yaw = cam.yaw + gyro.x, pitch = clamp(cam.pitch + gyro.y, -0.6, 1.1), cp = Math.cos(pitch);
    camera.position.copy(cam.pos);
    tmpLook.set(cam.pos.x + Math.sin(yaw) * cp, cam.pos.y + Math.sin(pitch), cam.pos.z - Math.cos(yaw) * cp);
    camera.lookAt(tmpLook);
    if (Math.abs(camera.fov - cam.fov) > 0.01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }

    // lớp học sống động
    room.fans.forEach((f, i) => { f.blades.rotation.y += dt * (3.2 + i * 0.4); f.group.visible = night.k < 0.95; });
    const now = new Date(), sec = now.getSeconds() + now.getMilliseconds() / 1000, spin = night.k * t * 40;
    room.hands.s.rotation.z = -(sec / 60) * Math.PI * 2 - spin * 2;
    room.hands.m.rotation.z = -((now.getMinutes() + sec / 60) / 60) * Math.PI * 2 - spin * 0.4;
    room.hands.h.rotation.z = -(((now.getHours() % 12) + now.getMinutes() / 60) / 12) * Math.PI * 2 - spin * 0.05;
    motes.material.uniforms.uTime.value = t;
    stars.material.uniforms.uTime.value = t;

    // ngày ↔ đêm
    night.k = damp(night.k, night.on ? 1 : 0, 1.1, dt);
    const nk = night.k;
    sun.intensity = lerp(3.2, 0.1, nk); hemi.intensity = lerp(0.95, 0.22, nk); fill.intensity = lerp(0.45, 0.08, nk);
    amb.intensity = lerp(0.35, 0.22, nk); amb.color.copy(ambDay).lerp(ambNight, nk);
    room.tubeMat.color.copy(tubeDay).lerp(tubeNight, nk);
    beams.mat.opacity = 0.2 * (1 - nk); motes.material.uniforms.uAlpha.value = 1 - nk * 0.7;
    room.sky.material.uniforms.top.value.copy(dayCol.top).lerp(nightCol.top, nk);
    room.sky.material.uniforms.hor.value.copy(dayCol.hor).lerp(nightCol.hor, nk);
    room.ceilingMat.opacity = 1 - nk; room.ceiling.visible = nk < 0.98;
    stars.material.uniforms.uReveal.value = night.on ? clamp(stars.material.uniforms.uReveal.value + dt / 6, 0, 1) : Math.max(0, stars.material.uniforms.uReveal.value - dt / 2);
    stars.visible = stars.material.uniforms.uReveal.value > 0.001;
    if (!night.on && nk < 0.02 && room.ceilingMat.transparent) { room.ceilingMat.transparent = false; room.ceilingMat.needsUpdate = true; }

    // dấu lấp lánh, bài kiểm tra của con
    Object.values(markers).forEach((m) => {
      if (!m.visible) return;
      const k = 0.75 + 0.3 * Math.sin(t * 3 + m.userData.i);
      m.scale.setScalar(m.userData.base * k); m.material.rotation = t * 0.6 + m.userData.i;
      m.material.opacity = 0.65 + 0.35 * Math.sin(t * 2.2 + m.userData.i);
    });
    // tờ bài kiểm tra tạm ẩn khi đang xem kỹ món khác trên bàn, để khỏi che ống kính
    letter.visible = letterShown && (!cam.focused || focusKey === 'letter');
    if (letter.visible) { letter.position.y = Y + 0.45 + Math.sin(t * 1.6) * 0.04; letterProxy.position.copy(letter.position); }
    hearts.update(dt);
    for (let i = fx.dust.length - 1; i >= 0; i--) {
      const d = fx.dust[i]; d.life += dt; d.s.position.y += d.vy * dt;
      d.s.material.opacity = Math.min(1, d.life * 4) * Math.max(0, 1 - d.life / d.max) * 0.6;
      if (d.life > d.max) { scene.remove(d.s); d.s.material.dispose(); fx.dust.splice(i, 1); }
    }

    // trống, giấy, kính, compa
    if (fx.drumT >= 0) {
      fx.drumT += dt;
      while (fx.bi < fx.beats.length && fx.drumT >= fx.beats[fx.bi]) { fx.bi++; fx.drumPulse = 1; }
      if (fx.drumT > 2.2) fx.drumT = -1;
    }
    fx.drumPulse = Math.max(0, fx.drumPulse - dt * 5);
    drum.drum.scale.set(1 + fx.drumPulse * 0.05, 1 + fx.drumPulse * 0.05, 1 - fx.drumPulse * 0.04);
    drum.stick.rotation.z = -fx.drumPulse * 0.9;
    if (fx.papers >= 0) {
      fx.papers += dt; const k = Math.sin(clamp(fx.papers / 1.1, 0, 1) * Math.PI);
      desk.items.tests.children.slice(5, 8).forEach((p, i) => { if (!p.userData.base) return; p.position.y = p.userData.base.y + k * (0.03 + i * 0.02); p.rotation.y = p.userData.rot + k * (i - 1) * 0.25; });
      if (fx.papers > 1.1) fx.papers = -1;
    }
    if (fx.glasses >= 0) {
      fx.glasses += dt; const k = Math.sin(clamp(fx.glasses / 0.7, 0, 1) * Math.PI);
      desk.items.glasses.position.y = Y + 0.012 + k * 0.08; desk.items.glasses.rotation.z = k * 0.3;
      if (fx.glasses > 0.7) fx.glasses = -1;
    }
    if (fx.compass >= 0) {
      fx.compass += dt; desk.items.tools.children[1].rotation.z = 0.4 + ease(clamp(fx.compass / 1.4, 0, 1)) * Math.PI * 4;
      if (fx.compass > 1.4) fx.compass = -1;
    }

    // máy bay giấy
    let n = 0;
    for (let i = planes.length - 1; i >= 0; i--) {
      const p = planes[i]; p.t += dt;
      if (p.t < 0) continue;
      let s = 1;
      if (p.wish) {
        const u = clamp(p.t / p.dur, 0, 1);
        p.path.getPointAt(u, pA); p.path.getPointAt(Math.min(1, u + 0.01), pB); s = 1.7;
        wishGlow.visible = u < 1; wishGlow.position.copy(pA);
        if (u >= 1) { planes.splice(i, 1); wishGlow.visible = false; continue; }
      } else {
        if (p.t > p.dur) { planes.splice(i, 1); continue; }
        swirlPos(p, p.t, pA); swirlPos(p, p.t + 0.03, pB);
        s = Math.min(1, p.t * 2, (p.dur - p.t) * 2);
      }
      dummy.position.copy(pA); dummy.lookAt(pB); dummy.rotateZ(p.wish ? 0.2 : p.dir * 0.4); dummy.scale.setScalar(Math.max(0.001, s));
      dummy.updateMatrix(); planeMesh.setMatrixAt(n++, dummy.matrix);
    }
    planeMesh.count = n; planeMesh.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
    frames++;
    if (frames > 40 && frames < 160 && dt > 0.03) slow++;
    if (frames === 160 && slow > 60) {
      if (dpr > 1) { dpr = Math.max(1, dpr * 0.7); renderer.setPixelRatio(dpr); renderer.setSize(window.innerWidth, window.innerHeight, false); }
      sun.shadow.mapSize.set(512, 512); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    if (!cam.zoomed && !cam.focused) cam.tFov = baseFov();
  }

  camera.position.copy(intro.from); camera.lookAt(0, 1.72, -4.44);
  await breathe();
  try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera); } catch (e) { renderer.compile(scene, camera); }

  return {
    frame, resize, react, focus, unfocus, toggleTilt, tiltSupported, starsMoment, dayMode, launchPlanes,
    start() { intro.t = 0; cam.enabled = false; frame(0.001); },
    setFound(key) { if (markers[key]) markers[key].visible = false; },
    showLetter() { letterShown = true; },
  };
}
