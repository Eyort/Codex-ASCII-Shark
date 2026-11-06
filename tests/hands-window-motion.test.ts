import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { HANDS_ART } from "../src/animation/hands-window-art.js";
import { characterSpacingAt, handPointAt, handsGlyphsAt, handsPoseAt, windowGlyphs } from "../src/animation/hands-window-motion.js";

test("the source is a real ASCII grid with two hands", () => {
  assert.equal(HANDS_ART.length, 30);
  assert.ok(HANDS_ART.every((row) => row.length === 160 && /^[\x20-\x7e]+$/.test(row)));
  assert.ok(HANDS_ART.some((row) => row.slice(0, 80).includes("@")));
  assert.ok(HANDS_ART.some((row) => row.slice(81).includes("@")));
});

test("the webpage window stays fixed throughout breathing", () => {
  assert.ok(windowGlyphs().some((glyph) => glyph.y === 5.55 && glyph.char === "="));
  assert.deepEqual(windowGlyphs(), handsGlyphsAt(handsPoseAt(0)).filter((glyph) => glyph.part === "window"));
  assert.deepEqual(windowGlyphs(), handsGlyphsAt(handsPoseAt(2.4)).filter((glyph) => glyph.part === "window"));
  assert.deepEqual(windowGlyphs(), handsGlyphsAt(handsPoseAt(5.1)).filter((glyph) => glyph.part === "window"));
});

test("larger characters get wider spacing and fewer samples within the same picture bounds", () => {
  const fine = characterSpacingAt(0.9);
  const large = characterSpacingAt(1.4);
  assert.ok(large.x > fine.x && large.y > fine.y);
  const pose = handsPoseAt(0.7);
  const fineGlyphs = handsGlyphsAt(pose, 0.9).filter((glyph) => glyph.part !== "window");
  const largeGlyphs = handsGlyphsAt(pose, 1.4).filter((glyph) => glyph.part !== "window");
  assert.ok(largeGlyphs.length < fineGlyphs.length);
  for (const glyph of largeGlyphs) assert.ok(glyph.x > -1 && glyph.x < 161 && glyph.y > -1 && glyph.y < 31);
  assert.ok(windowGlyphs(1.4).some((glyph) => glyph.x === 59 && glyph.y === 3));
  assert.ok(windowGlyphs(1.4).some((glyph) => glyph.x === 108 && glyph.y === 23));
});

test("forearms ease out from their roots and fingertips follow the wrist", () => {
  const poseA = handsPoseAt(0);
  const poseB = handsPoseAt(1.2);
  const shift = (x: number, y: number, side: "left" | "right") => Math.hypot(handPointAt(x, y, side, poseA).x - handPointAt(x, y, side, poseB).x, handPointAt(x, y, side, poseA).y - handPointAt(x, y, side, poseB).y);
  assert.ok(shift(65, 16, "left") > shift(5, 16, "left") + 0.3);
  assert.ok(shift(108, 22, "right") > shift(155, 18, "right") + 0.3);
  assert.ok(shift(76, 19, "left") > shift(58, 10, "left"));
  assert.ok(shift(104, 27, "right") > shift(125, 16, "right"));
  const engine = readFileSync(new URL("../src/animation/hands-window-engine.ts", import.meta.url), "utf8");
  assert.ok(!/drawImage\s*\(|new Image\s*\(/.test(engine));
});
