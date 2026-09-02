import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import type { AffiliateProgram } from "@/lib/affiliate-tracker";
import { AFFILIATE_CALL_TARGETS } from "@/lib/affiliate-call-list";
import {
  canonicalSupplierDirectory,
  canonicalSupplierId,
  canonicalSupplierKey,
  findCanonicalSupplier,
  mergeCanonicalSupplierSourceRefs,
  resolveRequestSupplierRouteSelections,
  uniqueCanonicalSupplierNames,
} from "@/lib/supplier-canonical";
import { buildSupplierNetwork } from "@/lib/supplier-network";
import {
  emptySupplierPartnerProgress,
  SUPPLIER_PARTNERS,
} from "@/lib/supplier-partners/catalog";

function affiliateProgram(
  overrides: Partial<AffiliateProgram> = {},
): AffiliateProgram {
  return {
    id: "affiliate-home-depot",
    supplier_name: "Home Depot",
    priority: "A",
    affiliate_status: "In Progress",
    api_status: "Not Started",
    category: "Research category",
    new_york_access: "New York",
    affiliate_network: "Impact",
    published_commission: "1%",
    commission_min: 1,
    commission_max: 1,
    cookie_window: "24 hours",
    cookie_days: 1,
    application_difficulty: 3,
    approval_outlook: "Medium",
    avantia_fit: 5,
    application_url: "https://research.example/home-depot",
    retailer_url: null,
    application_date: null,
    application_email: null,
    confirmation_received: null,
    last_contact_date: null,
    next_follow_up_date: null,
    approval_date: null,
    setup_date: null,
    assigned_owner: null,
    next_action: "Research next action",
    notes: "",
    application_requirements: "",
    program_restrictions: "",
    approved_commission: null,
    approved_promotional_methods: null,
    safe_tracking_id: null,
    product_feeds_allowed: null,
    deep_links_allowed: null,
    api_allowed: null,
    product_images_allowed: null,
    affiliate_test_url: null,
    affiliate_tested_at: null,
    last_verified_date: "2026-09-02",
    updated_at: "2026-09-02T00:00:00.000Z",
    ...overrides,
  };
}

test("supplier aliases resolve to one stable cross-source identity", () => {
  expect(canonicalSupplierKey("The Home Depot Pro")).toBe("home depot");
  expect(canonicalSupplierKey("Home Depot")).toBe("home depot");
  expect(canonicalSupplierKey("Lowe’s Creator")).toBe("lowes");
  expect(canonicalSupplierKey("Lowe's")).toBe("lowes");
  expect(canonicalSupplierKey("ABC Supply Co.")).toBe("abc supply");
  expect(canonicalSupplierKey("ABC Supply API / Integration Partnership")).toBe(
    "abc supply",
  );
  expect(canonicalSupplierId("The Home Depot Pro")).toBe("home-depot");
  expect(canonicalSupplierId("Home Depot")).toBe("home-depot");
  expect(uniqueCanonicalSupplierNames(["Home Depot", "The Home Depot Pro"])).toEqual([
    "Home Depot",
  ]);
});

test("canonical directory selection prefers the strongest saved record", () => {
  const directory = [
    { id: "home-depot-old", name: "The Home Depot", trustLevel: "first-time" as const },
    { id: "home-depot-current", name: "Home Depot Pro", trustLevel: "preferred" as const, phone: "+1 516 555 0199" },
    { id: "abc-supply", name: "ABC Supply", trustLevel: "verified" as const },
  ];

  expect(findCanonicalSupplier(directory, { name: "Home Depot" })?.id).toBe(
    "home-depot-current",
  );
  expect(canonicalSupplierDirectory(directory).map((supplier) => supplier.id)).toEqual([
    "home-depot-current",
    "abc-supply",
  ]);
});

test("saved request routes follow current directory names and retain text ids", () => {
  const selections = resolveRequestSupplierRouteSelections(
    [
      {
        metadata: {
          supplier_route_names: ["The Home Depot", "Home Depot Pro", "ABC Supply"],
          supplier_route_entries: [
            { supplier_id: "home-depot-current", name: "The Home Depot" },
          ],
          supplier_route_notes: {
            "The Home Depot": "Call the pro desk.",
          },
        },
      },
    ],
    [
      { id: "home-depot-current", name: "Home Depot Pro" },
      { id: "abc-supply", name: "ABC Supply API / Integration Partnership" },
    ],
  );

  expect(selections).toEqual([
    {
      supplierId: "home-depot-current",
      name: "Home Depot Pro",
      note: "Call the pro desk.",
    },
    {
      supplierId: "abc-supply",
      name: "ABC Supply API / Integration Partnership",
      note: "",
    },
  ]);
});

