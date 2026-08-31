import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

async function productionSources() {
  const [broker, migration] = await Promise.all([
    readFile(
      path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
      "utf8",
    ),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260831134500_harden_sms_request_completion.sql",
      ),
      "utf8",
    ),
  ]);
  return { broker, migration };
}

test("canonical intake phases require list completion before address and summary", async () => {
  const { broker, migration } = await productionSources();
  expect(migration).toContain(
    "'items', 'additional_items', 'delivery_address',",
  );
  expect(migration).toContain(
    "'summary_confirmation', 'manager_review', 'confirmed'",
  );
  expect(migration).toContain("list_completion_communication_id");
  expect(migration).toContain("aura_sms_pending_one_per_state_uidx");

  const completion = broker.indexOf("const previouslyAskedForMore");
  const address = broker.indexOf(
    "result.reply = deliveryAddressQuestion",
    completion,
  );
  const confirmation = broker.indexOf(
    "confirmationPrepared = await prepareSmsRequestConfirmation",
    address,
  );
  expect(completion).toBeGreaterThan(-1);
  expect(address).toBeGreaterThan(completion);
  expect(confirmation).toBeGreaterThan(address);
  expect(broker.slice(address, confirmation)).toContain(
    "effectiveListComplete &&",
  );
  expect(broker.slice(address, confirmation)).toContain(
    "deliveryAddressKnown &&",
  );
});

test("an inbound completion reply proves receipt during the accepted-delivery race", async () => {
  const { broker } = await productionSources();
  expect(broker).toContain("const latestProvenOutgoingQuestion");
  expect(broker).toMatch(
    /persistedOrderState\?\.crossChannelMemory[\s\S]*?entry\.direction === "outgoing"/,
  );
  expect(broker).toMatch(
    /previouslyAskedForMore[\s\S]*?askedSlotsFromReply\(latestProvenOutgoingQuestion \|\| ""\)[\s\S]*?"additional_items"/,
  );
  expect(broker).toContain("The customer's reply itself proves receipt");
  expect(broker).toMatch(
    /completionContinuation[\s\S]*?customerFinishedMaterialList\(effectiveBody\)[\s\S]*?askedForAnotherItem/,
  );
  expect(broker).toMatch(
    /canAdvanceIntake\s*=\s*\(isIntakeTurn \|\| completionContinuation\)/,
  );
});

test("confirmation cannot be prepared from an incomplete list or partial address", async () => {
  const { broker } = await productionSources();
  const prepareStart = broker.indexOf(
    "async function prepareSmsRequestConfirmation",
  );
  const prepareEnd = broker.indexOf("async function", prepareStart + 20);
  const prepareBody = broker.slice(prepareStart, prepareEnd);
  expect(prepareBody).toContain("!input.listComplete");
  expect(prepareBody).toContain(
    "!smsHasFullDeliveryAddress(input.customerAddress)",
  );
  expect(prepareBody).toContain("!input.intelligenceReady");

  const callStart = broker.indexOf(
    "confirmationPrepared = await prepareSmsRequestConfirmation",
  );
  const guardStart = broker.lastIndexOf("if (", callStart);
  const guardedCall = broker.slice(guardStart, callStart + 80);
  expect(guardedCall).toContain("effectiveListComplete &&");
  expect(guardedCall).toContain("deliveryAddressKnown &&");
  expect(guardedCall).toContain("materialIntelligence.readyForConfirmation &&");
});

test("summary and YES confirmation are bound to the exact canonical state", async () => {
  const { broker, migration } = await productionSources();
  expect(migration).toContain("add column if not exists state_id uuid");
  expect(migration).toContain(
    "add column if not exists list_completion_communication_id uuid",
  );
  expect(migration).toMatch(
    /aura_sms_pending_one_per_state_uidx[\s\S]*?\(state_id\)[\s\S]*?where status = 'pending' and state_id is not null/,
  );

  const prepareStart = broker.indexOf(
    "async function prepareSmsRequestConfirmation",
  );
  const confirmStart = broker.indexOf(
    "async function confirmPendingSmsRequest",
  );
  const prepareBody = broker.slice(prepareStart, confirmStart);
  expect(prepareBody).toContain("source.state_id = state.id");
  expect(prepareBody).toContain("completion.state_id = state.id");
  expect(prepareBody).toContain(
    "completion.communication_id = state.list_completion_communication_id",
  );
  expect(prepareBody).toContain("address.state_id = state.id");
  expect(prepareBody).toContain("state.list_complete = true");
  expect(prepareBody).toContain("state.created_request_id is null");
  expect(prepareBody).toContain(
    "(state_id, list_completion_communication_id, normalized_phone",
  );
  expect(prepareBody).toContain(
    "where state_id = ${state.id}::uuid and summary_hash = ${summaryHash}",
  );

  const confirmEnd = broker.indexOf("async function", confirmStart + 20);
  const confirmBody = broker.slice(confirmStart, confirmEnd);
  expect(confirmBody).toContain("pending.state_id = state.id");
  expect(confirmBody).toContain(
    "state.list_completion_communication_id = pending.list_completion_communication_id",
  );
  expect(confirmBody).toContain("pending.summary_sent_at is not null");
  expect(confirmBody).toContain(
    "confirmation.occurred_at >= pending.summary_sent_at",
  );
  expect(confirmBody).toContain("not exists (");
  expect(confirmBody).toContain("intervening.state_id = state.id");
  expect(confirmBody).toContain(
    "intervening.occurred_at > pending.summary_sent_at",
  );
  expect(confirmBody).toContain(
    "intervening.occurred_at <= confirmation.occurred_at",
  );
  expect(confirmBody).toContain("where id = ${pending.state_id}::uuid");
  expect(confirmBody).toContain(
    "and pending_confirmation_id = ${pending.id}::uuid",
  );
  expect(confirmBody).toContain("closed_at = null");
});

