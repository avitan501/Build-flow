import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

async function source(file: string) {
  return readFile(path.join(root, file), "utf8")
}

test("material extraction is durably queued and repeated changes coalesce by generation", async () => {
  const migration = await source("supabase/migrations/20260902140536_add_durable_client_material_processing.sql")

  expect(migration).toContain("create table if not exists public.client_material_list_jobs")
  expect(migration).toContain("unique (request_id)")
  expect(migration).toContain("status in ('queued', 'processing', 'retrying', 'completed', 'failed')")
  expect(migration).toContain("create or replace function public.enqueue_client_material_list_job")
  expect(migration).toContain("generation = public.client_material_list_jobs.generation + 1")
  expect(migration).toContain("when public.client_material_list_jobs.status = 'processing' then 'processing'")
  expect(migration).toContain("force_requested = public.client_material_list_jobs.force_requested or excluded.force_requested")
  expect(migration).toContain("ai_organization_status")
  expect(migration).toContain("ai_organization_job_status")
})

test("only one worker claims a job and abandoned work becomes available again", async () => {
  const migration = await source("supabase/migrations/20260902140536_add_durable_client_material_processing.sql")

  expect(migration).toContain("create or replace function public.claim_client_material_list_jobs")
  expect(migration).toContain("for update skip locked")
  expect(migration).toContain("job.locked_at < now() - interval '6 minutes'")
  expect(migration).toContain("limit least(greatest(coalesce(p_limit, 1), 1), 3)")
  expect(migration).toContain("attempts = job.attempts + 1")
  expect(migration).toContain("attempts < job.max_attempts")
})

test("worker completion is generation-safe and retries with bounded backoff", async () => {
  const migration = await source("supabase/migrations/20260902140536_add_durable_client_material_processing.sql")

  expect(migration).toContain("if v_job.generation <> p_generation then")
  expect(migration).toContain("v_status := 'queued'")
  expect(migration).toContain("elsif v_job.attempts < v_job.max_attempts then")
  expect(migration).toContain("v_status := 'retrying'")
  expect(migration).toContain("least(15, power(2")
  expect(migration).toContain("v_status := 'failed'")
  expect(migration).toContain("automatic_processing_failed")
})

test("queue and worker stay private and scheduled credentials remain in Vault", async () => {
  const [migration, worker] = await Promise.all([
    source("supabase/migrations/20260902140536_add_durable_client_material_processing.sql"),
    source("supabase/functions/client-material-list-worker/index.ts"),
  ])

  expect(migration).toContain("alter table public.client_material_list_jobs enable row level security")
  expect(migration).toContain("revoke all on table public.client_material_list_jobs from public, anon, authenticated")
  expect(migration).toContain("grant execute on function public.claim_client_material_list_jobs(integer) to service_role")
  expect(migration).toContain("vault.decrypted_secrets")
  expect(migration).toContain("X-Client-Material-Dispatch")
  expect(migration).toContain("if project_url <> 'https://nprfhspwdflpqlopydmp.supabase.co' then return null")
  expect(migration).toContain("'* * * * *'")
  expect(worker).toContain("safeEqual(provided, expected)")
  expect(worker).toContain("safeEqual(bearer, serviceKey)")
  expect(worker).not.toMatch(/\b[a-f0-9]{32,}\b/i)
})

test("worker processes one bounded job and always records a terminal or retry result", async () => {
  const worker = await source("supabase/functions/client-material-list-worker/index.ts")

  expect(worker).toContain('admin.rpc("claim_client_material_list_jobs", { p_limit: 1 })')
  expect(worker).toContain('fetch(`${supabaseUrl}/functions/v1/client-material-list-ai`')
  expect(worker).toContain("controller.abort(), 45_000")
  expect(worker).toContain('admin.rpc("finish_client_material_list_job"')
  expect(worker).toContain('payload.status === "processing"')
  expect(worker).toContain('? "organizer_timeout"')
})

test("Next actions persist the job before returning and only nudge the worker after the response", async () => {
  const [scheduler, requestActions, managerActions] = await Promise.all([
    source("lib/material-request-organization.ts"),
    source("app/owner/materials/requests/actions.ts"),
    source("app/admin/users/actions.ts"),
  ])

  const enqueueAt = scheduler.indexOf('admin.rpc("enqueue_client_material_list_job"')
  const afterAt = scheduler.indexOf("after(async () =>")
  expect(enqueueAt).toBeGreaterThan(0)
  expect(afterAt).toBeGreaterThan(enqueueAt)
  expect(scheduler).toContain('>("client-material-list-worker"')
  expect(scheduler).toContain("invokeDirectFallback")
  expect(requestActions).toContain("await scheduleClientMaterialListOrganization({ requestId, force: true })")
  expect(managerActions).toContain("await scheduleClientMaterialListOrganization({ requestId: String(requestId) })")
  expect(requestActions).not.toContain("material_organization_timeout")
})

test("public intake durably enqueues before its non-blocking worker nudge", async () => {
  const intake = await source("supabase/functions/public-quote-intake/index.ts")
  const queueFunctionAt = intake.indexOf("async function queueClientMaterialList")
  const enqueueAt = intake.indexOf("/rest/v1/rpc/enqueue_client_material_list_job", queueFunctionAt)
  const waitUntilAt = intake.indexOf("EdgeRuntime.waitUntil", enqueueAt)
  const callAt = intake.indexOf("await queueClientMaterialList", waitUntilAt)

  expect(queueFunctionAt).toBeGreaterThan(0)
  expect(enqueueAt).toBeGreaterThan(queueFunctionAt)
  expect(waitUntilAt).toBeGreaterThan(enqueueAt)
  expect(callAt).toBeGreaterThan(waitUntilAt)
  expect(intake).toContain('queued.ok ? "client-material-list-worker" : "client-material-list-ai"')
})

test("the request screen shows queue, processing, and retry states while continuing to poll", async () => {
  const [worktable, status, button] = await Promise.all([
    source("components/buildflow/request-material-worktable.tsx"),
    source("components/buildflow/material-organization-status.tsx"),
    source("components/buildflow/organize-material-list-button.tsx"),
  ])

  expect(worktable).toContain('["queued", "processing", "retrying"].includes(organizationStatus)')
  expect(worktable).toContain("<MaterialOrganizationStatus status={organizationStatus}")
  expect(status).toContain('queued: "Queued for AI"')
  expect(status).toContain('processing: "AI is reading files…"')
  expect(status).toContain('retrying: "AI will retry automatically"')
  expect(status).toContain('failed: "AI could not finish"')
  expect(status).toContain("router.refresh()")
  expect(status).toContain("retrying ? 15_000 : 4_000")
  expect(button).toContain("You can keep working while AI reads the files")
})
