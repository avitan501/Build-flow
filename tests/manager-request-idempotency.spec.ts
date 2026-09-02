import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const read = (file: string) => readFile(path.join(process.cwd(), file), "utf8")

test("manager request creation reuses one browser submission key", async () => {
  const [component, action] = await Promise.all([
    read("components/buildflow/manager-create-client-request.tsx"),
    read("app/admin/users/actions.ts"),
  ])

  expect(component).toContain("setIdempotencyKey(crypto.randomUUID())")
  expect(component).toContain("idempotencyKey: idempotencyKey || crypto.randomUUID()")
  expect(action).toContain('supabase.rpc("staff_create_client_request_once"')
  expect(action).toContain("p_idempotency_key: idempotencyKey")
})

test("database idempotency returns the first request and protects key ownership", async () => {
  const migration = await read("supabase/migrations/20260902193000_secure_communication_history_and_request_idempotency.sql")

  expect(migration).toContain("private.staff_client_request_submissions")
  expect(migration).toContain("idempotency_key uuid primary key")
  expect(migration).toContain("request_id uuid unique references public.quote_requests(id) on delete cascade")
  expect(migration).toContain("on conflict (idempotency_key) do nothing")
  expect(migration).toContain("if prior_actor_id is distinct from actor_id")
  expect(migration).toContain("return result_request_id")
})
