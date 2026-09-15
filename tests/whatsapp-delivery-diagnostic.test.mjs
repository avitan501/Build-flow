import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { whatsappDeliveryDiagnostic } from "../supabase/functions/_shared/whatsapp-delivery-diagnostic.ts";

test("retains actual numeric Meta codes without raw error content", () => {
  const result = whatsappDeliveryDiagnostic([{ code: 131042, message: "secret token", error_data: { details: "private phone" } }]);
  assert.deepEqual(result.codes, [131042]);
  assert.match(result.message, /131042/);
  assert.doesNotMatch(JSON.stringify(result), /secret|private phone/);
});
test("deduplicates and bounds codes; rejects strings and malformed payloads", () => {
  assert.deepEqual(whatsappDeliveryDiagnostic([{ code: 131047 }, { code: 131047 }, { code: "123" }, null, { code: -1 }, { code: Infinity }]).codes, [131047]);
  for (const value of [null, {}, "token", [], [{ code: 1.5 }]]) {
    assert.deepEqual(whatsappDeliveryDiagnostic(value).codes, []);
    assert.match(whatsappDeliveryDiagnostic(value).message, /no numeric error code/);
  }
  assert.equal(whatsappDeliveryDiagnostic(Array.from({ length: 100 }, (_, i) => ({ code: i + 1 }))).codes.length, 20);
});
test("handler captures allowlisted evidence atomically and propagates effective delivery state", () => {
  const source = readFileSync(new URL("../supabase/functions/aura-messaging-broker/index.ts", import.meta.url), "utf8");
  const handler = source.slice(source.indexOf("async function handleMetaWhatsAppWebhook"), source.indexOf("async function optimizeMetaWhatsAppWebhook"));
  assert.match(handler, /whatsappDeliveryDiagnostic\(receipt.errors\)/);
  assert.match(handler, /with receipt_evidence as/);
  assert.match(handler, /'whatsapp.delivery_status'/);
  assert.match(handler, /returning id, status/);
  assert.match(handler, /markRequestCommunicationDelivery\(updated\[0\].id, updated\[0\].status/);
  assert.doesNotMatch(handler, /sql.json\(receipt\)|sql.json\(payload\)/);
});
test("template acceptance does not claim confirmed delivery", () => {
  const source = readFileSync(new URL("../components/buildflow/unified-communication-inbox.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Approved WhatsApp template sent and saved/);
  assert.match(source, /Delivery is not confirmed yet/);
});
