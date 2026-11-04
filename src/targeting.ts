export type CdpTarget = {
  id: string;
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
};

const LOOPBACKS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export function isAllowedCdpTarget(target: CdpTarget, port: number): boolean {
  if (target.type !== "page" || !target.url.startsWith("app://") || !target.id) return false;
  try {
    const url = new URL(target.webSocketDebuggerUrl);
    return url.protocol === "ws:" && LOOPBACKS.has(url.hostname) && Number(url.port) === port &&
      !url.username && !url.password && !url.search && !url.hash &&
      new RegExp(`^/devtools/page/${escapeRegExp(target.id)}$`).test(url.pathname);
  } catch {
    return false;
  }
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
