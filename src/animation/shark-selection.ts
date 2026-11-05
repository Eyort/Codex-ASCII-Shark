export const SHARK_KINDS = [
  "classic", "hammerhead", "greathammer", "zebra", "tiger", "mako", "thresher", "nurse",
] as const;

export type SharkKind = typeof SHARK_KINDS[number];
export type SharkSelection = "mixed" | SharkKind;
export type SharkSpec = { kind: SharkKind; size: number };

const SIZES = [1, 0.78, 0.62, 0.88, 0.7, 0.55, 0.82, 0.66, 0.92, 0.6, 0.74, 0.5];

function randomIndex(random: () => number, length: number): number {
  const value = random();
  return Math.floor(Math.max(0, Math.min(0.9999999999999999, value)) * length);
}

export function createSharkSpecs(count: number, selection: SharkSelection, random: () => number = Math.random): SharkSpec[] {
  if (!Number.isInteger(count) || count < 1 || count > 12) throw new Error("count must be an integer from 1 to 12");
  const kinds: SharkKind[] = selection === "mixed" ? [...SHARK_KINDS] : [selection];
  if (selection === "mixed") {
    for (let i = kinds.length - 1; i > 0; i--) {
      const j = randomIndex(random, i + 1);
      [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
    }
    const offset = randomIndex(random, kinds.length);
    kinds.push(...kinds.splice(0, offset));
  } else if (!SHARK_KINDS.includes(selection)) {
    throw new Error("unsupported shark kind");
  }

  return Array.from({ length: count }, (_, index) => ({
    kind: kinds[index % kinds.length],
    size: SIZES[index],
  }));
}
