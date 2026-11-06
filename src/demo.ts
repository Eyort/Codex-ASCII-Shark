import { OceanEngine } from "./animation/engine";
import { HandsWindowEngine } from "./animation/hands-window-engine";
import { CatEngine } from "./animation/cat-engine";
import { CapybaraEngine } from "./animation/capybara-engine";
import { HeartEngine } from "./animation/heart-engine";
import { HEART_SOURCE_URL } from "./animation/heart-source";
import { createSharkSpecs, type SharkSelection } from "./animation/shark-selection";
import { DEFAULT_CONFIG, type SharkConfig } from "./config-shared";
import "./style.css";

const canvasNode = document.querySelector<HTMLCanvasElement>("#ocean");
if (!canvasNode) throw new Error("Preview canvas not found");
const canvas: HTMLCanvasElement = canvasNode;
const handsCanvas = document.querySelector<HTMLCanvasElement>("#handsDemo")!;
const sceneCanvas = document.querySelector<HTMLCanvasElement>("#sceneDemo")!;
const animationButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-choice]")];

const fields = {
  enabled: document.querySelector<HTMLInputElement>("#enabled")!,
  controls: document.querySelector<HTMLElement>("#controls")!,
  work: document.querySelector<HTMLElement>(".work")!,
  kind: document.querySelector<HTMLSelectElement>("#kind")!,
  count: document.querySelector<HTMLInputElement>("#count")!,
  opacity: document.querySelector<HTMLInputElement>("#opacity")!,
  speed: document.querySelector<HTMLInputElement>("#speed")!,
  color: document.querySelector<HTMLInputElement>("#color")!,
  handsOpacity: document.querySelector<HTMLInputElement>("#handsOpacity")!,
  handsSpeed: document.querySelector<HTMLInputElement>("#handsSpeed")!,
  handsSize: document.querySelector<HTMLInputElement>("#handsSize")!,
  handsGlyphSize: document.querySelector<HTMLInputElement>("#handsGlyphSize")!,
  handsColor: document.querySelector<HTMLInputElement>("#handsColor")!,
  sceneOpacity: document.querySelector<HTMLInputElement>("#sceneOpacity")!,
  sceneSpeed: document.querySelector<HTMLInputElement>("#sceneSpeed")!,
  sceneColor: document.querySelector<HTMLInputElement>("#sceneColor")!,
  sceneSize: document.querySelector<HTMLInputElement>("#sceneSize")!,
  pause: document.querySelector<HTMLButtonElement>("#pause")!,
  reset: document.querySelector<HTMLButtonElement>("#reset")!,
  saveStatus: document.querySelector<HTMLElement>("#saveStatus")!,
  canvasStatus: document.querySelector<HTMLElement>("#canvasStatus")!,
};

type SceneName = "cat" | "capybara" | "heart";
const sceneColorField: Record<SceneName, "catColor" | "capybaraColor" | "heartColor"> = { cat: "catColor", capybara: "capybaraColor", heart: "heartColor" };
const sceneSizeField: Record<SceneName, "catSize" | "capybaraSize" | "heartSize"> = { cat: "catSize", capybara: "capybaraSize", heart: "heartSize" };
function isScene(name: string): name is SceneName {
  return name === "cat" || name === "capybara" || name === "heart";
}

let config: SharkConfig = { ...DEFAULT_CONFIG };
let engine: OceanEngine | null = null;
let handsEngine: HandsWindowEngine | null = null;
let catEngine: CatEngine | null = null;
let capybaraEngine: CapybaraEngine | null = null;
let heartEngine: HeartEngine | null = null;
let previewSharkKey: string | null = null;
let previewTimer = 0;
let saveTimer = 0;
let saveRevision = 0;
let saving = false;

