import { SHARK_KINDS, type SharkSelection } from "./animation/shark-selection.js";

export type SharkConfig = {
  enabled: boolean;
  paused: boolean;
  animation: "shark" | "hands" | "cat" | "capybara" | "heart";
  count: number;
  opacity: number;
  speed: number;
  color: string;
  kind: SharkSelection;
  handsOpacity: number;
  handsSpeed: number;
  handsColor: string;
  handsSize: number;
  handsGlyphSize: number;
  sceneOpacity: number;
  sceneSpeed: number;
  catColor: string;
  catSize: number;
  capybaraColor: string;
  capybaraSize: number;
  heartColor: string;
  heartSize: number;
  port: number;
  pollIntervalMs: number;
};

export const DEFAULT_CONFIG: SharkConfig = {
  enabled: true,
  paused: false,
  animation: "shark",
  count: 3,
  opacity: 0.32,
  speed: 0.55,
  color: "#718a99",
  kind: "mixed",
  handsOpacity: 0.28,
  handsSpeed: 1,
  handsColor: "#687b72",
  handsSize: 1,
  handsGlyphSize: 1.2,
  sceneOpacity: 0.58,
  sceneSpeed: 1,
  catColor: "#8ca99a",
  catSize: 1,
  capybaraColor: "#a79c91",
  capybaraSize: 1,
  heartColor: "#b97988",
  heartSize: 0.8,
  port: 9335,
  pollIntervalMs: 1200,
};

export function validateConfig(input: unknown): SharkConfig {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Config must be a JSON object");
  }
  const value = input as Record<string, unknown>;
  const config: SharkConfig = {
    enabled: (value.enabled ?? DEFAULT_CONFIG.enabled) as boolean,
    paused: (value.paused ?? DEFAULT_CONFIG.paused) as boolean,
    animation: (value.animation ?? DEFAULT_CONFIG.animation) as SharkConfig["animation"],
    count: (value.count ?? DEFAULT_CONFIG.count) as number,
    opacity: (value.opacity ?? DEFAULT_CONFIG.opacity) as number,
    speed: (value.speed ?? DEFAULT_CONFIG.speed) as number,
    color: (value.color ?? DEFAULT_CONFIG.color) as string,
    kind: (value.kind ?? DEFAULT_CONFIG.kind) as SharkSelection,
    handsOpacity: (value.handsOpacity ?? DEFAULT_CONFIG.handsOpacity) as number,
    handsSpeed: (value.handsSpeed ?? DEFAULT_CONFIG.handsSpeed) as number,
    handsColor: (value.handsColor ?? DEFAULT_CONFIG.handsColor) as string,
    handsSize: (value.handsSize ?? DEFAULT_CONFIG.handsSize) as number,
    handsGlyphSize: (value.handsGlyphSize ?? DEFAULT_CONFIG.handsGlyphSize) as number,
    sceneOpacity: (value.sceneOpacity ?? DEFAULT_CONFIG.sceneOpacity) as number,
    sceneSpeed: (value.sceneSpeed ?? DEFAULT_CONFIG.sceneSpeed) as number,
    catColor: (value.catColor ?? DEFAULT_CONFIG.catColor) as string,
    catSize: (value.catSize ?? DEFAULT_CONFIG.catSize) as number,
    capybaraColor: (value.capybaraColor ?? DEFAULT_CONFIG.capybaraColor) as string,
    capybaraSize: (value.capybaraSize ?? DEFAULT_CONFIG.capybaraSize) as number,
    heartColor: (value.heartColor ?? DEFAULT_CONFIG.heartColor) as string,
    heartSize: (value.heartSize ?? DEFAULT_CONFIG.heartSize) as number,
    port: (value.port ?? DEFAULT_CONFIG.port) as number,
    pollIntervalMs: (value.pollIntervalMs ?? DEFAULT_CONFIG.pollIntervalMs) as number,
  };
  if (typeof config.enabled !== "boolean" || typeof config.paused !== "boolean") {
    throw new Error("enabled and paused must be booleans");
  }
  if (!["shark", "hands", "cat", "capybara", "heart"].includes(config.animation)) throw new Error("unsupported animation");
  if (!Number.isInteger(config.count) || config.count < 1 || config.count > 12) {
    throw new Error("count must be an integer from 1 to 12");
  }
  if (!Number.isFinite(config.opacity) || config.opacity < 0 || config.opacity > 1) {
    throw new Error("opacity must be between 0 and 1");
  }
  if (!Number.isFinite(config.speed) || config.speed < 0.1 || config.speed > 2) {
    throw new Error("speed must be between 0.1 and 2");
  }
  if (!/^#[\da-f]{6}$/i.test(config.color)) {
    throw new Error("color must be a six-digit hex color");
  }
  if (config.kind !== "mixed" && !SHARK_KINDS.includes(config.kind)) {
    throw new Error("kind must be mixed or a supported shark species");
  }
  if (!Number.isFinite(config.handsOpacity) || config.handsOpacity < 0 || config.handsOpacity > 1) throw new Error("handsOpacity must be between 0 and 1");
  if (!Number.isFinite(config.handsSpeed) || config.handsSpeed < 0.5 || config.handsSpeed > 1.6) throw new Error("handsSpeed must be between 0.5 and 1.6");
  if (!/^#[\da-f]{6}$/i.test(config.handsColor)) throw new Error("handsColor must be a six-digit hex color");
  if (!Number.isFinite(config.handsSize) || config.handsSize < 0.7 || config.handsSize > 1.2) throw new Error("handsSize must be between 0.7 and 1.2");
  if (!Number.isFinite(config.handsGlyphSize) || config.handsGlyphSize < 0.9 || config.handsGlyphSize > 1.4) throw new Error("handsGlyphSize must be between 0.9 and 1.4");
  if (!Number.isFinite(config.sceneOpacity) || config.sceneOpacity < 0.1 || config.sceneOpacity > 0.9) throw new Error("sceneOpacity must be between 0.1 and 0.9");
  if (!Number.isFinite(config.sceneSpeed) || config.sceneSpeed < 0.5 || config.sceneSpeed > 1.6) throw new Error("sceneSpeed must be between 0.5 and 1.6");
  const sceneColorFields = ["catColor", "capybaraColor", "heartColor"] as const;
  for (const field of sceneColorFields) {
    if (!/^#[\da-f]{6}$/i.test(config[field])) throw new Error(`${field} must be a six-digit hex color`);
  }
  const sceneSizeFields = ["catSize", "capybaraSize", "heartSize"] as const;
  for (const field of sceneSizeFields) {
    if (!Number.isFinite(config[field]) || config[field] < 0.4 || config[field] > 1.4) throw new Error(`${field} must be between 0.4 and 1.4`);
  }
  if (!Number.isInteger(config.port) || config.port < 1024 || config.port > 65535) {
    throw new Error("port must be an integer from 1024 to 65535");
  }
  if (!Number.isInteger(config.pollIntervalMs) || config.pollIntervalMs < 500 || config.pollIntervalMs > 10000) {
    throw new Error("pollIntervalMs must be between 500 and 10000");
  }
  return config;
}
