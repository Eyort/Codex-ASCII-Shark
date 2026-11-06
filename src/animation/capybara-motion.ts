import { CAPYBARA_ART, CAPYBARA_COLORS } from "./capybara-art.js";

export type CapybaraGlyph = { char: string; x: number; y: number; color: "fur" | "orange" | "leaf" | "bubble"; alpha: number };
export type CapybaraPose = { nod: number; breath: number; bubble: number };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

export function capybaraPoseAt(time: number): CapybaraPose {
  const phase = ((time % 8.4) + 8.4) % 8.4;
  // A slow, uneven descent, a short suspended moment, then a startled recovery.
  const nod = phase < 4.25 ? ease((phase - 1.05) / 3.2) : phase < 4.52 ? 1 : phase < 4.93 ? 1 - ease((phase - 4.52) / 0.41) : -0.08 * (1 - ease((phase - 4.93) / 0.48));
  const breathingPhase = ((time % 3.8) + 3.8) % 3.8 / 3.8;
  const breath = breathingPhase < 0.61 ? ease(breathingPhase / 0.61) : 1 - ease((breathingPhase - 0.61) / 0.39);
  // The bubble trails the chest slightly, like air moving through the nostril.
  const bubblePhase = (((time - 0.19) % 3.8) + 3.8) % 3.8 / 3.8;
  const bubble = bubblePhase < 0.64 ? ease(bubblePhase / 0.64) : 1 - ease((bubblePhase - 0.64) / 0.36);
  return { nod, breath, bubble };
}

export function capybaraHeadPoint(x: number, y: number, pose: CapybaraPose): { x: number; y: number } {
  const weight = y < 21 ? 1 : 1 - ease((y - 21) / 9);
  const angle = pose.nod * 0.092 * weight;
  const dx = x - 49;
  const dy = y - 25;
  return { x: 49 + dx * Math.cos(angle) - dy * Math.sin(angle), y: 25 + dx * Math.sin(angle) + dy * Math.cos(angle) + pose.nod * 0.3 * weight };
}

export function bubbleAnchorAt(pose: CapybaraPose) { return capybaraHeadPoint(82.5, 13.4, pose); }
export function bubbleGapAt(pose: CapybaraPose) { return 0.9 + pose.bubble * 2.2; }

export function capybaraGlyphsAt(pose: CapybaraPose): CapybaraGlyph[] {
  const glyphs: CapybaraGlyph[] = [];
  for (let y = 0; y < CAPYBARA_ART.length; y++) {
    for (let x = 0; x < CAPYBARA_ART[y]!.length; x++) {
      const char = CAPYBARA_ART[y]![x]!;
      if (char === " ") continue;
      const tag = CAPYBARA_COLORS[y]![x];
      if (tag === "B") continue; // Rebuilt below so its size and point of attachment can change.
      const color = tag === "O" ? "orange" : tag === "G" ? "leaf" : "fur";
      const head = y < 26 && x > 28;
      const point = head ? capybaraHeadPoint(x, y, pose) : { x, y };
      const chest = y >= 20 && y <= 37 ? ease((y - 20) / 7) * (1 - ease((y - 33) / 5)) : 0;
      const chestX = x > 44 ? (x - 44) * 0.012 * pose.breath * chest : 0;
      glyphs.push({ char, x: point.x + chestX, y: point.y - pose.breath * 0.16 * chest, color, alpha: char === "." ? 0.79 : 1 });
    }
  }
  const anchor = bubbleAnchorAt(pose);
  const rx = 2.15 + pose.bubble * 3.05;
  const ry = 1.27 + pose.bubble * 1.47;
  const gap = bubbleGapAt(pose);
  const cx = anchor.x + gap + rx;
  const cy = anchor.y - 0.16 - pose.bubble * 0.24;
  // Individual character cells follow the expanding ellipse. The left edge stays at the nostril.
  for (let yi = -3; yi <= 3; yi++) {
    for (let xi = -6; xi <= 6; xi++) {
      const u = xi / rx, v = yi / ry;
      const d = u * u + v * v;
      if (d < 0.48 || d > 1.35) continue;
      const char = Math.abs(yi) > 1.4 ? (xi % 3 === 0 ? "+" : "=") : (xi % 3 === 0 ? ":" : ".");
      glyphs.push({ char, x: cx + xi, y: cy + yi, color: "bubble", alpha: Math.min(1, (1.35 - d) * 2.4) });
    }
  }
  glyphs.push({ char: ":", x: anchor.x + 0.35, y: anchor.y, color: "bubble", alpha: 0.88 });
  if (pose.bubble > 0.25) glyphs.push({ char: ".", x: anchor.x + gap * 0.48, y: anchor.y - 0.12, color: "bubble", alpha: 0.38 });
  return glyphs;
}
