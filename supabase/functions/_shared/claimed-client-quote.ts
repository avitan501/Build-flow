/** No provider/database SDK here: frozen claim validation is independently testable. */
export type ClaimedRoute = {
  id: string; comparison_id: string; client_send_token: string | null;
  client_send_actor_id: string | null; client_send_started_at: string | null;
  client_send_snapshot: unknown; client_send_manifest: unknown;
}
export type ClaimedQuoteEmail = {
  to: string[]; subject: string; text: string; html: string;
  attachments: Array<{ filename: string; content: string }>;
}
export type DeliveryDependencies = {
  loadClaim: (comparisonId: string, routeId: string) => Promise<ClaimedRoute | null>;
  start: (scope: DeliveryScope) => Promise<{ status: "claimed" | "sent" | "ambiguous"; providerId?: string }>;
  finish: (scope: DeliveryScope, providerId: string) => Promise<boolean>;
  send: (email: ClaimedQuoteEmail, idempotencyKey: string) => Promise<string>;
}
export type DeliveryScope = { comparisonId: string; routeId: string; token: string; actorId: string }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BYTES = 25 * 1024 * 1024;
const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("invalid_claim");
  return value as Record<string, unknown>;
}
function string(value: unknown, max: number, required = false) {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw Error("invalid_claim");
  return value;
}
function number(value: unknown, max = 1e12) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) throw Error("invalid_claim_amount");
  return value;
}
function escape(value: string) { return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }

