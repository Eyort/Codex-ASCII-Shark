import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAT_ART } from "../src/animation/cat-art.js";
import { blinkAmountAt, catGlyphsAt, catPoseAt, tailGlyphsAt } from "../src/animation/cat-motion.js";

test("cat source is a fixed ASCII character grid", () => {
  assert.equal(CAT_ART.length, 48);
  assert.ok(CAT_ART.every((line) => line.length === 96));
  assert.ok(CAT_ART.every((line) => /^[\x20-\x7e]*$/.test(line)));
});

test("blink closes and reopens rather than simply toggling", () => {
  assert.equal(blinkAmountAt(0), 0);
  const closing = blinkAmountAt(1.44);
  const closed = blinkAmountAt(1.51);
  const opening = blinkAmountAt(1.57);
  assert.ok(closing > 0 && closing < closed);
  assert.ok(closed > 0.9);
  assert.ok(opening < closed && opening > 0);
  assert.equal(blinkAmountAt(1.7), 0);
});

test("blink closes the full eye opening, including its white area and pupil", () => {
  const open = catGlyphsAt(catPoseAt(0, 1, 1)).filter((glyph) => glyph.part === "eye");
  const partial = catGlyphsAt(catPoseAt(1.44, 1, 1)).filter((glyph) => glyph.part === "eye");
  const closed = catGlyphsAt(catPoseAt(1.51, 1, 1)).filter((glyph) => glyph.part === "eye");
  assert.ok(closed.length > open.length + 40, "closed eyelids should fill the broad white openings");
  assert.ok(partial.length > open.length && partial.length < closed.length);
  assert.ok(closed.some((glyph) => glyph.x > 32 && glyph.x < 36 && glyph.y > 20 && glyph.y < 24), "the outer white eye edge is covered");
  assert.ok(closed.some((glyph) => glyph.x > 65 && glyph.x < 69 && glyph.y > 20 && glyph.y < 24), "the other white eye edge is covered");
  assert.ok(closed.every((glyph) => glyph.char !== "@" || glyph.alpha < 0.02), "pupils disappear behind the lids");
  assert.ok(closed.every((glyph) => Number.isFinite(glyph.x) && Number.isFinite(glyph.y)));
});

test("breathing moves the chest but keeps the bottom anchored", () => {
  const still = catGlyphsAt(catPoseAt(0, 0, 0)).filter((glyph) => glyph.part === "body");
  const breath = catGlyphsAt(catPoseAt(1, 0, 0)).filter((glyph) => glyph.part === "body");
  assert.ok(still.some((glyph, index) => glyph.y < 44 && Math.abs(glyph.x - breath[index]!.x) > 0.02));
  assert.ok(still.every((glyph, index) => glyph.y < 46 || Math.abs(glyph.x - breath[index]!.x) < 0.01));
});

test("ears can twitch independently while their roots stay on the head", () => {
  for (const time of [0, 2, 4, 7]) {
    const glyphs = catGlyphsAt(catPoseAt(time, 1, 1));
    const leftRoot = glyphs.filter((glyph) => glyph.part === "ear" && glyph.x < 45 && glyph.y > 11);
    const forehead = glyphs.filter((glyph) => glyph.part === "head" && glyph.x < 45 && glyph.y > 11 && glyph.y < 19);
    assert.ok(leftRoot.length && forehead.length);
    const near = (a: typeof glyphs[number], b: typeof glyphs[number]) => Math.hypot(a.x - b.x, a.y - b.y) < 3.5;
    assert.ok(leftRoot.some((a) => forehead.some((b) => near(a, b))));
  }
  const pose = catPoseAt(0, 0, 0);
  const leftA = catGlyphsAt({ ...pose, earLeft: -0.18 });
  const leftB = catGlyphsAt({ ...pose, earLeft: 0.18 });
  const tip = (glyphs: typeof leftA) => glyphs.filter((glyph) => glyph.part === "ear" && glyph.x < 45 && glyph.y < 5);
  assert.ok(tip(leftA).some((glyph, index) => Math.abs(glyph.x - tip(leftB)[index]!.x) > 1));
  const rightA = leftA.filter((glyph) => glyph.part === "ear" && glyph.x > 53);
  const rightB = leftB.filter((glyph) => glyph.part === "ear" && glyph.x > 53);
  assert.ok(rightA.every((glyph, index) => Math.abs(glyph.x - rightB[index]!.x) < 0.01));
});

test("tail emerges separately from the composer edge with a clear body gap", () => {
  const pose = catPoseAt(0, 0, 0);
  const body = catGlyphsAt(pose).filter((glyph) => glyph.part === "body");
  const tail = tailGlyphsAt(pose);
  assert.ok(tail.length > 50);
  assert.ok(Math.max(...tail.map((glyph) => glyph.y)) >= 47, "tail begins at the composer edge");
  assert.ok(Math.min(...tail.map((glyph) => glyph.y)) < 38, "tail curls upward");
  assert.ok(Math.max(...tail.map((glyph) => glyph.x)) > 96, "tail curls outward toward the right edge");
  assert.ok(Math.min(...tail.map((glyph) => glyph.x)) - Math.max(...body.map((glyph) => glyph.x)) > 8);
  assert.ok(tail.every((glyph) => Number.isFinite(glyph.x) && Number.isFinite(glyph.y)));
});

test("tail is a filled character shape instead of two outline strokes", () => {
  const tail = tailGlyphsAt(catPoseAt(0, 0, 0));
  assert.ok(tail.every((glyph) => typeof glyph.char === "string" && /^[\x21-\x7e]$/.test(glyph.char)), "every fill cell is one ASCII glyph");
  assert.ok(tail.every((glyph) => Number.isInteger(glyph.x) && Number.isInteger(glyph.y)), "tail uses the same character grid spacing as the cat");
  assert.ok(tail.some((glyph) => glyph.char === "@"), "dense interior characters are present");
  assert.ok(tail.some((glyph) => glyph.char === "=" || glyph.char === "-"), "tail uses the cat's varied character texture");
  const dense = tail.filter((glyph) => "@#%".includes(glyph.char)).length / tail.length;
  const open = tail.filter((glyph) => "-+=:.".includes(glyph.char)).length / tail.length;
  assert.ok(dense < 0.4 && open > 0.35, "tail texture leaves visual space like the body");
  assert.ok(tail.some((glyph) => glyph.x === 83 && glyph.y === 37), "curve center is filled");
  const crossSection = new Set(tail.filter((glyph) => glyph.y > 38 && glyph.y < 40).map((glyph) => Math.round(glyph.x)));
  assert.ok([...crossSection].some((x) => crossSection.has(x + 1) && crossSection.has(x + 2)));
  assert.ok(tail.every((glyph) => glyph.x < 93 || glyph.y < 40), "the tip does not loop back into a P shape");
  const swayed = tailGlyphsAt({ ...catPoseAt(0, 0, 0), tailPhase: 3.2 });
  assert.ok(Math.max(...swayed.map((glyph) => glyph.x)) - Math.max(...tail.map((glyph) => glyph.x)) >= 3, "the tail tip sways while the root stays put");
  assert.ok(swayed.some((glyph) => glyph.x === 80 && glyph.y >= 47));
});

test("cat preview renders characters without loading or drawing the reference image", () => {
  const engine = readFileSync(new URL("../src/animation/cat-engine.ts", import.meta.url), "utf8");
  const preview = readFileSync(new URL("../src/cat-preview.ts", import.meta.url), "utf8");
  assert.doesNotMatch(engine + preview, /cat-reference\.png|drawImage|new Image\(/);
  assert.match(engine, /fillText/);
});
