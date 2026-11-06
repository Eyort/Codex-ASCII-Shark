import { OceanEngine } from "./animation/engine.js";
import { HandsWindowEngine } from "./animation/hands-window-engine.js";
import { CatEngine } from "./animation/cat-engine.js";
import { CapybaraEngine } from "./animation/capybara-engine.js";
import { HeartEngine } from "./animation/heart-engine.js";
import { HEART_SOURCE_URL } from "./animation/heart-source.js";
import { createSharkSpecs } from "./animation/shark-selection.js";

// README GIF 录制页：仿 ChatGPT 界面（深/浅两套主题），颜色与透明度参考实际注入截图。
// 速度刻意放慢，抽帧合成后播放仍显自然。
const params = new URLSearchParams(location.search);
const anim = params.get("anim") ?? "shark";
const theme = params.get("theme") ?? (anim === "shark" || anim === "heart" ? "dark" : "light");
const shot = document.getElementById("shot")!;
const canvas = document.querySelector<HTMLCanvasElement>("#bg")!;
shot.dataset.anim = anim;
shot.dataset.theme = theme;

if (anim === "shark") {
  canvas.style.opacity = "0.8";
  new OceanEngine(canvas, createSharkSpecs(3, "mixed"), { interactive: false, speed: 0.32, color: "#14681d", paused: false });
} else if (anim === "hands") {
  new HandsWindowEngine(canvas, { color: "#6e6e6e", opacity: 0.55, size: 1, glyphSize: 1.2, speed: 1, paused: false });
} else if (anim === "cat") {
  new CatEngine(canvas, { color: "#8ca99a", opacity: 0.75, size: 1, headSpeed: 0.3, tailSpeed: 0.35, paused: false });
} else if (anim === "capybara") {
  new CapybaraEngine(canvas, { color: "#707070", opacity: 0.6, size: 0.9, speed: 0.5, paused: false });
} else if (anim === "heart") {
  new HeartEngine(canvas, HEART_SOURCE_URL, { color: "#7d8f06", opacity: 0.85, size: 0.8, beatSpeed: 0.45, ringSpeed: 0.22, paused: false });
}
