import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, validateConfig } from "../src/config.js";

test("config defaults include three low-contrast sharks and loopback CDP port", () => {
  assert.equal(DEFAULT_CONFIG.count, 3);
  assert.equal(DEFAULT_CONFIG.port, 9335);
  assert.equal(DEFAULT_CONFIG.kind, "mixed");
  assert.equal(DEFAULT_CONFIG.animation, "shark");
  assert.equal(DEFAULT_CONFIG.handsOpacity, 0.28);
});

test("config defaults a missing shark kind to mixed and accepts all upstream kinds", () => {
  const kinds = ["classic", "hammerhead", "greathammer", "zebra", "tiger", "mako", "thresher", "nurse"] as const;
  assert.equal(validateConfig({}).kind, "mixed");
  for (const kind of kinds) assert.equal(validateConfig({ kind }).kind, kind);
});

test("config rejects unsafe values outside supported ranges", () => {
  assert.equal(validateConfig({ animation: "hands" }).animation, "hands");
  for (const animation of ["cat", "capybara", "heart"] as const) {
    assert.equal(validateConfig({ animation }).animation, animation);
  }
  assert.throws(() => validateConfig({ animation: "frog" }), /animation/);
  assert.throws(() => validateConfig({ handsOpacity: 1.2 }), /handsOpacity/);
  assert.throws(() => validateConfig({ handsGlyphSize: 2 }), /handsGlyphSize/);
  assert.throws(() => validateConfig({ count: 13 }), /count/);
  assert.throws(() => validateConfig({ color: "url(https://example.invalid)" }), /color/);
  assert.throws(() => validateConfig({ port: 80 }), /port/);
  assert.throws(() => validateConfig({ kind: "orca" }), /kind/);
});

test("ignores grass-only fields left behind in old local config files", () => {
  const config = validateConfig({ mode: "grass", grassDetail: 1.2, count: 4 });
  assert.equal(config.count, 4);
  assert.equal("mode" in config, false);
  assert.equal("grassDetail" in config, false);
});

test("scene animations keep independent color and size settings", () => {
  assert.equal(DEFAULT_CONFIG.catColor, "#8ca99a");
  assert.equal(DEFAULT_CONFIG.capybaraColor, "#a79c91");
  assert.equal(DEFAULT_CONFIG.heartColor, "#b97988");
  assert.equal(DEFAULT_CONFIG.catSize, 1);
  const config = validateConfig({ catColor: "#112233", catSize: 1.3, heartSize: 0.8 });
  assert.equal(config.catColor, "#112233");
  assert.equal(config.catSize, 1.3);
  assert.equal(config.heartSize, 0.8);
  assert.equal(config.capybaraColor, "#a79c91");
  assert.throws(() => validateConfig({ catColor: "red" }), /catColor/);
  assert.throws(() => validateConfig({ capybaraColor: "#12345" }), /capybaraColor/);
  assert.throws(() => validateConfig({ heartColor: "url(https://example.invalid)" }), /heartColor/);
  assert.throws(() => validateConfig({ catSize: 2 }), /catSize/);
  assert.throws(() => validateConfig({ capybaraSize: 0.1 }), /capybaraSize/);
  assert.throws(() => validateConfig({ heartSize: Number.NaN }), /heartSize/);
});
