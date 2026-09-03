import { expect, test } from "@playwright/test";

import { requestSupplierFolderContents } from "@/lib/request-supplier-folder";

test("supplier folder returns only the exact supplier bid and files", () => {
  const [folder] = requestSupplierFolderContents([{
    id: "comparison-a",
    title: "Request comparison",
    bids: [
      { id: "frank-bid", supplierId: "frank", supplierName: "Frank Supply" },
      { id: "rio-bid", supplierId: "rio", supplierName: "Rio Supply" },
    ],
    documents: [
      { id: "frank-file", supplierId: "frank", fileName: "frank.pdf" },
      { id: "rio-file", supplierId: "rio", fileName: "rio.pdf" },
      { id: "unassigned-file", supplierId: null, fileName: "unknown.pdf" },
    ],
  }], "frank");

  expect(folder.bids.map((bid) => bid.id)).toEqual(["frank-bid"]);
  expect(folder.documents.map((document) => document.id)).toEqual(["frank-file"]);
});

test("empty suppliers have no folder contents", () => {
  const folder = requestSupplierFolderContents([{
    id: "comparison-a",
    bids: [{ supplierId: "rio" }],
    documents: [{ supplierId: "rio" }],
  }], "frank");

  expect(folder).toEqual([]);
});

test("similar supplier names cannot cross exact supplier IDs", () => {
  const folder = requestSupplierFolderContents([{
    id: "comparison-a",
    bids: [{ supplierId: "frank-new", supplierName: "Frank Supply" }],
    documents: [{ supplierId: "frank-new", fileName: "new.pdf" }],
  }], "frank-old");

  expect(folder).toEqual([]);
});
