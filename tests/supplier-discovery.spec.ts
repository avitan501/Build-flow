import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  selectSafeSupplierCandidates,
  SUPPLIER_DISCOVERY_RESULT_LIMIT,
} from "../lib/supplier-discovery";
import {
  canonicalSupplierName,
  normalizeSupplierDomain,
  safeSupplierSourceUrl,
  supplierIdentityKeys,
} from "../lib/supplier-identity";

const root = process.cwd();

test("supplier identities normalize known aliases, legal suffixes, and branch hosts", () => {
  expect(canonicalSupplierName("The Home Depot Pro, Inc.")).toBe("home depot");
  expect(canonicalSupplierName("ABC Supply Co.")).toBe("abc supply");
  expect(normalizeSupplierDomain("https://locations.example-supply.com/store/1")).toBe(
    "example-supply.com",
  );
  expect(supplierIdentityKeys({
    name: "Example Supply LLC",
    url: "https://www.example-supply.com/roofing",
  })).toEqual(["domain:example-supply.com", "name:example supply"]);
});

test("supplier discovery returns at most ten unique source-backed candidates", () => {
  const sources = Array.from({ length: 14 }, (_, index) => ({
    title: `Supplier ${index + 1} | Official Site`,
    url: `https://supplier-${index + 1}.example.com/contractors`,
    summary: `Source evidence for supplier ${index + 1}.`,
  }));
  sources.splice(3, 0, {
    title: "Supplier 1 duplicate",
    url: "https://shop.supplier-1.example.com/roofing",
    summary: "Duplicate branch page.",
  });

  const candidates = selectSafeSupplierCandidates({ sources });

  expect(candidates).toHaveLength(SUPPLIER_DISCOVERY_RESULT_LIMIT);
  expect(new Set(candidates.map((candidate) => candidate.identity)).size).toBe(10);
  expect(candidates.every((candidate) => candidate.reviewStatus === "needs-review")).toBe(true);
});

test("supplier discovery rejects unsafe and directory-style links", () => {
  expect(safeSupplierSourceUrl("http://supplier.example.com")).toBeNull();
  expect(safeSupplierSourceUrl("https://user:secret@supplier.example.com")).toBeNull();
  expect(safeSupplierSourceUrl("https://127.0.0.1/supplier")).toBeNull();
  expect(safeSupplierSourceUrl("https://www.google.com/search?q=suppliers")).toBeNull();
  expect(safeSupplierSourceUrl("https://maps.google.com/suppliers")).toBeNull();

  const candidates = selectSafeSupplierCandidates({
    sources: [
      { title: "HTTP supplier", url: "http://supplier.example.com" },
      { title: "Search result", url: "https://www.google.com/search?q=supplier" },
      { title: "", url: "https://unnamed.example.com" },
      {
        title: "Safe Building Supply | Official Site",
        url: "https://safe-building.example.com/departments/roofing#top",
        summary: "Roofing and exterior materials.",
      },
    ],
  });

  expect(candidates).toEqual([
    expect.objectContaining({
      name: "Safe Building Supply",
      domain: "safe-building.example.com",
      url: "https://safe-building.example.com/departments/roofing",
    }),
  ]);
});

test("supplier discovery deduplicates against canonical directory identities and prior batches", () => {
  const candidates = selectSafeSupplierCandidates({
    sources: [
      {
        title: "ABC Supply Company | Roofing",
        url: "https://branch-directory.example.net/abc",
      },
      {
        title: "Other Supply LLC | Official Site",
        url: "https://locations.other-supply.example.com/branch",
      },
      {
        title: "Fresh Supply | Official Site",
        url: "https://fresh-supply.example.com",
      },
    ],
    existingSuppliers: [
      { name: "ABC Supply Co.", url: "https://www.abcsupply.com" },
      { name: "Other Supply", url: "https://other-supply.example.com" },
    ],
    excludedIdentities: ["domain:already-seen.example.com"],
  });

  expect(candidates.map((candidate) => candidate.name)).toEqual(["Fresh Supply"]);
});

test("candidate payloads never manufacture contact fields", () => {
  const [candidate] = selectSafeSupplierCandidates({
    sources: [
      {
        title: "Source Verified Supply | Official Site",
        url: "https://verified-supply.example.com",
        summary: "Official page evidence only.",
      },
    ],
  });

  expect(candidate).toBeTruthy();
  expect(Object.keys(candidate ?? {})).toEqual([
    "identity",
    "name",
    "url",
    "domain",
    "summary",
    "reviewStatus",
  ]);
  expect(candidate).not.toHaveProperty("email");
  expect(candidate).not.toHaveProperty("phone");
  expect(candidate).not.toHaveProperty("contactName");
});

test("supplier discovery UI and server actions enforce review without outreach", async () => {
  const [workspace, actions, route] = await Promise.all([
    readFile(
      path.join(root, "components/buildflow/supplier-network-workspace.tsx"),
      "utf8",
    ),
    readFile(path.join(root, "app/admin/supplier-network/actions.ts"), "utf8"),
    readFile(path.join(root, "app/api/admin/suppliers/discover/route.ts"), "utf8"),
  ]);

  expect(workspace).toContain("Generate 10 more");
  expect(workspace).toContain("Review candidate");
  expect(workspace).toContain("Verified supplier name");
  expect(workspace).toContain("Add to More suppliers");
  expect(workspace).toContain("no outreach is sent");
  expect(workspace).toContain("Contact details are");
  expect(actions).toContain("reviewConfirmed: z.literal(true)");
  expect(actions).toContain("Confirm the supplier review before promoting this candidate.");
  expect(actions.indexOf("staff_load_supplier_directory_snapshot")).toBeLessThan(
    actions.indexOf("staff_upsert_supplier_directory_entry"),
  );
  expect(route).toContain("selectSafeSupplierCandidates");
  expect(route).toContain("excludeIdentities");
  expect(route).not.toContain("salesContacts");
  expect(`${workspace}\n${actions}\n${route}`).not.toContain("send-supplier-quote");
});
