// Clay red panda mascot built from three.js primitives, with poses + reactions.
import * as THREE from "three";

const C = {
  rust: "#c4562b",
  cream: "#f3dcc0",
  dark: "#4a2a26",
  earIn: "#7a4a3e",
  eye: "#24130f",
  pink: "#ff8fbf",
  grape: "#b39bff",
};

// Shared felt-clay bump texture (fine noise, like the fuzzy clay in the reference)
let feltTex = null;
function felt() {
  if (feltTex) return feltTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.random() * 145;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  feltTex = new THREE.CanvasTexture(c);
  feltTex.wrapS = feltTex.wrapT = THREE.RepeatWrapping;
  feltTex.repeat.set(4, 4);
  return feltTex;
}

const matCache = new Map();
function mat(color, { smooth = false } = {}) {
  const key = color + smooth;
  if (!matCache.has(key)) {
    matCache.set(key, smooth
      ? new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 0.8 })
      : new THREE.MeshStandardMaterial({ color, roughness: 0.92, bumpMap: felt(), bumpScale: 0.6 }));
  }
  return matCache.get(key);
}

const SPH = new THREE.SphereGeometry(1, 32, 24);
function blob(color, r, pos, scale = [1, 1, 1], opts) {
  const m = new THREE.Mesh(SPH, mat(color, opts));
  m.scale.set(r * scale[0], r * scale[1], r * scale[2]);
  m.position.set(...pos);
  return m;
}
function capsule(color, r, len, pos) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 16), mat(color));
  m.position.set(...pos);
  return m;
}
function heartMesh(color, size = 0.22) {
  const s = new THREE.Shape();
  s.moveTo(0, -0.9);
  s.bezierCurveTo(-1.6, 0.1, -0.8, 1.3, 0, 0.55);
  s.bezierCurveTo(0.8, 1.3, 1.6, 0.1, 0, -0.9);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 6, curveSegments: 24 });
  geo.center();
  const m = new THREE.Mesh(geo, mat(color, { smooth: true }));
  m.scale.setScalar(size);
  return m;
}

const lerp = (a, b, k) => a + (b - a) * k;

