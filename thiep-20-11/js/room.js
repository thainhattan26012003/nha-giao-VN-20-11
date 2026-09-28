// Căn phòng: nền gạch, tường vàng chân xanh, cửa sổ chớp có song sắt, cửa ra vào, trần đèn tuýp và quạt,
// bảng xanh, băng rôn, đồng hồ, bục giảng, sân trường bên ngoài, vệt nắng và bụi phấn trong nắng.
import { THREE, std, tex, box, cyl, noShadow, twinklePoints } from './kit.js';
import { makeTileCanvas, makeBoardCanvas, makeBannerCanvas, makeClockCanvas, canvas } from './art.js';

export const ROOM = { W: 8, D: 9, H: 3.4 };
export const WINDOWS = [-2.6, -0.2, 2.2];
export const WIN = { w: 1.5, sill: 1.0, top: 2.5 };
export const DOOR = { z0: -1.4, z1: -0.2, h: 2.3 };
export const sunDirection = () => new THREE.Vector3(12, -9, -3).normalize();

const T = 0.12;

export function makeRoom({ boardLines, dateText }) {
  const g = new THREE.Group();
  const { W, D, H } = ROOM;
  const wallUp = std('#f1d893', { roughness: 0.95 }), wallLow = std('#8fae97', { roughness: 0.9 });
  const green = std('#2f6f55', { roughness: 0.6 }), wood = std('#7a4f2c', { roughness: 0.7 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std('#ffffff', { map: tex(makeTileCanvas(512), { repeat: [W / 2, D / 2] }), roughness: 0.62 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);

  const wall = (cx, cz, sx, sz, y0, y1) => {
    if (y0 < WIN.sill) box(sx, Math.min(y1, WIN.sill) - y0, sz, wallLow, cx, (y0 + Math.min(y1, WIN.sill)) / 2, cz, g);
    if (y1 > WIN.sill) { const a = Math.max(y0, WIN.sill); box(sx, y1 - a, sz, wallUp, cx, (a + y1) / 2, cz, g); }
  };
  wall(0, -D / 2 - T / 2, W + T * 2, T, 0, H);
  wall(0, D / 2 + T / 2, W + T * 2, T, 0, H);
  const lx = -W / 2 - T / 2;
  wall(lx, 0, T, D, 0, WIN.sill);
  wall(lx, 0, T, D, WIN.top, H);
  const edges = [-D / 2];
  WINDOWS.forEach((zc) => edges.push(zc - WIN.w / 2, zc + WIN.w / 2));
  edges.push(D / 2);
  for (let i = 0; i < edges.length; i += 2) if (edges[i + 1] - edges[i] > 0.01) wall(lx, (edges[i] + edges[i + 1]) / 2, T, edges[i + 1] - edges[i], WIN.sill, WIN.top);
  const rx = W / 2 + T / 2;
  wall(rx, (-D / 2 + DOOR.z0) / 2, T, DOOR.z0 + D / 2, 0, H);
  wall(rx, (DOOR.z1 + D / 2) / 2, T, D / 2 - DOOR.z1, 0, H);
  wall(rx, (DOOR.z0 + DOOR.z1) / 2, T, DOOR.z1 - DOOR.z0, DOOR.h, H);

  // cửa sổ: khung, song sắt, hai cánh chớp mở ra ngoài
  const slats = tex((() => {
    const c = canvas(64, 256), x = c.getContext('2d');
    x.fillStyle = '#2f6f55'; x.fillRect(0, 0, 64, 256);
    x.fillStyle = 'rgba(0,0,0,0.28)'; for (let y = 6; y < 256; y += 14) x.fillRect(4, y, 56, 5);
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 6; x.strokeRect(0, 0, 64, 256);
    return c;
  })());
  const shutterMat = std('#ffffff', { map: slats, roughness: 0.6 }), bar = std('#3a3f3a', { metalness: 0.4, roughness: 0.5 });
  WINDOWS.forEach((zc) => {
    box(0.26, 0.05, WIN.w + 0.08, green, -W / 2 + 0.05, WIN.sill, zc, g);
    box(T + 0.04, 0.06, WIN.w + 0.08, green, lx, WIN.top, zc, g);
    [-1, 1].forEach((s) => box(T + 0.04, WIN.top - WIN.sill, 0.06, green, lx, (WIN.sill + WIN.top) / 2, zc + s * WIN.w / 2, g));
    for (let i = 0; i < 7; i++) cyl(0.012, 0.012, WIN.top - WIN.sill, bar, -W / 2 - 0.03, (WIN.sill + WIN.top) / 2, zc - 0.6 + i * 0.2, g, 6);
    [-1, 1].forEach((s) => {
      const pivot = new THREE.Group(); pivot.position.set(-W / 2 - T, WIN.sill + 0.02, zc + s * WIN.w / 2);
      const leaf = box(0.03, WIN.top - WIN.sill - 0.04, WIN.w / 2, shutterMat, 0, (WIN.top - WIN.sill - 0.04) / 2, -s * WIN.w / 4, pivot);
      leaf.castShadow = true;
      pivot.rotation.y = s * 1.9; g.add(pivot);
    });
  });

  // cửa ra vào mở ra hành lang
  [-1, 1].forEach((s) => box(T + 0.04, DOOR.h, 0.06, green, rx, DOOR.h / 2, s < 0 ? DOOR.z0 : DOOR.z1, g));
  box(T + 0.04, 0.06, DOOR.z1 - DOOR.z0 + 0.06, green, rx, DOOR.h, (DOOR.z0 + DOOR.z1) / 2, g);
  // bản lề phía cuối lớp, cánh cửa mở ra ngoài về phía sau để không che cái trống
  const doorPivot = new THREE.Group(); doorPivot.position.set(W / 2 + T, 0, DOOR.z1);
  box(0.05, DOOR.h - 0.06, DOOR.z1 - DOOR.z0 - 0.04, std('#2f6f55', { roughness: 0.55 }), 0.03, (DOOR.h - 0.06) / 2, -(DOOR.z1 - DOOR.z0) / 2, doorPivot);
  doorPivot.rotation.y = -1.75; g.add(doorPivot);

  // trần, đèn tuýp, quạt trần
  const ceilingMat = std('#f3efe3', { roughness: 1 });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilingMat);
  ceiling.rotation.x = Math.PI / 2; ceiling.position.y = H; ceiling.receiveShadow = true; g.add(ceiling);
  const tubeMat = new THREE.MeshBasicMaterial({ color: '#fffaf0' }), fixture = std('#eceae4', { roughness: 0.5 });
  [-1.6, 1.6].forEach((x) => [-2.3, 1.1].forEach((z) => {
    noShadow(box(0.14, 0.05, 1.25, fixture, x, H - 0.03, z, g));
    const tube = cyl(0.024, 0.024, 1.15, tubeMat, x, H - 0.075, z, g, 8); tube.rotation.x = Math.PI / 2; noShadow(tube);
  }));
  const fanParts = std('#e9e3d3', { roughness: 0.5 }), bladeMat = std('#d9d2bf', { roughness: 0.6 });
  const fans = [-1.6, 1.6].map((x) => {
    const f = new THREE.Group(); f.position.set(x, H, -0.6);
    noShadow(cyl(0.015, 0.015, 0.42, fanParts, 0, -0.21, 0, f, 6));
    noShadow(cyl(0.13, 0.11, 0.1, fanParts, 0, -0.47, 0, f));
    const blades = new THREE.Group(); blades.position.y = -0.5; f.add(blades);
    for (let i = 0; i < 3; i++) {
      const arm = new THREE.Group(); arm.rotation.y = (i / 3) * Math.PI * 2; blades.add(arm);
      const b = box(0.75, 0.012, 0.13, bladeMat, 0.48, 0, 0, arm); b.rotation.x = 0.12; b.castShadow = false;
    }
    g.add(f);
    return { group: f, blades };
  });

  // bảng, máng phấn, băng rôn, đồng hồ
  const bz = -D / 2;
  box(3.95, 1.45, 0.05, wood, 0, 1.72, bz + 0.025, g);
  const boardTex = tex(makeBoardCanvas(boardLines, dateText));
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.75, 1.3), std('#ffffff', { map: boardTex, roughness: 0.92 }));
  board.position.set(0, 1.72, bz + 0.056); board.receiveShadow = true; g.add(board);
  box(3.75, 0.035, 0.09, wood, 0, 1.045, bz + 0.08, g);
  ['#f3f1e8', '#f7dc6f', '#f5a3b5', '#9fd3f0', '#f3f1e8'].forEach((c, i) => {
    const s = cyl(0.008, 0.008, 0.07, std(c, { roughness: 1 }), -1.3 + i * 0.09, 1.072, bz + 0.08, g, 6); s.rotation.z = Math.PI / 2;
  });
  box(0.15, 0.04, 0.055, std('#3d3b37'), 1.25, 1.083, bz + 0.08, g);
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.34), std('#ffffff', { map: tex(makeBannerCanvas('TIÊN HỌC LỄ – HẬU HỌC VĂN')), roughness: 0.8 }));
  banner.position.set(0, 2.8, bz + 0.012); g.add(banner);
  const clock = new THREE.Group(); clock.position.set(2.72, 2.8, bz + 0.03); g.add(clock);
  clock.add(new THREE.Mesh(new THREE.CircleGeometry(0.2, 40), std('#ffffff', { map: tex(makeClockCanvas(256)), roughness: 0.6 })));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 40), std('#2b2b2b', { roughness: 0.4 })); clock.add(rim);
  const hand = (len, wdt, col, z) => {
    const p = new THREE.Group(); p.position.z = z; clock.add(p);
    const m = new THREE.Mesh(new THREE.BoxGeometry(wdt, len, 0.004), new THREE.MeshBasicMaterial({ color: col }));
    m.position.y = len / 2 - 0.02; p.add(m);
    return p;
  };
  const hands = { h: hand(0.11, 0.014, '#1d1d1d', 0.006), m: hand(0.16, 0.009, '#1d1d1d', 0.009), s: hand(0.17, 0.004, '#c0281f', 0.012) };

  // bục giảng
  box(5.6, 0.18, 1.3, std('#a8744a', { roughness: 0.7 }), 0, 0.09, bz + 0.65, g);
  box(5.6, 0.025, 0.03, std('#6e4524'), 0, 0.18, bz + 1.3, g);

  // bên ngoài: bầu trời, sân trường, cây, hành lang
  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#8fc3ee') }, hor: { value: new THREE.Color('#f7e6c4') }, sun: { value: sunDirection().negate() } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top, hor, sun; varying vec3 vDir;
      void main(){ vec3 c = mix(hor, top, smoothstep(0.0, 0.6, vDir.y));
        c += vec3(1.0, 0.85, 0.55) * pow(max(dot(normalize(vDir), sun), 0.0), 12.0) * 0.6;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  g.add(sky);
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), std('#d6cdb8', { roughness: 1 }));
  yard.rotation.x = -Math.PI / 2; yard.position.y = -0.02; yard.receiveShadow = true; g.add(yard);
  const leaf = ['#4f8a3c', '#3f7a33', '#5d9a45'].map((c) => std(c, { flatShading: true, roughness: 0.9 }));
  [[-9, -5], [-10, 3.5], [11, -8]].forEach(([x, z], k) => {
    const tree = new THREE.Group(); tree.position.set(x, 0, z);
    cyl(0.25, 0.4, 4.2, std('#6b4a33'), 0, 2.1, 0, tree, 8);
    [[0, 4.6, 0, 2.1], [1.3, 4.1, 0.6, 1.5], [-1.2, 4.2, -0.4, 1.6], [0.3, 5.6, -0.3, 1.5]].forEach(([a, b, c, r], i) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaf[(i + k) % 3]); m.position.set(a, b, c); tree.add(m);
    });
    g.add(noShadow(tree));
  });
  box(2.6, 0.05, 6, std('#c9c0ad', { roughness: 0.9 }), W / 2 + 1.3 + T, -0.02, -1.5, g);
  box(0.06, 0.9, 6, std('#8f8a7c'), W / 2 + 2.55 + T, 0.45, -1.5, g);
  [-4.3, 1.3].forEach((z) => box(0.25, H, 0.25, wallUp, W / 2 + 2.5 + T, H / 2, z, g));

  return { group: g, board, ceiling, ceilingMat, tubeMat, fans, hands, sky };
}

