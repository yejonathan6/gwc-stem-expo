// Binary Bracelet studio
import { cleanName, nameToBits, ALPHABET } from "./binary.js";
import { toast, openSheet } from "./ui.js";

export function initBracelet({ load3D, bitsy = () => {} }) {
  let lastCheer = 0;
  const input = document.getElementById("name-input");
  const rows = document.getElementById("bead-rows");
  const c0 = document.getElementById("color0");
  const c1 = document.getElementById("color1");
  const copyBtn = document.getElementById("copy-btn");
  const resetBtn = document.getElementById("reset-btn");
  const toggle3D = document.getElementById("toggle-3d");
  const box3D = document.getElementById("bracelet-3d");
  const alphaBtn = document.getElementById("alpha-btn");
  let scene3D = null;
  let show3D = false;

  const allBits = () => nameToBits(cleanName(input.value)).join("");

  function paintSwatches() {
    for (const id of ["sw0", "lg0"]) document.getElementById(id).style.background = c0.value;
    for (const id of ["sw1", "lg1"]) document.getElementById(id).style.background = c1.value;
    rows.style.setProperty("--c0", c0.value);
    rows.style.setProperty("--c1", c1.value);
    rows.querySelectorAll(".bead").forEach((b) => { b.style.background = b.dataset.bit === "1" ? c1.value : c0.value; });
    scene3D?.setColors(c0.value, c1.value);
  }

  function render() {
    const name = cleanName(input.value);
    if (input.value !== name) {
      // keep only A–Z, uppercase, max 24
      const pos = input.selectionStart;
      input.value = name;
      try { input.setSelectionRange(pos, pos); } catch {}
    }
    rows.innerHTML = "";
    if (!name) {
      rows.innerHTML = '<p class="empty">Type above to see your binary beads ✨</p>';
    } else {
      nameToBits(name).forEach((bits, i) => {
        const row = document.createElement("div");
        row.className = "bead-row";
        row.style.animationDelay = `${Math.min(i, 8) * 40}ms`;
        row.setAttribute("aria-label", `${name[i]}: ${bits.split("").join(" ")}`);
        row.innerHTML = `<span class="letter" aria-hidden="true">${name[i]}</span>` +
          [...bits].map((b) => `<span class="bead" data-bit="${b}" aria-hidden="true" style="background:${b === "1" ? c1.value : c0.value}">${b}</span>`).join("");
        rows.appendChild(row);
      });
    }
    // Bitsy reads out the newest letter (at most every ~1.2s so it isn't noisy)
    const now = performance.now();
    if (name && now - lastCheer > 1200) {
      lastCheer = now;
      const ch = name[name.length - 1];
      bitsy("tap", `${ch} is ${nameToBits(ch)[0]} — that's 8 beads!`);
    }
    copyBtn.disabled = !name;
    toggle3D.disabled = !name;
    if (!name && show3D) setShow3D(false);
    scene3D?.setBits(allBits());
  }

  async function setShow3D(v) {
    show3D = v;
    box3D.hidden = !v;
    rows.hidden = v;
    toggle3D.textContent = v ? "▦ Show bead rows" : "🌀 Spin it in 3D";
    if (v && !scene3D) {
      try {
        const { createBraceletScene } = await load3D();
        scene3D = createBraceletScene(box3D, { bits: allBits(), colors: [c0.value, c1.value] });
      } catch {
        toast("3D isn't available on this device");
        return setShow3D(false);
      }
    }
    scene3D?.setActive(v);
  }

  input.addEventListener("input", render);
  c0.addEventListener("input", paintSwatches);
  c1.addEventListener("input", paintSwatches);
  toggle3D.addEventListener("click", () => {
    setShow3D(!show3D);
    if (show3D) bitsy("happy", "Wheee! Drag the bracelet to spin it 🌀");
  });

  copyBtn.addEventListener("click", async () => {
    const name = cleanName(input.value);
    const text = nameToBits(name).map((b, i) => `${name[i]} ${b}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied your binary code! ⧉");
      bitsy("happy", "Copied! Show it to a friend ✨");
    } catch {
      toast("Couldn't copy — try a long-press instead");
    }
  });

  resetBtn.addEventListener("click", () => {
    input.value = "";
    c0.value = "#ff8fbf";
    c1.value = "#b39bff";
    paintSwatches();
    render();
    input.focus();
  });

  alphaBtn.addEventListener("click", () => {
    const list = document.createElement("div");
    list.innerHTML = '<p class="note" style="margin-bottom:.8rem">Uppercase ASCII · 8 bits per letter</p>';
    const grid = document.createElement("div");
    grid.className = "alpha";
    grid.innerHTML = ALPHABET.map(([ch, bits]) => `<div><b>${ch}</b>${bits}</div>`).join("");
    list.appendChild(grid);
    openSheet("Binary Alphabet", list);
  });

  return { setActive: (v) => scene3D?.setActive(v && show3D) };
}
