type Rect = { left: number; top: number; width: number; height: number };
export type PanePlacement = { left: number; top: number; width: number; height: number };

/** Covers the conversation pane including its header, excluding any right workspace pane. */
export function computePanePlacement(host: Rect, pane: Rect): PanePlacement | null {
  const left = Math.max(0, pane.left - host.left);
  const width = Math.min(pane.width, host.width - left);
  if (width < 180 || host.height < 200) return null;
  return { left, top: 0, width, height: host.height };
}
