// Small shared UI helpers: toast + bottom sheet
export function toast(msg) {
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div");
  t.className = "toast glass";
  t.setAttribute("role", "status");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

export function openSheet(title, contentEl) {
  const opener = document.activeElement;
  const back = document.createElement("div");
  back.className = "sheet-backdrop";
  back.innerHTML = `
    <div class="sheet glass" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <div class="sheet-grab" aria-hidden="true"></div>
      <div class="sheet-head"><h2 id="sheet-title"></h2><button class="btn glass" type="button" data-close>Close ✕</button></div>
    </div>`;
  back.querySelector("#sheet-title").textContent = title;
  back.querySelector(".sheet").appendChild(contentEl);
  const close = () => { back.remove(); document.removeEventListener("keydown", onKey); opener?.focus?.(); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  back.addEventListener("click", (e) => { if (e.target === back || e.target.closest("[data-close]")) close(); });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(back);
  back.querySelector("[data-close]").focus();
}
