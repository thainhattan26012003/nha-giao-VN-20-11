// Đồ vật trong lớp: bàn giáo viên và đồ trên bàn, bàn ghế học sinh, trống trường, máy bay giấy, bầu trời sao
import { THREE, TX, std, tex, box, cyl, glowSprite, noShadow } from './kit.js';
import { makeTestPaperCanvas, makeCalculatorCanvas, makeBookCanvas, makeDaisyCanvas, canvas } from './art.js';
import { ROOM } from './room.js';

const DESK_Y = 0.18 + 0.765;   // mặt bàn giáo viên (đặt trên bục)

export function makeTeacherDesk() {
  const g = new THREE.Group(), D = ROOM.D;
  const wood = std('#8a5a33', { roughness: 0.6 }), dark = std('#5e3b20', { roughness: 0.7 });
  const X = 0.95, Z = -D / 2 + 0.8;
  box(1.4, 0.05, 0.7, wood, X, DESK_Y - 0.025, Z, g);
  [[-0.66, -0.31], [0.66, -0.31], [-0.66, 0.31], [0.66, 0.31]].forEach(([dx, dz]) => box(0.05, 0.74, 0.05, dark, X + dx, 0.18 + 0.37, Z + dz, g));
  box(1.36, 0.5, 0.02, wood, X, 0.18 + 0.47, Z + 0.33, g);
  const chair = new THREE.Group(); chair.position.set(X, 0.18, Z - 0.62); g.add(chair);
  box(0.46, 0.04, 0.44, wood, 0, 0.46, 0, chair);
  box(0.46, 0.5, 0.04, wood, 0, 0.74, -0.2, chair);
  [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]].forEach(([dx, dz]) => box(0.04, 0.46, 0.04, dark, dx, 0.23, dz, chair));

  const Y = DESK_Y;
  const items = {};

  // bó hoa 20/11 trong bình
  const flowers = new THREE.Group(); flowers.position.set(X - 0.45, Y, Z - 0.05); g.add(flowers);
  cyl(0.07, 0.06, 0.22, std('#7fb8d8', { roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }), 0, 0.11, 0, flowers);
  const wrap = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.34, 16, 1, true), std('#e9c9a3', { side: THREE.DoubleSide, roughness: 0.9 }));
  wrap.rotation.x = Math.PI; wrap.position.y = 0.36; wrap.castShadow = true; flowers.add(wrap);
  const rose = std('#c8203a', { roughness: 0.55, emissive: '#3a0610', emissiveIntensity: 0.6 }), leafM = std('#3f7a33', { roughness: 0.7 });
  const R = (s => () => { s = (s * 16807) % 2147483647; return s / 2147483647; })(9);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, r = 0.07;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.048, 1), rose);
    m.position.set(Math.cos(a) * r, 0.56 + R() * 0.06, Math.sin(a) * r); m.scale.set(1, 0.85, 1); m.castShadow = true; flowers.add(m);
    const lf = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), leafM); lf.scale.set(0.5, 0.15, 1.2);
    lf.position.set(Math.cos(a + 0.5) * 0.12, 0.5, Math.sin(a + 0.5) * 0.12); lf.rotation.y = -a; flowers.add(lf);
  }
  const daisy = new THREE.SpriteMaterial({ map: tex(makeDaisyCanvas(128)), transparent: true, depthWrite: false });
  [[0, 0.64, 0], [0.09, 0.6, 0.05], [-0.09, 0.61, -0.04], [0.02, 0.59, -0.1], [-0.05, 0.6, 0.1]].forEach(([x, y, z]) => {
    const s = new THREE.Sprite(daisy); s.position.set(x, y, z); s.scale.setScalar(0.085); flowers.add(s);
  });
  items.flowers = flowers;

  // chồng bài kiểm tra, bút đỏ, sổ điểm
  const tests = new THREE.Group(); tests.position.set(X + 0.1, Y, Z + 0.02); g.add(tests);
  const paper = std('#fbfaf3', { roughness: 0.9 }), topTex = tex(makeTestPaperCanvas());
  for (let i = 0; i < 8; i++) {
    const mats = i === 7 ? [paper, paper, std('#ffffff', { map: topTex, roughness: 0.9 }), paper, paper, paper] : paper;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.004, 0.42), mats);
    p.position.y = 0.002 + i * 0.0045; p.rotation.y = (R() - 0.5) * 0.12; p.castShadow = p.receiveShadow = true; tests.add(p);
    p.userData.base = p.position.clone(); p.userData.rot = p.rotation.y;
  }
  const pen = new THREE.Group(); pen.position.set(0.05, 0.042, 0.02); pen.rotation.set(0, 0.6, Math.PI / 2); tests.add(pen);
  cyl(0.0065, 0.0065, 0.14, std('#d23b2c', { roughness: 0.4 }), 0, 0, 0, pen, 8);
  cyl(0.007, 0.007, 0.04, std('#f5f5f5'), 0, 0.075, 0, pen, 8);
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.3), [std('#7d1f1a'), std('#7d1f1a'), std('#ffffff', { map: tex(makeBookCanvas()) }), std('#7d1f1a'), std('#efe6d2'), std('#7d1f1a')]);
  book.position.set(-0.3, 0.015, 0.05); book.rotation.y = 0.15; book.castShadow = true; tests.add(book);
  items.tests = tests;

  // cặp kính của Ba đặt cạnh chồng bài
  const glasses = new THREE.Group(); glasses.position.set(X - 0.12, Y + 0.012, Z + 0.22); glasses.rotation.y = -0.3; g.add(glasses);
  const frame = std('#6b4423', { roughness: 0.35, metalness: 0.2 });
  [-1, 1].forEach((s) => {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.0045, 8, 24), frame);
    rim.rotation.x = Math.PI / 2; rim.position.set(s * 0.042, 0, 0); rim.castShadow = true; glasses.add(rim);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.032, 20), new THREE.MeshStandardMaterial({ color: '#cfe6f5', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.3 }));
    lens.rotation.x = -Math.PI / 2; lens.position.set(s * 0.042, 0.001, 0); glasses.add(lens);
    const arm = box(0.004, 0.004, 0.12, frame, s * 0.074, 0.004, -0.058, glasses); arm.rotation.y = s * 0.12;
  });
  const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.004, 6, 10, Math.PI), frame);
  bridge.rotation.x = -Math.PI / 2; bridge.position.set(0, 0.002, 0.005); glasses.add(bridge);
  items.glasses = glasses;

  // thước êke, compa, máy tính Casio
  const tools = new THREE.Group(); tools.position.set(X + 0.5, Y, Z + 0.05); g.add(tools);
  const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(0.2, 0); tri.lineTo(0, 0.13); tri.closePath();
  const hole = new THREE.Path(); hole.moveTo(0.035, 0.025); hole.lineTo(0.12, 0.025); hole.lineTo(0.035, 0.08); hole.closePath(); tri.holes.push(hole);
  const eke = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.004, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#8fd19e', transparent: true, opacity: 0.75, roughness: 0.2 }));
  eke.rotation.x = -Math.PI / 2; eke.position.set(-0.12, 0.004, 0.18); eke.castShadow = true; tools.add(eke);
  const compass = new THREE.Group(); compass.position.set(0.02, 0.012, 0.2); compass.rotation.set(-Math.PI / 2, 0, 0.4); tools.add(compass);
  const metal = std('#c9ccd1', { metalness: 0.8, roughness: 0.3 });
  [-1, 1].forEach((s) => { const leg = cyl(0.004, 0.003, 0.13, metal, s * 0.018, -0.06, 0, compass, 6); leg.rotation.z = s * 0.28; });
  cyl(0.009, 0.009, 0.02, std('#2b2b2b'), 0, 0.005, 0, compass, 8);
  const calc = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.014, 0.15), [std('#2f3237'), std('#2f3237'), std('#ffffff', { map: tex(makeCalculatorCanvas()), roughness: 0.5 }), std('#2f3237'), std('#2f3237'), std('#2f3237')]);
  calc.position.set(0.1, 0.007, -0.08); calc.rotation.y = -0.25; calc.castShadow = true; tools.add(calc);
  items.tools = tools;

  // ly cà phê và hộp phấn
  cyl(0.04, 0.034, 0.11, new THREE.MeshStandardMaterial({ color: '#e8f1f5', transparent: true, opacity: 0.45, roughness: 0.05 }), X + 0.6, Y + 0.055, Z - 0.22, g, 16);
  cyl(0.036, 0.031, 0.075, std('#8a5a2b', { roughness: 0.3 }), X + 0.6, Y + 0.04, Z - 0.22, g, 16);
  const chalkBox = new THREE.Group(); chalkBox.position.set(X - 0.62, Y, Z + 0.22); g.add(chalkBox);
  box(0.12, 0.05, 0.08, std('#f4f1ea'), 0, 0.025, 0, chalkBox);
  box(0.121, 0.02, 0.081, std('#3b6fb6'), 0, 0.03, 0, chalkBox);
  for (let i = 0; i < 4; i++) { const s = cyl(0.007, 0.007, 0.06, std('#fbfaf5'), -0.03 + i * 0.02, 0.07, 0, chalkBox, 6); s.rotation.x = 0.3; }

  return { group: g, items, deskTop: new THREE.Vector3(X, Y, Z) };
}

