import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("hook isolates account/record queues and cancels delayed navigation after leaving", () => {
  const hook = readFileSync("hooks/use-quote-autosave.ts", "utf8");
  expect(hook).toContain("scopeKey: string");
  expect(hook).toContain("[scopeKey]");
  expect(hook).toContain("return () => queue.pause()");
  expect(hook).toContain("event.stopImmediatePropagation()");
  expect(hook).toContain("window.location.href === originHref");
  expect(hook).toContain("leavingQueues.every((mounted) => mountedQueues.has(mounted))");
});
