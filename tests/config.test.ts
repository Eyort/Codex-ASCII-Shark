import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, validateConfig } from "../src/config.js";

test("config defaults include three low-contrast sharks and loopback CDP port", () => {
  assert.equal(DEFAULT_CONFIG.count, 3);
  assert.equal(DEFAULT_CONFIG.port, 9335);
  assert.equal(DEFAULT_CONFIG.kind, "mixed");
});

test("config defaults a missing shark kind to mixed and accepts all upstream kinds", () => {
  const kinds = ["classic", "hammerhead", "greathammer", "zebra", "tiger", "mako", "thresher", "nurse"] as const;
  assert.equal(validateConfig({}).kind, "mixed");
  for (const kind of kinds) assert.equal(validateConfig({ kind }).kind, kind);
});

test("config rejects unsafe values outside supported ranges", () => {
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
