// Three.js clay scenes: a spinning bead bracelet (+ floating clay blobs for the hero)
import * as THREE from "three";
import { buildPanda } from "./panda.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function clayMaterial(color) {
  // Matte, slightly glossy "fresh clay" look
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color("#ffffff") });
}

/**
 * @param {HTMLElement} container
 * @param {{bits?: string, colors?: [string,string], blobs?: boolean}} opts
 */
export function createBraceletScene(container, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb39bff, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd6ea, 0.8);
  rim.position.set(-4, -2, -3);
  scene.add(rim);

  // Bracelet group: tilted ring of beads on a string
  const tilt = new THREE.Group();
  tilt.rotation.x = 0.55;
  scene.add(tilt);
  const ring = new THREE.Group();
  tilt.add(ring);

  const beadGeo = new THREE.SphereGeometry(0.16, 32, 24);
  const mats = [clayMaterial(opts.colors?.[0] || "#ff8fbf"), clayMaterial(opts.colors?.[1] || "#b39bff")];
  const stringMat = clayMaterial("#fffaf3");
  let stringMesh = null;
  let radius = 1;

  function setBits(bits) {
    ring.clear();
    if (stringMesh) { stringMesh.geometry.dispose(); stringMesh = null; }
    const n = Math.max(bits.length, 1);
    const spacing = 0.16 * 2 * 1.12;
    radius = Math.max(1.0, (n * spacing) / (2 * Math.PI));
    stringMesh = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.035, 12, Math.max(64, n * 4)), stringMat);
    stringMesh.rotation.x = Math.PI / 2;
    ring.add(stringMesh);
    for (let i = 0; i < bits.length; i++) {
      const a = (i / n) * Math.PI * 2;
      const m = new THREE.Mesh(beadGeo, mats[bits[i] === "1" ? 1 : 0]);
      m.position.set(Math.sin(a) * radius, 0, Math.cos(a) * radius);
      m.userData.phase = i * 0.35;
      ring.add(m);
    }
    fitCamera();
    renderOnce();
  }

  function setColors(c0, c1) {
    mats[0].color.set(c0);
    mats[1].color.set(c1);
    renderOnce();
  }

  // Hula-hooping red panda inside the bracelet (hero only)
  let panda = null;
  if (opts.panda) {
    panda = buildPanda();
    panda.setMode("hula");
    const holder = new THREE.Group();
    holder.position.y = -1.0;
    holder.scale.setScalar(0.95);
    holder.add(panda.root);
    scene.add(holder);
    tilt.position.y = -1.0 + 0.72 * 0.95;   // ring sits at the panda's waist
    tilt.rotation.x = 0.35;
  }

  // Floating clay blobs (hero only)
  const blobs = [];
  if (opts.blobs) {
    const defs = [
      { geo: new THREE.IcosahedronGeometry(0.42, 5), color: "#7fe3c0", pos: [-2.1, 0.9, -0.6] },
      { geo: new THREE.IcosahedronGeometry(0.3, 5), color: "#ffd96b", pos: [2.2, 1.0, -0.4] },
      { geo: new THREE.TorusGeometry(0.3, 0.13, 24, 48), color: "#ffb38a", pos: [2.0, -0.9, 0.2] },
      { geo: new THREE.IcosahedronGeometry(0.24, 5), color: "#8fd0ff", pos: [-1.9, -1.0, 0.4] },
    ];
    for (const d of defs) {
      const m = new THREE.Mesh(d.geo, clayMaterial(d.color));
      m.position.set(...d.pos);
      if (opts.panda) m.position.x *= 0.82;
      m.userData.base = m.position.y;
      m.userData.phase = Math.random() * Math.PI * 2;
      scene.add(m);
      blobs.push(m);
    }
  }

  function fitCamera() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    camera.aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    let dist, cy = 0;
    if (opts.panda) {
      // Fit the panda's height and the ring's width
      cy = 0.15;
      dist = Math.max((radius + 0.6) / (tan * camera.aspect), 2.0 / tan);
    } else {
      const span = radius * 2 + (opts.blobs ? 2.6 : 0.8);
      // Fit full width horizontally, and the (tilted, flatter) ring vertically
      dist = Math.max((span * 0.55) / (tan * camera.aspect), (span * 0.4) / tan);
    }
    camera.position.set(0, cy, dist);
    camera.lookAt(0, cy, 0);
    camera.updateProjectionMatrix();
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    fitCamera();
    renderOnce();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // Drag to spin, with inertia
  let velocity = reduceMotion ? 0 : 0.006, dragging = false, lastX = 0, moved = 0;
  const el = renderer.domElement;
  el.addEventListener("pointerdown", (e) => { dragging = true; moved = 0; lastX = e.clientX; el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    moved += Math.abs(dx);
    ring.rotation.y += dx * 0.01;
    velocity = dx * 0.002;
    if (!running) renderOnce();
  });
  const end = () => { dragging = false; };
  el.addEventListener("pointerup", () => { if (dragging && moved < 6) panda?.react("happy"); end(); });
  el.addEventListener("pointercancel", end);

  // Render loop only while visible + active
  let running = false, active = true, onScreen = true, raf = 0, last = 0;
  const clock = new THREE.Clock();
  function frame() {
    if (!running) return;
    const t = clock.getElapsedTime();
    panda?.update(t, Math.max(0, Math.min(0.05, t - last)));
    last = t;
    if (!dragging) {
      ring.rotation.y += velocity;
      const idle = reduceMotion ? 0 : 0.006;
      velocity += (idle - velocity) * 0.03;
    }
    ring.children.forEach((m) => { if (m.userData.phase !== undefined) m.position.y = Math.sin(t * 2 + m.userData.phase) * 0.03; });
    blobs.forEach((b) => {
      b.position.y = b.userData.base + Math.sin(t * 1.1 + b.userData.phase) * 0.12;
      b.rotation.x += 0.004; b.rotation.y += 0.006;
    });
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function renderOnce() { renderer.render(scene, camera); }
  function update() {
    const should = active && onScreen && document.visibilityState === "visible" && !reduceMotion;
    if (should && !running) { running = true; raf = requestAnimationFrame(frame); }
    if (!should && running) { running = false; cancelAnimationFrame(raf); }
    if (!running) renderOnce();
  }
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update(); });
  io.observe(container);
  document.addEventListener("visibilitychange", update);

  panda?.update(0, 0.016);
  setBits(opts.bits || "");
  resize();
  update();

  return {
    setBits,
    setColors,
    setActive(v) { active = v; update(); },
    react(kind) { panda?.react(kind); },
    dispose() {
      running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", update);
      renderer.dispose(); el.remove();
    },
  };
}
