// Tab navigation. The pages live in a native horizontal snap-scroll strip (main), so swipes,
// trackpad scrolls and momentum are handled by the browser. The 3D ring at the bottom is simply a
// view of that scroll position. Dragging the ring or tapping a tab scrolls the strip with a spring.
//
// Looping without duplicate pages: the current page is always kept in the middle of the strip
// with two pages either side. After each move settles, the off-screen page at one end is moved to
// the other end and the scroll offset corrected in the same frame, so nothing visibly changes.
import { TABS, currentTab, onTabChange, setTransition } from "./router.js?v=202611150330";

// Each tab appears twice round the ring so neighbours turn only 36° and stay readable
const N = TABS.length, STEP = 360 / (N * 2), MID = 2; // MID: index of the current page in the strip
const wrap = (deg, p) => ((((deg % p) + p * 1.5) % p) - p / 2); // → [-p/2, p/2)
const tabAt = (slot) => TABS[((slot % N) + N) % N];
const shortest = (from, to) => ((TABS.indexOf(to) - TABS.indexOf(from) + N + 2) % N) - 2; // −2…2 pages

const MOMENTUM = 0.18; // seconds of glide projected from release velocity (ring drags)
const STIFFNESS = 220, DAMPING = 2 * Math.sqrt(STIFFNESS) * 0.9; // settles in ~0.4s, barely any overshoot
const TILT = -6; // camera looks slightly down onto the ring
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

