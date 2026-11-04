import { OceanEngine } from "./animation/engine";
import { DEFAULT_CONFIG, type SharkConfig } from "./config-shared";
import "./style.css";

const canvasNode = document.querySelector<HTMLCanvasElement>("#ocean");
if (!canvasNode) throw new Error("Preview canvas not found");
const canvas: HTMLCanvasElement = canvasNode;

const fields = {
  enabled: document.querySelector<HTMLInputElement>("#enabled")!,
  count: document.querySelector<HTMLInputElement>("#count")!,
  opacity: document.querySelector<HTMLInputElement>("#opacity")!,
  speed: document.querySelector<HTMLInputElement>("#speed")!,
  color: document.querySelector<HTMLInputElement>("#color")!,
  pause: document.querySelector<HTMLButtonElement>("#pause")!,
  reset: document.querySelector<HTMLButtonElement>("#reset")!,
  saveStatus: document.querySelector<HTMLElement>("#saveStatus")!,
  canvasStatus: document.querySelector<HTMLElement>("#canvasStatus")!,
};

let config: SharkConfig = { ...DEFAULT_CONFIG };
let engine: OceanEngine | null = null;
let previewTimer = 0;
let saveTimer = 0;
let saveRevision = 0;
let saving = false;

function sharks(count: number) {
  const sizes = [1, 0.78, 0.62, 0.88, 0.7, 0.55, 0.82, 0.66, 0.92, 0.6, 0.74, 0.5];
  return Array.from({ length: count }, (_, index) => ({ kind: "classic" as const, size: sizes[index] }));
}

function syncControls() {
  fields.enabled.checked = config.enabled;
  fields.count.value = String(config.count);
  fields.opacity.value = String(Math.round(config.opacity * 100));
  fields.speed.value = String(Math.round(config.speed * 100));
  fields.color.value = config.color;
  document.querySelector<HTMLOutputElement>("#count + output")!.value = String(config.count);
  document.querySelector<HTMLOutputElement>("#opacity + output")!.value = `${Math.round(config.opacity * 100)}%`;
  document.querySelector<HTMLOutputElement>("#speed + output")!.value = `${config.speed.toFixed(2)}×`;
  document.querySelector<HTMLOutputElement>("#colorValue")!.value = config.color.toUpperCase();
  fields.pause.textContent = config.paused ? "继续动画" : "暂停动画";
  fields.pause.setAttribute("aria-pressed", String(config.paused));
}

function drawPreview() {
  window.clearTimeout(previewTimer);
  engine?.destroy();
  engine = null;
  canvas.style.visibility = config.enabled ? "visible" : "hidden";
  canvas.style.opacity = String(config.opacity);
  if (!config.enabled) return;
  engine = new OceanEngine(canvas, sharks(config.count), {
    interactive: false,
    speed: config.speed,
    color: config.color,
    paused: config.paused,
  });
}

function readControls() {
  config = {
    ...config,
    enabled: fields.enabled.checked,
    count: Number(fields.count.value),
    opacity: Number(fields.opacity.value) / 100,
    speed: Number(fields.speed.value) / 100,
    color: fields.color.value,
  };
  syncControls();
  canvas.style.opacity = String(config.opacity);
  canvas.style.visibility = config.enabled ? "visible" : "hidden";
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

for (const input of [fields.enabled, fields.count, fields.opacity, fields.speed, fields.color]) {
  input.addEventListener("input", readControls);
}
fields.pause.addEventListener("click", () => {
  config = { ...config, paused: !config.paused };
  engine?.setPaused(config.paused);
  syncControls();
  scheduleSave();
});
fields.reset.addEventListener("click", () => {
  applyConfig(DEFAULT_CONFIG);
  scheduleSave();
});
window.addEventListener("pagehide", () => engine?.destroy(), { once: true });
void loadConfig();
