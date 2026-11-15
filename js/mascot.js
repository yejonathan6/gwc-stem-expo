// One shared WebGL view of the panda that moves into whichever tab is open.
import * as THREE from "three";
import { buildPanda } from "./panda.js?v=202611150109";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createMascot() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = "mascot-canvas";

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffc9a8, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(2.5, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd6ea, 0.9);
  rim.position.set(-3, 2, -3);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0.7, 1.45, 5.7);
  camera.lookAt(0, 1.15, 0);

  const panda = buildPanda();
  panda.root.rotation.y = -0.35;
  scene.add(panda.root);

  // Soft clay "shadow" disc under the panda
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40), new THREE.MeshBasicMaterial({ color: 0x5b3caa, transparent: true, opacity: 0.12 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  scene.add(shadow);

  let slot = null, running = false, raf = 0, last = 0;
  const clock = new THREE.Clock();

  function size() {
    if (!slot) return;
    const w = slot.clientWidth, h = slot.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(size);

  function frame() {
    if (!running) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(0.05, t - last);
    last = t;
    panda.update(t, dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function play(on) {
    const should = on && document.visibilityState === "visible";
    if (should && !running) { running = true; raf = requestAnimationFrame(frame); }
    if (!should && running) { running = false; cancelAnimationFrame(raf); }
  }
  document.addEventListener("visibilitychange", () => play(!!slot));

  // Tap to tickle, drag to turn
  let dragging = false, lastX = 0, moved = 0;
  canvas.addEventListener("pointerdown", (e) => { dragging = true; moved = 0; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
    panda.root.rotation.y += dx * 0.012;
  });
  canvas.addEventListener("pointerup", () => { dragging = false; if (moved < 6) panda.react("tap"); });

  return {
    attach(el, mode) {
      if (slot) ro.unobserve(slot);
      slot = el;
      el.prepend(canvas);
      el.classList.add("has-3d");
      ro.observe(el);
      size();
      panda.setMode(mode);
      panda.update(clock.getElapsedTime(), 0.016);
      renderer.render(scene, camera);
      play(!reduceMotion);
    },
    detach() { slot = null; play(false); },
    react(kind) { panda.react(kind); if (reduceMotion && slot) { panda.update(clock.getElapsedTime(), 1); renderer.render(scene, camera); } },
  };
}
