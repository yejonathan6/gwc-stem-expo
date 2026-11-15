// Hash-based tab router: #home, #create, #solve, #play, #about
export const TABS = ["home", "create", "solve", "play", "about"];
const listeners = new Set();
let current = null;
let transition = null;

export function onTabChange(fn) { listeners.add(fn); }
export function currentTab() { return current; }
// The tab ring animates every tab change itself and calls commit() once its motion settles
export function setTransition(fn) { transition = fn; }

function show(tab) {
  if (!TABS.includes(tab)) tab = "home";
  if (tab === current) return;
  const prev = current;
  current = tab;

  const swap = () => {
    // Every page stays laid out in the scroll strip; pages other than the current one are inert
    // (skipped by keyboard and screen readers) rather than hidden.
    document.querySelectorAll("main > .panel").forEach((p) => { p.inert = p.dataset.tab !== tab; });
    document.querySelectorAll("#tab-ring a[data-tab]").forEach((a) => {
      if (a.dataset.tab === tab) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    if (prev !== null) document.getElementById(`tab-${tab}`)?.focus({ preventScroll: true });
    listeners.forEach((fn) => fn(tab, prev));
  };
  if (prev === null || !transition) return swap();
  transition(tab, swap);
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
