import { PremiumBackLink, PremiumBadge, PremiumEmptyState, PremiumHero, PremiumInfoCard, PremiumMutedPanel, PremiumPageShell, PremiumPhotoPanel, PremiumPrimaryButton, PremiumSection } from "@/components/buildflow/premium-page";
import type { ShopItemRecord } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";

const shopHeroImage =
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=80";
const shopEmptyImage =
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1400&q=80";

function formatCurrency(value: number | null) {
  if (value == null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default async function ShopPage() {
  const supabase = await createClient();
  const { data: itemsData, error } = await supabase
    .from("shop_items")
    .select("id, supplier_estimate_id, supplier_name, quote_number, pricing_date, item_number, name, description, category, quantity, unit, unit_price, extended_price, source, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(24)
    .returns<ShopItemRecord[]>();

  const items = error ? [] : itemsData ?? [];

  return (
    <PremiumPageShell>
      <PremiumHero
        eyebrow="BuildFlow Shop"
        title="Supplier catalog"
        description="Browse supplier catalog items, search materials, and later add selected items into the right project material list."
        badges={
          <>
            <PremiumBadge tone="sky">Read only</PremiumBadge>
            <PremiumBadge tone="amber">No cart</PremiumBadge>
          </>
        }
        aside={<PremiumBackLink href="/projects">Open Projects</PremiumBackLink>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.04fr_0.96fr]">
        <div className="grid gap-4">
          <PremiumPhotoPanel
            image={shopHeroImage}
            eyebrow="Client catalog"
            title="A cleaner front door to supplier materials"
            description="Use Shop to review what is already in the supplier catalog before anything gets tied to a project workflow."
            badge={<PremiumBadge tone="amber">Catalog view</PremiumBadge>}
          />

          <PremiumSection title="What this page is for" description="Client-facing catalog browsing only for now.">
            <div className="grid gap-3 sm:grid-cols-3">
              <PremiumInfoCard label="Browse supplier catalog items" value="Yes" />
              <PremiumInfoCard label="Search materials" value="Use Search or Shop" />
              <PremiumInfoCard label="Add to project later" value="Coming soon" />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <PremiumPrimaryButton href="/search">Search materials</PremiumPrimaryButton>
              <PremiumBackLink href="/projects">Go to projects</PremiumBackLink>
            </div>
          </PremiumSection>
        </div>

        <PremiumSection title="Current guardrails" description="This page stays intentionally safe and simple.">
          <PremiumMutedPanel tone="amber">
            No cart, no checkout, no direct ordering, no payments, and no supplier import actions are available here yet.
          </PremiumMutedPanel>
          {error ? (
            <div className="mt-4">
              <PremiumMutedPanel>
                Shop items are not available to this session right now, so the page is falling back to the empty catalog state.
              </PremiumMutedPanel>
            </div>
          ) : null}
        </PremiumSection>
      </div>

      <PremiumSection title="Catalog items" description="Read-only supplier catalog items saved by admin import.">
        {items.length === 0 ? (
          <PremiumEmptyState
            image={shopEmptyImage}
            eyebrow="Shop catalog"
            title="No shop items available yet"
            description="Supplier catalog items will appear here after admin import."
            action={<PremiumBackLink href="/search">Search materials</PremiumBackLink>}
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="rounded-[24px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.9))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.supplier_name}</p>
                  </div>
                  <PremiumBadge>{item.category || "Catalog item"}</PremiumBadge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description || "Saved supplier catalog item ready for later project selection."}</p>
                <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Unit price</dt>
                    <dd className="mt-1 font-semibold text-slate-900">{formatCurrency(item.unit_price)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Unit</dt>
                    <dd className="mt-1">{item.unit || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Item #</dt>
                    <dd className="mt-1">{item.item_number || "—"}</dd>
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
    </PremiumPageShell>
  );
}
