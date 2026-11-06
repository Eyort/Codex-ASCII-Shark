import { HANDS_ART } from "./hands-window-art.js";

export type HandsGlyph = { char: string; x: number; y: number; part: "left" | "right" | "window"; alpha: number };
export type HandsPose = { breath: number; leftWrist: number; rightWrist: number; leftFingers: number; rightFingers: number };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

export function handsPoseAt(time: number): HandsPose {
  const breath = Math.sin(time * Math.PI * 2 / 4.8);
  return {
    breath,
    leftWrist: Math.sin(time * Math.PI * 2 / 4.8 - 0.18),
    rightWrist: Math.sin(time * Math.PI * 2 / 4.8 + 0.11),
    leftFingers: Math.sin(time * Math.PI * 2 / 4.8 - 0.47) + Math.sin(time * Math.PI * 2 / 8.7) * 0.24,
    rightFingers: Math.sin(time * Math.PI * 2 / 4.8 + 0.34) + Math.sin(time * Math.PI * 2 / 9.6) * 0.21,
  };
}

export function handPointAt(x: number, y: number, side: "left" | "right", pose: HandsPose): { x: number; y: number } {
  if (side === "left") {
    // Shoulder/forearm enters from the left. Motion grows toward the wrist.
    const arm = ease((x + 3) / 57);
    const wrist = ease((x - 40) / 20);
    const finger = ease((x - 60) / 19) * ease((y - 10) / 8);
    const dy = pose.breath * 0.42 * arm + pose.leftWrist * 0.35 * wrist + pose.leftFingers * 0.40 * finger;
    const dx = pose.leftWrist * 0.18 * wrist - pose.leftFingers * 0.36 * finger;
    return { x: x + dx, y: y + dy };
  }
  const arm = ease((163 - x) / 56);
  const wrist = ease((130 - x) / 22);
  const finger = ease((121 - x) / 22) * ease((y - 15) / 11);
  const dy = pose.breath * 0.40 * arm + pose.rightWrist * 0.31 * wrist + pose.rightFingers * 0.43 * finger;
  const dx = -pose.rightWrist * 0.16 * wrist + pose.rightFingers * 0.34 * finger;
  return { x: x + dx, y: y + dy };
}

export function characterSpacingAt(glyphSize: number) {
  return { x: 1.38 * glyphSize, y: 1.25 * glyphSize };
}

export function windowGlyphs(glyphSize = 1.2): HandsGlyph[] {
  const result: HandsGlyph[] = [];
  const spacing = characterSpacingAt(glyphSize);
  for (const y of [3, 23]) {
    result.push({ char: "+", x: 59, y, part: "window", alpha: 0.93 });
    for (let x = 59 + spacing.x; x < 108 - spacing.x * 0.5; x += spacing.x) result.push({ char: "=", x, y, part: "window", alpha: 0.93 });
    result.push({ char: "+", x: 108, y, part: "window", alpha: 0.93 });
  }
  for (let y = 3 + spacing.y; y < 23 - spacing.y * 0.5; y += spacing.y) {
    result.push({ char: "|", x: 59, y, part: "window", alpha: 0.93 });
    result.push({ char: "|", x: 108, y, part: "window", alpha: 0.93 });
  }
  for (let x = 59 + spacing.x; x < 108 - spacing.x * 0.5; x += spacing.x) result.push({ char: "=", x, y: 5.55, part: "window", alpha: 0.93 });
  for (const [label, start] of [["PROJECT.EXE", 61], ["[_][=][X]", 107 - 9 * spacing.x]] as const) {
    for (let i = 0; i < label.length; i++) result.push({ char: label[i]!, x: start + i * spacing.x, y: 4.2, part: "window", alpha: 0.93 });
  }
  return result;
}

export function handsGlyphsAt(pose: HandsPose, glyphSize = 1.2): HandsGlyph[] {
  const result: HandsGlyph[] = [];
  const spacing = characterSpacingAt(glyphSize);
  const shades = " .:+*#%@";
  for (let top = 0; top < HANDS_ART.length; top += spacing.y) {
    for (let left = 0; left < HANDS_ART[0]!.length; left += spacing.x) {
      let total = 0;
      let count = 0;
      for (let y = Math.floor(top); y < Math.min(HANDS_ART.length, Math.ceil(top + spacing.y)); y++) {
        for (let x = Math.floor(left); x < Math.min(HANDS_ART[0]!.length, Math.ceil(left + spacing.x)); x++) {
          total += Math.max(0, shades.indexOf(HANDS_ART[y]![x]!));
          count++;
        }
      }
      const density = total / count;
      if (density < 0.5) continue;
      const char = shades[Math.max(1, Math.min(7, Math.round(density)))]!;
      const x = Math.min(159.5, left + spacing.x * 0.5);
      const y = Math.min(29.5, top + spacing.y * 0.5);
      const side = x < 81 ? "left" : "right";
      const point = handPointAt(x, y, side, pose);
      result.push({ char, ...point, part: side, alpha: char === "." ? 0.7 : char === ":" ? 0.82 : 0.97 });
    }
  }
  result.push(...windowGlyphs(glyphSize));
  return result;
}
