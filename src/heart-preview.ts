import { HeartEngine, type HeartOptions } from "./animation/heart-engine.js";

const canvas = document.querySelector<HTMLCanvasElement>("#heart");
const color = document.querySelector<HTMLInputElement>("#color");
const opacity = document.querySelector<HTMLInputElement>("#opacity");
const beatSpeed = document.querySelector<HTMLInputElement>("#beatSpeed");
const ringSpeed = document.querySelector<HTMLInputElement>("#ringSpeed");
const pause = document.querySelector<HTMLButtonElement>("#pause");
const status = document.querySelector<HTMLElement>("#status");
if (!canvas || !color || !opacity || !beatSpeed || !ringSpeed || !pause || !status) throw new Error("Heart preview controls are missing");

const fields = { canvas, color, opacity, beatSpeed, ringSpeed, pause, status };
let options: HeartOptions = {
  color: color.value,
  opacity: Number(opacity.value) / 100,
  size: 1,
  beatSpeed: Number(beatSpeed.value) / 100,
  ringSpeed: Number(ringSpeed.value) / 100,
  paused: false,
};
const engine = new HeartEngine(canvas, "/references/heart-reference.png", options, (message) => { status.textContent = message; });

function update() {
  options = {
    ...options,
    color: fields.color.value,
    opacity: Number(fields.opacity.value) / 100,
    beatSpeed: Number(fields.beatSpeed.value) / 100,
    ringSpeed: Number(fields.ringSpeed.value) / 100,
  };
  document.querySelector<HTMLOutputElement>("#opacityValue")!.value = fields.opacity.value + "%";
  document.querySelector<HTMLOutputElement>("#beatValue")!.value = options.beatSpeed.toFixed(2) + "×";
  document.querySelector<HTMLOutputElement>("#ringValue")!.value = options.ringSpeed.toFixed(2) + "×";
  engine.setOptions(options);
}

for (const input of [fields.color, fields.opacity, fields.beatSpeed, fields.ringSpeed]) input.addEventListener("input", update);
fields.pause.addEventListener("click", () => {
  options = { ...options, paused: !options.paused };
  engine.setOptions({ paused: options.paused });
  fields.pause.textContent = options.paused ? "继续动画" : "暂停动画";
  fields.pause.setAttribute("aria-pressed", String(options.paused));
});
window.addEventListener("pagehide", () => engine.dispose(), { once: true });
