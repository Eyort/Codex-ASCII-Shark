import test from "node:test";
import assert from "node:assert/strict";
import { isSupportedConversationModeLabel } from "../src/work-mode.js";

test("accepts ChatGPT, Codex, and Work modes", () => {
  assert.equal(isSupportedConversationModeLabel("切换模式，当前模式：ChatGPT"), true);
  assert.equal(isSupportedConversationModeLabel("切换模式，当前模式：Codex"), true);
  assert.equal(isSupportedConversationModeLabel("Switch mode, current mode: Work"), true);
});

test("rejects unsupported and ambiguous labels", () => {
  assert.equal(isSupportedConversationModeLabel("切换模式，当前模式：Images"), false);
  assert.equal(isSupportedConversationModeLabel("Work page"), false);
  assert.equal(isSupportedConversationModeLabel(""), false);
});