export function makeStudentDesks() {
  const g = new THREE.Group();
  const wood = std('#b98c5a', { roughness: 0.65 }), bench = std('#a57a4c', { roughness: 0.7 }), leg = std('#6e4a2a');
  const books = ['#3b6fb6', '#d9534f', '#f0ad4e', '#5cb85c', '#fbfaf3'].map((c) => std(c, { roughness: 0.8 }));
  let k = 0;
  [-2.25, -1.05, 0.15, 1.35].forEach((z) => [-1.45, 1.45].forEach((x) => {
    box(1.3, 0.04, 0.45, wood, x, 0.74, z, g);
    [-0.62, 0.62].forEach((dx) => box(0.04, 0.72, 0.42, leg, x + dx, 0.36, z, g));
    box(1.22, 0.02, 0.34, wood, x, 0.52, z - 0.02, g);
    box(1.28, 0.28, 0.02, wood, x, 0.58, z - 0.215, g);
    box(1.3, 0.04, 0.28, bench, x, 0.44, z + 0.46, g);
    [-0.58, 0.58].forEach((dx) => box(0.04, 0.42, 0.24, leg, x + dx, 0.21, z + 0.46, g));
    if (k % 3 !== 1) {
      const b = box(0.2, 0.012, 0.27, books[k % books.length], x + (k % 2 ? 0.3 : -0.25), 0.766, z + 0.02, g); b.rotation.y = (k % 4 - 1.5) * 0.12;
    }
    k++;
  }));
  return g;
}

