import Link from "next/link";
import { redirect } from "next/navigation";
import { BookMarked, ChevronLeft, LockKeyhole, Search } from "lucide-react";

import { requireManagerPortalProfile } from "@/lib/auth";
import {
  retrieveInternalAuraDocuments,
  type AuraInternalKnowledgeDocument,
} from "@/lib/aura/internal-library";
import { formatSiteDate } from "@/lib/site-date-time";

export default async function InternalAuraLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const { supabase, access } = await requireManagerPortalProfile();
  if (!access.aiTools || !access.owner) redirect("/");

  const { data, error } = await supabase
    .from("aura_internal_knowledge_documents")
    .select("id,slug,title,summary,category,content_markdown,tags,source_refs,status,retrieval_only,customer_send_allowed,reviewed_at,updated_at")
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(100)
    .returns<AuraInternalKnowledgeDocument[]>();
  const query = String(params.q || "").trim().replace(/\s+/g, " ").slice(0, 200);
  const documents = retrieveInternalAuraDocuments(data ?? [], query, 20);

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin/ai-tools" className="inline-flex items-center gap-1 text-xs font-bold text-sky-700">
          <ChevronLeft className="h-4 w-4" />Manager Tools
        </Link>

        <header className="mt-4 rounded-2xl bg-slate-950 px-5 py-6 text-white shadow-lg sm:px-7">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500"><BookMarked className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-200">Owner-only retrieval</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Internal Aura Library</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Operational playbooks, source rules, and future implementation guidance. Stored separately from customer reply knowledge.</p>
            </div>
          </div>
        </header>

        <section className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 text-emerald-700" /><div><h2 className="text-sm font-bold text-emerald-950">Retrieval only — never customer-sendable</h2><p className="mt-1 text-xs leading-5 text-emerald-900">Database constraints force every document in this library to remain internal. Aura messaging does not query this table.</p></div></div>
        </section>

        <form method="get" className="mt-4 flex gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <label htmlFor="library-search" className="sr-only">Search internal Aura knowledge</label>
          <input id="library-search" name="q" defaultValue={query} maxLength={200} placeholder="Search sources, PDF workflow, repeated questions, SMS…" className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm" />
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 text-sm font-bold text-white"><Search className="h-4 w-4" />Retrieve</button>
        </form>

        {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">The internal library could not be loaded.</p> : null}
        <section className="mt-4 space-y-3" aria-label="Internal Aura documents">
          {documents.map((document, index) => (
            <details key={document.id} open={Boolean(query) || index === 0} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <summary className="cursor-pointer list-none px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-violet-700">{document.category}</p><h2 className="mt-1 text-base font-bold text-slate-950">{document.title}</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">{document.summary}</p></div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">Internal only</span>
                </div>
              </summary>
              <div className="border-t border-slate-200 px-4 py-4 sm:px-5">
                <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{document.content_markdown}</div>
                <div className="mt-4 flex flex-wrap gap-1.5">{document.tags.map((tag) => <span key={tag} className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{tag}</span>)}</div>
                <p className="mt-3 text-[10px] text-slate-400">Reviewed {document.reviewed_at ? formatSiteDate(document.reviewed_at) : "internally"} · {document.slug}</p>
              </div>
            </details>
          ))}
          {!documents.length && !error ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No internal document matches this search.</p> : null}
        </section>
      </div>
    </main>
  );
}
