import { OceanEngine } from "./animation/engine";
import { createSharkSpecs } from "./animation/shark-selection";
import type { SharkConfig } from "./config";
import { isSupportedConversationModeLabel } from "./work-mode";

type PageControl = {
  configure: (config: SharkConfig) => { mounted: boolean; reason?: string };
  remove: () => void;
};

declare global {
  interface Window {
    __ASCII_SHARK_BACKGROUND_CONFIG__?: (config: SharkConfig) => { mounted: boolean; reason?: string };
    __ASCII_SHARK_BACKGROUND_REMOVE__?: () => void;
    __ASCII_SHARK_BACKGROUND_CONTROL__?: PageControl;
  }
}

const STYLE_ID = "ascii-shark-background-style";
const CANVAS_ID = "ascii-shark-background-canvas";
const HOST_CLASS = "ascii-shark-background-host";
const childStyleRestores = new Map<HTMLElement, {
  position: string; positionPriority: string; zIndex: string; zIndexPriority: string;
}>();

function isSupportedConversationMode(): boolean {
  const modeControl = [...document.querySelectorAll<HTMLElement>('button[aria-label], [role="button"][aria-label]')]
    .find((element) => /切换模式|switch mode/i.test(element.getAttribute("aria-label") ?? ""));
  return !!modeControl && isSupportedConversationModeLabel(modeControl.getAttribute("aria-label") ?? "");
}

function findConversationHost(): HTMLElement | null {
  if (!isSupportedConversationMode()) return null;
  const sidebar = document.querySelector<HTMLElement>("aside.app-shell-left-panel");
  if (!sidebar) return null;
  const sidebarRight = sidebar.getBoundingClientRect().right;
  const minWidth = Math.max(320, window.innerWidth * 0.35);
  const minHeight = Math.max(240, window.innerHeight * 0.35);
  const candidates = [...document.querySelectorAll<HTMLElement>("main")]
    .filter((element) => {
      if (element.contains(sidebar)) return false;
      const rect = element.getBoundingClientRect();
      if (rect.width < minWidth || rect.height < minHeight || rect.left < sidebarRight - 2) return false;
      return [...element.querySelectorAll<HTMLElement>('[role="textbox"][contenteditable="true"]')]
        .some((composer) => {
          const composerRect = composer.getBoundingClientRect();
          return composerRect.width > 0 && composerRect.height > 0;
        });
    })
    .sort((left, right) => {
      const a = left.getBoundingClientRect(); const b = right.getBoundingClientRect();
      return b.width * b.height - a.width * a.height;
    });
  return candidates[0] ?? null;
}

function installStyle() {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .${HOST_CLASS} { position: relative; isolation: isolate; }
      #${CANVAS_ID} { position: absolute; inset: 0; z-index: 0; display: block;
        width: 100%; height: 100%; pointer-events: none; background: transparent; contain: strict; }
    `;
    (document.head ?? document.documentElement).appendChild(style);
  }
}

let currentHost: HTMLElement | null = null;
let canvas: HTMLCanvasElement | null = null;
let engine: OceanEngine | null = null;
let activeSharkKey: string | null = null;
let currentConfig: SharkConfig | null = null;
let observer: MutationObserver | null = null;
let interval = 0;
let scheduled = 0;
let originallyHadHostClass = false;

function unmountCanvas() {
  engine?.destroy(); engine = null; activeSharkKey = null;
  canvas?.remove(); canvas = null;
  for (const [child, saved] of childStyleRestores) {
    if (child.style.getPropertyValue("position") === "relative" && !child.style.getPropertyPriority("position")) {
      child.style.removeProperty("position");
      if (saved.position) child.style.setProperty("position", saved.position, saved.positionPriority);
    }
    if (child.style.getPropertyValue("z-index") === "1" && !child.style.getPropertyPriority("z-index")) {
      child.style.removeProperty("z-index");
      if (saved.zIndex) child.style.setProperty("z-index", saved.zIndex, saved.zIndexPriority);
    }
  }
  childStyleRestores.clear();
  if (currentHost && !originallyHadHostClass) currentHost.classList.remove(HOST_CLASS);
  currentHost = null; originallyHadHostClass = false;
}

function mount(config: SharkConfig): boolean {
  const host = findConversationHost();
  if (!host || !host.isConnected) { unmountCanvas(); return false; }
  if (host !== currentHost) {
    unmountCanvas(); currentHost = host;
    originallyHadHostClass = host.classList.contains(HOST_CLASS);
    host.classList.add(HOST_CLASS);
  }
  host.classList.add(HOST_CLASS);
  for (const child of [...host.children]) {
    if (!(child instanceof HTMLElement) || child === canvas || childStyleRestores.has(child)) continue;
    childStyleRestores.set(child, {
      position: child.style.getPropertyValue("position"), positionPriority: child.style.getPropertyPriority("position"),
      zIndex: child.style.getPropertyValue("z-index"), zIndexPriority: child.style.getPropertyPriority("z-index"),
    });
    if (getComputedStyle(child).position === "static") child.style.setProperty("position", "relative");
    child.style.setProperty("z-index", "1");
  }
  if (!canvas) {
    installStyle();
    canvas = document.createElement("canvas");
    canvas.id = CANVAS_ID; canvas.setAttribute("aria-hidden", "true"); canvas.tabIndex = -1;
    host.prepend(canvas); canvas.style.opacity = String(config.opacity);
  }
  const nextKey = `${config.count}|${config.kind}|${config.speed}|${config.color}`;
  if (!engine || nextKey !== activeSharkKey) {
    engine?.destroy();
    engine = new OceanEngine(canvas, createSharkSpecs(config.count, config.kind), {
      interactive: false, speed: config.speed, color: config.color, paused: config.paused,
    });
    activeSharkKey = nextKey;
  } else engine.setPaused(config.paused);
  canvas.style.opacity = String(config.opacity);
  currentConfig = config;
  return true;
}

function remove() {
  observer?.disconnect(); observer = null;
  if (interval) window.clearInterval(interval);
  interval = 0;
  if (scheduled) window.clearTimeout(scheduled);
  scheduled = 0;
  unmountCanvas(); document.getElementById(STYLE_ID)?.remove();
  currentConfig = null;
  delete window.__ASCII_SHARK_BACKGROUND_CONTROL__;
  delete window.__ASCII_SHARK_BACKGROUND_CONFIG__;
  delete window.__ASCII_SHARK_BACKGROUND_REMOVE__;
}

function configure(config: SharkConfig) {
  if (!config.enabled) { unmountCanvas(); currentConfig = config; return { mounted: false, reason: "disabled" }; }
  if (!document.documentElement) return { mounted: false, reason: "document-not-ready" };
  currentConfig = config;
  const mounted = mount(config);
  ensureObserver();
  const reason = isSupportedConversationMode() ? "conversation-content-not-found" : "conversation-mode-not-confirmed";
  return { mounted, reason: mounted ? undefined : reason };
}

function ensureObserver() {
  if (observer || !document.documentElement) return;
  observer = new MutationObserver(() => {
    if (scheduled) window.clearTimeout(scheduled);
    scheduled = window.setTimeout(() => { scheduled = 0; if (currentConfig?.enabled) mount(currentConfig); }, 120);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-testid"] });
  interval = window.setInterval(() => { if (currentConfig?.enabled) mount(currentConfig); }, 2000);
}

window.__ASCII_SHARK_BACKGROUND_CONTROL__ = { configure, remove };
window.__ASCII_SHARK_BACKGROUND_CONFIG__ = configure;
window.__ASCII_SHARK_BACKGROUND_REMOVE__ = remove;
