import { startRouter, onTabChange, currentTab } from "./router.js?v=202611150330";
import { initBracelet } from "./bracelet.js?v=202611150330";
import { initChallenges } from "./challenges.js?v=202611150330";
import { initTheme } from "./theme.js?v=202611150330";
import { initTabRing } from "./tabring.js?v=202611150330";
import { bitsy } from "./bitsy.js?v=202611150330";
import { nameToBits } from "./binary.js?v=202611150330";

// Three.js is loaded lazily from the CDN; the site works fine without it.
let threePromise = null;
const load3D = () => (threePromise ??= import("./clay3d.js?v=202611150330"));

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}
const has3D = webglOK();

// ---- Home hero: the GWC bead bracelet. It animates whenever Home is on screen (including while
// sliding in during a swipe) and pauses itself when off screen. ----
async function startHero() {
  const stage = document.getElementById("hero-stage");
  if (!has3D) return;
  try {
    const { createBraceletScene } = await load3D();
    // "GWC" in binary = 24 beads
    createBraceletScene(stage, { bits: nameToBits("GWC").join(""), colors: ["#ff8fbf", "#fffaf3"], blobs: true, touchSpin: false });
    stage.classList.add("has-3d");
  } catch (err) {
    console.warn("3D hero unavailable:", err);
  }
}

// ---- Bitsy buddy on the other tabs (a panda per page, one shared renderer) ----
let mascot = null, mascotPromise = null;
function getMascot() {
  if (!has3D) return Promise.resolve(null);
  return (mascotPromise ??= import("./mascot.js?v=202611150330")
    .then(({ createMascot }) => (mascot = createMascot()))
    .catch((err) => { console.warn("Bitsy 3D unavailable:", err); return null; }));
}

async function showBuddy(tab) {
  const stage = document.querySelector(`#tab-${tab} .buddy-stage`);
  const m = await getMascot();
  if (!m) return;
  if (currentTab() !== tab) return;       // user already moved on
  if (stage) m.attach(stage); // reactions go to this page's panda
  else m.detach();
}

// Speech bubble + reactions
const bubbleTimers = new WeakMap();
window.addEventListener("bitsy", (e) => {
  const { kind, line } = e.detail;
  mascot?.react(kind);
  const bubble = document.querySelector(`#tab-${currentTab()} .buddy-bubble`);
  if (!bubble || !line) return;
  bubble.textContent = line;
  bubble.classList.remove("pop"); void bubble.offsetWidth; bubble.classList.add("pop");
  clearTimeout(bubbleTimers.get(bubble));
  bubbleTimers.set(bubble, setTimeout(() => { bubble.textContent = bubble.dataset.line; }, 3500));
});

// Fallback image (no WebGL): tapping it still gets a little bounce
document.querySelectorAll(".buddy-fallback").forEach((img) => {
  img.addEventListener("click", () => img.animate([{ transform: "scale(1)" }, { transform: "scale(1.12, 0.9)" }, { transform: "scale(1)" }], { duration: 400 }));
});

document.querySelectorAll("#tab-play a.btn").forEach((a) =>
  a.addEventListener("click", () => bitsy("happy", "Have fun! Ask a grown-up before signing up 👋")));

const bracelet = initBracelet({ load3D, bitsy });
initChallenges({ bitsy });
initTabRing();
initTheme();

onTabChange((tab) => {
  bracelet.setActive(tab === "create");
  if (tab === "home") mascot?.detach();
  else showBuddy(tab);
});
startRouter();
// Every page is laid out from the start, so load all the 3D at once: the Home bracelet and the
// pandas. Each only draws while its page is on screen.
startHero();
getMascot();