function syncControls() {
  fields.enabled.checked = config.enabled;
  fields.controls.dataset.animation = config.animation;
  fields.work.dataset.animation = config.animation;
  for (const button of animationButtons) button.setAttribute("aria-pressed", String(button.dataset.choice === config.animation));
  fields.kind.value = config.kind;
  fields.count.value = String(config.count);
  fields.opacity.value = String(Math.round(config.opacity * 100));
  fields.speed.value = String(Math.round(config.speed * 100));
  fields.color.value = config.color;
  fields.handsOpacity.value = String(Math.round(config.handsOpacity * 100));
  fields.handsSpeed.value = String(Math.round(config.handsSpeed * 100));
  fields.handsSize.value = String(Math.round(config.handsSize * 100));
  fields.handsGlyphSize.value = String(Math.round(config.handsGlyphSize * 100));
  fields.handsColor.value = config.handsColor;
  fields.sceneOpacity.value = String(Math.round(config.sceneOpacity * 100));
  fields.sceneSpeed.value = String(Math.round(config.sceneSpeed * 100));
  if (isScene(config.animation)) {
    fields.sceneColor.value = config[sceneColorField[config.animation]];
    fields.sceneSize.value = String(Math.round(config[sceneSizeField[config.animation]] * 100));
  }
  document.querySelector<HTMLOutputElement>("#count + output")!.value = String(config.count);
  document.querySelector<HTMLOutputElement>("#opacity + output")!.value = `${Math.round(config.opacity * 100)}%`;
  document.querySelector<HTMLOutputElement>("#speed + output")!.value = `${config.speed.toFixed(2)}×`;
  document.querySelector<HTMLOutputElement>("#colorValue")!.value = config.color.toUpperCase();
  document.querySelector<HTMLOutputElement>("#handsOpacityValue")!.value = `${Math.round(config.handsOpacity * 100)}%`;
  document.querySelector<HTMLOutputElement>("#handsSpeedValue")!.value = `${config.handsSpeed.toFixed(2)}×`;
  document.querySelector<HTMLOutputElement>("#handsSizeValue")!.value = `${Math.round(config.handsSize * 100)}%`;
  document.querySelector<HTMLOutputElement>("#handsGlyphSizeValue")!.value = `${Math.round(config.handsGlyphSize * 100)}%`;
  document.querySelector<HTMLOutputElement>("#handsColorValue")!.value = config.handsColor.toUpperCase();
  document.querySelector<HTMLOutputElement>("#sceneOpacityValue")!.value = `${Math.round(config.sceneOpacity * 100)}%`;
  document.querySelector<HTMLOutputElement>("#sceneSpeedValue")!.value = `${config.sceneSpeed.toFixed(2)}×`;
  document.querySelector<HTMLOutputElement>("#sceneColorValue")!.value = fields.sceneColor.value.toUpperCase();
  document.querySelector<HTMLOutputElement>("#sceneSizeValue")!.value = `${Math.round(Number(fields.sceneSize.value))}%`;
  fields.pause.textContent = config.paused ? "继续动画" : "暂停动画";
  fields.pause.setAttribute("aria-pressed", String(config.paused));
}

function drawPreview() {
  window.clearTimeout(previewTimer);
  canvas.style.visibility = config.enabled && config.animation === "shark" ? "visible" : "hidden";
  handsCanvas.style.visibility = config.enabled && config.animation === "hands" ? "visible" : "hidden";
  sceneCanvas.style.visibility = config.enabled && ["cat", "capybara", "heart"].includes(config.animation) ? "visible" : "hidden";
  canvas.style.opacity = String(config.opacity);
  if (!config.enabled) {
    engine?.destroy(); engine = null; previewSharkKey = null;
    handsEngine?.dispose(); handsEngine = null;
    disposeScene();
    return;
  }
  if (config.animation === "hands") {
    engine?.destroy(); engine = null; previewSharkKey = null;
    disposeScene();
    const options = { color: config.handsColor, opacity: config.handsOpacity, size: config.handsSize, glyphSize: config.handsGlyphSize, speed: config.handsSpeed, paused: config.paused };
    if (!handsEngine) handsEngine = new HandsWindowEngine(handsCanvas, options);
    else handsEngine.setOptions(options);
    return;
  }
  handsEngine?.dispose(); handsEngine = null;
  if (config.animation !== "shark") {
    engine?.destroy(); engine = null; previewSharkKey = null;
    const base = { opacity: config.sceneOpacity, paused: config.paused };
    if (config.animation === "cat") {
      capybaraEngine?.dispose(); capybaraEngine = null;
      heartEngine?.dispose(); heartEngine = null;
      const options = { ...base, color: config.catColor, size: config.catSize, headSpeed: 0.75 * config.sceneSpeed, tailSpeed: 0.9 * config.sceneSpeed };
      if (!catEngine) catEngine = new CatEngine(sceneCanvas, options);
      else catEngine.setOptions(options);
    } else if (config.animation === "capybara") {
      catEngine?.dispose(); catEngine = null;
      heartEngine?.dispose(); heartEngine = null;
      const options = { ...base, color: config.capybaraColor, size: config.capybaraSize, speed: config.sceneSpeed };
      if (!capybaraEngine) capybaraEngine = new CapybaraEngine(sceneCanvas, options);
      else capybaraEngine.setOptions(options);
    } else {
      catEngine?.dispose(); catEngine = null;
      capybaraEngine?.dispose(); capybaraEngine = null;
      const options = { ...base, color: config.heartColor, size: config.heartSize, beatSpeed: 0.85 * config.sceneSpeed, ringSpeed: 0.42 * config.sceneSpeed };
      if (!heartEngine) heartEngine = new HeartEngine(sceneCanvas, HEART_SOURCE_URL, options);
      else heartEngine.setOptions(options);
    }
    return;
  }
  disposeScene();
  const key = `${config.count}|${config.kind}|${config.speed}|${config.color}`;
  if (!engine || previewSharkKey !== key) {
    engine?.destroy();
    engine = new OceanEngine(canvas, createSharkSpecs(config.count, config.kind), { interactive: false, speed: config.speed, color: config.color, paused: config.paused });
    previewSharkKey = key;
  } else engine.setPaused(config.paused);
}

