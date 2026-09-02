import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  isExplicitTrustedPhoneAddCommand,
  shouldJoinTrustedPhoneIntakeFollowUp,
  stripCarlosRoutingPhrase,
  trustedPhoneIntakeDestination,
} from "../supabase/functions/_shared/trusted-phone-intake-routing";

const root = process.cwd();

test("new trusted phone tasks require an explicit ADD command", () => {
  expect(isExplicitTrustedPhoneAddCommand("ADD call the roofer")).toBe(true);
  expect(isExplicitTrustedPhoneAddCommand(" add idea improve quote intake ")).toBe(true);
  expect(isExplicitTrustedPhoneAddCommand("Please call the roofer")).toBe(false);
  expect(isExplicitTrustedPhoneAddCommand(null)).toBe(false);
});

test("explicit to Carlos wording chooses Carlos without polluting the title", () => {
  expect(trustedPhoneIntakeDestination("ADD call ABC Supply to Carlos")).toBe("carlos");
  expect(trustedPhoneIntakeDestination("ADD to Carlos call ABC Supply")).toBe("carlos");
  expect(trustedPhoneIntakeDestination("ADD call ABC Supply")).toBe("david");
  expect(trustedPhoneIntakeDestination("Send this to Carlos")).toBe("david");
  expect(stripCarlosRoutingPhrase("To Carlos: Call ABC Supply")).toBe("Call ABC Supply");
  expect(stripCarlosRoutingPhrase("Call ABC Supply to Carlos")).toBe("Call ABC Supply");
});

test("a follow-up photo joins only a recent ADD intake and never creates a standalone task", () => {
  expect(shouldJoinTrustedPhoneIntakeFollowUp({
    body: null,
    imageCount: 1,
    priorMessageText: "ADD call ABC Supply",
    priorMissingCount: 0,
    priorAutoRouted: true,
  })).toBe(true);
  expect(shouldJoinTrustedPhoneIntakeFollowUp({
    body: null,
    imageCount: 1,
    priorMessageText: null,
    priorMissingCount: 0,
    priorAutoRouted: false,
  })).toBe(false);
  expect(shouldJoinTrustedPhoneIntakeFollowUp({
    body: "ADD create another task",
    imageCount: 1,
    priorMessageText: "ADD call ABC Supply",
    priorMissingCount: 0,
    priorAutoRouted: true,
  })).toBe(false);
});

test("an incomplete ADD intake accepts a clearly related text continuation", () => {
  expect(shouldJoinTrustedPhoneIntakeFollowUp({
    body: "his phone is 516-555-1212",
    imageCount: 0,
    priorMessageText: "ADD supplier North Shore Lumber",
    priorMissingCount: 1,
    priorAutoRouted: false,
  })).toBe(true);
  expect(shouldJoinTrustedPhoneIntakeFollowUp({
    body: "I will arrive late",
    imageCount: 0,
    priorMessageText: "ADD supplier North Shore Lumber",
    priorMissingCount: 1,
    priorAutoRouted: false,
  })).toBe(false);
});

test("edge and manual routing update the same canonical website work row", async () => {
  const [broker, actions] = await Promise.all([
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/website-work/actions.ts"), "utf8"),
  ]);

  expect(broker).toContain("if (!joinPrior && !isExplicitTrustedPhoneAddCommand(body)) return;");
  expect(broker).toContain("on conflict (task_key) do update set");
  expect(broker).toContain("published_to_carlos = excluded.published_to_carlos");
  expect(broker).toContain("alreadyJoined");
  expect(actions).toContain(".upsert(");
  expect(actions).toContain('{ onConflict: "task_key" }');
  expect(actions).not.toContain('insertError.code !== "23505"');
});
