import test from "node:test";
import assert from "node:assert/strict";
import { isCodexWorkModeLabel } from "../src/work-mode.js";

test("accepts an explicitly selected Codex or Work mode", () => {
  assert.equal(isCodexWorkModeLabel("切换模式，当前模式：Codex"), true);
  assert.equal(isCodexWorkModeLabel("Switch mode, current mode: Work"), true);
});

test("rejects ChatGPT mode and ambiguous labels", () => {
  assert.equal(isCodexWorkModeLabel("切换模式，当前模式：ChatGPT"), false);
  assert.equal(isCodexWorkModeLabel("Work page"), false);
  assert.equal(isCodexWorkModeLabel(""), false);
});
