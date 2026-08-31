import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  deliveredQuestionRetryAllowed,
  questionSlotsFromReply,
  requestCommunicationDeliveryTransition,
} from "../supabase/functions/_shared/request-communication-state";

const root = process.cwd();

test("SMS and WhatsApp share an idempotent request communication ledger", async () => {
  const migration = await readFile(
    path.join(
      root,
      "supabase/migrations/20260831131500_unify_request_state_communications.sql",
    ),
    "utf8",
  );
  expect(migration).toContain(
    "create table public.aura_request_state_communications",
  );
  expect(migration).toContain("unique (communication_id)");
  expect(migration).toContain("channel in ('sms', 'whatsapp')");
  expect(migration).toContain(
    "'received', 'accepted', 'delivered', 'read', 'failed'",
  );
  expect(migration).toContain("enable row level security");
  expect(migration).toContain(
    "aura_request_state_communications_state_time_idx",
  );
});

test("incoming WhatsApp events are linked to the same active request state", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  expect(broker).toContain("linkIncomingCommunicationToRequestState(");
  expect(broker).toMatch(
    /await linkIncomingCommunicationToRequestState\(\s*from,\s*communicationId,\s*"whatsapp",?\s*\)/,
  );
  expect(broker).toContain("crossChannelMemory: communicationRows.reverse()");
  expect(broker).toContain("limit 60");
  expect(broker).toContain("answered_slots");
  expect(broker).toContain("current.occurred_at - interval '6 hours'");
});

test("questions are recorded only after provider-confirmed delivery", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  expect(broker).toContain("linkOutgoingCommunicationAccepted(");
  expect(broker).toContain("markRequestCommunicationDelivery(");
  expect(broker).toContain('eventType === "message.delivered"');
  expect(broker).toContain(
    "when cardinality(${askedSlots}::text[]) > 0 then ${askedSlots}",
  );
  expect(broker).toContain("on conflict (communication_id) do nothing");
  expect(broker).not.toContain(
    "last_asked_slots = ${askedSlotsFromReply(params.result.reply)}",
  );
  expect(broker).not.toContain(
    "${params.communicationId}::uuid, ${askedSlotsFromReply(params.result.reply)})",
  );
});

test("every request-related outgoing message keeps exact source provenance", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  expect(broker).toContain("if (!sourceCommunicationId) return;");
  expect(broker).toContain("exact_state.last_inbound_communication_id");
  expect(broker).toContain("summarySourceCommunicationId");
  expect(broker).toMatch(
    /pending_confirmation_id, source_communication_id,[\s\S]{0,300}summarySourceCommunicationId/,
  );
  expect(broker).not.toContain(
    "sourceCommunicationId}::uuid is null and state.normalized_phone",
  );
  const actions = await readFile(
    path.join(root, "app/owner/aura/actions.ts"),
    "utf8",
  );
  const inbox = await readFile(
    path.join(root, "components/buildflow/unified-communication-inbox.tsx"),
    "utf8",
  );
  expect(actions).toContain(
    "sourceCommunicationId: input.sourceCommunicationId",
  );
  expect(inbox).toContain("sourceCommunicationId = activeConversation");
  expect(inbox).toContain('item.direction === "incoming"');
});

test("new requests do not backfill an earlier channel conversation", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  expect(broker).toContain("startsNewRequest?: boolean");
  expect(broker).toContain("stateCreated && !params.startsNewRequest");
  expect(broker).toContain("startsNewRequest,");
});

test("persisted memory stays valid and removes oldest turns first", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  expect(broker).toContain(
    "const memory = state.crossChannelMemory.slice(-60)",
  );
  expect(broker).toContain("memory.shift()");
  expect(broker).not.toContain("}).slice(0, 12000)");
});

test("failed or ambiguous outbox rows cannot mark a question as asked", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  const markStart = broker.indexOf("async function markSmsOutboxSent");
  const reconcileStart = broker.indexOf("async function reconcileSmsOutbox");
  const markBody = broker.slice(markStart, reconcileStart);
  expect(markBody).toContain("linkOutgoingCommunicationAccepted(");
  expect(markBody).toContain("returning id");
  expect(markBody).not.toContain("markRequestCommunicationDelivery(");
  expect(broker).toContain("requestCommunicationDeliveryTransition(");
});

test("delivered question attempts are read and bound repeated blockers", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  expect(broker).toContain("state.question_attempts");
  expect(broker).toContain("deliveredQuestionAttempts: Object.fromEntries(");
  expect(broker).toContain("deliveredQuestionLimitReached");
  expect(broker).toContain("deliveredQuestionRetryAllowed(");
  expect(broker).toContain("durableCrossChannelText");
});

test("accepted then failed never counts as a delivered question", () => {
  expect(requestCommunicationDeliveryTransition("accepted", "failed")).toEqual({
    status: "failed",
    countQuestion: false,
  });
});

test("delivered and read replays count a question exactly once", () => {
  expect(
    requestCommunicationDeliveryTransition("accepted", "delivered"),
  ).toEqual({ status: "delivered", countQuestion: true });
  expect(
    requestCommunicationDeliveryTransition("delivered", "delivered"),
  ).toEqual({ status: "delivered", countQuestion: false });
  expect(requestCommunicationDeliveryTransition("delivered", "read")).toEqual({
    status: "read",
    countQuestion: false,
  });
  expect(requestCommunicationDeliveryTransition("read", "read")).toEqual({
    status: "read",
    countQuestion: false,
  });
});

test("the same delivered blocker is bounded before manager review", () => {
  expect(
    deliveredQuestionRetryAllowed({ specification: 1 }, ["specification"]),
  ).toBe(true);
  expect(
    deliveredQuestionRetryAllowed({ specification: 2 }, ["specification"]),
  ).toBe(false);
});

test("real English, Spanish, and Hebrew blockers receive stable keys", () => {
  expect(questionSlotsFromReply("What substrate is it for?")).toContain(
    "application_surface",
  );
  expect(
    questionSlotsFromReply("Which Square D line do you need: Homeline or QO?"),
  ).toContain("panel_compatibility");
  expect(
    questionSlotsFromReply("¿Qué marca tiene el panel eléctrico?"),
  ).toContain("panel_compatibility");
  expect(questionSlotsFromReply("מה יצרן לוח החשמל?")).toContain(
    "panel_compatibility",
  );
  expect(questionSlotsFromReply("Which profile do you need?")).toEqual([
    "clarification",
  ]);
});

test("delivery-before-link is reconciled after exact ledger binding", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  expect(broker).toContain("pendingSendReconciliation: true");
  expect(broker).toContain('["delivered", "read", "failed"].includes(status)');
  expect(broker).toContain(
    "when public.aura_communications.status = 'delivered'",
  );
  expect(broker).toContain("when aura_communications.status = 'delivered'");
  expect(broker).toContain("when status = 'delivered'");
  expect(broker).toContain("sourceCommunicationIdValue");
});
