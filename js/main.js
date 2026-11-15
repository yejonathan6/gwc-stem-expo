import { startRouter, onTabChange, currentTab } from "./router.js";
import { initBracelet } from "./bracelet.js";
import { initChallenges } from "./challenges.js";

// Three.js is loaded lazily from the CDN; the site works fine without it.
let threePromise = null;
const load3D = () => (threePromise ??= import("./clay3d.js"));

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}

let hero = null;
async function startHero() {
  const stage = document.getElementById("hero-stage");
  if (!webglOK()) return;
  try {
    const { createBraceletScene } = await load3D();
    // "GWC" in binary = 24 beads
    const bits = [..."GWC"].map((c) => c.charCodeAt(0).toString(2).padStart(8, "0")).join("");
    hero = createBraceletScene(stage, { bits, colors: ["#ff8fbf", "#fffaf3"], blobs: true });
    stage.classList.add("has-3d");
  } catch (err) {
    console.warn("3D hero unavailable:", err);
  }
}

const bracelet = initBracelet({ load3D });
initChallenges();

onTabChange((tab) => {
  hero?.setActive(tab === "home");
  bracelet.setActive(tab === "create");
});
startRouter();
startHero().then(() => hero?.setActive(currentTab() === "home"));
