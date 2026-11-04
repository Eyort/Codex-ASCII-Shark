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

test("legacy config defaults to shark mode and grass detail 1", () => {
  const config = validateConfig({ count: 3 });
  assert.equal(config.mode, "sharks");
  assert.equal(config.grassDetail, 1);
});

test("validates both animation modes", () => {
  assert.equal(validateConfig({ mode: "sharks" }).mode, "sharks");
  assert.equal(validateConfig({ mode: "grass" }).mode, "grass");
  assert.equal(validateConfig({ grassDetail: 0.5 }).grassDetail, 0.5);
  assert.equal(validateConfig({ grassDetail: 1.5 }).grassDetail, 1.5);
});

test("rejects invalid mode or grass detail", () => {
  assert.throws(() => validateConfig({ mode: "fish" }), /mode/);
  assert.throws(() => validateConfig({ grassDetail: 0.49 }), /grassDetail/);
  assert.throws(() => validateConfig({ grassDetail: 1.51 }), /grassDetail/);
  assert.throws(() => validateConfig({ grassDetail: Number.NaN }), /grassDetail/);
});
