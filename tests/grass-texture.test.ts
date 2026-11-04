import test from "node:test";
import assert from "node:assert/strict";
import { computeCoverCrop, mapLuminanceToGlyph, tintGrassSample, validateGrassDetail } from "../src/animation/grass-texture.js";

test("maps darker samples to denser ASCII glyphs", () => {
  assert.equal(mapLuminanceToGlyph(0), "@");
  assert.equal(mapLuminanceToGlyph(128), "=");
  assert.equal(mapLuminanceToGlyph(255), " ");
});

test("center crops a portrait source for landscape output", () => {
  assert.deepEqual(computeCoverCrop(100, 200, 200, 100), { x: 0, y: 75, width: 100, height: 50 });
});

test("accepts supported detail bounds and rejects values outside them", () => {
  assert.equal(validateGrassDetail(0.5), 0.5);
  assert.equal(validateGrassDetail(1.5), 1.5);
  assert.throws(() => validateGrassDetail(0.49));
  assert.throws(() => validateGrassDetail(1.51));
});

test("rejects invalid crop dimensions", () => {
  assert.throws(() => computeCoverCrop(0, 100, 100, 100));
});

test("tints grass samples with the selected color while preserving luminance", () => {
  assert.deepEqual(tintGrassSample(128, "#ff8000"), { r: 172, g: 87, b: 0 });
  assert.throws(() => tintGrassSample(0, "green"));
});
