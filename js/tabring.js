// Tab navigation. The pages live in a native horizontal snap-scroll strip (main), so swipes,
// trackpad scrolls and momentum are handled by the browser. The 3D ring at the bottom is simply a
// view of that scroll position. Dragging the ring or tapping a tab scrolls the strip.
//
// Looping without duplicate pages: the current page is always kept in the middle of the strip
// with two pages either side. After each move settles, the off-screen page at one end is moved to
// the other end and the scroll offset corrected in the same frame, so nothing visibly changes.
import { TABS, currentTab, onTabChange, setTransition } from "./router.js?v=202611150341";

// Each tab appears twice round the ring so neighbours turn only 36° and stay readable
const N = TABS.length, STEP = 360 / (N * 2), MID = 2; // MID: index of the current page in the strip
const wrap = (deg, p) => ((((deg % p) + p * 1.5) % p) - p / 2); // → [-p/2, p/2)
const tabAt = (slot) => TABS[((slot % N) + N) % N];
const shortest = (from, to) => ((TABS.indexOf(to) - TABS.indexOf(from) + N + 2) % N) - 2; // −2…2 pages

const MOMENTUM = 0.18; // seconds of glide projected from release velocity (ring drags)
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
  // Rotate the off-screen ends so the page nearest the centre is order[MID] again, keeping the
  // exact (possibly in-between) scroll position. Returns how many pages the order shifted.
  function recentre() {
    const p = pos(), k = Math.round(p) - MID;
    if (!k) return 0;
    for (let n = 0; n < Math.abs(k); n++) {
      if (k > 0) { strip.append(strip.firstElementChild); order.push(order.shift()); }
      else { strip.prepend(strip.lastElementChild); order.unshift(order.pop()); }
    }
    baseAngle += k * STEP;
    strip.scrollLeft = (p - k) * W; // same frame as the DOM move, so nothing visibly jumps
    return k;
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
  // Only the page in the middle of the screen takes taps; the rest are inert. This follows the
  // scroll position directly: waiting for the move to formally settle (scrollend, which phones
  // report late) left the arrived page locked, so the first tap on it did nothing.
  let live = null;
  function unlockCentre() {
    const tab = order[Math.round(pos())];
    if (!tab || tab === live) return;
    live = tab;
    for (const t in panels) panels[t].inert = t !== tab;
  }
  let paintQueued = false;
  strip.addEventListener("scroll", () => {
    if (paintQueued) return;
    paintQueued = true;
    requestAnimationFrame(() => { paintQueued = false; paintRing(); unlockCentre(); });
  }, { passive: true });

  // ---- Moving the strip. Taps, links and ring releases use the browser's own smooth scroll with
  // snapping left on, so the browser always knows which page it is settling on. (Switching snapping
  // off around a scripted animation and back on made phone browsers re-snap towards the old page,
  // stranding the strip between two faded pages.) Only a live ring drag pauses snapping. ----
  let heading = null, pending = null, dragging = false;
  function scrollToSlot(slot) {
    heading = Math.max(0, Math.min(N - 1, slot));
    strip.scrollTo({ left: heading * W, behavior: reduceMotion.matches ? "instant" : "smooth" });
    if (Math.abs(strip.scrollLeft - heading * W) < 1) settle(); // already there: no scroll will follow
  }

  // A move has come to rest: commit the tab, then recentre
  function settle() {
    heading = null;
    const tab = order[Math.round(pos())];
    if (pending?.tab === tab) { const { commit } = pending; pending = null; commit(); }
    else if (tab !== currentTab()) location.hash = tab; // a swipe landed on a new page
    recentre();
    paintRing();
  }
  // A scroll-end only counts once a tap/link move has actually arrived: the swipe that was already
  // finishing when you tapped reports its own end mid-flight, and must not override the tap.
  const onScrollEnd = () => {
    if (dragging || (heading !== null && Math.abs(pos() - heading) > 0.01)) return;
    settle();
  };
  if ("onscrollend" in window) strip.addEventListener("scrollend", onScrollEnd);
  else { // older Safari: treat 120ms without scroll events as the end
    let t = 0;
    strip.addEventListener("scroll", () => { clearTimeout(t); t = setTimeout(onScrollEnd, 120); }, { passive: true });
  }
  // Touching, swiping or wheeling the strip mid-move takes over: wherever it then stops counts
  ["pointerdown", "touchstart", "wheel"].forEach((t) => strip.addEventListener(t, () => { heading = null; }, { passive: true }));

  // Router hands every tab change (links, tiles, ring taps, swipes) here to animate
  setTransition((tab, commit) => {
    pending = { tab, commit };
    preview = null;
    if (dragging || (heading !== null && order[heading] === tab)) return; // already on its way there
    let here = heading ?? Math.round(pos());
    let dest = here + shortest(order[here], tab);
    if (dest < 0 || dest > N - 1) { here -= recentre(); dest = here + shortest(order[here], tab); } // a move hasn't settled yet: make room first
    scrollToSlot(dest);
  });
  // First load (no motion) and keeping the ring in sync with commits
  onTabChange((tab) => { if (!order.length) { layout(tab); baseAngle = TABS.indexOf(tab) * STEP; paintRing(); } });

  // ---- Dragging the ring scrolls the strip (1 card = 1 page) ----
  let startPos = 0, lastP = 0, lastMoveT = 0, dVel = 0;
  function dragStart() {
    dragging = true; preview = null; heading = null;
    strip.style.scrollSnapType = "none"; // follow the pointer exactly while held
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
    strip.style.scrollSnapType = ""; // snapping back on before the browser glides to the page
    scrollToSlot(slot);
    if (order[slot] !== currentTab()) location.hash = order[slot]; // committed when it settles
  }

  // Keyboard: turn a focused card to the front so its focus outline is visible (pages stay put)
  links.forEach((a, i) => {
    // Keyboard focus only: a mouse press on a card must not start turning the ring
    a.addEventListener("focus", () => {
      if (dragging || heading !== null || !a.matches(":focus-visible")) return;
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
