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
  const [network, workspace] = await Promise.all([
    readFile(path.join(root, "lib/supplier-network.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/supplier-network-workspace.tsx"), "utf8"),
  ])
  expect(network).toContain('row.stage === "contact" && !row.priority')
  expect(workspace).toContain('label: "Building Relationship"')
  expect(workspace).toContain("Approved suppliers · ready when needed")
  expect(workspace).toContain("Generate 10")
})

test("supplier profile exposes compact relationship controls", async () => {
  const profile = await readFile(path.join(root, "components/buildflow/supplier-routing-manager.tsx"), "utf8")
  for (const label of ["Delivery charge", "Way to contact", "Salespeople & emails", "Sales & supplier information", "Relationship updates"]) {
    expect(profile).toContain(label)
  }
  expect(profile).not.toContain("Automatic service routing ·")
})
