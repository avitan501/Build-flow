import { ArrowRight, Award, Building2, Columns3, PackageCheck, Scale } from "lucide-react";
import Link from "next/link";

import { QuoteComparisonCreateForm } from "@/components/buildflow/quote-comparison-create-form";
import { requireStaffProfile } from "@/lib/auth";
import { quoteComparisonStatusLabel, type QuoteComparisonRecord } from "@/lib/quote-comparison";

type ProjectOption = { id: string; name: string; address: string | null };
type CountRow = { comparison_id: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function statusClass(status: QuoteComparisonRecord["status"]) {
  if (status === "awarded") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "review") return "border-sky-200 bg-sky-50 text-sky-800";
  if (status === "archived") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export default async function QuoteComparisonPage() {
  const { supabase } = await requireStaffProfile("suppliers");
  const [comparisonsResult, projectsResult] = await Promise.all([
    supabase.from("quote_comparisons").select("*").order("updated_at", { ascending: false }).limit(100).returns<QuoteComparisonRecord[]>(),
    supabase.from("projects").select("id,name,address").order("updated_at", { ascending: false }).limit(150).returns<ProjectOption[]>(),
  ]);

  const comparisons = comparisonsResult.data ?? [];
  const comparisonIds = comparisons.map((comparison) => comparison.id);
  const [itemsResult, bidsResult] = comparisonIds.length
    ? await Promise.all([
        supabase.from("quote_comparison_items").select("comparison_id").in("comparison_id", comparisonIds).returns<CountRow[]>(),
        supabase.from("quote_comparison_bids").select("comparison_id").in("comparison_id", comparisonIds).returns<CountRow[]>(),
      ])
    : [{ data: [] as CountRow[] }, { data: [] as CountRow[] }];

  const projects = projectsResult.data ?? [];
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const itemCounts = new Map<string, number>();
  const bidCounts = new Map<string, number>();
  for (const item of itemsResult.data ?? []) itemCounts.set(item.comparison_id, (itemCounts.get(item.comparison_id) ?? 0) + 1);
  for (const bid of bidsResult.data ?? []) bidCounts.set(bid.comparison_id, (bidCounts.get(bid.comparison_id) ?? 0) + 1);

  const schemaReady = !comparisonsResult.error;
  const active = comparisons.filter((comparison) => !["awarded", "archived"].includes(comparison.status)).length;
  const awarded = comparisons.filter((comparison) => comparison.status === "awarded").length;
  const quoteCount = [...bidCounts.values()].reduce((total, count) => total + count, 0);
  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-16 pt-6 text-slate-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0071e3]">Manager Portal</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Supplier Quote Comparison</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Enter supplier pricing side by side. The system checks delivered cost, missing items, lead time, and supplier trust before recommending a winner.</p>
          </div>
          <QuoteComparisonCreateForm enabled={schemaReady} />
        </header>

        {!schemaReady ? (
          <div className="mt-5 border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <p className="font-bold">Database update required</p>
            <p className="mt-1">The page is ready, but comparisons cannot be saved until the new quote-comparison migration is reviewed and applied.</p>
          </div>
        ) : null}

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Quote comparison summary">
          {[
            { label: "Active comparisons", value: active, icon: Columns3 },
            { label: "Supplier quotes", value: quoteCount, icon: Building2 },
            { label: "Suppliers selected", value: awarded, icon: Award },
            { label: "Total comparisons", value: comparisons.length, icon: Scale },
          ].map((metric) => (
            <div key={metric.label} className="border border-slate-200 bg-white p-4 shadow-sm">
              <metric.icon className="h-5 w-5 text-[#0071e3]" />
              <p className="mt-4 text-2xl font-bold tabular-nums">{metric.value}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{metric.label}</p>
            </div>
          ))}
        </section>

        <section className="mt-5 border border-slate-200 bg-white shadow-sm" aria-labelledby="comparisons-heading">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h2 id="comparisons-heading" className="text-lg font-bold">Comparisons</h2>
              <p className="mt-1 text-xs text-slate-500">Drafts, reviews, and awarded supplier packages</p>
            </div>
            <PackageCheck className="h-5 w-5 text-slate-400" />
          </div>

          {comparisons.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {comparisons.map((comparison) => {
                const project = comparison.project_id ? projectById.get(comparison.project_id) : null;
                return (
                  <Link key={comparison.id} href={`/admin/quote-comparison/${comparison.id}`} className="group grid gap-3 px-5 py-4 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-bold text-slate-950">{comparison.title}</h3>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${statusClass(comparison.status)}`}>{quoteComparisonStatusLabel(comparison.status)}</span>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-600">{comparison.job_address || project?.address || project?.name || "No project address"}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                        <span>{comparison.department || "General materials"}</span>
                        <span>{itemCounts.get(comparison.id) ?? 0} materials</span>
                        <span>{bidCounts.get(comparison.id) ?? 0} supplier quotes</span>
                        <span>Updated {formatDate(comparison.updated_at)}</span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-[#0071e3]">Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-14 text-center sm:px-6">
              <Columns3 className="mx-auto h-9 w-9 text-slate-300" />
              <h3 className="mt-4 text-lg font-bold">No comparisons yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Create the first comparison, add the materials, then enter each supplier’s quote.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
