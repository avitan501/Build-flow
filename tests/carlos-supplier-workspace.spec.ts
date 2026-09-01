import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

test("Carlos supplier workspace uses staff access and persistent manager goals", async () => {
  const [
    page,
    actions,
    store,
    goalsPage,
    networkPage,
    deliveryPage,
    deliveryStore,
    managerShell,
    workspace,
    catalog,
    scripts,
    affiliateCalls,
  ] = await Promise.all([
    readFile(path.join(root, "app/owner/partnerships/page.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/partnerships/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/supplier-partners/store.ts"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/supplier-network/page.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/delivery-requests/page.tsx"), "utf8"),
    readFile(path.join(root, "lib/delivery-requests.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/supplier-partnership-workspace.tsx"), "utf8"),
    readFile(path.join(root, "lib/supplier-partners/catalog.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/carlos-outreach-scripts.tsx"), "utf8"),
    readFile(path.join(root, "lib/affiliate-call-list.ts"), "utf8"),
  ]);

  expect(page).toContain('requireStaffProfile("suppliers")');
  expect(actions.match(/requireStaffProfile\("suppliers"\)/g)?.length).toBe(2);
  expect(store).toContain('.from("manager_goals")');
  expect(store).toContain('assignee: "carlos"');
  expect(store).toContain("created_by: userId");
  expect(store).not.toContain("createAdminClient");
  expect(store).not.toContain('.from("aura_tasks")');
  expect(goalsPage).toContain('href="/admin/supplier-network"');
  expect(goalsPage).not.toContain("SupplierNetworkWorkspace");
  expect(networkPage).toContain("SupplierNetworkWorkspace");
  expect(networkPage).toContain("buildSupplierNetwork");
  expect(networkPage).toContain("loadSupplierPartnerProgress");
  expect(goalsPage).not.toContain('count: SUPPLIER_PARTNERS.length, href: "/owner/partnerships"');
  expect(networkPage).toContain("SUPPLIER_PARTNERS");
  expect(deliveryPage).toContain('requireStaffProfile("suppliers")');
  expect(deliveryPage).toContain("loadDeliveryRequests(supabase)");
  expect(deliveryStore).not.toContain("createAdminClient");
  expect(managerShell).not.toContain('href: "/owner/partnerships"');
  expect(goalsPage).toContain("Build Supplier Relationships");
  expect(goalsPage).not.toContain("<SupplierRelationshipScripts />");
  expect(goalsPage).toContain("<ContractorCallScript />");
  expect(scripts).toContain("Supplier call");
  expect(scripts).toContain("Contractor call");
  expect(scripts).toContain("export function ContractorCallScript()");
  expect(scripts).toContain("HighlightedScript");
  expect(scripts).toContain('bg-sky-100 text-sky-950');
  expect(scripts).toContain('bg-amber-100 text-amber-950');
  expect(scripts).toContain('bg-emerald-100 text-emerald-950');
  expect(scripts).toContain('<details className="group overflow-hidden');
  const supplierScriptSection = scripts.split("export function SupplierRelationshipScripts()")[1]?.split("export function ContractorCallScript()")[0] ?? "";
  expect(supplierScriptSection).not.toContain('title="Contractor call"');
  expect(goalsPage).not.toContain("ApiAffiliateCallScript");
  expect((affiliateCalls.match(/recommendedScript:/g) ?? []).length).toBe(10);
  expect((affiliateCalls.match(/termsFit:/g) ?? []).length).toBe(10);
  expect(affiliateCalls).toContain("third-party aggregator integration for mutual ABC customers");
  expect(affiliateCalls).toContain("traditional Lowe's affiliate team at CJ");
  expect(page).toContain('body: { action: "status" }');
  expect(actions).toContain('action: "send_email"');
  expect(managerShell).toContain("...(access.suppliers ? [");
  expect(actions).toContain("important: z.boolean().optional()");
  expect(workspace).toContain('useState<"important" | "other">("important")');
  expect(workspace).toContain("Important Suppliers ({counts.important})");
  expect(workspace).toContain("Other Suppliers ({counts.other})");
  expect(workspace).toContain('const importantPartners = partners.filter((partner) => progress[partner.slug]?.important)');
  expect(workspace).toContain('["Important suppliers", counts.total]');
  expect(workspace).not.toContain('["Companies", counts.total]');
  expect(workspace).toContain('type="checkbox" checked={itemProgress.important}');
  expect(catalog).toContain("important: false");
});

test("every Carlos supplier record has working local assets and complete links", async () => {
  const rows = JSON.parse(
    await readFile(path.join(root, "data/supplier-partners.json"), "utf8"),
  ) as Array<Record<string, string>>;
  const catalog = await readFile(
    path.join(root, "lib/supplier-partners/catalog.ts"),
    "utf8",
  );
  const logoOverrides: Record<string, string> = {
    "prime-lumber-and-home-center": "prime-lumber-home-center",
    "central-jersey-screw-and-bolt": "central-jersey-screw-bolt",
    "exclusive-doors-and-moldings": "exclusive-doors-moldings",
    lowes: "lowe-s",
  };

  expect(rows).toHaveLength(44);
  for (const row of rows) {
    expect(row.Company).toBeTruthy();
    expect(row.Phone).toBeTruthy();
    expect(row["What they sell"]).toBeTruthy();
    expect(row["Carlos call opening"]).toBeTruthy();
    expect(row.Website).toMatch(/^https?:\/\//);
    expect(row["Program / contact URL"]).toMatch(/^https?:\/\//);
    expect(row["Research source"]).toMatch(/^https?:\/\//);
    const slug = row.Company.toLowerCase()
      .replace(/&/g, "and")
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    await expect(
      access(
        path.join(
          root,
          "public/images/supplier-partners",
          `${logoOverrides[slug] || slug}.png`,
        ),
      ),
    ).resolves.toBeUndefined();
  }

  expect(catalog).toContain("/images/supplier-partners/");
  expect(catalog).toContain("emailSubject");
  expect(catalog).toContain("emailBody");
});

test("signed-out visitors are redirected away from Carlos pages", async ({
  page,
}) => {
  await page.goto("/owner/partnerships");
  await expect(page).toHaveURL(/\/login\?next=%2Fowner%2Fpartnerships/);

  await page.goto("/owner/delivery-requests");
  await expect(page).toHaveURL(/\/login\?next=%2Fowner%2Fdelivery-requests/);
});
