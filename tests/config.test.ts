import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, validateConfig } from "../src/config.js";

test("config defaults include three low-contrast sharks and loopback CDP port", () => {
  assert.equal(DEFAULT_CONFIG.count, 3);
  assert.equal(DEFAULT_CONFIG.port, 9335);
});

test("config rejects unsafe values outside supported ranges", () => {
  assert.throws(() => validateConfig({ count: 13 }), /count/);
  assert.throws(() => validateConfig({ color: "url(https://example.invalid)" }), /color/);
  assert.throws(() => validateConfig({ port: 80 }), /port/);
});
