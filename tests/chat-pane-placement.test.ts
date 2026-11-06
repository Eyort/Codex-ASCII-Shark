import assert from "node:assert/strict";
import { test } from "node:test";
import { computePanePlacement } from "../src/chat-pane-placement.js";

const host = { left: 291, top: 44, width: 1267, height: 868 };

test("without a right pane, hands cover the full shark canvas", () => {
  assert.deepEqual(computePanePlacement(host, { left: 291, top: 96, width: 1267, height: 816 }),
    { left: 0, top: 0, width: 1267, height: 868 });
});

test("with a right pane, hands stop at the conversation pane edge", () => {
  assert.deepEqual(computePanePlacement(host, { left: 291, top: 96, width: 909, height: 816 }),
    { left: 0, top: 0, width: 909, height: 868 });
  assert.deepEqual(computePanePlacement(host, { left: 291, top: 96, width: 736, height: 816 }),
    { left: 0, top: 0, width: 736, height: 868 });
});