test("any non-YES after a summary invalidates it before later processing", async () => {
  const { broker } = await productionSources();
  const automationStart = broker.indexOf(
    "async function processCustomerSmsAutomation",
  );
  const explicitConfirmation = broker.indexOf(
    "const explicitConfirmation = isExplicitCustomerRequestConfirmation(body)",
    automationStart,
  );
  const confirmationAttempt = broker.indexOf(
    "confirmPendingSmsRequest(communicationId, phone, body)",
    explicitConfirmation,
  );
  const nonYesGuard = broker.indexOf(
    "if (!explicitConfirmation)",
    confirmationAttempt,
  );
  const laterProcessing = broker.indexOf(
    "const openDrafts = await sql",
    nonYesGuard,
  );
  const nonYesPath = broker.slice(nonYesGuard, laterProcessing);

  expect(explicitConfirmation).toBeGreaterThan(automationStart);
  expect(confirmationAttempt).toBeGreaterThan(explicitConfirmation);
  expect(nonYesGuard).toBeGreaterThan(confirmationAttempt);
  expect(laterProcessing).toBeGreaterThan(nonYesGuard);
  expect(nonYesPath).toContain(
    "await supersedeSmsConfirmationForCustomerChange(",
  );

  const helperStart = broker.indexOf(
    "async function supersedeSmsConfirmationForCustomerChange",
  );
  const helperEnd = broker.indexOf("async function", helperStart + 20);
  const helperBody = broker.slice(helperStart, helperEnd);
  expect(helperBody).toContain("pending.status in ('pending', 'send_failed')");
  expect(helperBody).toContain("pending_confirmation_id = null");
  expect(helperBody).toContain("where state.id = ${row.state_id}::uuid");
  expect(helperBody).toContain(
    "and state.pending_confirmation_id = ${row.pending_id}::uuid",
  );
});

test("terminal summary send failure reopens the exact state before a fresh snapshot", async () => {
  const { broker } = await productionSources();
  const finalizeStart = broker.indexOf(
    "async function finalizeSmsOutboxParent",
  );
  const finalizeEnd = broker.indexOf("async function", finalizeStart + 20);
  const finalizeBody = broker.slice(finalizeStart, finalizeEnd);
  expect(finalizeBody).toContain("status = 'send_failed'");
  expect(finalizeBody).toContain("state.id = pending.state_id");
  expect(finalizeBody).toContain("state.pending_confirmation_id = pending.id");
  expect(finalizeBody).toContain("returning state.id as state_id");
  expect(finalizeBody).toContain("status = 'collecting'");
  expect(finalizeBody).toContain("pending_confirmation_id = null");
  expect(finalizeBody).toContain("where id = ${failed[0].state_id}::uuid");
  expect(finalizeBody).toContain(
    "and pending_confirmation_id = ${row.pending_confirmation_id}::uuid",
  );

  const prepareStart = broker.indexOf(
    "async function prepareSmsRequestConfirmation",
  );
  const prepareEnd = broker.indexOf(
    "async function supersedeSmsConfirmationForCustomerChange",
    prepareStart,
  );
  const prepareBody = broker.slice(prepareStart, prepareEnd);
  const failedBranch = prepareBody.indexOf(
    'if (same[0].status === "send_failed")',
  );
  const freshInsert = prepareBody.indexOf(
    "insert into public.aura_sms_request_pending_confirmations",
    failedBranch,
  );
  expect(failedBranch).toBeGreaterThan(-1);
  expect(freshInsert).toBeGreaterThan(failedBranch);
  expect(prepareBody.slice(failedBranch, freshInsert)).toContain(
    "set status = 'superseded'",
  );
  expect(prepareBody.slice(failedBranch, freshInsert)).toContain(
    "where id = ${same[0].id}::uuid and state_id = ${state.id}::uuid",
  );
});

