import { ArrowLeft, LockKeyhole, Rows3 } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";

import { lockWebsiteWorkAction } from "@/app/admin/goals-progress/website-work/actions";
import { WebsiteWorkPinForm } from "@/components/buildflow/website-work-pin-form";
import { requireManagerPortalProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { verifyWebsiteWorkToken, WEBSITE_WORK_COOKIE } from "@/lib/website-work-access";

type WebsiteWorkItem = {
  id: string;
  title: string;
  category: string;
  status: string;
  assigned_agent: string | null;
  progress_percent: number;
  summary: string;
  next_step: string;
  updated_at: string;
};

const categoryLabels: Record<string, string> = {
  ai_communications: "AI & communications",
  documents_catalog: "Documents & catalog",
  requests_quotes: "Requests & quotes",
  suppliers_pricing: "Suppliers & pricing",
  carlos_focus: "Carlos Focus",
  website_ux: "Website",
  integrations: "Integrations",
  infrastructure: "Infrastructure",
};

const statusStyles: Record<string, string> = {
  in_progress: "bg-sky-50 text-sky-700 ring-sky-200",
  testing: "bg-violet-50 text-violet-700 ring-violet-200",
  ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  blocked: "bg-amber-50 text-amber-800 ring-amber-200",
  open: "bg-slate-100 text-slate-700 ring-slate-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default async function WebsiteWorkPage() {
  const { user, access } = await requireManagerPortalProfile();
  if (!access.tasks) return null;
  const cookieStore = await cookies();
  const unlocked = verifyWebsiteWorkToken(cookieStore.get(WEBSITE_WORK_COOKIE)?.value, user.id);

  if (!unlocked) {
    return <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-[#f5f5f7] px-4 py-10"><WebsiteWorkPinForm /></main>;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("website_work_items")
    .select("id,title,category,status,assigned_agent,progress_percent,summary,next_step,updated_at")
    .not("status", "in", "(completed,superseded,archived)")
    .order("priority")
    .order("category")
    .order("sort_order")
    .returns<WebsiteWorkItem[]>();
  if (error) throw new Error("The website work board could not load.");
  const items = data ?? [];
  const groups = Object.entries(Object.groupBy(items, (item) => item.category));

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-3 py-5 text-slate-950 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <Link href="/admin/goals-progress" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" />Carlos Focus</Link>
            <div className="mt-3 flex items-center gap-3"><span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white"><Rows3 className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#0066cc]">Live work board</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Website tasks</h1></div></div>
            <p className="mt-2 text-sm text-slate-600">Only open work · latest decision wins · {items.length} items</p>
          </div>
          <form action={lockWebsiteWorkAction}><button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"><LockKeyhole className="h-3.5 w-3.5" />Lock</button></form>
        </header>

        <div className="mt-5 grid gap-5">
          {groups.map(([category, categoryItems]) => (
            <section key={category} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3"><h2 className="text-xs font-bold uppercase tracking-[.12em] text-slate-700">{categoryLabels[category] ?? category}</h2><span className="text-[11px] font-semibold text-slate-500">{categoryItems?.length ?? 0}</span></header>
              <div className="hidden grid-cols-[minmax(12rem,1.2fr)_7rem_6rem_5rem_minmax(13rem,1.4fr)] gap-3 border-b border-slate-100 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 md:grid"><span>Task</span><span>Status</span><span>Owner</span><span>Done</span><span>Next</span></div>
              {(categoryItems ?? []).map((item) => (
                <article key={item.id} className="grid gap-2 border-b border-slate-100 px-4 py-3 last:border-0 md:grid-cols-[minmax(12rem,1.2fr)_7rem_6rem_5rem_minmax(13rem,1.4fr)] md:items-center md:gap-3">
                  <div className="min-w-0"><h3 className="text-sm font-semibold text-slate-950">{item.title}</h3><p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">{item.summary}</p></div>
                  <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ring-1 ${statusStyles[item.status] ?? statusStyles.open}`}>{statusLabel(item.status)}</span>
                  <p className="text-xs font-semibold text-slate-700"><span className="mr-1 text-slate-400 md:hidden">Owner:</span>{item.assigned_agent || "—"}</p>
                  <p className="text-xs font-bold tabular-nums text-slate-700">{item.progress_percent}%</p>
                  <p className="text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-800 md:hidden">Next: </span>{item.next_step || "No next step."}</p>
                </article>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
