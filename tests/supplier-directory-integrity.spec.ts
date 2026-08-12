import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()

test("deleted suppliers cannot be recreated by a create request", async () => {
  const sql = await readFile(
    path.join(root, "supabase/migrations/20260812180000_make_supplier_deletion_permanent.sql"),
    "utf8",
  )

  expect(sql).toContain("private.supplier_directory_tombstones where supplier_id = requested_id")
  expect(sql).toContain("raise exception 'supplier_not_found'")
  expect(sql).not.toMatch(/if p_create then\s+delete from private\.supplier_directory_tombstones/i)
})

test("the supplier page loads tombstones and hides deleted trial vendors", async () => {
  const [actions, manager] = await Promise.all([
    readFile(path.join(root, "app/admin/vendors/actions.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/supplier-routing-manager.tsx"), "utf8"),
  ])

  expect(actions).toContain('supabase.rpc("staff_load_supplier_directory_snapshot")')
  expect(manager).toContain("deletedSupplierIdSet.has(`trial-${entry.sourceId}`)")
  expect(manager).toContain("setDeletedSupplierIds(result.deletedSupplierIds)")
})