// Trống trường treo trên giá gỗ ngoài hành lang
export function makeDrum() {
  const g = new THREE.Group(); g.position.set(ROOM.W / 2 + 1.4, 0, -2.2);
  const woodM = std('#6e4524', { roughness: 0.7 });
  [-0.62, 0.62].forEach((z) => box(0.1, 1.9, 0.1, woodM, 0, 0.95, z, g));
  box(0.12, 0.1, 1.4, woodM, 0, 1.85, 0, g);
  const drum = new THREE.Group(); drum.position.set(0, 1.25, 0); g.add(drum);
  const prof = []; for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push(new THREE.Vector2(0.34 + Math.sin(Math.PI * t) * 0.07, (t - 0.5) * 0.72)); }
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), std('#b3261e', { roughness: 0.45 }));
  body.rotation.x = Math.PI / 2; body.castShadow = true; drum.add(body);
  const skin = std('#e9d8b4', { roughness: 0.8 });
  [-1, 1].forEach((s) => { const c = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), skin); c.position.z = s * 0.36; c.rotation.y = s < 0 ? Math.PI : 0; drum.add(c); });
  const stud = std('#e0b04a', { metalness: 0.6, roughness: 0.3 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    [-0.33, 0.33].forEach((z) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), stud); s.position.set(Math.cos(a) * 0.345, Math.sin(a) * 0.345, z); drum.add(s); });
  }
  [-0.5, 0.5].forEach((z) => { const r = cyl(0.01, 0.01, 0.6, std('#4a3a2a'), 0, 1.58, z * 0.8, g, 6); r.rotation.x = z * 0.4; });
  const stick = new THREE.Group(); stick.position.set(-0.05, 1.25, 0.55); g.add(stick);
  const st = cyl(0.018, 0.022, 0.5, std('#c9a26b'), 0, -0.25, 0, stick, 8); st.rotation.z = 0.1;
  return { group: g, drum, stick };
}

