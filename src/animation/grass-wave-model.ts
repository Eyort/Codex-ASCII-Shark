export function getGrassStripCount(hostHeight: number, detail: number): number {
  if (!Number.isFinite(hostHeight) || hostHeight < 0 || !Number.isFinite(detail) || detail < 0.5 || detail > 1.5) throw new Error("invalid grass dimensions or detail");
  return Math.max(12, Math.min(24, Math.round(hostHeight / 40 * detail)));
}

export function getGrassDurationSeconds(speed: number): number {
  if (!Number.isFinite(speed) || speed < 0.1 || speed > 2) throw new Error("speed must be between 0.1 and 2");
  return Math.max(4, Math.min(80, 8 / speed));
}
