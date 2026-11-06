import { CapybaraEngine, type CapybaraOptions } from "./animation/capybara-engine.js";

const canvas = document.querySelector<HTMLCanvasElement>("#capybara");
const color = document.querySelector<HTMLInputElement>("#color");
const opacity = document.querySelector<HTMLInputElement>("#opacity");
const size = document.querySelector<HTMLInputElement>("#size");
const speed = document.querySelector<HTMLInputElement>("#speed");
const pause = document.querySelector<HTMLButtonElement>("#pause");
const status = document.querySelector<HTMLElement>("#status");
if (!canvas || !color || !opacity || !size || !speed || !pause || !status) throw new Error("Capybara preview controls are missing");

let options: CapybaraOptions = { color: color.value, opacity: Number(opacity.value) / 100, size: Number(size.value) / 100, speed: Number(speed.value) / 100, paused: false };
const engine = new CapybaraEngine(canvas, options, (message) => { status.textContent = message; });
function update() {
  options = { ...options, color: color!.value, opacity: Number(opacity!.value) / 100, size: Number(size!.value) / 100, speed: Number(speed!.value) / 100 };
  document.querySelector<HTMLOutputElement>("#opacityValue")!.value = opacity!.value + "%";
  document.querySelector<HTMLOutputElement>("#sizeValue")!.value = size!.value + "%";
  document.querySelector<HTMLOutputElement>("#speedValue")!.value = options.speed.toFixed(2) + "×";
  engine.setOptions(options);
}
for (const input of [color, opacity, size, speed]) input.addEventListener("input", update);
pause.addEventListener("click", () => { options = { ...options, paused: !options.paused }; engine.setOptions({ paused: options.paused }); pause.textContent = options.paused ? "继续动画" : "暂停动画"; pause.setAttribute("aria-pressed", String(options.paused)); });
window.addEventListener("pagehide", () => engine.dispose(), { once: true });
