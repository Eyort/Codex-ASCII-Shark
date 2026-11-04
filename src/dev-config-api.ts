import { rename, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { loadConfig, validateConfig } from "./config.js";

const CONFIG_PATH = resolve(".codex-shark.config.json");
const TEMP_PATH = `${CONFIG_PATH}.tmp`;
const MAX_BODY_BYTES = 8 * 1024;

function sendJson(response: import("node:http").ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(value));
}

export function devConfigApi(): Plugin {
  return {
    name: "ascii-shark-local-config-api",
    configureServer(server) {
      server.middlewares.use("/__ascii-sharks/config", (request, response, next) => {
        const host = request.headers.host?.split(":")[0]?.toLowerCase();
        if (host !== "127.0.0.1" && host !== "localhost") {
          sendJson(response, 403, { error: "This settings endpoint is local only." });
          return;
        }
        const origin = request.headers.origin;
        if (origin && origin !== `http://${request.headers.host}`) {
          sendJson(response, 403, { error: "Settings can only be changed from this local page." });
          return;
        }

        if (request.method === "GET") {
          void loadConfig().then((config) => sendJson(response, 200, { config }))
            .catch(() => sendJson(response, 500, { error: "Could not read the local settings file." }));
          return;
        }
        if (request.method !== "PUT") {
          response.setHeader("Allow", "GET, PUT");
          sendJson(response, 405, { error: "Use GET or PUT for settings." });
          return;
        }

        const chunks: Buffer[] = [];
        let size = 0;
        let tooLarge = false;
        request.on("data", (chunk: Buffer | string) => {
          if (tooLarge) return;
          const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += bytes.length;
          if (size > MAX_BODY_BYTES) {
            tooLarge = true;
            sendJson(response, 413, { error: "Settings payload is too large." });
            return;
          }
          chunks.push(bytes);
        });
        request.on("end", () => {
          if (tooLarge) return;
          void (async () => {
            try {
              const config = validateConfig(JSON.parse(Buffer.concat(chunks).toString("utf8")));
              await writeFile(TEMP_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
              await rename(TEMP_PATH, CONFIG_PATH);
              sendJson(response, 200, { saved: true, config });
            } catch (error) {
              await unlink(TEMP_PATH).catch(() => undefined);
              sendJson(response, 400, { error: error instanceof Error ? error.message : "Invalid settings." });
            }
          })();
        });
        request.on("error", () => {
          if (!response.headersSent) sendJson(response, 400, { error: "Settings request was interrupted." });
        });
      });
    },
  };
}
