import { SHARK_KINDS, type SharkSelection } from "./animation/shark-selection.js";

export type SharkConfig = {
  enabled: boolean;
  paused: boolean;
  count: number;
  opacity: number;
  speed: number;
  color: string;
  kind: SharkSelection;
  port: number;
  pollIntervalMs: number;
};

export const DEFAULT_CONFIG: SharkConfig = {
  enabled: true,
  paused: false,
  count: 3,
  opacity: 0.32,
  speed: 0.55,
  color: "#718a99",
  kind: "mixed",
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
    count: (value.count ?? DEFAULT_CONFIG.count) as number,
    opacity: (value.opacity ?? DEFAULT_CONFIG.opacity) as number,
    speed: (value.speed ?? DEFAULT_CONFIG.speed) as number,
    color: (value.color ?? DEFAULT_CONFIG.color) as string,
    kind: (value.kind ?? DEFAULT_CONFIG.kind) as SharkSelection,
    port: (value.port ?? DEFAULT_CONFIG.port) as number,
    pollIntervalMs: (value.pollIntervalMs ?? DEFAULT_CONFIG.pollIntervalMs) as number,
  };
  if (typeof config.enabled !== "boolean" || typeof config.paused !== "boolean") {
    throw new Error("enabled and paused must be booleans");
  }
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
  if (!Number.isInteger(config.port) || config.port < 1024 || config.port > 65535) {
    throw new Error("port must be an integer from 1024 to 65535");
  }
  if (!Number.isInteger(config.pollIntervalMs) || config.pollIntervalMs < 500 || config.pollIntervalMs > 10000) {
    throw new Error("pollIntervalMs must be between 500 and 10000");
  }
  return config;
}
