// Tab navigation: a 3D ring of cards docked at the bottom, and the pages above it, all moved by
// one physics simulation. The pages form a horizontal strip in ring order, positioned from the
// ring's angle every frame: drag or swipe and both follow your finger; let go and momentum plus
// a spring carry both to rest; only then does the tab change commit (router's commit()).
import { TABS, currentTab, onTabChange, setTransition } from "./router.js?v=202611150309";

// Each tab appears twice round the ring so neighbours turn only 36° and stay readable
const N = TABS.length, STEP = 360 / (N * 2), HALF = STEP * N; // HALF = 180°
const wrap = (deg, p) => ((((deg % p) + p * 1.5) % p) - p / 2); // → [-p/2, p/2)
const tabAt = (slot) => TABS[((slot % N) + N) % N];

const MOMENTUM = 0.18; // seconds of glide projected from release velocity
const STIFFNESS = 140, DAMPING = 2 * Math.sqrt(STIFFNESS) * 0.92; // soft spring, barely any overshoot
const TILT = -6; // camera looks slightly down onto the ring
const PAGE_GAP = 32; // px between neighbouring pages while they slide
const FADE_OUT = 0.6; // the page you're leaving is gone once it's this fraction of a page away
const MAX_BLUR = 12;  // px of blur at full distance
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

