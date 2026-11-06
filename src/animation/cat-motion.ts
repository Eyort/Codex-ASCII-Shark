import { CAT_ART } from "./cat-art.js";

export type CatGlyph = {
  char: string;
  x: number;
  y: number;
  alpha: number;
  part: "body" | "head" | "ear" | "eye" | "tail";
};

export type CatPose = {
  time: number;
  headTilt: number;
  headShift: number;
  earLeft: number;
  earRight: number;
  whiskerSway: number;
  tailPhase: number;
  blink: number;
  breath: number;
  gaze: number;
};

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const smooth = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const bump = (time: number, at: number, width: number) => {
  const distance = Math.abs(time - at);
  return distance >= width ? 0 : (1 + Math.cos(Math.PI * distance / width)) * 0.5;
};

const BLINKS = [1.4, 4.6, 4.94, 8.0];
export function blinkAmountAt(time: number): number {
  const cycle = ((time % 9.4) + 9.4) % 9.4;
  let amount = 0;
  for (const start of BLINKS) {
    const age = cycle - start;
    if (age >= 0 && age < 0.25) {
      amount = Math.max(amount, smooth(0, 0.09, age) * (1 - smooth(0.13, 0.25, age)));
    }
  }
  return amount;
}

export function catPoseAt(time: number, headPhase: number, tailPhase: number): CatPose {
  const headTime = headPhase;
  const cycle = ((headTime % 10.6) + 10.6) % 10.6;
  const curiousTilt = bump(cycle, 3.1, 1.15) * 0.12 - bump(cycle, 7.35, 0.95) * 0.09;
  return {
    time,
    headTilt: Math.sin(headTime * 1.15) * 0.035 + curiousTilt,
    headShift: Math.sin(headTime * 0.88 - 0.8) * 1.15,
    earLeft: Math.sin(headTime * 2.7 + 0.4) * 0.11 + bump(cycle, 3.0, 0.32) * 0.18,
    earRight: Math.sin(headTime * 3.1 + 1.6) * 0.10 - bump(cycle, 7.1, 0.3) * 0.20,
    whiskerSway: Math.sin(headTime * 1.15 - 0.45) * 0.65,
    tailPhase: tailPhase * 1.65,
    blink: blinkAmountAt(time),
    breath: Math.sin(time * 2.1),
    gaze: Math.sin(time * 0.92 + 0.5) * 0.48,
  };
}

const EYES = [{ x: 38.5, y: 21.5, rx: 7.5, ry: 4.3 }, { x: 62.5, y: 21.5, rx: 7.5, ry: 4.3 }] as const;
function eyeCoverAt(x: number, y: number, pose: CatPose): { inside: boolean; cover: number } {
  for (const eye of EYES) {
    const nx = (x - eye.x) / eye.rx;
    if (Math.abs(nx) >= 1) continue;
    const halfHeight = eye.ry * Math.sqrt(1 - nx * nx);
    const distance = Math.abs(y - eye.y);
    if (distance > halfHeight) continue;
    const openHalfHeight = halfHeight * (1 - pose.blink);
    return { inside: true, cover: pose.blink * smooth(openHalfHeight - 0.75, openHalfHeight + 0.1, distance) };
  }
  return { inside: false, cover: 0 };
}

function transform(x: number, y: number, pose: CatPose): { x: number; y: number } {
  const headWeight = 1 - smooth(30, 43, y);
  const pivotX = 49;
  const pivotY = 35;
  const angle = pose.headTilt * headWeight;
  const dx = x - pivotX;
  const dy = y - pivotY;
  let tx = pivotX + Math.cos(angle) * dx - Math.sin(angle) * dy + pose.headShift * headWeight;
  let ty = pivotY + Math.sin(angle) * dx + Math.cos(angle) * dy;
  for (const ear of [
    { pivotX: 36, pivotY: 16, angle: pose.earLeft, minX: 21, maxX: 49 },
    { pivotX: 68, pivotY: 16, angle: pose.earRight, minX: 52, maxX: 81 },
  ]) {
    if (x < ear.minX || x > ear.maxX || y > 17) continue;
    const weight = 1 - smooth(7, 17, y);
    const ex = x - ear.pivotX;
    const ey = y - ear.pivotY;
    const rotatedX = Math.cos(ear.angle) * ex - Math.sin(ear.angle) * ey;
    const rotatedY = Math.sin(ear.angle) * ex + Math.cos(ear.angle) * ey;
    tx += (rotatedX - ex) * weight;
    ty += (rotatedY - ey) * weight;
  }
  const whiskerWeight = smooth(25, 28, y) * (1 - smooth(32, 35, y)) * smooth(12, 24, Math.abs(x - 49));
  tx += Math.sign(x - 49) * pose.whiskerSway * whiskerWeight;
  const chestWeight = smooth(34, 38, y) * (1 - smooth(43, 46, y));
  tx += (x - pivotX) * pose.breath * 0.008 * chestWeight;
  ty -= pose.breath * 0.12 * chestWeight;
  return { x: tx, y: ty };
}