export function initTabRing() {
  const ring = document.getElementById("tab-ring");
  const track = ring.querySelector(".ring-track");
  const strip = document.getElementById("main");
  const panels = Object.fromEntries([...strip.querySelectorAll(":scope > .panel")].map((p) => [p.dataset.tab, p]));

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

  // ---- Strip geometry and ring angle ----
  let W = strip.clientWidth || 1;   // one page width = one snap step
  let order = [];                   // tabs in strip order; order[MID] is the centred one
  let baseAngle = 0;                // ring angle of order[MID]; grows/shrinks as the strip loops
  const pos = () => strip.scrollLeft / W; // strip position in pages (MID = centred)
  const ringAngle = () => baseAngle + (pos() - MID) * STEP;

  function layout(tab) {            // put `tab` in the middle, its neighbours either side
    const i = TABS.indexOf(tab);
    order = [-2, -1, 0, 1, 2].map((k) => tabAt(i + k));
    order.forEach((t) => strip.append(panels[t]));
    strip.scrollLeft = MID * W;
  }
  function recentre() {             // after a move: rotate the off-screen ends so we can keep looping
    const k = Math.round(pos()) - MID;
    if (!k) return;
    for (let n = 0; n < Math.abs(k); n++) {
      if (k > 0) { strip.append(strip.firstElementChild); order.push(order.shift()); }
      else { strip.prepend(strip.lastElementChild); order.unshift(order.pop()); }
    }
    baseAngle += k * STEP;
    strip.scrollLeft = MID * W;     // same frame as the DOM move, so nothing visibly jumps
  }
  new ResizeObserver(() => { const p = Math.round(pos()); W = strip.clientWidth || 1; strip.scrollLeft = p * W; paintRing(); }).observe(strip);

  // ---- Ring rendering (style writes skipped when unchanged) ----
  let lastTrack = "", front = -1, preview = null;
  const lastOpacity = cards.map(() => "");
  function paintRing() {
    const angle = preview ?? ringAngle();
    const tr = `translateZ(${-R}px) rotateX(${TILT}deg) rotateY(${-angle}deg)`;
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
  let paintQueued = false;
  strip.addEventListener("scroll", () => {
    if (paintQueued) return;
    paintQueued = true;
    requestAnimationFrame(() => { paintQueued = false; paintRing(); });
  }, { passive: true });

  // ---- Spring-driven scrolling (ring drags, taps, links). Snap is paused while we drive it. ----
  // sp: the spring's own exact position in pages (scrollLeft is rounded to device pixels)
  let target = MID, sp = MID, vel = 0, raf = 0, lastT = 0, driving = false, pending = null;
  function drive(on) {
    driving = on;
    strip.style.scrollSnapType = on ? "none" : "";
  }
  function tick(now) {
    let left = Math.min(0.12, (now - lastT) / 1000 || 0.016); // real time in fixed sub-steps
    lastT = now;
    while (left > 0) {
      const h = Math.min(0.008, left);
      vel += (STIFFNESS * (target - sp) - DAMPING * vel) * h;
      sp += vel * h;
      left -= h;
    }
    if (Math.abs(target - sp) < 0.002 && Math.abs(vel) < 0.02) { // within ~1px: finish
      strip.scrollLeft = target * W; raf = 0; vel = 0;
      return settle();
    }
    strip.scrollLeft = sp * W;
    raf = requestAnimationFrame(tick);
  }
  function animateTo(slot) {
    target = Math.max(0, Math.min(N - 1, slot));
    drive(true);
    if (reduceMotion.matches) { strip.scrollLeft = target * W; return settle(); }
    if (!raf) { sp = pos(); lastT = performance.now(); raf = requestAnimationFrame(tick); }
  }
  function stopDriving() { cancelAnimationFrame(raf); raf = 0; vel = 0; drive(false); }

  // A move has come to rest (native swipe, or our spring): commit the tab, then recentre
  function settle() {
    drive(false);
    const tab = order[Math.round(pos())];
    if (pending?.tab === tab) { const { commit } = pending; pending = null; commit(); }
    else if (tab !== currentTab()) location.hash = tab; // native swipe landed on a new page
    recentre();
    paintRing();
  }
  if ("onscrollend" in window) strip.addEventListener("scrollend", () => { if (!driving && !dragging) settle(); });
  else { // older Safari: treat 120ms without scroll events as the end
    let t = 0;
    strip.addEventListener("scroll", () => { clearTimeout(t); t = setTimeout(() => { if (!driving && !dragging) settle(); }, 120); }, { passive: true });
  }
  // A finger, trackpad or wheel on the strip takes over from any spring in progress
  ["pointerdown", "wheel", "touchstart"].forEach((t) => strip.addEventListener(t, () => { if (driving && !dragging) stopDriving(); }, { passive: true }));

  // Router hands every tab change (links, tiles, ring taps, swipes) here to animate
  setTransition((tab, commit) => {
    pending = { tab, commit };
    preview = null;
    const here = Math.round(pos());
    if (order[here] === tab && !driving) return settle();          // a swipe already brought it here
    if (driving && order[target] === tab) return;                  // a ring fling is already heading there
    animateTo(here + shortest(order[here], tab));
  });
  // First load (no motion) and keeping the ring in sync with commits
  onTabChange((tab) => { if (!order.length) { layout(tab); baseAngle = TABS.indexOf(tab) * STEP; paintRing(); } });

  // ---- Dragging the ring scrolls the strip (1 card = 1 page) ----
  let dragging = false, startPos = 0, lastP = 0, lastMoveT = 0, dVel = 0;
  function dragStart() {
    stopDriving();
    dragging = true; preview = null;
    drive(true);
    startPos = lastP = pos(); lastMoveT = performance.now(); dVel = 0;
    ring.classList.add("dragging");
  }
  function dragTo(dx) {
    const now = performance.now();
    const p = Math.max(0, Math.min(N - 1, startPos - (dx * RING_DEG_PER_PX) / STEP));
    const inst = (p - lastP) / Math.max(0.008, (now - lastMoveT) / 1000);
    dVel = dVel * 0.6 + inst * 0.4; // smoothed flick speed, pages/second
    lastP = p; lastMoveT = now;
    strip.scrollLeft = p * W;
  }
  function dragEnd() {
    dragging = false;
    ring.classList.remove("dragging");
    if (performance.now() - lastMoveT > 80) dVel *= 0.3; // held still before letting go: little momentum
    // Momentum may carry at most one card past where it was let go, so a flick never skips tabs
    const p = pos(), from = Math.round(p);
    const slot = Math.max(from - 1, Math.min(from + 1, Math.round(p + dVel * MOMENTUM)));
    vel = dVel;
    animateTo(slot);
    if (order[target] !== currentTab()) location.hash = order[target]; // committed when the spring settles
  }

  // Keyboard: turn a focused card to the front so its focus outline is visible (pages stay put)
  links.forEach((a, i) => {
    // Keyboard focus only: a mouse press on a card must not start turning the ring
    a.addEventListener("focus", () => {
      if (dragging || driving || !a.matches(":focus-visible")) return;
      const now = ringAngle(); preview = now + wrap(i * STEP - now, 360); paintRing();
    });
    a.addEventListener("blur", () => { if (preview === null) return; preview = null; paintRing(); });
  });

  // Drag the ring with mouse, pen or finger
  let sx = null, moved = 0, dragged = false;
  ring.addEventListener("pointerdown", (e) => { sx = e.clientX; moved = 0; dragged = false; });
  window.addEventListener("pointermove", (e) => {
    if (sx === null) return;
    moved = e.clientX - sx;
    if (!dragged && Math.abs(moved) > 6) { dragged = true; dragStart(); }
    if (dragged) dragTo(moved);
  });
  const endPointer = () => { if (sx === null) return; sx = null; if (dragged) dragEnd(); };
  window.addEventListener("pointerup", endPointer);
  window.addEventListener("pointercancel", endPointer);
  // A drag that ends over a card must not also follow its link
  ring.addEventListener("click", (e) => { if (dragged) { e.preventDefault(); dragged = false; } }, true);
}