function readControls() {
  config = {
    ...config,
    enabled: fields.enabled.checked,
    kind: fields.kind.value as SharkSelection,
    count: Number(fields.count.value),
    opacity: Number(fields.opacity.value) / 100,
    speed: Number(fields.speed.value) / 100,
    color: fields.color.value,
    handsOpacity: Number(fields.handsOpacity.value) / 100,
    handsSpeed: Number(fields.handsSpeed.value) / 100,
    handsSize: Number(fields.handsSize.value) / 100,
    handsGlyphSize: Number(fields.handsGlyphSize.value) / 100,
    handsColor: fields.handsColor.value,
    sceneOpacity: Number(fields.sceneOpacity.value) / 100,
    sceneSpeed: Number(fields.sceneSpeed.value) / 100,
  };
  if (isScene(config.animation)) {
    config = {
      ...config,
      [sceneColorField[config.animation]]: fields.sceneColor.value,
      [sceneSizeField[config.animation]]: Number(fields.sceneSize.value) / 100,
    };
  }
  syncControls();
  canvas.style.opacity = String(config.opacity);
  canvas.style.visibility = config.enabled && config.animation === "shark" ? "visible" : "hidden";
  handsCanvas.style.visibility = config.enabled && config.animation === "hands" ? "visible" : "hidden";
  sceneCanvas.style.visibility = config.enabled && ["cat", "capybara", "heart"].includes(config.animation) ? "visible" : "hidden";
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(drawPreview, 160);
  scheduleSave();
}

function scheduleSave() {
  saveRevision++;
  window.clearTimeout(saveTimer);
  fields.saveStatus.textContent = "保存中…";
  delete fields.saveStatus.dataset.error;
  saveTimer = window.setTimeout(() => void flushSave(), 220);
}

async function flushSave() {
  if (saving) return;
  saving = true;
  const revision = saveRevision;
  const snapshot = { ...config };
  try {
    const response = await fetch("/__ascii-sharks/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
      cache: "no-store",
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || "保存失败");
    if (revision === saveRevision) {
      fields.saveStatus.textContent = "已保存 · Codex 运行时自动应用";
      delete fields.saveStatus.dataset.error;
    }
  } catch (error) {
    if (revision === saveRevision) {
      fields.saveStatus.textContent = error instanceof Error ? error.message : "无法保存本机配置";
      fields.saveStatus.dataset.error = "true";
    }
  } finally {
    saving = false;
    if (revision !== saveRevision) void flushSave();
  }
}

function applyConfig(next: SharkConfig) {
  config = { ...next };
  syncControls();
  drawPreview();
}

async function loadConfig() {
  try {
    const response = await fetch("/__ascii-sharks/config", { cache: "no-store" });
    if (!response.ok) throw new Error("本机设置服务暂不可用");
    const result = await response.json() as { config: SharkConfig };
    applyConfig(result.config);
    fields.saveStatus.textContent = "设置已读取 · 改动会自动保存";
  } catch {
    applyConfig(DEFAULT_CONFIG);
    fields.saveStatus.textContent = "本机设置服务未连接 · 当前仅预览";
    fields.saveStatus.dataset.error = "true";
  }
}

function disposeScene() {
  catEngine?.dispose(); catEngine = null;
  capybaraEngine?.dispose(); capybaraEngine = null;
  heartEngine?.dispose(); heartEngine = null;
}

for (const input of [fields.enabled, fields.kind, fields.count, fields.opacity, fields.speed, fields.color, fields.handsOpacity, fields.handsSpeed, fields.handsSize, fields.handsGlyphSize, fields.handsColor, fields.sceneOpacity, fields.sceneSpeed, fields.sceneColor, fields.sceneSize]) {
  input.addEventListener("input", readControls);
}
for (const button of animationButtons) button.addEventListener("click", () => {
  config = { ...config, animation: button.dataset.choice as SharkConfig["animation"] };
  syncControls();
  drawPreview();
  scheduleSave();
});
fields.pause.addEventListener("click", () => {
  config = { ...config, paused: !config.paused };
  engine?.setPaused(config.paused);
  handsEngine?.setOptions({ paused: config.paused });
  catEngine?.setOptions({ paused: config.paused });
  capybaraEngine?.setOptions({ paused: config.paused });
  heartEngine?.setOptions({ paused: config.paused });
  syncControls();
  scheduleSave();
});
fields.reset.addEventListener("click", () => {
  applyConfig(DEFAULT_CONFIG);
  scheduleSave();
});
window.addEventListener("pagehide", () => { engine?.destroy(); handsEngine?.dispose(); disposeScene(); }, { once: true });
void loadConfig();
