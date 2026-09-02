import { readFile } from "node:fs/promises"
import path from "node:path"
import { expect, test } from "@playwright/test"

const root = process.cwd()

test("item sourcing is portaled over the request without changing its table layout", async () => {
  const source = await readFile(path.join(root, "components/buildflow/material-price-check.tsx"), "utf8")
  expect(source).toContain("createPortal")
  expect(source).toContain("fixed inset-0 z-[140]")
  expect(source).toContain('role="dialog"')
  expect(source).toContain("max-w-6xl")
})

test("supplier relationship workflow keeps only current focus in the middle stage", async () => {
  const [network, workspace, discovery] = await Promise.all([
    readFile(path.join(root, "lib/supplier-network.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/supplier-network-workspace.tsx"), "utf8"),
    readFile(path.join(root, "app/api/admin/suppliers/discover/route.ts"), "utf8"),
  ])
  expect(network).toContain('row.stage === "contact" && !row.priority')
  expect(workspace).toContain('label: "Building Relationship"')
  expect(workspace).toContain("Approved suppliers · ready when needed")
  expect(workspace).toContain("Generate 10")
  expect(discovery).toContain('action: "price_research"')
  expect(discovery).toContain('requireStaffProfile("suppliers")')
})

test("supplier profile exposes compact relationship controls", async () => {
  const [profile, actions, types] = await Promise.all([
    readFile(path.join(root, "components/buildflow/supplier-routing-manager.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/vendors/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/shop-qualification.ts"), "utf8"),
  ])
  for (const label of ["Delivery charge", "Way to contact", "Salespeople & emails", "Sales & supplier information", "Relationship updates"]) {
    expect(profile).toContain(label)
  }
  expect(profile).toContain("Referred by")
  expect(profile).toContain("Referral name")
  expect(profile).toContain("is already saved. Its supplier profile is open.")
  expect(profile).toContain("was saved in ${group === \"verified\" ? \"Verified Suppliers\" : \"Trial Suppliers\"}.")
  expect(profile).toContain('setSupplierDirectorySearch("")')
  expect(actions).toContain("allowedReferralSources")
  expect(actions).toContain("referredByName: input.referredByName?.trim().slice(0, 160)")
  expect(types).toContain('export type SupplierReferralSource = "friend" | "client" | "contractor" | "supplier" | "other"')
  expect(profile).not.toContain("Automatic service routing ·")
})