export function initTabRing() {
  const ring = document.getElementById("tab-ring");
  const track = ring.querySelector(".ring-track");
  const main = document.getElementById("main");
  const panels = Object.fromEntries([...main.querySelectorAll(":scope > .panel")].map((p) => [p.dataset.tab, p]));

  // The five links in the HTML are the real nav; a decorative copy fills the back of the ring
  const links = [...track.children];
  const copies = links.map((a) => {
    const c = a.cloneNode(true);
    c.removeAttribute("data-tab");
    c.tabIndex = -1;
    c.setAttribute("aria-hidden", "true");
    track.appendChild(c);
    return c;
  });
  const cards = [...links, ...copies];
  cards.forEach((c, i) => {
    c.style.transform = `rotateY(${i * STEP}deg) translateZ(var(--ring-r))`;
    c.style.setProperty("--i", i);
  });
  const R = parseFloat(getComputedStyle(ring).getPropertyValue("--ring-r")) || 172;
  // Dragging the ring: the grabbed card stays under the pointer (arc length at the front = R·θ)
  const RING_DEG_PER_PX = 180 / (Math.PI * R);

  // ---- State: angles in degrees, velocity in degrees/second ----
  let angle = 0, vel = 0, target = 0, dragging = false, raf = 0, lastT = 0, front = -1;
  let shown = null;        // tab whose panel is in normal flow (committed)
  let pending = null;      // { tab, commit } waiting for the motion to settle
  let previewing = false;  // keyboard focus is turning the ring; pages stay put
  let geo = null;          // page strip geometry, measured when motion starts

  // ---- Ring ----
  // Style writes are skipped when the value is unchanged: a new --ring-r restyles all ten cards
  let lastR = "", lastTrack = "";
  const lastOpacity = cards.map(() => "");
  function paintRing() {
    const r = (R * (1 + Math.min(Math.abs(vel) / 900, 1) * 0.1)).toFixed(1); // swells a little when spun fast
    if (r !== lastR) ring.style.setProperty("--ring-r", `${(lastR = r)}px`);
    const tr = `translateZ(${-r}px) rotateX(${TILT}deg) rotateY(${-angle}deg)`;
    if (tr !== lastTrack) track.style.transform = lastTrack = tr;
    let nearest = 0, best = 999;
    cards.forEach((c, i) => {
      const d = Math.abs(wrap(i * STEP - angle, 360)); // 0 = facing the viewer
      const o = Math.max(0, 1 - d / 105).toFixed(3);
      if (o !== lastOpacity[i]) c.style.opacity = lastOpacity[i] = o;
      if (d < best) { best = d; nearest = i; }
    });
    if (nearest !== front) { cards[front]?.classList.remove("is-front"); cards[nearest].classList.add("is-front"); front = nearest; }
  }

  // ---- Pages: the two pages either side of the ring's angle, offset by how far it has turned ----
  function measure() {
    const r = main.getBoundingClientRect();
    geo = { left: r.left, width: r.width, top: r.top + scrollY };
  }
  function resetPanel(p) {
    p.style.position = p.style.top = p.style.left = p.style.width = p.style.transform = p.style.visibility = p.style.zIndex = p.style.opacity = p.style.filter = "";
  }
  function paintPages() {
    if (!geo || previewing) return;
    const rel = angle / STEP, s0 = Math.floor(rel + 1e-6), f = rel - s0;
    const place = new Map();
    if (f < 0.0005 || f > 0.9995) place.set(tabAt(Math.round(rel)), 0);
    else { place.set(tabAt(s0), -f); place.set(tabAt(s0 + 1), 1 - f); }
    const W = geo.width + PAGE_GAP;
    for (const [tab, p] of Object.entries(panels)) {
      if (place.has(tab)) {
        const x = place.get(tab) * W;
        p.hidden = false;
        if (tab === shown) p.style.visibility = ""; // in flow, keeps its scroll position
        else Object.assign(p.style, { position: "fixed", top: `${geo.top}px`, left: `${geo.left}px`, width: `${geo.width}px`, zIndex: "1" }); // shows from its top, where it will sit once committed
        // Pages fade, blur and shrink slightly with distance from centre. The page being left
        // clears quickly; the arriving one is visible (faint, soft) from the first pixel of a drag.
        const o = Math.abs(place.get(tab));
        const d = tab === shown ? Math.min(1, o / FADE_OUT) : o;
        p.style.transform = x ? `translate3d(${x.toFixed(1)}px,0,0) scale(${(1 - d * 0.04).toFixed(4)})` : "";
        p.style.opacity = d ? (tab === shown ? 1 - d : 1 - d * d).toFixed(3) : "";
        p.style.filter = d > 0.01 ? `blur(${(d * MAX_BLUR).toFixed(2)}px)` : "";
      } else if (tab === shown) {
        p.style.visibility = "hidden"; // a long fling has carried it off-screen; keep the layout
      } else if (!p.hidden) {
        resetPanel(p);
        p.hidden = true;
      }
    }
  }

  function settle() {
    const tab = tabAt(Math.round(angle / STEP));
    if (pending && pending.tab === tab) {
      const { commit } = pending;
      pending = null;
      commit(); // router: hides other panels, scrolls to top, aria-current, listeners (sets `shown`)
    }
    Object.values(panels).forEach(resetPanel);
    geo = null;
  }

  function tick(now) {
    // Real elapsed time in small fixed sub-steps: motion keeps its speed even when frames drop
    let left = Math.min(0.12, (now - lastT) / 1000 || 0.016);
    lastT = now;
    if (!dragging) {
      while (left > 0) {
        const h = Math.min(0.008, left);
        vel += (STIFFNESS * (target - angle) - DAMPING * vel) * h;
        angle += vel * h;
        left -= h;
      }
      if (Math.abs(target - angle) < 0.02 && Math.abs(vel) < 0.3) {
        angle = target; vel = 0; paintRing(); paintPages(); raf = 0;
        if (!previewing) settle();
        return;
      }
    }
    paintRing();
    paintPages();
    raf = requestAnimationFrame(tick);
  }
  function kick() {
    if (!geo && !previewing) measure();
    if (reduceMotion.matches && !dragging) { angle = target; vel = 0; paintRing(); if (!previewing) settle(); return; }
    if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
  }
  const nearestSlotAngle = (tab) => Math.round((angle + wrap(TABS.indexOf(tab) * STEP - angle, HALF)) / STEP) * STEP;

  // Router hands every tab change (links, tiles, ring taps, swipes) to the ring to animate
  setTransition((tab, commit) => {
    pending = { tab, commit };
    previewing = false;
    if (tabAt(Math.round(target / STEP)) !== tab) target = nearestSlotAngle(tab); // a fling may already have chosen
    kick();
  });
  // Commits without motion (first load, reduced motion) and keeps `shown` in sync
  onTabChange((tab) => {
    shown = tab;
    if (!raf && !dragging && tabAt(Math.round(angle / STEP)) !== tab) { angle = target = nearestSlotAngle(tab); paintRing(); }
  });

  // ---- Shared drag (the ring and page swipes) ----
  let base = 0, lastMoveT = 0, lastAngle = 0;
  function dragStart() {
    previewing = false;
    dragging = true; base = angle; lastAngle = angle; lastMoveT = performance.now();
    ring.classList.add("dragging");
    kick();
  }
  function dragTo(deltaDeg) {
    const now = performance.now(), next = base - deltaDeg;
    const inst = (next - lastAngle) / Math.max(0.008, (now - lastMoveT) / 1000);
    vel = Math.max(-900, Math.min(900, vel * 0.6 + inst * 0.4)); // smoothed flick speed
    angle = lastAngle = next; lastMoveT = now;
  }
  // Momentum may carry the ring at most one card past where it was let go (ring drags), or at
  // most one page from where the swipe began (page swipes), so a quick flick never skips tabs.
  function dragEnd(pageSwipe = false) {
    dragging = false;
    ring.classList.remove("dragging");
    if (performance.now() - lastMoveT > 80) vel *= 0.3; // held still before letting go: little momentum
    const from = Math.round((pageSwipe ? base : angle) / STEP);
    const slot = Math.max(from - 1, Math.min(from + 1, Math.round((angle + vel * MOMENTUM) / STEP)));
    target = slot * STEP;
    const tab = tabAt(slot);
    if (tab !== currentTab()) location.hash = tab; // router → setTransition above → commit on settle
    kick();
  }

  // Keyboard: turn a focused card to the front so its focus outline is visible (pages stay put)
  links.forEach((a, i) => {
    // Keyboard focus only: a mouse press on a card must not start turning the ring
    a.addEventListener("focus", () => { if (dragging || pending || !a.matches(":focus-visible")) return; previewing = true; target = angle + wrap(i * STEP - angle, 360); kick(); });
    a.addEventListener("blur", () => { if (!previewing) return; target = nearestSlotAngle(currentTab()); kick(); previewing = false; });
  });

  // Drag the ring with mouse, pen or finger
  let sx = null, moved = 0, dragged = false;
  ring.addEventListener("pointerdown", (e) => { sx = e.clientX; moved = 0; dragged = false; });
  window.addEventListener("pointermove", (e) => {
    if (sx === null) return;
    moved = e.clientX - sx;
    if (!dragged && Math.abs(moved) > 6) { dragged = true; dragStart(); }
    if (dragged) dragTo(moved * RING_DEG_PER_PX);
  });
  const endPointer = () => { if (sx === null) return; sx = null; if (dragged) dragEnd(); };
  window.addEventListener("pointerup", endPointer);
  window.addEventListener("pointercancel", endPointer);
  // A drag that ends over a card must not also follow its link
  ring.addEventListener("click", (e) => { if (dragged) { e.preventDefault(); dragged = false; } }, true);

  // Swipe the page sideways: once the gesture is clearly horizontal, the page follows the finger
  // 1:1 (and the ring with it). Skips areas that already use horizontal drags.
  let tx = null, ty = 0, swiping = false;
  main.addEventListener("touchstart", (e) => {
    swiping = false;
    tx = e.target.closest("canvas, input, #challenge-root, .code") ? null : e.touches[0].clientX;
    ty = e.touches[0].clientY;
  }, { passive: true });
  main.addEventListener("touchmove", (e) => {
    if (tx === null) return;
    const dx = e.touches[0].clientX - tx, dy = e.touches[0].clientY - ty;
    if (!swiping) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { tx = null; return; } // vertical scroll wins
      if (Math.abs(dx) < 12) return;
      swiping = true; dragStart();
    }
    dragTo((dx / (geo.width + PAGE_GAP)) * STEP); // one page width = one card
  }, { passive: true });
  const endTouch = () => { if (swiping) dragEnd(true); tx = null; swiping = false; };
  main.addEventListener("touchend", endTouch, { passive: true });
  main.addEventListener("touchcancel", endTouch, { passive: true });

  paintRing();
}
