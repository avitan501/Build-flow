import Link from "next/link";

import { PremiumBackLink, PremiumBadge, PremiumHero, PremiumMutedPanel, PremiumPageShell, PremiumSection } from "@/components/buildflow/premium-page";
import { requireAdminProfile } from "@/lib/auth";

export default async function AdminShopPage() {
  await requireAdminProfile();

  return (
    <PremiumPageShell>
      <PremiumHero
        eyebrow="Admin Shop"
        title="Supplier Catalog Import"
        description="Safe admin-only foundation for supplier estimate intake before any items are pushed into project materials."
        badges={
          <>
            <PremiumBadge>Admin only</PremiumBadge>
            <PremiumBadge tone="amber">Draft-only foundation</PremiumBadge>
          </>
        }
        aside={<PremiumBackLink href="/admin/materials">Back to Admin Materials</PremiumBackLink>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <PremiumSection title="Planned import flow" description="Keep supplier estimates in Shop first, then let admins choose what moves into project materials later.">
          <ol className="space-y-2 text-sm leading-6 text-slate-700">
            <li>1. Upload a supplier estimate PDF or image into an admin-only intake.</li>
            <li>2. Extract supplier, quote details, and line items into a draft review screen.</li>
            <li>3. Save approved draft rows into Shop tables, not project_materials.</li>
            <li>4. Add a later action to copy selected Shop items into a chosen project.</li>
          </ol>
        </PremiumSection>

        <PremiumSection title="Guardrails" description="This route is intentionally limited while the data layer is being set up.">
          <PremiumMutedPanel tone="amber">
            No parser, no real file upload, no Supabase writes, and no project material insertion happen from this page yet.
          </PremiumMutedPanel>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-slate-700">
            <Link href="/admin/vendors" className="rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">Vendors</Link>
            <Link href="/admin/materials" className="rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">Materials</Link>
          </div>
        </PremiumSection>
      </div>
    </PremiumPageShell>
  );
}