export function claimedQuoteText(snapshot: unknown, routeId: string) {
  const source = object(snapshot), comparison = object(source.comparison);
  if (comparison.active_route_id !== routeId || comparison.client_quote_status !== "ready" || !UUID.test(String(comparison.client_id))) throw Error("invalid_claim_scope");
  const recipient = string(comparison.client_email_snapshot, 320, true).trim().toLowerCase();
  if (!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(recipient)) throw Error("invalid_claim_recipient");
  const quote = string(comparison.quote_number, 40, true);
  if (/[\r\n]/.test(quote)) throw Error("invalid_claim");
  const name = string(comparison.client_name_snapshot, 320);
  const address = string(comparison.job_address, 500);
  const message = string(comparison.client_message, 4000);
  if (!Array.isArray(source.items) || !source.items.length || source.items.length > 1000) throw Error("invalid_claim_items");
  const ids = new Set<string>();
  const lines = source.items.map(raw => {
    const item = object(raw), id = String(item.id);
    if (!UUID.test(id) || ids.has(id)) throw Error("invalid_claim_items");
    ids.add(id);
    const description = string(item.description, 500, true), spec = string(item.specification, 1000);
    const quantity = number(item.quantity, 1e8), unit = string(item.unit, 40, true), unitPrice = number(item.client_unit_price, 1e8);
    if (!quantity) throw Error("invalid_claim_amount");
    const total = cents(quantity * unitPrice);
    return { total, text: `${quantity} ${unit} — ${description}${spec ? ` (${spec})` : ""}: ${money(unitPrice)} / ${unit} · ${money(total)}` };
  });
  const materials = cents(lines.reduce((sum,line)=>sum+line.total,0));
  const delivery = number(comparison.client_delivery_charge), taxPercent = number(comparison.client_tax_percent,100);
  // Match the website's calculateQuoteTax exactly (per-line totals are rounded first).
  const tax = Math.round((materials + delivery) * taxPercent) / 100, total = cents(materials + delivery + tax);
  if (!Number.isFinite(total) || total <= 0 || total > 1e12) throw Error("invalid_claim_amount");
  const text = [`Hi ${name || "Client"},`, "", `Your Avantia Build material quote ${quote} is ready.`, `Job location: ${address || "Not provided"}`, "", ...lines.map(line=>line.text), "", `Materials: ${money(materials)}`, `Delivery: ${money(delivery)}`, `Sales tax (${taxPercent}%): ${money(tax)}`, `Total: ${money(total)}`, "", message, "", "The full quote is attached as a PDF.", "A 3% processing fee applies to credit card payments.", "", "Avantia Build", "office@avantiabuild.com", "https://avantiabuild.com"].join("\n");
  return { to: [recipient], subject: `Avantia Build material quote ${quote}`, text, html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escape(text)}</div>` };
}

async function verifiedAttachments(payload: Record<string, unknown>, manifest: unknown) {
  if (!Array.isArray(manifest) || !manifest.length || manifest.length > 11) throw Error("invalid_attachment_manifest");
  if (payload.attachments !== undefined && !Array.isArray(payload.attachments)) throw Error("invalid_attachment_manifest");
  const incoming = [payload.attachment, ...((payload.attachments || []) as unknown[])];
  if (incoming.length !== manifest.length) throw Error("attachment_manifest_mismatch");
  let total = 0;
  const result: Array<{filename:string;content:string}> = [];
  for (let index=0;index<manifest.length;index++) {
    const expected = object(manifest[index]), attachment = object(incoming[index]);
    const filename = string(expected.filename,180,true);
    if (/[\\/\u0000-\u001f\u007f]/.test(filename) || attachment.filename !== filename || !Number.isSafeInteger(expected.bytes) || number(expected.bytes,MAX_BYTES)<1 || !/^[a-f0-9]{64}$/.test(String(expected.sha256))) throw Error("invalid_attachment_manifest");
    const content = string(attachment.content, Math.ceil(MAX_BYTES/3)*4, true);
    // Avoid a repeated-group regexp over multi-megabyte PDFs; atob additionally
    // rejects malformed padding without recursive regexp stack growth.
    if (content.length % 4 || /[^A-Za-z0-9+/=]/.test(content)) throw Error("invalid_attachment_encoding");
    const bytes = Uint8Array.from(atob(content), character=>character.charCodeAt(0));
    if (bytes.byteLength !== expected.bytes || (total+=bytes.byteLength)>MAX_BYTES) throw Error("attachment_size_mismatch");
    if (index===0 && (new TextDecoder().decode(bytes.subarray(0,5))!=="%PDF-" || !filename.toLowerCase().endsWith(".pdf"))) throw Error("invalid_quote_pdf");
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)), byte=>byte.toString(16).padStart(2,"0")).join("");
    if (digest !== expected.sha256) throw Error("attachment_hash_mismatch");
    result.push({filename,content});
  }
  return result;
}

export async function deliverClaimedClientQuote(raw: unknown, actorId: string, dependencies: DeliveryDependencies) {
  let scope: DeliveryScope;
  let email: ClaimedQuoteEmail;
  try {
    const payload=object(raw);
    if (Object.keys(payload).some(key=>!["action","requestId","routeId","deliveryId","attachment","attachments"].includes(key)) || payload.action!=="send_client_quote") throw Error("invalid_payload");
    scope={comparisonId:String(payload.requestId),routeId:String(payload.routeId),token:String(payload.deliveryId),actorId};
    if (!Object.values(scope).every(value=>UUID.test(value))) throw Error("invalid_claim_scope");
    const claim=await dependencies.loadClaim(scope.comparisonId,scope.routeId);
    if (!claim || claim.id!==scope.routeId || claim.comparison_id!==scope.comparisonId || claim.client_send_token!==scope.token || claim.client_send_actor_id!==actorId || !claim.client_send_started_at) throw Error("claim_not_found");
    email={...claimedQuoteText(claim.client_send_snapshot,scope.routeId),attachments:await verifiedAttachments(payload,claim.client_send_manifest)};
  } catch { return {status:400,body:{error:"invalid_or_changed_quote_claim"}}; }
  // This gate is durable and never resets on provider errors or a function crash.
  // Provider idempotency is an extra protection, not the lifetime duplicate guard.
  let started;
  try { started=await dependencies.start(scope); }
  catch { return {status:409,body:{error:"quote_dispatch_claim_failed"}}; }
  if (started.status==="sent" && started.providerId) return {status:200,body:{ok:true,providerId:started.providerId,alreadySent:true}};
  if (started.status!=="claimed") return {status:409,body:{error:"quote_delivery_requires_review",ambiguous:true}};
  try {
    const providerId=await dependencies.send(email,`avantia-client-quote-${scope.comparisonId}-${scope.token}`);
    if (!providerId || !await dependencies.finish(scope,providerId)) return {status:502,body:{error:"quote_delivery_confirmation_pending",ambiguous:true}};
    return {status:200,body:{ok:true,providerId}};
  } catch { return {status:502,body:{error:"quote_delivery_not_confirmed",ambiguous:true}}; }
}