// Máy bay giấy (hình mũi tên gấp giữa)
export function planeGeometry() {
  const v = [0, 0, 0.22, -0.11, 0.012, -0.12, 0, 0, -0.1, 0, 0, 0.22, 0, 0, -0.1, 0.11, 0.012, -0.12, 0, 0, 0.22, 0, -0.035, -0.1, 0, 0, -0.1];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  return geo;
}

// "Mỗi học trò là một vì sao": bầu trời sao phía trên trần, hiện dần theo uReveal
export function makeStudentStars(n) {
  const pos = new Float32Array(n * 3), th = new Float32Array(n), ph = new Float32Array(n);
  let s = 77;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, e = Math.acos(1 - r() * 0.92), rad = 26;
    pos[i * 3] = Math.sin(e) * Math.cos(a) * rad; pos[i * 3 + 1] = ROOM.H + Math.cos(e) * rad * 0.6; pos[i * 3 + 2] = Math.sin(e) * Math.sin(a) * rad;
    th[i] = r(); ph[i] = r() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aTh', new THREE.BufferAttribute(th, 1));
  geo.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uReveal: { value: 0 }, uTime: { value: 0 }, uSize: { value: 5 * Math.min(window.devicePixelRatio || 1, 2) } },
    vertexShader: `uniform float uReveal, uTime, uSize; attribute float aTh, aPh; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        float on = smoothstep(aTh, aTh + 0.04, uReveal);
        float tw = 0.6 + 0.4 * sin(uTime * (1.0 + fract(aPh) * 2.0) + aPh);
        vA = on * tw; gl_PointSize = uSize * (0.6 + fract(aPh * 7.3) * 0.9) * (0.4 + 0.6 * on); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vec3(1.0, 0.95, 0.82), a * a * vA); }`,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.visible = false;
  return pts;
}

// Bài kiểm tra của con: hiện lấp lánh trên bàn giáo viên sau khi tìm đủ
export function makeLetterSprite() {
  const c = canvas(256, 200), x = c.getContext('2d');
  x.fillStyle = '#fdfbf4'; x.fillRect(20, 10, 216, 180);
  x.strokeStyle = 'rgba(60,90,170,0.3)'; x.lineWidth = 2; for (let y = 70; y < 180; y += 18) { x.beginPath(); x.moveTo(34, y); x.lineTo(222, y); x.stroke(); }
  x.strokeStyle = '#d23b2c'; x.lineWidth = 4; x.beginPath(); x.arc(190, 44, 26, 0, Math.PI * 2); x.stroke();
  x.fillStyle = '#d23b2c'; x.font = "700 30px 'Dancing Script', cursive"; x.textAlign = 'center'; x.fillText('10', 190, 55);
  x.fillStyle = '#2b2a26'; x.font = "600 18px 'Be Vietnam Pro', sans-serif"; x.textAlign = 'left'; x.fillText('BÀI KIỂM TRA', 36, 50);
  const g = new THREE.Group();
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), transparent: true, fog: false })); sp.scale.set(0.5, 0.39, 1); g.add(sp);
  g.add(glowSprite('#ffe3a3', 1.6, 0.55));
  g.visible = false;
  return g;
}

export function makeHearts() {
  const pool = [], group = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.heart, transparent: true, depthWrite: false, opacity: 0, fog: false }));
    s.scale.setScalar(0.12); s.visible = false; group.add(s); pool.push({ s, life: 0, max: 1, vx: 0, delay: 0 });
  }
  let seed = 5;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  return {
    group,
    burst(at) {
      pool.forEach((h, i) => { h.s.position.set(at.x + (r() - 0.5) * 0.25, at.y + r() * 0.1, at.z + (r() - 0.5) * 0.25); h.life = h.max = 1.4 + r() * 0.8; h.vx = (r() - 0.5) * 0.2; h.delay = i * 0.06; h.s.visible = true; });
    },
    update(dt) {
      pool.forEach((h) => {
        if (!h.s.visible) return;
        if (h.delay > 0) { h.delay -= dt; return; }
        h.life -= dt;
        if (h.life <= 0) { h.s.visible = false; h.s.material.opacity = 0; return; }
        const k = h.life / h.max;
        h.s.position.y += dt * 0.35; h.s.position.x += h.vx * dt;
        h.s.material.opacity = Math.min(1, (1 - k) * 5) * k; h.s.scale.setScalar(0.08 + (1 - k) * 0.08);
      });
    },
  };
}

export { noShadow };
