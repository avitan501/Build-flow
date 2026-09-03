import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

test("supplier profile reuses the private document center and preserves supplier linking", async () => {
  const [vendorsPage, supplierProfile, upload, actions] = await Promise.all([
    readFile(path.join(root, "app/admin/vendors/page.tsx"), "utf8"),
    readFile(
      path.join(root, "components/buildflow/supplier-routing-manager.tsx"),
      "utf8",
    ),
    readFile(
      path.join(root, "components/buildflow/manager-document-upload.tsx"),
      "utf8",
    ),
    readFile(path.join(root, "app/admin/documents/actions.ts"), "utf8"),
  ]);

  expect(vendorsPage).toContain('.from("manager_documents")');
  expect(vendorsPage).toContain('.not("supplier_id", "is", null)');
  expect(vendorsPage).toContain("initialSupplierDocuments={supplierDocuments}");
  expect(supplierProfile).toContain("Documents & photos");
  expect(supplierProfile).toContain("initialSupplierId={selectedSupplier.id}");
  expect(supplierProfile).toContain("selectedSupplierDocuments.map");
  expect(supplierProfile).toContain("/admin/documents/${document.id}");
  expect(upload).toContain('name="supplierId" value={initialSupplierId}');
  expect(upload).toContain("completeManagerDocumentUploadAction");
  expect(upload).toContain('const supplierId = String(formData.get("supplierId") ?? "")');
  expect(upload).toContain("supplierId,");
  expect(actions).toContain("requestedSupplierId");
  expect(actions).toContain("This exact document is already attached to another supplier.");
  expect(actions).toContain("supplier_id: requestedSupplierId");
  expect(actions).toContain("supplier_id: supplierId || null");
  expect(actions).toContain("MANAGER_DOCUMENT_BUCKET");
  expect(supplierProfile).not.toContain("supplier-documents");
});
