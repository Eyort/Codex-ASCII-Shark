import { HandsWindowEngine, type HandsWindowOptions } from "./animation/hands-window-engine.js";

const canvas = document.querySelector<HTMLCanvasElement>("#hands");
const color = document.querySelector<HTMLInputElement>("#color");
const opacity = document.querySelector<HTMLInputElement>("#opacity");
const size = document.querySelector<HTMLInputElement>("#size");
const glyphSize = document.querySelector<HTMLInputElement>("#glyphSize");
const speed = document.querySelector<HTMLInputElement>("#speed");
const pause = document.querySelector<HTMLButtonElement>("#pause");
const reset = document.querySelector<HTMLButtonElement>("#reset");
const zoom = document.querySelector<HTMLButtonElement>("#zoom");
const scene = document.querySelector<HTMLElement>(".scene");
const status = document.querySelector<HTMLElement>("#status");
if (!canvas || !color || !opacity || !size || !glyphSize || !speed || !pause || !reset || !zoom || !scene || !status) throw new Error("Hands preview controls are missing");

let options: HandsWindowOptions = { color: color.value, opacity: Number(opacity.value) / 100, size: Number(size.value) / 100, glyphSize: Number(glyphSize.value) / 100, speed: Number(speed.value) / 100, paused: false };
const engine = new HandsWindowEngine(canvas, options, (message) => { status.textContent = message; });
function update() {
  options = { ...options, color: color!.value, opacity: Number(opacity!.value) / 100, size: Number(size!.value) / 100, glyphSize: Number(glyphSize!.value) / 100, speed: Number(speed!.value) / 100 };
  document.querySelector<HTMLOutputElement>("#opacityValue")!.value = opacity!.value + "%";
  document.querySelector<HTMLOutputElement>("#sizeValue")!.value = size!.value + "%";
  document.querySelector<HTMLOutputElement>("#glyphSizeValue")!.value = glyphSize!.value + "%";
  document.querySelector<HTMLOutputElement>("#speedValue")!.value = options.speed.toFixed(2) + "×";
  engine.setOptions(options);
}
for (const input of [color, opacity, size, glyphSize, speed]) input.addEventListener("input", update);
pause.addEventListener("click", () => { options = { ...options, paused: !options.paused }; engine.setOptions({ paused: options.paused }); pause.textContent = options.paused ? "继续动画" : "暂停动画"; pause.setAttribute("aria-pressed", String(options.paused)); });
reset.addEventListener("click", () => {
  color.value = "#ededed";
  opacity.value = "90";
  size.value = "100";
  glyphSize.value = "120";
  speed.value = "100";
  options = { ...options, paused: false };
  pause.textContent = "暂停动画";
  pause.setAttribute("aria-pressed", "false");
  update();
});
zoom.addEventListener("click", () => {
  const enlarged = scene.classList.toggle("is-zoomed");
  zoom.textContent = enlarged ? "适应宽度" : "放大查看";
  zoom.setAttribute("aria-pressed", String(enlarged));
});
window.addEventListener("pagehide", () => engine.dispose(), { once: true });
