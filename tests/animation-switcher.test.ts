import test from "node:test";
import assert from "node:assert/strict";
import { AnimationSwitcher } from "../src/animation/animation-switcher.js";

test("switching animation destroys current engine before creating next", () => {
  const events: string[] = [];
  const switcher = new AnimationSwitcher();
  switcher.activate("sharks", () => ({ destroy: () => events.push("destroy") }));
  switcher.activate("grass", () => { events.push("create"); return { destroy() {} }; });
  assert.deepEqual(events, ["destroy", "create"]);
});

test("dispose is idempotent", () => {
  let destroyed = 0;
  const switcher = new AnimationSwitcher();
  switcher.activate("grass", () => ({ destroy: () => destroyed++ }));
  switcher.dispose(); switcher.dispose();
  assert.equal(destroyed, 1);
});