function glyph(char: string, x: number, y: number, part: CatGlyph["part"], pose: CatPose, alpha = 1): CatGlyph {
  return { char, ...transform(x, y, pose), alpha, part };
}

function eyelids(pose: CatPose): CatGlyph[] {
  const result: CatGlyph[] = [];
  for (const eye of EYES) {
    for (let y = 17; y <= 26; y++) {
      for (let x = Math.floor(eye.x - eye.rx); x <= Math.ceil(eye.x + eye.rx); x++) {
        const { cover } = eyeCoverAt(x, y, pose);
        if (cover <= 0.02) continue;
        const fur = "#%+=*"[(x * 3 + y * 7) % 5]!;
        result.push(glyph(fur, x, y, "eye", pose, cover));
      }
    }
    if (pose.blink > 0.65) {
      for (let x = -5; x <= 5; x++) {
        result.push(glyph(x === -5 || x === 5 ? "~" : "_", eye.x + x, eye.y + 0.15 + Math.abs(x) * 0.05, "eye", pose, smooth(0.65, 1, pose.blink)));
      }
    }
    if (pose.blink < 0.98) result.push(glyph("@", eye.x + pose.gaze, eye.y + 0.5, "eye", pose, 0.58 * (1 - pose.blink)));
  }
  return result;
}

type Point = { x: number; y: number };
function cubic([a, b, c, d]: readonly Point[], t: number): Point {
  const s = 1 - t;
  return {
    x: s * s * s * a!.x + 3 * s * s * t * b!.x + 3 * s * t * t * c!.x + t * t * t * d!.x,
    y: s * s * s * a!.y + 3 * s * s * t * b!.y + 3 * s * t * t * c!.y + t * t * t * d!.y,
  };
}

export function tailGlyphsAt(pose: CatPose): CatGlyph[] {
  const tail: CatGlyph[] = [];
  const sections: readonly (readonly Point[])[] = [
    [{ x: 80, y: 47.8 }, { x: 83, y: 44.5 }, { x: 80, y: 39.8 }, { x: 84, y: 37 }],
    [{ x: 84, y: 37 }, { x: 89, y: 32.6 }, { x: 96, y: 32 }, { x: 98, y: 34 }],
  ];
  const centerline: Point[] = [];
  for (const [sectionIndex, section] of sections.entries()) {
    for (let i = 0; i < 29; i++) {
      const t = i / 28;
      const point = cubic(section, t);
      const progress = (sectionIndex + t) / sections.length;
      const sway = Math.sin(pose.tailPhase * 0.9 - progress * 2.2) * progress ** 1.6 * 3.4;
      const lift = Math.sin(pose.tailPhase * 0.7 - progress * 1.8) * progress * 0.8;
      centerline.push({ x: point.x + sway, y: point.y + lift });
    }
  }
  for (let y = 30; y <= 48; y++) {
    for (let x = 76; x <= 103; x++) {
      let nearest = Number.POSITIVE_INFINITY;
      for (let i = 0; i < centerline.length; i++) {
        const point = centerline[i]!;
        const progress = i / (centerline.length - 1);
        const rx = 4.1 - progress * 2.0;
        const ry = 2.1 - progress * 0.9;
        const distance = ((x - point.x) / rx) ** 2 + ((y - point.y) / ry) ** 2;
        nearest = Math.min(nearest, distance);
      }
      if (nearest > 1) continue;
      const sourceY = 34 + (x + 2 * y) % 14;
      const sourceX = 33 + (3 * x + y) % 27;
      const sampled = CAT_ART[sourceY]?.[sourceX] ?? "+";
      const char = sampled === " " ? "=" : sampled;
      tail.push({ char, x, y, alpha: nearest > 0.68 ? 0.85 : 1, part: "tail" });
    }
  }
  return tail;
}

export function catGlyphsAt(pose: CatPose): CatGlyph[] {
  const result: CatGlyph[] = [];
  for (let y = 0; y < CAT_ART.length; y++) {
    const line = CAT_ART[y]!;
    for (let x = 0; x < line.length; x++) {
      const char = line[x]!;
      if (char === " ") continue;
      const eye = eyeCoverAt(x, y, pose);
      const part: CatGlyph["part"] = eye.inside ? "eye" : y >= 34 ? "body" : y <= 14 && ((x >= 22 && x <= 48) || (x >= 53 && x <= 80)) ? "ear" : "head";
      const alpha = 1 - eye.cover;
      if (alpha > 0.01) result.push(glyph(char, x, y, part, pose, alpha));
    }
  }
  result.push(...eyelids(pose), ...tailGlyphsAt(pose));
  return result;
}
