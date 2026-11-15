// Bitsy on every tab: one shared WebGL renderer draws a separate, independently animated panda
// for each page's buddy stage. Every stage whose page is on screen animates each frame, so a
// page sliding in during a swipe is already alive (no frozen frame, no swap when it lands).
import * as THREE from "three";
import { buildPanda } from "./panda.js?v=202611150309";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createMascot() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const gl = renderer.domElement; // offscreen: each frame is copied into the visible stage canvases

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffc9a8, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(2.5, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd6ea, 0.9);
  rim.position.set(-3, 2, -3);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  // Framed for the tallest poses (hop peak, floating heart) so nothing clips at the card's top edge
  camera.position.set(0.8, 1.6, 6.7);
  camera.lookAt(0, 1.38, 0);

  // Soft clay "shadow" disc under the panda
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40), new THREE.MeshBasicMaterial({ color: 0x5b3caa, transparent: true, opacity: 0.12 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  scene.add(shadow);

  const clock = new THREE.Clock();
  let w = 0, h = 0;
  function sizeTo(el) {
    const cw = el.clientWidth, ch = el.clientHeight;
    if (!cw || !ch || (cw === w && ch === h)) return;
    w = cw; h = ch;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // One panda + one visible 2D canvas per buddy stage
  const stages = [...document.querySelectorAll(".buddy-stage")].map((el) => {
    const panda = buildPanda();
    panda.root.rotation.y = -0.35;
    panda.root.visible = false;
    panda.setMode(el.dataset.mode);
    scene.add(panda.root);
    const cv = document.createElement("canvas");
    cv.className = "buddy-canvas";
    cv.setAttribute("aria-hidden", "true");
    el.prepend(cv);
    el.classList.add("has-3d");
    const s = { el, panel: el.closest(".panel"), panda, cv, ctx: cv.getContext("2d"), drawn: false };

    // Tap to tickle, drag to turn
    let dragging = false, lastX = 0, moved = 0;
    cv.addEventListener("pointerdown", (e) => { dragging = true; moved = 0; lastX = e.clientX; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
      panda.root.rotation.y += dx * 0.012;
      s.drawn = false;
    });
    cv.addEventListener("pointerup", () => { dragging = false; if (moved < 6) react(s, "tap"); });
    return s;
  });

  // Stages whose page is on screen (in place, or sliding in/out during a tab change). The render
  // loop only runs while this set is non-empty, so on Home the pandas cost nothing.
  const inView = new Set();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const s = stages.find((o) => o.el === e.target);
      if (e.isIntersecting) inView.add(s); else inView.delete(s);
    }
    play();
  });
  stages.forEach((s) => io.observe(s.el));
  const faded = (s) => s.panel.style.visibility === "hidden" || (s.panel.style.opacity !== "" && +s.panel.style.opacity === 0);

  function draw(s, t, dt) {
    sizeTo(s.el);
    stages.forEach((o) => { o.panda.root.visible = o === s; });
    s.panda.update(t, dt);
    renderer.render(scene, camera);
    if (s.cv.width !== gl.width || s.cv.height !== gl.height) { s.cv.width = gl.width; s.cv.height = gl.height; }
    s.ctx.clearRect(0, 0, s.cv.width, s.cv.height);
    s.ctx.drawImage(gl, 0, 0); // copy straight after render, while the WebGL frame is readable
    s.drawn = true;
  }

  let raf = 0, last = 0;
  function frame() {
    const t = clock.getElapsedTime(), dt = Math.min(0.05, t - last);
    last = t;
    for (const s of inView) {
      if (faded(s)) continue;
      if (!reduceMotion) draw(s, t, dt);
      else if (!s.drawn) draw(s, t, 1); // reduced motion: redraw only when something changed
    }
    raf = requestAnimationFrame(frame);
  }
  function play() {
    const should = document.visibilityState === "visible" && inView.size > 0;
    if (should && !raf) { last = clock.getElapsedTime(); raf = requestAnimationFrame(frame); }
    if (!should && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  document.addEventListener("visibilitychange", play);

  let current = null; // stage on the tab being viewed (reactions go to its panda)
  function react(s, kind) {
    s.panda.react(kind);
    s.drawn = false;
  }

  return {
    attach(el) { current = stages.find((s) => s.el === el) || null; },
    detach() { current = null; },
    react(kind) { if (current) react(current, kind); },
  };
}
