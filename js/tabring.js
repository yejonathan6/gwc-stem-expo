// 3D ring of tab cards under the top bar: the current tab sits at the front.
// Drag the ring, tap a card, or swipe the page sideways to switch tabs.
import { TABS, currentTab, onTabChange } from "./router.js?v=202611150201";

// Each tab appears twice round the ring so neighbours turn only 36° and stay readable
const N = TABS.length, STEP = 360 / (N * 2), HALF = STEP * N; // HALF = 180°
const wrap = (deg, p) => ((((deg % p) + p * 1.5) % p) - p / 2); // → [-p/2, p/2)
const go = (i) => { location.hash = TABS[(i % TABS.length + TABS.length) % TABS.length]; };

export function initTabRing() {
  const ring = document.getElementById("tab-ring");
  const track = ring.querySelector(".ring-track");
  // Build the cards from the tab bar so labels and icons live in one place
  const tabs = [...document.querySelectorAll(".tabbar .tab")];
  const cards = [...tabs, ...tabs].map((a, i) => {
    const c = document.createElement("a");
    c.className = "ring-card glass";
    c.href = a.getAttribute("href");
    c.tabIndex = -1;
    c.innerHTML = a.innerHTML;
    c.style.transform = `rotateY(${i * STEP}deg) translateZ(var(--ring-r))`;
    track.appendChild(c);
    return c;
  });

  let angle = 0; // cumulative, so About → Home turns the short way round
  function paint(a) {
    track.style.transform = `translateZ(calc(-1 * var(--ring-r))) rotateY(${-a}deg)`;
    cards.forEach((c, i) => {
      const d = Math.abs(wrap(i * STEP - a, 360)); // 0 = facing the viewer
      c.style.opacity = Math.max(0, 1 - d / 105).toFixed(2);
      c.classList.toggle("is-front", d < STEP / 2);
    });
  }
  onTabChange((tab) => {
    angle += wrap(TABS.indexOf(tab) * STEP - angle, HALF); // nearest of the tab's two cards
    paint(angle);
  });

  // Drag the ring
  let sx = null, base = 0, moved = 0, dragged = false;
  ring.addEventListener("pointerdown", (e) => { sx = e.clientX; base = angle; moved = 0; dragged = false; });
  window.addEventListener("pointermove", (e) => {
    if (sx === null) return;
    moved = e.clientX - sx;
    if (!dragged && Math.abs(moved) > 6) { dragged = true; ring.classList.add("dragging"); }
    if (dragged) paint(base - moved * 0.45);
  });
  window.addEventListener("pointerup", () => {
    if (sx === null) return;
    sx = null;
    if (!dragged) return; // a tap: the card's own link navigates
    ring.classList.remove("dragging");
    const i = Math.round((base - moved * 0.45) / STEP);
    if (TABS[(i % TABS.length + TABS.length) % TABS.length] === currentTab()) paint(angle); // snap back
    else go(i);
  });
  // A drag that ends over a card must not also follow its link
  ring.addEventListener("click", (e) => { if (dragged) { e.preventDefault(); dragged = false; } }, true);

  // Swipe the page sideways (skips areas that already use horizontal drags)
  const main = document.getElementById("main");
  let tx = null, ty = 0;
  main.addEventListener("touchstart", (e) => {
    tx = e.target.closest("canvas, input, #challenge-root, .code") ? null : e.touches[0].clientX;
    ty = e.touches[0].clientY;
  }, { passive: true });
  main.addEventListener("touchend", (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    tx = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > 1.5 * Math.abs(dy)) go(TABS.indexOf(currentTab()) + (dx < 0 ? 1 : -1));
  }, { passive: true });
}
