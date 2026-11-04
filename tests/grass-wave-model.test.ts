import test from "node:test";
import assert from "node:assert/strict";
import { getGrassDurationSeconds, getGrassStripCount } from "../src/animation/grass-wave-model.js";

test("bounds the strip count for compact and tall hosts", () => {
  assert.equal(getGrassStripCount(100, 0.5), 12);
  assert.equal(getGrassStripCount(2000, 1.5), 24);
});

test("maps speed to a bounded inverse duration", () => {
  assert.equal(getGrassDurationSeconds(0.1), 80);
  assert.ok(Math.abs(getGrassDurationSeconds(0.55) - 8 / 0.55) < 0.001);
  assert.equal(getGrassDurationSeconds(2), 4);
});
