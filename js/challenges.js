// Coding challenges: one card at a time, stars saved on this device
import { CHALLENGES } from "./challenges-data.js?v=202611150213";

const KEY = "gwc-expo-stars";

function loadSolved() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { return new Set(); }
}
function saveSolved(set) {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch {}
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function initChallenges({ bitsy = () => {} } = {}) {
  const root = document.getElementById("challenge-root");
  const starEls = [...document.querySelectorAll("#star-row .star")];
  const count = document.getElementById("star-count");
  const solved = loadSolved();
  let index = Math.min([...Array(CHALLENGES.length).keys()].find((i) => !solved.has(i)) ?? 0, CHALLENGES.length - 1);
  let showCelebrate = false;

  function paintStars(popIndex) {
    starEls.forEach((s, i) => {
      const on = i < solved.size;
      s.classList.toggle("on", on);
      if (i === popIndex) { s.classList.remove("on"); void s.offsetWidth; s.classList.add("on"); }
    });
    count.textContent = `${solved.size} of ${CHALLENGES.length} stars`;
  }

  function stepsHTML() {
    return `<div class="steps" role="group" aria-label="Choose a challenge">` +
      CHALLENGES.map((_, i) => `<button type="button" data-step="${i}" class="${solved.has(i) ? "done" : ""}" ${i === index && !showCelebrate ? 'aria-current="step"' : ""} aria-label="Challenge ${i + 1}${solved.has(i) ? ", solved" : ""}"></button>`).join("") +
      `</div>`;
  }

  function render() {
    if (showCelebrate) {
      root.innerHTML = stepsHTML() + `
        <div class="clay card celebrate clay--mint">
          <div class="big" aria-hidden="true">🏆</div>
          <h2>You did it, coder!</h2>
          <p style="margin:.4rem 0 1rem">All 3 stars earned. You just used strings, binary, and loops — real programming ideas!</p>
          <div class="stack">
            <a class="btn btn--pink btn--block glass" href="#play">Keep coding 🎮</a>
            <button class="btn glass btn--block" type="button" data-reset>↻ Play again</button>
          </div>
        </div>`;
      return;
    }
    const c = CHALLENGES[index];
    const body = c.code
      ? `<pre class="code clay-well"><code>${c.code}</code></pre>`
      : `<div class="clay-well" style="display:flex;gap:.3rem;justify-content:center;padding:1rem;margin:.8rem 0 1rem" aria-label="Beads: ${c.beads.split("").join(" ")}">` +
        [...c.beads].map((b) => `<span class="bead" style="background:${b === "1" ? "var(--grape)" : "var(--bubblegum)"}">${b}</span>`).join("") + `</div>`;
    root.innerHTML = stepsHTML() + `
      <div class="clay card">
        <div class="q-meta">
          <span class="q-tag clay clay--${c.color}">${c.tag}</span>
          <span class="note">Challenge ${index + 1} of ${CHALLENGES.length}${solved.has(index) ? " · ⭐ solved" : ""}</span>
        </div>
        <h2 id="q-title">${c.question}</h2>
        ${body}
        <div class="answers" role="group" aria-labelledby="q-title">
          ${c.answers.map((a, i) => `<button class="answer glass" type="button" data-answer="${i}"><span class="mark" aria-hidden="true">${"ABCD"[i]}</span>${esc(a)}</button>`).join("")}
        </div>
        <div id="feedback" aria-live="polite"></div>
        <div class="q-nav">
          <button class="btn glass" type="button" data-prev ${index === 0 ? "disabled" : ""}>← Back</button>
          <button class="btn btn--grape glass" type="button" data-next>${index === CHALLENGES.length - 1 ? "Finish ✦" : "Next →"}</button>
        </div>
      </div>`;
  }

  function answer(btn) {
    const c = CHALLENGES[index];
    const pick = Number(btn.dataset.answer);
    const fb = document.getElementById("feedback");
    root.querySelectorAll(".answer").forEach((b) => b.classList.remove("wrong"));
    if (pick === c.correct) {
      btn.classList.add("correct");
      btn.querySelector(".mark").textContent = "✓";
      root.querySelectorAll(".answer").forEach((b) => { b.disabled = true; });
      const isNew = !solved.has(index);
      solved.add(index);
      saveSolved(solved);
      paintStars(isNew ? solved.size - 1 : undefined);
      fb.innerHTML = `<div class="feedback clay clay--mint"><strong>Yes! ${isNew ? "+1 star ⭐" : "Nice!"}</strong>${esc(c.explain)}</div>`;
      root.querySelectorAll(".steps button")[index]?.classList.add("done");
      bitsy("cheer", solved.size === CHALLENGES.length ? "3 stars! You're a real coder! 🏆" : "You got it! ⭐ Tap Next!");
    } else {
      btn.classList.add("wrong");
      fb.innerHTML = `<div class="feedback clay clay--peach"><strong>So close! Try again 💪</strong>Hint: ${esc(c.hint)}</div>`;
      bitsy("oops", "Oops! Read the hint and try again 💪");
    }
  }

  root.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.answer !== undefined) return answer(t);
    if (t.dataset.step !== undefined) { index = Number(t.dataset.step); showCelebrate = false; return render(); }
    if (t.hasAttribute("data-prev")) { index = Math.max(0, index - 1); return render(); }
    if (t.hasAttribute("data-next")) {
      if (index < CHALLENGES.length - 1) index++;
      else if (solved.size === CHALLENGES.length) showCelebrate = true;
      else index = [...Array(CHALLENGES.length).keys()].find((i) => !solved.has(i));
      return render();
    }
    if (t.hasAttribute("data-reset")) {
      solved.clear(); saveSolved(solved); index = 0; showCelebrate = false; paintStars(); render();
    }
  });

  // Swipe left/right between challenges
  let sx = null;
  root.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  root.addEventListener("touchend", (e) => {
    if (sx === null || showCelebrate) return;
    const dx = e.changedTouches[0].clientX - sx;
    sx = null;
    if (Math.abs(dx) < 60) return;
    const next = index + (dx < 0 ? 1 : -1);
    if (next >= 0 && next < CHALLENGES.length) { index = next; render(); }
  });

  paintStars();
  render();
}
