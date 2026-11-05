import test from "node:test";
import assert from "node:assert/strict";
import { createSharkSpecs } from "../src/animation/shark-selection.js";

test("mixed mode creates one valid shark when count is one", () => {
  const sharks = createSharkSpecs(1, "mixed", () => 0);
  assert.equal(sharks.length, 1);
  assert.ok(sharks[0].kind);
});

test("mixed mode cycles through all kinds evenly without adjacent duplicates", () => {
  const sharks = createSharkSpecs(12, "mixed", () => 0);
  const kinds = sharks.map((shark) => shark.kind);
  assert.equal(new Set(kinds.slice(0, 8)).size, 8);
  assert.ok(kinds.slice(1).every((kind, index) => kind !== kinds[index]));
  assert.equal(kinds.filter((kind) => kind === kinds[0]).length, 2);
});

test("a selected species is assigned to every shark", () => {
  const sharks = createSharkSpecs(4, "hammerhead", () => 0);
  assert.deepEqual(sharks.map((shark) => shark.kind), Array(4).fill("hammerhead"));
});
