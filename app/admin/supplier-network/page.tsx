import { ArrowLeft, Building2, UsersRound } from "lucide-react";
import Link from "next/link";

import { SupplierNetworkWorkspace } from "@/components/buildflow/supplier-network-workspace";
import type { AffiliateProgram } from "@/lib/affiliate-tracker";
import { requireManagerPortalProfile } from "@/lib/auth";
import { SUPPLIER_PARTNERS } from "@/lib/supplier-partners/catalog";
import { loadSupplierPartnerProgress } from "@/lib/supplier-partners/store";
import { buildSupplierNetwork } from "@/lib/supplier-network";
import { loadSupplierNetworkOptions } from "@/lib/supplier-network-options";

export default async function SupplierNetworkPage() {
  const { supabase, access } = await requireManagerPortalProfile();
  const [progress, programResult, channelOverrides] = await Promise.all([
    loadSupplierPartnerProgress(supabase).catch(() => ({})),
    access.owner
      ? supabase
          .from("affiliate_programs")
          .select("*")
          .order("priority")
          .order("supplier_name")
          .returns<AffiliateProgram[]>()
      : Promise.resolve({ data: [] as AffiliateProgram[], error: null }),
    loadSupplierNetworkOptions(supabase).catch(() => ({})),
  ]);
  const rows = buildSupplierNetwork({
    programs: programResult.data ?? [],
    partners: SUPPLIER_PARTNERS,
    progress,
    channelOverrides,
  });

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-5 sm:py-8">
        <Link
          href="/admin/goals-progress"
          className="mb-4 inline-flex h-9 items-center gap-2 rounded-md px-2 text-xs font-semibold text-[#0066cc] transition hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Carlos Dashboard
        </Link>

        <header className="mb-4 flex flex-col gap-3 rounded-xl bg-[#071225] px-4 py-4 text-white shadow-sm sm:flex-row sm:items-end sm:justify-between sm:px-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-sky-300">
              Supplier network
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Build Supplier Relationships
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-300">
              See who sells what, which channel is available, and exactly what
              Carlos should ask next.
            </p>
          </div>
          <div className="flex gap-2 text-[10px] font-bold">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-2">
              <Building2 className="h-3.5 w-3.5" />
              {rows.length} suppliers
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-400/15 px-2.5 py-2 text-sky-200">
              <UsersRound className="h-3.5 w-3.5" />
              One workspace
            </span>
          </div>
        </header>

        <SupplierNetworkWorkspace rows={rows} />

        <div className="mt-3 flex justify-end">
          <Link
            href="/owner/partnerships"
            className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-[#0066cc] shadow-sm"
          >
            Open full supplier records
          </Link>
        </div>
      </div>
    </main>
  );
}
