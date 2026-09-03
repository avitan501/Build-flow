import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import {
  confirmSupplierDirectoryPersistence,
  parseSupplierDirectorySnapshot,
} from "../lib/supplier-directory-persistence"
import type { ShopQualificationSettings, SupplierRoutingOption } from "../lib/shop-qualification"

const root = process.cwd()

const supplier: SupplierRoutingOption = {
  id: "durable-building-supply",
  name: "Durable Building Supply",
  contactLabel: "Supplier contact",
  email: "quotes@example.com",
  preferredDeliveryMethod: "email",
}

function snapshotWith(suppliers: SupplierRoutingOption[]) {
  const settings: ShopQualificationSettings = { suppliers, products: {} }
  return { settings, deletedSupplierIds: [] }
}

test("a supplier save is confirmed only from the persisted directory snapshot", () => {
  const confirmed = confirmSupplierDirectoryPersistence(snapshotWith([supplier]), supplier)
  expect(confirmed).toEqual(supplier)

  // The write RPC's intended return value is not proof that the directory kept it.
  expect(confirmSupplierDirectoryPersistence(snapshotWith([]), supplier)).toBeNull()
  expect(confirmSupplierDirectoryPersistence(snapshotWith([{ ...supplier, name: "Old name" }]), supplier)).toBeNull()
  expect(confirmSupplierDirectoryPersistence(snapshotWith([{ ...supplier, id: "different-id" }]), supplier)).toBeNull()
})

test("supplier directory snapshots reject malformed state and sanitize tombstone ids", () => {
  expect(parseSupplierDirectorySnapshot(null)).toBeNull()
  expect(parseSupplierDirectorySnapshot({ settings: { suppliers: [] } })).toBeNull()
  expect(parseSupplierDirectorySnapshot({ settings: { suppliers: {}, products: {} } })).toBeNull()

  const parsed = parseSupplierDirectorySnapshot({
    ...snapshotWith([supplier]),
    deletedSupplierIds: [supplier.id, 123, null],
  })
  expect(parsed?.deletedSupplierIds).toEqual([supplier.id])
})

test("the server action performs read-after-write verification before reporting success", async () => {
  const source = await readFile(path.join(root, "app/admin/vendors/actions.ts"), "utf8")
  const upsertIndex = source.indexOf('"staff_upsert_supplier_directory_entry"')
  const verifyIndex = source.indexOf('"staff_load_supplier_directory_snapshot"', upsertIndex)
  const confirmIndex = source.indexOf("confirmSupplierDirectoryPersistence", verifyIndex)
  const successIndex = source.indexOf("return { ok: true, supplier: verifiedSupplier }", confirmIndex)

  expect(upsertIndex).toBeGreaterThan(-1)
  expect(verifyIndex).toBeGreaterThan(upsertIndex)
  expect(confirmIndex).toBeGreaterThan(verifyIndex)
  expect(successIndex).toBeGreaterThan(confirmIndex)
  expect(source).toContain("The supplier save could not be confirmed")
})

test("Supplier Network confirms the canonical directory before reporting success", async () => {
  const source = await readFile(path.join(root, "app/admin/supplier-network/actions.ts"), "utf8")
  const discoveredStart = source.indexOf("export async function addDiscoveredSupplierNetworkAction")
  const updateStart = source.indexOf("export async function updateSupplierNetworkRowAction")
  const discovered = source.slice(discoveredStart, updateStart)
  const update = source.slice(updateStart)

  expect(discovered).toContain("confirmSupplierDirectoryPersistence")
  expect(discovered.indexOf("staff_upsert_supplier_directory_entry")).toBeLessThan(discovered.indexOf("saveSupplierNetworkOptions"))
  expect(discovered.indexOf("staff_load_supplier_directory_snapshot", discovered.indexOf("staff_upsert_supplier_directory_entry"))).toBeLessThan(discovered.indexOf("saveSupplierNetworkOptions"))
  expect(update).toContain("supplier_persistence_failed")
  expect(update.indexOf("staff_upsert_supplier_directory_entry")).toBeLessThan(update.indexOf("saveSupplierNetworkOptions"))
})

test("the upsert migration verifies the final locked row and keeps access controls", async () => {
  const migration = await readFile(
    path.join(root, "supabase/migrations/20260903031011_verify_supplier_directory_persistence.sql"),
    "utf8",
  )

  expect(migration).toContain("security definer")
  expect(migration).toContain("private.has_staff_capability('suppliers')")
  expect(migration).toContain("private.supplier_directory_tombstones")
  expect(migration).toContain("for update")
  expect(migration).toContain("current_qualification_settings")
  expect(migration).toContain("returning state #> '{qualificationSettings,suppliers}'")
  expect(migration).toContain("persisted_supplier <> saved_supplier")
  expect(migration).toContain("supplier_persistence_failed")
  expect(migration).toContain("from public, anon")
  expect(migration).toContain("to authenticated, service_role")
})
