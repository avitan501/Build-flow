"use client";

import { CheckSquare, CircleAlert, Plus, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createDavidDashboardItemAction,
  setDavidTaskPublishedAction,
} from "@/app/admin/goals-progress/website-work/actions";

export type DavidDashboardItem = {
  id: string;
  title: string;
  category: string;
  status: string;
  assigned_agent: string | null;
  progress_percent: number;
  summary: string;
  next_step: string;
  updated_at: string;
  item_kind: "task" | "pain";
  published_to_carlos: boolean;
};

const statusStyles: Record<string, string> = {
  in_progress: "bg-sky-50 text-sky-700",
  testing: "bg-violet-50 text-violet-700",
  ready: "bg-emerald-50 text-emerald-700",
  blocked: "bg-amber-50 text-amber-800",
  open: "bg-slate-100 text-slate-700",
};

export function DavidDashboardBoard({ items }: { items: DavidDashboardItem[] }) {
  const router = useRouter();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNext, setTaskNext] = useState("");
  const [painTitle, setPainTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const tasks = items.filter((item) => item.item_kind === "task");
  const pains = items.filter((item) => item.item_kind === "pain");

  function add(kind: "task" | "pain") {
    const title = kind === "task" ? taskTitle : painTitle;
    startTransition(async () => {
      setError(null);
      const result = await createDavidDashboardItemAction({
        title,
        nextStep: kind === "task" ? taskNext : "",
        kind,
      });
      if (!result.ok) return setError(result.error);
      if (kind === "task") {
        setTaskTitle("");
        setTaskNext("");
      } else setPainTitle("");
      router.refresh();
    });
  }

  function publish(id: string, published: boolean) {
    startTransition(async () => {
      setError(null);
      const result = await setDavidTaskPublishedAction({ id, published });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <CheckSquare className="h-4 w-4 text-[#0066cc]" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-950">Tasks</h2>
            <p className="text-xs text-slate-500">Check Publish to Carlos only when Carlos should see it.</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{tasks.length}</span>
        </header>
        <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={160} placeholder="New task" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-400" />
          <input value={taskNext} onChange={(event) => setTaskNext(event.target.value)} maxLength={500} placeholder="Next step (optional)" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-400" />
          <button type="button" disabled={pending || taskTitle.trim().length < 2} onClick={() => add("task")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-40"><Plus className="h-4 w-4" />Add</button>
        </div>
        <div className="divide-y divide-slate-100">
          {tasks.map((item) => (
            <article key={item.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusStyles[item.status] ?? statusStyles.open}`}>{item.status.replaceAll("_", " ")}</span>
                </div>
                {item.next_step ? <p className="mt-1 text-xs leading-5 text-slate-500">{item.next_step}</p> : null}
              </div>
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={item.published_to_carlos} disabled={pending} onChange={(event) => publish(item.id, event.target.checked)} className="h-4 w-4 accent-[#0071e3]" />
                <Send className="h-3.5 w-3.5 text-[#0066cc]" />
                Publish to Carlos
              </label>
            </article>
          ))}
          {!tasks.length ? <p className="px-4 py-6 text-center text-sm text-slate-500">No open tasks.</p> : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <CircleAlert className="h-4 w-4 text-amber-600" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-950">Pain I&apos;m Resolving</h2>
            <p className="text-xs text-slate-500">David&apos;s private problem list.</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{pains.length}</span>
        </header>
        <div className="flex gap-2 border-b border-slate-200 bg-slate-50 p-3">
          <input value={painTitle} onChange={(event) => setPainTitle(event.target.value)} maxLength={160} placeholder="Add a pain to resolve" className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-400" />
          <button type="button" disabled={pending || painTitle.trim().length < 2} onClick={() => add("pain")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-40"><Plus className="h-4 w-4" />Add</button>
        </div>
        <div className="divide-y divide-slate-100">
          {pains.map((item) => <p key={item.id} className="px-4 py-3 text-sm font-medium text-slate-800">{item.title}</p>)}
          {!pains.length ? <p className="px-4 py-6 text-center text-sm text-slate-500">No pains added yet.</p> : null}
        </div>
      </section>
      {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
    </div>
  );
}
