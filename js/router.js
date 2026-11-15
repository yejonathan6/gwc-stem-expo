// Hash-based tab router: #home, #create, #solve, #play, #about
export const TABS = ["home", "create", "solve", "play", "about"];
const listeners = new Set();
let current = null;

export function onTabChange(fn) { listeners.add(fn); }
export function currentTab() { return current; }

function show(tab, { focus = true } = {}) {
  if (!TABS.includes(tab)) tab = "home";
  if (tab === current) return;
  const prev = current;
  current = tab;

  // Slide direction for the panel entrance (shortest way round the ring)
  if (prev !== null) {
    const n = TABS.length, step = ((TABS.indexOf(tab) - TABS.indexOf(prev) + n + 2) % n) - 2;
    document.getElementById("main").dataset.dir = step > 0 ? "next" : "prev";
  }
  document.querySelectorAll("main > .panel").forEach((p) => { p.hidden = p.dataset.tab !== tab; });
  document.querySelectorAll(".tabbar .tab").forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  const pill = document.getElementById("tab-pill");
  if (pill) pill.style.transform = `translateX(${TABS.indexOf(tab) * 100}%)`;

  window.scrollTo(0, 0);
  if (focus && prev !== null) document.getElementById(`tab-${tab}`)?.focus({ preventScroll: true });
  listeners.forEach((fn) => fn(tab, prev));
}

export function startRouter() {
  // Non-tab hashes (e.g. the #main skip link) leave the current tab alone
  const read = () => {
    const h = location.hash.replace("#", "");
    if (TABS.includes(h)) show(h);
    else if (current === null) show("home");
  };
  window.addEventListener("hashchange", read);
  read();
}
