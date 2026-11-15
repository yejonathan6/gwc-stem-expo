// Light/dark switch in the top bar. The starting theme is set by an inline script in
// <head> (saved choice, else the system setting) so the page never flashes the wrong one.
export function initTheme() {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");
  const meta = document.querySelector('meta[name="theme-color"]');
  const sync = () => {
    const dark = root.dataset.theme === "dark";
    btn.setAttribute("aria-checked", String(dark));
    meta.content = dark ? "#15121a" : "#fff7ee";
  };
  btn.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    const apply = () => { root.dataset.theme = next; sync(); };
    // Cross-fade the whole page while the thumb glides across (it has its own view-transition-name)
    if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(apply);
    else apply();
    try { localStorage.setItem("theme", next); } catch {}
  });
  sync();
}
