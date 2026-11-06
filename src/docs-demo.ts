import { OceanEngine } from "./animation/engine.js";
import { HandsWindowEngine } from "./animation/hands-window-engine.js";
import { CatEngine } from "./animation/cat-engine.js";
import { CapybaraEngine } from "./animation/capybara-engine.js";
import { HeartEngine } from "./animation/heart-engine.js";
import { HEART_SOURCE_URL } from "./animation/heart-source.js";
import { createSharkSpecs } from "./animation/shark-selection.js";

// README GIF 录制页：界面与设置页一致，速度刻意放慢，抽帧合成后播放仍显自然。
const anim = new URLSearchParams(location.search).get("anim") ?? "shark";
const shot = document.getElementById("shot")!;
const canvas = document.querySelector<HTMLCanvasElement>("#bg")!;
shot.dataset.anim = anim;

if (anim === "shark") {
  canvas.style.opacity = "0.9";
  new OceanEngine(canvas, createSharkSpecs(3, "mixed"), { interactive: false, speed: 0.32, color: "#4e6572", paused: false });
} else if (anim === "hands") {
  new HandsWindowEngine(canvas, { color: "#687b72", opacity: 0.5, size: 1, glyphSize: 1.2, speed: 1, paused: false });
} else if (anim === "cat") {
  new CatEngine(canvas, { color: "#8ca99a", opacity: 0.75, size: 1, headSpeed: 0.3, tailSpeed: 0.35, paused: false });
} else if (anim === "capybara") {
  new CapybaraEngine(canvas, { color: "#a79c91", opacity: 0.75, size: 0.9, speed: 0.5, paused: false });
} else if (anim === "heart") {
  new HeartEngine(canvas, HEART_SOURCE_URL, { color: "#b97988", opacity: 0.8, size: 0.8, beatSpeed: 0.45, ringSpeed: 0.22, paused: false });
}
