import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DEFAULT_CONFIG, validateConfig, type SharkConfig } from "./config-shared.js";

export { DEFAULT_CONFIG, validateConfig } from "./config-shared.js";
export type { SharkConfig } from "./config-shared.js";

export async function loadConfig(path = resolve(".codex-shark.config.json")): Promise<SharkConfig> {
  try {
    return validateConfig(JSON.parse(await readFile(path, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return DEFAULT_CONFIG;
    throw error;
  }
}

export function signature(config: SharkConfig): string {
  return JSON.stringify(config);
}