// Vệt nắng xiên qua cửa sổ (khối sáng cộng màu)
export function makeBeams() {
  const { W } = ROOM, d = sunDirection();
  const c = canvas(64, 128), x = c.getContext('2d');
  const v = x.createLinearGradient(0, 128, 0, 0);
  v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(0.6, 'rgba(255,255,255,0.35)'); v.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = v; x.fillRect(0, 0, 64, 128);
  x.globalCompositeOperation = 'destination-in';
  const h = x.createLinearGradient(0, 0, 64, 0);
  h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(0.25, 'rgba(0,0,0,1)'); h.addColorStop(0.75, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = h; x.fillRect(0, 0, 64, 128);
  const mat = new THREE.MeshBasicMaterial({ map: tex(c), color: '#ffe3a6', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, fog: false });
  const group = new THREE.Group();
  WINDOWS.forEach((zc) => {
    const P = [[WIN.sill, zc - WIN.w / 2], [WIN.sill, zc + WIN.w / 2], [WIN.top, zc + WIN.w / 2], [WIN.top, zc - WIN.w / 2]].map(([y, z]) => new THREE.Vector3(-W / 2, y, z));
    const Q = P.map((p) => p.clone().addScaledVector(d, p.y / -d.y));
    const pos = [], uv = [];
    [[0, 1], [3, 2], [0, 3], [1, 2]].forEach(([a, b]) => {
      pos.push(...P[a].toArray(), ...P[b].toArray(), ...Q[b].toArray(), ...P[a].toArray(), ...Q[b].toArray(), ...Q[a].toArray());
      uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const m = new THREE.Mesh(geo, mat); m.renderOrder = 2; group.add(m);
  });
  return { group, mat };
}

// Bụi phấn lấp lánh trong vệt nắng
export function makeMotes(R) {
  const { W } = ROOM, d = sunDirection(), p = [], c = [];
  WINDOWS.forEach((zc) => {
    for (let i = 0; i < 70; i++) {
      const y = WIN.sill + R() * (WIN.top - WIN.sill), z = zc - WIN.w / 2 + R() * WIN.w, t = (0.15 + R() * 0.8) * (y / -d.y);
      p.push(-W / 2 + d.x * t, y + d.y * t, z + d.z * t); c.push(1, 0.93, 0.75);
    }
  });
  for (let i = 0; i < 60; i++) { p.push((R() - 0.5) * 7, 0.3 + R() * 2.8, (R() - 0.5) * 8); c.push(0.55, 0.52, 0.45); }
  return twinklePoints(p, c, { size: 3.4, drift: 0.12, speed: 1.1, seed: 7 });
}