export function buildPanda() {
  const root = new THREE.Group();     // moves (hops, hula)
  const body = new THREE.Group();     // squash & stretch
  root.add(body);

  // Torso, haunches, chest
  body.add(blob(C.rust, 0.62, [0, 0.72, -0.05], [1, 1.05, 0.9]));
  body.add(blob(C.rust, 0.4, [0.42, 0.38, -0.05]));
  body.add(blob(C.rust, 0.4, [-0.42, 0.38, -0.05]));
  body.add(blob(C.dark, 0.44, [0, 0.6, 0.28], [1, 1.15, 0.7]));
  body.add(blob(C.dark, 0.2, [0.48, 0.1, 0.32], [1, 0.6, 1.4]));
  body.add(blob(C.dark, 0.2, [-0.48, 0.1, 0.32], [1, 0.6, 1.4]));
  body.add(blob(C.rust, 0.42, [0, 1.12, 0.05], [1.1, 0.8, 1]));  // neck fluff

  // Front legs (arms) pivot at shoulders
  function arm(side) {
    const g = new THREE.Group();
    g.position.set(0.25 * side, 1.0, 0.3);
    g.add(capsule(C.dark, 0.13, 0.55, [0, -0.38, 0]));
    g.add(blob(C.dark, 0.16, [0, -0.72, 0.05], [1, 0.75, 1.2]));
    body.add(g);
    return g;
  }
  const armL = arm(1), armR = arm(-1);

  // Head (pivot at neck)
  const head = new THREE.Group();
  head.position.set(0, 1.22, 0.05);
  body.add(head);
  head.add(blob(C.rust, 0.62, [0, 0.45, 0], [1.12, 0.92, 0.95]));
  head.add(blob(C.rust, 0.3, [0.55, 0.3, 0.05], [1, 0.9, 0.9]));   // side fluff
  head.add(blob(C.rust, 0.3, [-0.55, 0.3, 0.05], [1, 0.9, 0.9]));
  head.add(blob(C.cream, 0.26, [0.46, 0.26, 0.3], [1, 0.75, 0.6])); // cheeks
  head.add(blob(C.cream, 0.26, [-0.46, 0.26, 0.3], [1, 0.75, 0.6]));
  head.add(blob(C.cream, 0.3, [0, 0.27, 0.47], [1.2, 0.85, 0.8]));  // muzzle
  for (const s of [1, -1]) {
    const brow = blob(C.cream, 0.1, [0.25 * s, 0.7, 0.47], [1.3, 0.55, 0.5]);
    brow.rotation.z = -0.35 * s;
    head.add(brow);
  }
  const eyes = [];
  for (const s of [1, -1]) {
    const e = new THREE.Group();
    e.position.set(0.23 * s, 0.5, 0.53);
    e.add(blob(C.eye, 0.085, [0, 0, 0], [1, 1.1, 0.8], { smooth: true }));
    e.add(blob("#ffffff", 0.025, [0.03, 0.035, 0.065], [1, 1, 1], { smooth: true }));
    head.add(e);
    eyes.push(e);
  }
  head.add(blob(C.eye, 0.085, [0, 0.37, 0.74], [1.35, 0.85, 0.9], { smooth: true })); // nose
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 8, 24, Math.PI), mat(C.eye, { smooth: true }));
  mouth.position.set(0, 0.24, 0.715);
  mouth.rotation.z = Math.PI;
  head.add(mouth);

  function ear(side) {
    const g = new THREE.Group();
    g.position.set(0.44 * side, 0.86, -0.05);
    g.rotation.z = -0.4 * side;
    g.add(blob(C.cream, 0.24, [0, 0.12, 0], [1, 1.2, 0.5]));
    g.add(blob(C.earIn, 0.15, [0, 0.1, 0.07], [1, 1.15, 0.4]));
    head.add(g);
    return g;
  }
  const earL = ear(1), earR = ear(-1);

  // Banded tail curling around the right side
  const tail = new THREE.Group();
  tail.position.set(-0.3, 0.25, -0.45);
  body.add(tail);
  const tailSegs = [];
  const N = 13;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const ang = Math.PI * 0.1 + t * Math.PI * 0.9;           // sweep from back, around the side, to the front
    const rad = 0.55 + t * 0.15;
    const r = 0.2 + Math.sin(t * Math.PI) * 0.07;
    const band = Math.floor(i / 2) % 2 === 1 ? C.cream : C.rust;
    const seg = blob(band, r, [-Math.sin(ang) * rad, 0.02 - t * 0.12, -Math.cos(ang) * rad + 0.25]);
    seg.userData.base = seg.position.clone();
    tail.add(seg);
    tailSegs.push(seg);
  }

  // Props
  const heart = heartMesh(C.pink);
  heart.position.set(0, 2.55, 0.1);
  heart.visible = false;
  root.add(heart);

  const beadRing = new THREE.Group();
  beadRing.position.set(0, 1.0, 0.45);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    beadRing.add(blob(i % 3 ? C.pink : C.grape, 0.08, [Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0], [1, 1, 1], { smooth: true }));
  }
  beadRing.visible = false;
  root.add(beadRing);

  // ---- Animation state ----
  let mode = "wave";
  let reaction = null;           // { kind, t0 }
  let nextBlink = 1.5, blinkT = -1;
  let nextTwitch = 2;
  const cur = { aLx: 0, aLz: 0, aRx: 0, aRz: 0, hx: 0, hy: 0, hz: 0 };

  function setMode(m) { mode = m; }
  function react(kind) { reaction = { kind, t0: performance.now() / 1000 }; }

  function update(t, dt) {
    const k = Math.min(1, dt * 9);
    // targets from mode
    let aLx = 0.15, aLz = 0, aRx = 0.15, aRz = 0, hx = 0, hy = 0, hz = 0;
    let y = 0, sx = 1, sy = 1 + Math.sin(t * 2.2) * 0.015, spin = 0, px = 0, pz = 0;
    heart.visible = mode === "heart";
    beadRing.visible = mode === "type";

    switch (mode) {
      case "wave":
        aRx = -2.6; aRz = -0.35 + Math.sin(t * 8) * 0.35; hz = 0.12 + Math.sin(t * 1.5) * 0.05;
        break;
      case "hula":
        px = Math.sin(t * 4.5) * 0.07; pz = Math.cos(t * 4.5) * 0.07;
        aLx = -1.2; aLz = 0.9; aRx = -1.2; aRz = -0.9; hz = Math.sin(t * 4.5) * 0.08;
        break;
      case "type":
        hx = 0.22; aLx = -0.9 + Math.max(0, Math.sin(t * 9)) * 0.35; aRx = -0.9 + Math.max(0, Math.sin(t * 9 + Math.PI)) * 0.35;
        aLz = -0.25; aRz = 0.25; beadRing.rotation.z = t * 1.5;
        break;
      case "think":
        aRx = -2.0; aRz = 0.55; hz = 0.22 + Math.sin(t * 1.2) * 0.06; hx = -0.12;
        break;
      case "hop": {
        const s = Math.abs(Math.sin(t * 3.4));
        y = s * 0.38; sy = 0.86 + s * 0.2; sx = 1.08 - s * 0.1;
        aLx = -0.6 - s * 1.2; aRx = -0.6 - s * 1.2;
        break;
      }
      case "heart":
        hz = Math.sin(t * 1.6) * 0.15; px = Math.sin(t * 1.6) * 0.06;
        aLx = -1.0; aLz = -0.55; aRx = -1.0; aRz = 0.55;
        heart.scale.setScalar(0.22 * (1 + Math.max(0, Math.sin(t * 6)) * 0.18));
        heart.rotation.y = Math.sin(t) * 0.4;
        break;
    }

    // Reactions override for a moment
    if (reaction) {
      const e = performance.now() / 1000 - reaction.t0;
      const D = { cheer: 1.4, oops: 0.8, happy: 0.9, tap: 0.6 }[reaction.kind] || 0.8;
      if (e > D) reaction = null;
      else {
        const p = e / D;
        if (reaction.kind === "cheer") {
          y = Math.abs(Math.sin(p * Math.PI * 3)) * 0.5; aLx = aRx = -2.9; aLz = 0.3 + Math.sin(e * 14) * 0.25; aRz = -aLz;
          spin = p < 0.5 ? p * 2 * Math.PI * 2 : 0;
        } else if (reaction.kind === "oops") {
          hy = Math.sin(e * 22) * 0.35 * (1 - p); hz = 0.15;
        } else if (reaction.kind === "happy") {
          y = Math.sin(p * Math.PI) * 0.35; spin = p * Math.PI * 2;
        } else if (reaction.kind === "tap") {
          sy = 1 - Math.sin(p * Math.PI) * 0.15; sx = 1 + Math.sin(p * Math.PI) * 0.08;
          hz = Math.sin(e * 18) * 0.15;
        }
      }
    }

    // Smoothly ease joints
    cur.aLx = lerp(cur.aLx, aLx, k); cur.aLz = lerp(cur.aLz, aLz, k);
    cur.aRx = lerp(cur.aRx, aRx, k); cur.aRz = lerp(cur.aRz, aRz, k);
    cur.hx = lerp(cur.hx, hx, k); cur.hy = lerp(cur.hy, hy, k); cur.hz = lerp(cur.hz, hz, k);
    armL.rotation.set(cur.aLx, 0, cur.aLz);
    armR.rotation.set(cur.aRx, 0, cur.aRz);
    head.rotation.set(cur.hx, cur.hy, cur.hz);
    root.position.set(lerp(root.position.x, px, k), y, lerp(root.position.z, pz, k));
    body.scale.set(lerp(body.scale.x, sx, k * 1.5), lerp(body.scale.y, sy, k * 1.5), lerp(body.scale.z, sx, k * 1.5));
    body.rotation.y = spin;

    // Blink
    if (blinkT < 0 && t > nextBlink) { blinkT = t; nextBlink = t + 2.5 + Math.random() * 3; }
    const bs = blinkT >= 0 ? Math.max(0.08, Math.abs(Math.cos(((t - blinkT) / 0.18) * Math.PI))) : 1;
    if (blinkT >= 0 && t - blinkT > 0.18) blinkT = -1;
    eyes.forEach((e) => { e.scale.y = bs; });

    // Ear twitch
    const tw = t > nextTwitch ? Math.sin((t - nextTwitch) * 30) * 0.25 : 0;
    if (t > nextTwitch + 0.3) nextTwitch = t + 2 + Math.random() * 4;
    earL.rotation.z = -0.4 + tw;
    earR.rotation.z = 0.4;

    // Tail swish (more swish further along)
    const wag = mode === "hop" || reaction ? 2.2 : 1;
    tailSegs.forEach((s, i) => {
      const f = i / tailSegs.length;
      s.position.x = s.userData.base.x + Math.sin(t * 2.4 * wag - i * 0.45) * 0.06 * f * wag;
      s.position.y = s.userData.base.y + Math.sin(t * 1.8 - i * 0.3) * 0.03 * f;
    });
  }

  return { root, setMode, react, update };
}
