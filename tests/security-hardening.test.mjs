import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8")

test("production hard deletes are guarded before authorization or database access", async () => {
  const managerActions = await read("app/admin/users/actions.ts")
  const supplierActions = await read("app/admin/supplier-requests/actions.ts")
  const guard = await read("lib/permanent-deletion.ts")

  assert.match(guard, /NODE_ENV !== "production"/)
  assert.match(guard, /ALLOW_PERMANENT_DATA_DELETION/)
  assert.match(managerActions, /deleteOpenRequestAction[\s\S]*?permanentDeletionIsEnabled\(\)[\s\S]*?requireStaffProfile/)
  assert.match(managerActions, /deleteProjectAction[\s\S]*?permanentDeletionIsEnabled\(\)[\s\S]*?requireStaffProfile/)
  assert.match(managerActions, /deleteCustomerAction[\s\S]*?permanentDeletionIsEnabled\(\)[\s\S]*?requireAdminProfile/)
  assert.match(supplierActions, /deleteSupplierQuoteRequestAction[\s\S]*?permanentDeletionIsEnabled\(\)[\s\S]*?requireStaffProfile/)
})

test("backup scripts are pinned to the live production ref and cover database plus storage", async () => {
  const backup = await read("scripts/backup-production-supabase.sh")
  const storage = await read("scripts/backup-supabase-storage.mjs")

  for (const source of [backup, storage]) assert.match(source, /nprfhspwdflpqlopydmp/)
  assert.match(backup, /pg_dump --format=custom/)
  assert.match(backup, /backup-supabase-storage\.mjs/)
  assert.match(storage, /storage\.listBuckets\(\)/)
  assert.match(storage, /sha256/)
})
