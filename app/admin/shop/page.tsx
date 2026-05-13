import Link from "next/link";

import { PremiumBackLink, PremiumBadge, PremiumHero, PremiumInfoCard, PremiumMutedPanel, PremiumPageShell, PremiumSection } from "@/components/buildflow/premium-page";
import { requireAdminProfile } from "@/lib/auth";
import type { ShopItemRecord, ShopSupplierEstimateRecord } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";

const SUPPLIER_ESTIMATE_LIMIT = 24;
const SHOP_ITEM_LIMIT = 48;

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatCurrency(value: number | null) {
  if (value == null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

async function loadShopCatalogData() {
  const supabase = await createClient();

  const [{ data: estimates, error: estimatesError }, { data: items, error: itemsError }] = await Promise.all([
    supabase
      .from("shop_supplier_estimates")
      .select("id, supplier_name, quote_number, estimate_date, source_file_name, source_file_path, status, created_by, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(SUPPLIER_ESTIMATE_LIMIT)
      .returns<ShopSupplierEstimateRecord[]>(),
    supabase
      .from("shop_items")
      .select("id, supplier_estimate_id, supplier_name, quote_number, pricing_date, item_number, name, description, category, quantity, unit, unit_price, extended_price, source, image_url, image_alt, image_source, image_license, image_credit, image_category, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(SHOP_ITEM_LIMIT)
      .returns<ShopItemRecord[]>(),
  ]);

  if (estimatesError) {
    throw new Error(`Failed to load supplier estimates: ${estimatesError.message}`);
  }

  if (itemsError) {
    throw new Error(`Failed to load shop items: ${itemsError.message}`);
  }

  return {
    estimates: estimates ?? [],
    items: items ?? [],
  };
}

export default async function AdminShopPage() {
  await requireAdminProfile();
  const { estimates, items } = await loadShopCatalogData();
  const latestEstimate = estimates[0] ?? null;

  return (
    <PremiumPageShell>
      <PremiumHero
        eyebrow="Admin Shop"
        title="Supplier Catalog"
        description="Read-only view of supplier estimates and saved shop items before anything is copied into project materials."
        badges={
          <>
            <PremiumBadge>Admin only</PremiumBadge>
            <PremiumBadge tone="emerald">Live Supabase read</PremiumBadge>
            <PremiumBadge tone="amber">Read-only</PremiumBadge>
          </>
        }
        aside={<PremiumBackLink href="/admin/materials">Back to Admin Materials</PremiumBackLink>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumInfoCard label="Supplier estimates count" value={estimates.length} />
        <PremiumInfoCard label="Shop items count" value={items.length} />
        <PremiumInfoCard label="Latest supplier name" value={latestEstimate?.supplier_name || "—"} />
        <PremiumInfoCard label="Latest estimate date" value={formatDate(latestEstimate?.estimate_date ?? null)} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <PremiumSection
          title="Supplier estimates"
          description="Latest supplier estimate records saved in the Shop catalog tables."
        >
          {estimates.length === 0 ? (
            <PremiumMutedPanel>No supplier estimates imported yet</PremiumMutedPanel>
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-sky-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-sky-100 text-left text-sm text-slate-700">
                  <thead className="bg-sky-50/70 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3">Quote #</th>
                      <th className="px-4 py-3">Estimate date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100 bg-white">
                    {estimates.map((estimate) => (
                      <tr key={estimate.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{estimate.supplier_name}</td>
                        <td className="px-4 py-3">{estimate.quote_number || "—"}</td>
                        <td className="px-4 py-3">{formatDate(estimate.estimate_date)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                            {estimate.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">{formatDate(estimate.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </PremiumSection>

        <PremiumSection title="Shop items" description="Latest supplier catalog items stored for later project selection.">
          {items.length === 0 ? (
            <PremiumMutedPanel>No shop items saved yet</PremiumMutedPanel>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <article key={item.id} className="rounded-[24px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.9))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                      <div className="mt-1 text-sm text-slate-600">{item.supplier_name}</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{formatCurrency(item.unit_price)}</div>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Item #</dt>
                      <dd className="mt-1">{item.item_number || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Unit</dt>
                      <dd className="mt-1">{item.unit || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Pricing date</dt>
                      <dd className="mt-1">{formatDate(item.pricing_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quote #</dt>
                      <dd className="mt-1">{item.quote_number || "—"}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </PremiumSection>
      </div>

      <PremiumSection title="Guardrails" description="This route stays read-only until import and review flows are approved.">
        <PremiumMutedPanel tone="amber">
          No parser, no file upload, no Supabase writes, and no project material insertion happen from this page yet.
        </PremiumMutedPanel>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-slate-700">
          <Link href="/admin/vendors" className="rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">Vendors</Link>
          <Link href="/admin/materials" className="rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">Materials</Link>
        </div>
      </PremiumSection>
    </PremiumPageShell>
  );
}
