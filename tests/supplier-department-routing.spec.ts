import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import {
  materialCatalogDepartmentOptions,
  normalizeMaterialCatalogDepartment,
  supplierCanReceiveDepartmentRequest,
  supplierIsAddedToCatalogDepartment,
  supplierServesMaterialDepartment,
} from "../lib/material-catalog"

const root = process.cwd()

test("material departments normalize old request labels and include Others", () => {
  expect(normalizeMaterialCatalogDepartment("Sheet rock")).toBe("Sheet Rock")
  expect(normalizeMaterialCatalogDepartment("Door and molding")).toBe("Door & Molding")
  expect(normalizeMaterialCatalogDepartment("Wood Floor")).toBe("Flooring")
  expect(normalizeMaterialCatalogDepartment("Flooring / Materials")).toBe("Flooring")
  expect(normalizeMaterialCatalogDepartment("Rentals")).toBe("Appliances")
  expect(normalizeMaterialCatalogDepartment("High-end")).toBe("Take Care of Yourself")
  expect(normalizeMaterialCatalogDepartment("Concrete")).toBe("Concrete & Masonry")
  expect(normalizeMaterialCatalogDepartment("Unassigned")).toBe("Others")
  expect(materialCatalogDepartmentOptions([])).toContain("Appliances")
  expect(materialCatalogDepartmentOptions([])).toContain("Take Care of Yourself")
  expect(materialCatalogDepartmentOptions(["Custom Millwork"])).toContain("Others")
  expect(materialCatalogDepartmentOptions(["Custom Millwork"])).toContain("Custom Millwork")
})

test("supplier routing requires category, a contact channel, and an approved trust level", () => {
  const trialSupplier = {
    catalogDepartments: ["Framing", "Sheet Rock"],
    email: "quotes@example.com",
    trustLevel: "first-time" as const,
  }
  expect(supplierServesMaterialDepartment(trialSupplier, "Sheet rock")).toBe(true)
  expect(supplierCanReceiveDepartmentRequest(trialSupplier, "Framing")).toBe(true)
  expect(supplierCanReceiveDepartmentRequest({ ...trialSupplier, trustLevel: "not-reviewed" }, "Framing")).toBe(false)
  expect(supplierCanReceiveDepartmentRequest({ ...trialSupplier, trustLevel: "do-not-use" }, "Framing")).toBe(false)
  expect(supplierCanReceiveDepartmentRequest({ ...trialSupplier, email: "" }, "Framing")).toBe(false)
  expect(supplierCanReceiveDepartmentRequest({ ...trialSupplier, email: "", phone: "+15165550123" }, "Framing")).toBe(true)
  expect(supplierCanReceiveDepartmentRequest({ ...trialSupplier, email: "", whatsapp: "+15165550124" }, "Framing")).toBe(true)
  expect(supplierCanReceiveDepartmentRequest(trialSupplier, "Electrical")).toBe(false)
  expect(supplierIsAddedToCatalogDepartment({ catalogEnabledDepartments: ["Sheet rock"] }, "Sheet Rock")).toBe(true)
  expect(supplierIsAddedToCatalogDepartment({ catalogEnabledDepartments: [] }, "Sheet Rock")).toBe(false)
})

test("supplier categories remain available while manual request routing allows any saved supplier", async () => {
  const [directory, requestPanel, supplierDraftPage, catalog] = await Promise.all([
    readFile(path.join(root, "components/buildflow/supplier-routing-manager.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/[requestId]/supplier-request/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/material-catalog-workspace.tsx"), "utf8"),
  ])

  expect(directory).toContain("Categories supplied")
  expect(directory).toContain("catalogDepartments")
  expect(directory).toContain("supplierDirectorySort")
  expect(directory).toContain("Supplier order")
  expect(directory).toContain("A–Z")
  expect(requestPanel).toContain("Recommended suppliers")
  expect(requestPanel).toContain("Find Supplier")
  expect(requestPanel).toContain("availableSuppliers")
  expect(requestPanel).not.toContain("supplierCanReceiveDepartmentRequest")
  expect(requestPanel).not.toContain("Choose a department first.")
  expect(supplierDraftPage).toContain("matchingItems = preferredItems")
  expect(supplierDraftPage).not.toContain("supplierCanReceiveDepartmentRequest")
  expect(catalog).toContain("supplierServesMaterialDepartment")
  expect(catalog).toContain("Previous supplier")
  expect(catalog).toContain("Next supplier")
  expect(catalog).toContain("md:hidden")
})
