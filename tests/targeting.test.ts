import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedCdpTarget } from "../src/targeting.js";

const target = {
  id: "work-page_1",
  type: "page",
  url: "app://codex/",
  webSocketDebuggerUrl: "ws://127.0.0.1:9335/devtools/page/work-page_1",
};

test("accepts app page targets only on the expected loopback port", () => {
  assert.equal(isAllowedCdpTarget(target, 9335), true);
  assert.equal(isAllowedCdpTarget({ ...target, webSocketDebuggerUrl: "ws://example.com:9335/devtools/page/work-page_1" }, 9335), false);
  assert.equal(isAllowedCdpTarget({ ...target, url: "https://chatgpt.com" }, 9335), false);
});
