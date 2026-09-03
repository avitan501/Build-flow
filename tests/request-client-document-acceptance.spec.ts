import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("acceptance receipts are immutable, versioned, and service-only", async () => {
  const migration = await readFile(path.join(root, "supabase/migrations/20260903034728_add_request_client_document_acceptance.sql"), "utf8")
  expect(migration).toContain("create table public.request_client_document_acceptances")
  expect(migration).toContain("unique (client_document_id, document_version, terms_version, terms_hash)")
  expect(migration).toContain("accepted_timezone text not null default 'America/New_York'")
  expect(migration).toContain("before update or delete on public.request_client_document_acceptances")
  expect(migration).toContain("for update;")
  expect(migration).toContain("selected_document.version <> p_document_version")
  expect(migration).toContain("extensions.digest")
  expect(migration).toContain("client_document_terms_hash_mismatch")
  expect(migration).toContain("grant execute on function public.accept_request_client_document")
  expect(migration).toContain("to service_role")
  expect(migration).toContain("revoke all on table public.request_client_document_acceptances from public, anon, authenticated")
  expect(migration).toContain("revoke all on table public.request_client_document_acceptances from service_role")
  expect(migration).toContain("receipt.document_version = document.version")
})

test("the public action derives terms server-side and rejects stale or incomplete consent", async () => {
  const action = await readFile(path.join(root, "app/client-document/[token]/actions.ts"), "utf8")
  expect(action).toContain('consent: z.literal("accepted")')
  expect(action).toContain("row.version !== input.data.documentVersion")
  expect(action).toContain('rpc("get_request_client_document"')
  expect(action).toContain('rpc("accept_request_client_document_public"')
  expect(action).toContain("input.data.signerEmail?.toLowerCase() !== signerEmail")
  expect(action).not.toContain("createAdminClient")
  expect(action).not.toContain("p_terms_hash:")
  expect(action).not.toContain("p_terms_text:")
})

test("the public acceptance wrapper hashes only the exact stored terms", async () => {
  const migration = await readFile(path.join(root, "supabase/migrations/20260903212526_allow_public_client_document_acceptance.sql"), "utf8")
  expect(migration).toContain("create or replace function public.accept_request_client_document_public")
  expect(migration).toContain("document.document_data ->> 'terms'")
  expect(migration).toContain("extensions.digest")
  expect(migration).toContain("'avantia-client-document-terms-v2'")
  expect(migration).toContain("to anon, authenticated")
  expect(migration).not.toContain("p_terms_text text")
  expect(migration).not.toContain("p_terms_hash text")
})

test("authorized managers can read only current-version client document acceptances", async () => {
  const migration = await readFile(path.join(root, "supabase/migrations/20260903233412_expose_current_client_document_acceptance_to_staff.sql"), "utf8")
  expect(migration).toContain("create or replace function public.get_request_current_client_document_acceptances")
  expect(migration).toContain("private.has_staff_capability('customers')")
  expect(migration).toContain("acceptance.document_version = document.version")
  expect(migration).toContain("document.request_id = p_request_id")
  expect(migration).toContain("to authenticated")
  expect(migration).toContain("from public, anon")
})

test("request manager uses exact current estimate acceptance as approval and activity", async () => {
  const page = await readFile(path.join(root, "app/owner/materials/requests/[requestId]/page.tsx"), "utf8")
  expect(page).toContain('rpc("get_request_current_client_document_acceptances"')
  expect(page).toContain('acceptance.document_type === "estimate"')
  expect(page).toContain("Boolean(currentEstimateAcceptance)")
  expect(page).toContain("activityEvents.map")
  expect(page).toContain("acknowledged exact document version")
})

test("saved client documents capture the request owner's email for signer matching", async () => {
  const actions = await readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8")
  const panel = await readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8")
  expect(actions).toContain("clientEmail: client?.email?.trim().toLowerCase() || undefined")
  expect(panel).toContain("clientEmail?: string")
})

test("estimate and invoice links show one terms block and an explicit unchecked gate", async () => {
  const page = await readFile(path.join(root, "app/client-document/[token]/page.tsx"), "utf8")
  const form = await readFile(path.join(root, "app/client-document/[token]/client-document-acceptance.tsx"), "utf8")
  expect(page.match(/Terms &amp; conditions/g)).toHaveLength(1)
  expect(page).toContain('row.document_type !== "receipt"')
  expect(page).toContain("accepted_terms_hash === termsHash")
  expect(form).toContain('name="consent" type="checkbox" value="accepted" required')
  expect(form).not.toContain("defaultChecked")
  expect(form).toContain('name="signerName"')
  expect(form).toContain("clientEmail ?")
  expect(form).toContain("formatSiteDateTime")
  expect(form).not.toContain('dateStyle: "medium"')
  expect(form).not.toContain('timeStyle: "short"')
  expect(form).toContain("This records your acknowledgement")
  expect(form).not.toContain("legally binding")
  expect(form).not.toContain("waive")
})

test("shared proposal terms disclose the 25% return fee and preserve statutory disputes", async () => {
  const terms = await readFile(path.join(root, "lib/proposal-terms.ts"), "utf8")
  const acceptance = await readFile(path.join(root, "lib/request-client-document-acceptance.ts"), "utf8")
  expect(terms).toContain("restocking fee of up to 25%")
  expect(terms).toContain("prior written authorization")
  expect(terms).toContain("Before requesting a stop-payment, reversal, or chargeback")
  expect(terms).toContain("does not waive any billing-error, dispute, or other right")
  expect(terms).not.toMatch(/cannot (?:request|initiate|file).*(?:chargeback|stop-payment)/i)
  expect(acceptance).toContain('CLIENT_DOCUMENT_TERMS_VERSION = "avantia-client-document-terms-v2"')
  expect(acceptance).toContain("includeRequiredProposalTerms")
})
