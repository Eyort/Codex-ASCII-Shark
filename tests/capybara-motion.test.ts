import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CAPYBARA_ART, CAPYBARA_COLORS } from "../src/animation/capybara-art.js";
import { bubbleAnchorAt, bubbleGapAt, capybaraGlyphsAt, capybaraHeadPoint, capybaraPoseAt } from "../src/animation/capybara-motion.js";

test("source is a real 95 by 44 ASCII grid with color tags for orange, leaf and bubble", () => {
  assert.equal(CAPYBARA_ART.length, 44);
  assert.ok(CAPYBARA_ART.every((row) => row.length === 95 && /^[\x20-\x7e]+$/.test(row)));
  assert.ok(CAPYBARA_COLORS.every((row) => row.length === 95));
  const tags = CAPYBARA_COLORS.join("");
  for (const tag of ["O", "G", "B"]) assert.ok(tags.includes(tag));
});

test("the head slowly dips, then recovers quickly with its orange and nose", () => {
  const start = capybaraPoseAt(1.05);
  const middle = capybaraPoseAt(2.7);
  const low = capybaraPoseAt(4.4);
  const awake = capybaraPoseAt(4.95);
  assert.ok(start.nod < middle.nod && middle.nod < low.nod);
  assert.ok(awake.nod < 0.05);
  const orange = capybaraHeadPoint(56, 5, low);
  const nose = bubbleAnchorAt(low);
  assert.ok(orange.y > capybaraHeadPoint(56, 5, start).y);
  assert.ok(nose.y > bubbleAnchorAt(start).y);
});

test("breathing changes bubble size continuously while its anchor follows the nostril and feet stay planted", () => {
  const small = capybaraPoseAt(0.19);
  const mid = capybaraPoseAt(1.3);
  const large = capybaraPoseAt(2.6);
  assert.ok(small.bubble < mid.bubble && mid.bubble < large.bubble);
  const bubble = capybaraGlyphsAt(mid).filter((glyph) => glyph.color === "bubble");
  const anchor = bubbleAnchorAt(mid);
  assert.ok(bubble.some((glyph) => Math.abs(glyph.x - anchor.x) < 0.5 && Math.abs(glyph.y - anchor.y) < 0.5));
  assert.ok(bubbleGapAt(large) > bubbleGapAt(small) + 1.5);
  const footA = capybaraGlyphsAt(small).find((glyph) => glyph.y === 42 && glyph.x < 30);
  const footB = capybaraGlyphsAt(large).find((glyph) => glyph.y === 42 && glyph.x < 30);
  assert.deepEqual(footA, footB);
  const engine = readFileSync(new URL("../src/animation/capybara-engine.ts", import.meta.url), "utf8");
  assert.ok(!/drawImage\s*\(|new Image\s*\(/.test(engine));
});
