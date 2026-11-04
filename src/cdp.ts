import type { CdpTarget } from "./targeting.js";
import { isAllowedCdpTarget } from "./targeting.js";

type CdpMessage = { id?: number; method?: string; params?: Record<string, unknown>; result?: unknown; error?: { message?: string } };

export async function getEndpoint(port: number) {
  const response = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(2500) });
  if (!response.ok) throw new Error(`CDP endpoint returned HTTP ${response.status}`);
  const info = await response.json() as { webSocketDebuggerUrl?: string };
  if (!info.webSocketDebuggerUrl) throw new Error("CDP response has no browser WebSocket URL");
  const ws = new URL(info.webSocketDebuggerUrl);
  if (ws.protocol !== "ws:" || !["127.0.0.1", "localhost", "[::1]", "::1"].includes(ws.hostname) || Number(ws.port) !== port) {
    throw new Error("Refusing a CDP endpoint outside the configured loopback port");
  }
  return { browserId: ws.pathname.match(/^\/devtools\/browser\/([\w.-]+)$/)?.[1] ?? "", port };
}

export async function listPageTargets(port: number): Promise<CdpTarget[]> {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(2500) });
  if (!response.ok) throw new Error(`CDP targets returned HTTP ${response.status}`);
  const targets = await response.json() as CdpTarget[];
  return targets.filter((target) => isAllowedCdpTarget(target, port));
}

export class CdpSession {
  private ws: WebSocket;
  private id = 0;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (reason: Error) => void; timer: NodeJS.Timeout }>();
  private closed = false;

  private constructor(private target: CdpTarget, port: number) {
    this.ws = new WebSocket(target.webSocketDebuggerUrl);
    this.ws.addEventListener("message", (event) => this.onMessage(String(event.data)));
    this.ws.addEventListener("close", () => this.failAll(new Error("CDP session closed")));
    this.ws.addEventListener("error", () => this.failAll(new Error("CDP WebSocket error")));
    this.port = port;
  }

  private port: number;

  static async connect(target: CdpTarget, port: number): Promise<CdpSession> {
    if (!isAllowedCdpTarget(target, port)) throw new Error("Refusing an untrusted page target");
    const session = new CdpSession(target, port);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("CDP WebSocket open timed out")), 5000);
      session.ws.addEventListener("open", () => { clearTimeout(timeout); resolve(); }, { once: true });
      session.ws.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("CDP WebSocket open failed")); }, { once: true });
    });
    return session;
  }

  private onMessage(raw: string) {
    let message: CdpMessage;
    try { message = JSON.parse(raw) as CdpMessage; } catch { return; }
    if (!message.id) return;
    const waiter = this.pending.get(message.id);
    if (!waiter) return;
    clearTimeout(waiter.timer);
    this.pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message ?? "CDP command failed"));
    else waiter.resolve(message.result);
  }

  send<T = any>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (this.closed || this.ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error("CDP socket is not open"));
    const id = ++this.id;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, 8000);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression: string) {
    const result = await this.send<{ result?: { value?: unknown }; exceptionDetails?: { text?: string } }>("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: false,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "Renderer evaluation failed");
    return result.result?.value;
  }

  close() {
    this.closed = true;
    try { this.ws.close(); } catch {}
    this.failAll(new Error("CDP session closed"));
  }

  private failAll(error: Error) {
    this.closed = true;
    for (const waiter of this.pending.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.pending.clear();
  }

  get idString() { return this.target.id; }
  get connectedPort() { return this.port; }
  get isOpen() { return !this.closed && this.ws.readyState === WebSocket.OPEN; }
}