test("source references remain unique without discarding historical IDs", () => {
  expect(
    mergeCanonicalSupplierSourceRefs(
      [{ source: "directory", sourceId: "supplier-1" }],
      [
        { source: "directory", sourceId: "supplier-1" },
        { source: "affiliate_program", sourceId: "program-1" },
      ],
    ),
  ).toEqual([
    { source: "directory", sourceId: "supplier-1" },
    { source: "affiliate_program", sourceId: "program-1" },
  ]);
});

test("canonical rows retain every researched and show source record", () => {
  const progress = Object.fromEntries(
    SUPPLIER_PARTNERS.map((partner) => [
      partner.slug,
      { ...emptySupplierPartnerProgress(partner), important: true },
    ]),
  );
  const rows = buildSupplierNetwork({
    partners: SUPPLIER_PARTNERS,
    progress,
  });
  const refs = rows.flatMap((row) => row.sourceRefs);

  expect(
    new Set(
      refs
        .filter((ref) => ref.source === "researched_target")
        .map((ref) => ref.sourceId),
    ).size,
  ).toBe(AFFILIATE_CALL_TARGETS.length);
  expect(
    new Set(
      refs
        .filter((ref) => ref.source === "show_partner")
        .map((ref) => ref.sourceId),
    ).size,
  ).toBe(SUPPLIER_PARTNERS.length);
});

test("the live directory is authoritative while every source ID stays linked", () => {
  const rows = buildSupplierNetwork({
    programs: [affiliateProgram()],
    partners: [],
    progress: {},
    directorySuppliers: [
      {
        id: "directory-home-depot-old",
        name: "The Home Depot",
        contactLabel: "Pro desk",
        phone: "+1 516 555 0101",
        portalUrl: "https://directory.example/home-depot",
        deliveryNotes: "Use David's saved Pro desk route.",
        notes: "Saved relationship history remains in the directory.",
        catalogDepartments: ["Building materials"],
        programChannels: ["Trade"],
        trustLevel: "verified",
      },
      {
        id: "directory-home-depot-current",
        name: "Home Depot Pro",
        contactLabel: "Current Pro desk",
        phone: "+1 516 555 0199",
        portalUrl: "https://directory.example/current-home-depot",
        deliveryNotes: "Use the current saved route.",
        notes: "Current directory note.",
        catalogDepartments: ["Building materials", "Tools"],
        programChannels: ["Trade"],
        trustLevel: "preferred",
      },
    ],
  });
  const row = rows.find((candidate) => candidate.key === "home depot");

  expect(row).toMatchObject({
    name: "Home Depot Pro",
    phone: "+1 516 555 0199",
    link: "https://directory.example/current-home-depot",
    ask: "Use the current saved route.",
    note: "Current directory note.",
    stage: "approved",
    priority: true,
    directorySupplierId: "directory-home-depot-current",
  });
  expect(row?.directorySupplierIds).toEqual([
    "directory-home-depot-old",
    "directory-home-depot-current",
  ]);
  expect(row?.sourceRefs).toEqual(
    expect.arrayContaining([
      { source: "researched_target", sourceId: "48" },
      { source: "affiliate_program", sourceId: "affiliate-home-depot" },
      { source: "directory", sourceId: "directory-home-depot-old" },
      { source: "directory", sourceId: "directory-home-depot-current" },
    ]),
  );
});

test("network, directory, and request routes use the shared canonical adapter", async () => {
  const root = process.cwd();
  const [networkActions, directoryActions, requestActions, requestPage, routeEditor, requestPanel] = await Promise.all([
    readFile(path.join(root, "app/admin/supplier-network/actions.ts"), "utf8"),
    readFile(path.join(root, "app/admin/vendors/actions.ts"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/[requestId]/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/request-supplier-route-editor.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8"),
  ]);

  expect(networkActions).toContain("findCanonicalSupplier");
  expect(networkActions).toContain("canonicalSupplierId");
  expect(directoryActions).toContain("findCanonicalSupplier");
  expect(directoryActions).toContain("canonicalSupplierId");
  expect(directoryActions).toContain('revalidatePath("/admin/supplier-network")');
  expect(requestActions).toContain("uniqueCanonicalSupplierNames");
  expect(requestActions).toContain('rpc("staff_upsert_supplier_directory_entry"');
  expect(requestActions).toContain("supplier_route_entries: supplierRouteEntries");
  expect(requestActions).toContain('revalidatePath("/admin/vendors")');
  expect(requestPage).toContain("resolveRequestSupplierRouteSelections(items ?? [], suppliers)");
  expect(requestPage).toContain("canonicalSupplierDirectory(");
  expect(routeEditor).toContain("resolveRequestSupplierRouteSelections");
  expect(routeEditor).toContain("canonicalSupplierKey(entry) === key");
  expect(requestPanel).toContain("findCanonicalSupplier(availableSuppliers, selection)");
});
