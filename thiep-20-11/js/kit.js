// Hàm dùng chung cho cảnh 3D (three.js được tải lúc chạy nên truyền vào qua setup)
export let THREE = null;
export const TX = {};
export function setup(three, textures) { THREE = three; Object.assign(TX, textures); }

export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });

export function tex(c, { srgb = true, repeat = null } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

export function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

export function cyl(rt, rb, h, mat, x, y, z, parent, seg = 14) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

export function glowSprite(color, scale, opacity = 1, soft = false) {
  const m = new THREE.SpriteMaterial({ map: soft ? TX.glowSoft : TX.glow, color, transparent: true, opacity,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const s = new THREE.Sprite(m); s.scale.setScalar(scale);
  return s;
}

export function noShadow(obj) { obj.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } }); return obj; }

// Hạt sáng lấp lánh (bụi phấn trong nắng, sao trời) — một lần vẽ cho cả đám
export function twinklePoints(positions, colors, { size = 6, attenuate = true, drift = 0, speed = 1, seed = 1 } = {}) {
  const geo = new THREE.BufferGeometry();
  const n = positions.length / 3, phase = new Float32Array(n);
  let s = seed;
  for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; phase[i] = (s / 2147483647) * 100; }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { uTime: { value: 0 }, uSize: { value: size * Math.min(window.devicePixelRatio || 1, 2) }, uDrift: { value: drift }, uSpeed: { value: speed }, uAlpha: { value: 1 } },
    vertexShader: `
      uniform float uTime, uSize, uDrift, uSpeed; attribute float aPhase; varying vec3 vColor; varying float vTw;
      void main() {
        vec3 p = position;
        p += uDrift * vec3(sin(uTime * 0.3 + aPhase), sin(uTime * 0.45 + aPhase * 1.7) * 0.6, cos(uTime * 0.25 + aPhase * 1.3));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vTw = 0.55 + 0.45 * sin(uTime * uSpeed * (1.2 + fract(aPhase) * 2.0) + aPhase);
        vColor = color;
        gl_PointSize = uSize * (0.7 + 0.5 * vTw) ${attenuate ? '* (6.0 / -mv.z)' : ''};
      }`,
    fragmentShader: `
      uniform float uAlpha; varying vec3 vColor; varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d); a *= a;
        gl_FragColor = vec4(vColor * (0.6 + 0.8 * vTw), a * uAlpha);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}
