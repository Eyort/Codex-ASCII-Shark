import { CatEngine, type CatOptions } from "./animation/cat-engine.js";

const canvas = document.querySelector<HTMLCanvasElement>("#cat");
const color = document.querySelector<HTMLInputElement>("#color");
const opacity = document.querySelector<HTMLInputElement>("#opacity");
const headSpeed = document.querySelector<HTMLInputElement>("#headSpeed");
const tailSpeed = document.querySelector<HTMLInputElement>("#tailSpeed");
const pause = document.querySelector<HTMLButtonElement>("#pause");
const status = document.querySelector<HTMLElement>("#status");
if (!canvas || !color || !opacity || !headSpeed || !tailSpeed || !pause || !status) throw new Error("Cat preview controls are missing");

const fields = { canvas, color, opacity, headSpeed, tailSpeed, pause, status };
let options: CatOptions = {
  color: color.value,
  opacity: Number(opacity.value) / 100,
  size: 1,
  headSpeed: Number(headSpeed.value) / 100,
  tailSpeed: Number(tailSpeed.value) / 100,
  paused: false,
};
const engine = new CatEngine(canvas, options, (message) => { status.textContent = message; });

function update() {
  options = {
    ...options,
    color: fields.color.value,
    opacity: Number(fields.opacity.value) / 100,
    headSpeed: Number(fields.headSpeed.value) / 100,
    tailSpeed: Number(fields.tailSpeed.value) / 100,
  };
  document.querySelector<HTMLOutputElement>("#opacityValue")!.value = fields.opacity.value + "%";
  document.querySelector<HTMLOutputElement>("#headValue")!.value = options.headSpeed.toFixed(2) + "×";
  document.querySelector<HTMLOutputElement>("#tailValue")!.value = options.tailSpeed.toFixed(2) + "×";
  engine.setOptions(options);
}

for (const input of [fields.color, fields.opacity, fields.headSpeed, fields.tailSpeed]) input.addEventListener("input", update);
fields.pause.addEventListener("click", () => {
  options = { ...options, paused: !options.paused };
  engine.setOptions({ paused: options.paused });
  fields.pause.textContent = options.paused ? "继续动画" : "暂停动画";
  fields.pause.setAttribute("aria-pressed", String(options.paused));
});
window.addEventListener("pagehide", () => engine.dispose(), { once: true });
