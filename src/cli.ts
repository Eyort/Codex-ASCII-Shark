import { access, readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { CdpSession, getEndpoint, listPageTargets } from "./cdp.js";
import { loadConfig, signature, type SharkConfig } from "./config.js";

type SessionRecord = { session: CdpSession; scriptId?: string; documentToken?: number };
type PageHealth = { documentToken?: number; readyState?: string; hasControl?: boolean; hasBackground?: boolean; hasWorkSidebar?: boolean };
type State = { browserId: string; port: number; packageFullName: string; executablePath: string };

const statePath = resolve(".codex-shark-state.json");
const payloadPath = resolve("dist/injector/ascii-shark-inject.js");
const stopRequestPath = resolve(".codex-shark.stop");
const sessions = new Map<string, SessionRecord>();

async function consumeStopRequest() {
  try {
    await access(stopRequestPath);
    await unlink(stopRequestPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function readState(): Promise<State> {
  let state: State;
  try { state = JSON.parse(await readFile(statePath, "utf8")) as State; }
  catch { throw new Error("CDP state is missing; run npm run cdp:start first."); }
  if (!state.browserId || !Number.isInteger(state.port) || !state.executablePath || !state.packageFullName) {
    throw new Error("CDP state is incomplete; run npm run cdp:start again.");
  }
  const endpoint = await getEndpoint(state.port);
  if (endpoint.browserId !== state.browserId) {
    throw new Error("The CDP browser identity changed; close Codex and run npm run cdp:start again.");
  }
  return state;
}

function bootstrap(payload: string, config: SharkConfig): string {
  return `window.__ASCII_SHARK_BACKGROUND_REMOVE__?.();\n${payload}\n;window.__ASCII_SHARK_BACKGROUND_CONFIG__?.(${JSON.stringify(config)});`;
}

async function removeFromSession(record: SessionRecord) {
  if (record.scriptId) {
    await record.session.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: record.scriptId }).catch(() => undefined);
  }
  await record.session.evaluate("window.__ASCII_SHARK_BACKGROUND_REMOVE__?.()")
    .catch(() => undefined);
}

async function applyToSession(record: SessionRecord, payload: string, config: SharkConfig) {
  if (record.scriptId) {
    await record.session.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: record.scriptId }).catch(() => undefined);
  }
  const registered = await record.session.send<{ identifier?: string }>("Page.addScriptToEvaluateOnNewDocument", {
    source: bootstrap(payload, config),
  });
  record.scriptId = registered.identifier;
  return await record.session.evaluate(bootstrap(payload, config)) as { mounted?: boolean; reason?: string } | undefined;
}

async function closeSessions(remove: boolean) {
  for (const record of sessions.values()) {
    if (remove) await removeFromSession(record);
    record.session.close();
  }
  sessions.clear();
}

async function run(mode: "watch" | "remove") {
  const state = await readState();
  const payload = await readFile(payloadPath, "utf8");
  let config = await loadConfig();
  let previousSignature = signature(config);
  let interrupted = false;
  process.once("SIGINT", () => { interrupted = true; });
  process.once("SIGTERM", () => { interrupted = true; });

  if (mode === "remove") {
    const targets = await listPageTargets(state.port);
    for (const target of targets) {
      const session = await CdpSession.connect(target, state.port);
      await session.evaluate("window.__ASCII_SHARK_BACKGROUND_REMOVE__?.()").catch(() => undefined);
      session.close();
    }
    console.log(`Removed shark background from ${targets.length} app page target(s).`);
    return;
  }

  console.log(`Watching Codex Work pages through verified browser ${state.browserId} on 127.0.0.1:${state.port}.`);
  try {
    while (!interrupted) {
      try {
        if (await consumeStopRequest()) {
          console.log("Stop requested; removing the live background and exiting.");
          break;
        }
        const endpoint = await getEndpoint(state.port);
        if (endpoint.browserId !== state.browserId) throw new Error("The CDP browser identity changed; stopping.");
        config = await loadConfig();
        const nextSignature = signature(config);
        const changed = nextSignature !== previousSignature;
        const targets = await listPageTargets(state.port);
        const liveIds = new Set(targets.map((target) => target.id));

        for (const [id, record] of sessions) {
          if (!liveIds.has(id) || !record.session.isOpen) {
            record.session.close();
            sessions.delete(id);
          }
        }

        for (const target of targets) {
          let record = sessions.get(target.id);
          if (!record) {
            const session = await CdpSession.connect(target, state.port);
            const newRecord: SessionRecord = { session };
            sessions.set(target.id, newRecord);
            await session.send("Runtime.enable");
            await session.send("Page.enable");
            newRecord.documentToken = await session.evaluate("performance.timeOrigin") as number | undefined;
            const result = await applyToSession(newRecord, payload, config);
            console.log(`[shark-bg] ${target.id}: ${result?.mounted ? "Work background mounted" : result?.reason ?? "waiting for Work content"}`);
          } else {
            const health = await record.session.evaluate(`({ documentToken: performance.timeOrigin, readyState: document.readyState,
              hasControl: typeof window.__ASCII_SHARK_BACKGROUND_CONFIG__ === "function",
              hasBackground: Boolean(document.getElementById("ascii-shark-background-canvas") || document.querySelector(".ascii-grass-wave")),
              hasWorkSidebar: Boolean(document.querySelector("aside.app-shell-left-panel")) })`) as PageHealth | undefined;
            const navigated = typeof health?.documentToken === "number" && health.documentToken !== record.documentToken;
            if (navigated || (changed && health?.readyState === "complete") || (!health?.hasControl && health?.readyState === "complete")) {
              const result = await applyToSession(record, payload, config);
              record.documentToken = health?.documentToken;
              console.log(`[shark-bg] ${target.id}: ${result?.mounted ? "Work background restored" : result?.reason ?? "waiting for Work content"}`);
            } else if (!changed && health?.hasWorkSidebar && !health.hasBackground && health.hasControl) {
              const result = await record.session.evaluate(`window.__ASCII_SHARK_BACKGROUND_CONFIG__?.(${JSON.stringify(config)})`) as { mounted?: boolean; reason?: string } | undefined;
              if (result?.mounted) console.log(`[shark-bg] ${target.id}: Work background mounted after page layout became ready`);
            } else if (changed) {
              const result = await applyToSession(record, payload, config);
              record.documentToken = health?.documentToken;
              if (result?.mounted) console.log(`[shark-bg] ${target.id}: configuration applied`);
            }
          }
        }
        previousSignature = nextSignature;
      } catch (error) {
        console.error(`[shark-bg] ${error instanceof Error ? error.message : String(error)}`);
        if (/identity changed|CDP browser identity|fetch failed|ECONNREFUSED|ECONNRESET/.test(String(error))) break;
      }
      await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
    }
  } finally {
    await closeSessions(true);
    console.log("Shark background removed from connected pages; the Codex app can remain open.");
  }
}

const mode = process.argv[2];
if (mode !== "watch" && mode !== "remove") {
  console.error("Usage: npm run inject | npm run remove");
  process.exitCode = 2;
} else {
  run(mode).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