test("prepare, supersede, and confirm serialize per customer phone", async () => {
  const { broker } = await productionSources();
  const prepareStart = broker.indexOf(
    "async function prepareSmsRequestConfirmation",
  );
  const supersedeStart = broker.indexOf(
    "async function supersedeSmsConfirmationForCustomerChange",
  );
  const confirmStart = broker.indexOf(
    "async function confirmPendingSmsRequest",
  );
  const nextAfterConfirm = broker.indexOf("async function", confirmStart + 20);

  expect(broker.slice(prepareStart, supersedeStart)).toContain(
    "pg_advisory_xact_lock(hashtextextended(${input.phone}, 0))",
  );
  expect(broker.slice(supersedeStart, confirmStart)).toContain(
    "pg_advisory_xact_lock(hashtextextended(${phone}, 0))",
  );
  expect(broker.slice(confirmStart, nextAfterConfirm)).toContain(
    "pg_advisory_xact_lock(hashtextextended(${phone}, 0))",
  );
  const confirmBody = broker.slice(confirmStart, nextAfterConfirm);
  const lockIndex = confirmBody.indexOf(
    "pg_advisory_xact_lock(hashtextextended(${phone}, 0))",
  );
  const canonicalInterveningIndex = confirmBody.indexOf(
    "from public.aura_communications as intervening",
    lockIndex,
  );
  expect(canonicalInterveningIndex).toBeGreaterThan(lockIndex);
  expect(confirmBody.slice(canonicalInterveningIndex)).toContain(
    "intervening.counterparty_phone = ${phone}",
  );
  expect(confirmBody.slice(canonicalInterveningIndex)).toContain(
    "intervening.occurred_at <= confirmation.occurred_at",
  );
});

test("an added item reopens completion and supersedes an unconfirmed summary", async () => {
  const { broker } = await productionSources();
  expect(broker).toMatch(
    /addedMaterialAfterCompletion[\s\S]*?latestTurnIsMaterialRequest[\s\S]*?persistedOrderState\?\.listComplete === true/,
  );
  expect(broker).toContain(
    "const effectiveListComplete = listComplete && !addedMaterialAfterCompletion",
  );
  expect(broker).toContain("resetListComplete:");

  const helperStart = broker.indexOf(
    "async function supersedeSmsConfirmationForCustomerChange",
  );
  const helperEnd = broker.indexOf("async function", helperStart + 20);
  const helperBody = broker.slice(helperStart, helperEnd);
  expect(helperBody).toContain("pending.id = state.pending_confirmation_id");
  expect(helperBody).toContain("pending.state_id = state.id");
  expect(helperBody).toContain(
    "where id = ${row.pending_id}::uuid and state_id = ${row.state_id}::uuid",
  );
  expect(helperBody).toContain("pending_confirmation_id = null");
  expect(helperBody).toContain("where state.id = ${row.state_id}::uuid");
  expect(helperBody).toContain(
    "and state.pending_confirmation_id = ${row.pending_id}::uuid",
  );

  const explicitConfirmation = broker.indexOf(
    "const explicitConfirmation = isExplicitCustomerRequestConfirmation(body)",
  );
  const confirm = broker.indexOf(
    "confirmPendingSmsRequest(communicationId, phone, body)",
    explicitConfirmation,
  );
  const guardedHelperCall = broker.indexOf(
    "if (!explicitConfirmation)",
    confirm,
  );
  const laterProcessing = broker.indexOf(
    "const openDrafts = await sql",
    guardedHelperCall,
  );
  expect(confirm).toBeGreaterThan(explicitConfirmation);
  expect(guardedHelperCall).toBeGreaterThan(confirm);
  expect(laterProcessing).toBeGreaterThan(guardedHelperCall);
  expect(broker.slice(guardedHelperCall, laterProcessing)).toContain(
    "await supersedeSmsConfirmationForCustomerChange(",
  );
});

test("exact-list intake still asks neutral completion and never suggests accessories", async () => {
  const { broker } = await productionSources();
  const completionStart = broker.indexOf(
    "if (canAdvanceIntake && !effectiveListComplete)",
  );
  const completionEnd = broker.indexOf("} else if (", completionStart);
  const completionBody = broker.slice(completionStart, completionEnd);
  expect(completionBody).toContain("additionalItemsQuestion(effectiveBody)");
  expect(completionBody).toContain("exactListOnly");
  expect(completionBody).not.toMatch(/accessor|recommend|suggest/i);
});
