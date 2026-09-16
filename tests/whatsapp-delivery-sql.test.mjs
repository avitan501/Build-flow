// Runs the actual handler SQL against an isolated, network-disabled local container.
// Never points at production. Start: docker run -d --name avantia-wa-diagnostic-test-20260915 --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { whatsappDeliveryDiagnostic } from "../supabase/functions/_shared/whatsapp-delivery-diagnostic.ts";

const container = process.env.WHATSAPP_TEST_CONTAINER || "avantia-wa-diagnostic-test-20260915";
function query(sql) {
  return execFileSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-XAtq", "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" }).trim();
}
const literal = value => value === null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
const sql = async (strings, ...values) => {
  const result = query(strings.reduce((text, part, i) => text + part + (i < values.length ? literal(values[i]) : ""), ""));
  return result ? result.split("\n").map(row => { const [id, status] = row.split("|"); return { id, status }; }) : [];
};
sql.json = JSON.stringify;

test("actual receipt handler: duplicate, out-of-order, privacy, evidence without message, auth", async () => {
  query(`create table public.aura_communications (id text, provider text, external_activity_id text, status text, next_steps jsonb default '[]', last_event_at timestamptz, updated_at timestamptz);
    create table public.aura_webhook_events (provider text, external_event_id text, event_type text, activity_id text, raw_payload jsonb, processed_at timestamptz, unique(provider,external_event_id));
    insert into public.aura_communications(id,provider,external_activity_id,status,next_steps) values ('test','whatsapp','wamid.test','accepted','["Keep unrelated note"]');`);
  const calls = [];
  const source = readFileSync(new URL("../supabase/functions/aura-messaging-broker/index.ts", import.meta.url), "utf8");
  const handler = source.slice(source.indexOf("async function handleMetaWhatsAppWebhook"), source.indexOf("async function optimizeMetaWhatsAppWebhook"));
  const context = vm.createContext({ sql, whatsappDeliveryDiagnostic,
    metaWhatsAppWebhookConfig: async () => ({ appSecret: "test", businessAccountId: "waba", phoneNumberId: "phone" }),
    hmacSha256HexRawKey: async () => "signed", constantTimeEqual: (a,b) => a === b,
    json: (body, status = 200) => ({ body, status }),
    processMetaWhatsAppMessage: async () => { throw new Error("Unexpected inbound processing"); },
    markRequestCommunicationDelivery: async (id,status) => calls.push({ id, status }),
  });
  vm.runInContext(ts.transpileModule(handler, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const send = async (status, errors = [], id = "wamid.test", signature = "sha256=signed") => context.handleMetaWhatsAppWebhook({
    headers: { get: () => signature }, text: async () => JSON.stringify({ object: "whatsapp_business_account", entry: [{ id: "waba", changes: [{ field: "messages", value: { metadata: { phone_number_id: "phone" }, statuses: [{ id, status, errors }] } }] }] }),
  });
  assert.equal((await send("failed", [{ code: 131042, message: "do not store private data" }])).status, 200);
  assert.match(query("select status || '|' || next_steps::text from aura_communications"), /failed.*Keep unrelated note.*131042/);
  await send("failed", [{ code: 131042 }]);
  assert.equal(query("select count(*) from aura_webhook_events"), "1");
  assert.equal(query("select jsonb_array_length(next_steps) from aura_communications"), "2");
  await send("sent");
  assert.equal(query("select status from aura_communications"), "failed");
  await send("delivered");
  assert.equal(query("select status from aura_communications"), "delivered");
  assert.equal(query("select next_steps::text from aura_communications"), '["Keep unrelated note"]');
  await send("failed", [{ code: 131047 }]);
  assert.equal(calls.at(-1).status, "delivered");
  await send("read");
  await send("sent");
  assert.equal(query("select status from aura_communications"), "read");
  await send("failed", [{ code: 999999, message: "secret" }], "wamid.early");
  assert.equal(query("select raw_payload->'error_codes' from aura_webhook_events where activity_id='wamid.early'"), "[999999]");
  assert.doesNotMatch(query("select raw_payload::text from aura_webhook_events"), /secret|private data/);
  assert.equal(query("select count(*) from aura_webhook_events where processed_at is null"), "0");
  assert.equal((await send("failed", [], "unauthorized", "wrong")).status, 401);
  assert.equal(query("select count(*) from aura_webhook_events where activity_id='unauthorized'"), "0");
});
