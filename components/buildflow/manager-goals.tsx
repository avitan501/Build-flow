"use client";

import { Archive, Check, ChevronDown, Plus, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";

import {
  createManagerGoalAction,
  deleteManagerGoalAction,
  setManagerGoalFocusAction,
} from "@/app/admin/goals-progress/goal-actions";
import { ManagerGoalStatusSelect } from "@/components/buildflow/manager-goal-status-select";
import type { ManagerGoalStatus } from "@/lib/manager-goal-status";

export type ManagerGoalRecord = {
  id: string;
  assignee: "david" | "carlos";
  title: string;
  details: string | null;
  status: ManagerGoalStatus;
  is_focus: boolean;
};

export function AddManagerGoal({ assignee }: { assignee: "david" | "carlos" }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [focus, setFocus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const name = assignee === "david" ? "David" : "Carlos";

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
  }

  function submit() {
    startTransition(async () => {
      const result = await createManagerGoalAction({ assignee, title, details, focus });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setDetails("");
      setFocus(false);
      setOpen(false);
    });
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-slate-950 px-2.5 text-xs font-semibold text-white">
      <Plus className="h-3.5 w-3.5" /> Add goal
    </button>
    {open && typeof document !== "undefined" ? createPortal(
      <div className="fixed inset-0 z-[160] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby={`add-${assignee}-goal-title`} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
        <section className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl">
          <header className="flex items-start justify-between border-b border-slate-200 p-5">
            <div><p className="text-[11px] font-semibold uppercase text-[#0066cc]">{name}</p><h2 id={`add-${assignee}-goal-title`} className="mt-1 text-xl font-semibold">Add a goal</h2></div>
            <button type="button" onClick={close} aria-label="Close" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200"><X className="h-4 w-4" /></button>
          </header>
          <div className="grid gap-4 p-5">
            <label className="grid gap-1.5 text-sm font-semibold">Goal<input autoFocus maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to be completed?" className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
            <label className="grid gap-1.5 text-sm font-semibold">Notes <span className="font-normal text-slate-400">optional</span><textarea maxLength={500} value={details} onChange={(event) => setDetails(event.target.value)} rows={3} placeholder="Add the next step or deadline" className="rounded-md border border-slate-300 p-3 font-normal" /></label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-950"><input type="checkbox" checked={focus} onChange={(event) => setFocus(event.target.checked)} className="h-4 w-4 accent-amber-500" /><Star className="h-4 w-4 text-amber-600" />Add to Focus</label>
            {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4"><button type="button" onClick={close} disabled={pending} className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</button><button type="button" onClick={submit} disabled={pending || title.trim().length < 2} className="min-h-11 rounded-md bg-[#0071e3] px-5 text-sm font-semibold text-white disabled:opacity-40">{pending ? "Adding..." : "Add goal"}</button></footer>
        </section>
      </div>, document.body) : null}
  </>;
}
export function CustomManagerGoals({ goals }: { goals: ManagerGoalRecord[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!goals.length) return null;
  const activeGoals = goals.filter((goal) => goal.status !== "archived");
  const archivedGoals = goals.filter((goal) => goal.status === "archived");
  const focusGoals = activeGoals.filter((goal) => goal.is_focus);
  const otherGoals = activeGoals.filter((goal) => !goal.is_focus);

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function goalRow(goal: ManagerGoalRecord) {
    return <details key={goal.id} className="group overflow-hidden border-b border-slate-100 bg-white last:border-b-0">
      <summary className="grid min-h-16 cursor-pointer list-none grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2 px-3 py-2.5">
        <span className={`row-span-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${goal.status === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : goal.status === "archived" ? "border-slate-200 bg-slate-100 text-slate-500" : "border-sky-200 bg-sky-50 text-sky-700"}`}>{goal.status === "completed" ? <Check className="h-3.5 w-3.5" /> : goal.status === "archived" ? <Archive className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span>
        <h3 className={`min-w-0 text-sm font-semibold leading-5 ${goal.status === "completed" ? "text-slate-500" : "text-slate-950"}`}>{goal.title}</h3>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden="true" />
        <div className="col-start-2 mt-1 flex min-w-0 flex-wrap items-center gap-1.5">{goal.is_focus ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800"><Star className="h-3 w-3 fill-current" />Focus</span> : null}<ManagerGoalStatusSelect goalId={goal.id} status={goal.status} /></div>
      </summary>
      <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-2.5"><p className="whitespace-pre-line text-xs leading-5 text-slate-600">{goal.details || "No notes added."}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><button type="button" disabled={pending} onClick={() => run(() => setManagerGoalFocusAction({ id: goal.id, focus: !goal.is_focus }))} className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-semibold ${goal.is_focus ? "border-amber-300 bg-amber-50 text-amber-900" : "border-slate-300 bg-white text-slate-700"}`}><Star className={`h-3.5 w-3.5 ${goal.is_focus ? "fill-current" : ""}`} />{goal.is_focus ? "Remove from Focus" : "Add to Focus"}</button><button type="button" disabled={pending} onClick={() => window.confirm(`Permanently delete “${goal.title}”? Archive is safer if you may need it later.`) && run(() => deleteManagerGoalAction(goal.id))} className="inline-flex min-h-7 items-center gap-1 rounded-md px-2 text-[10px] font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="h-3 w-3" />Delete permanently</button></div></div>
    </details>;
  }

  return <section className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white" aria-labelledby="carlos-custom-tasks">
    <header className="flex items-end justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2.5"><div><h3 id="carlos-custom-tasks" className="text-xs font-bold uppercase tracking-[.12em] text-slate-700">Focus &amp; tasks</h3><p className="mt-0.5 text-[11px] text-slate-500">Focus is the next priority. Open a task only when you need its notes.</p></div><span className="shrink-0 text-[10px] font-bold text-slate-500">{activeGoals.length} open</span></header>
    {focusGoals.length ? <div><p className="border-b border-amber-100 bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">Tomorrow&apos;s focus</p>{focusGoals.map(goalRow)}</div> : null}
    {otherGoals.length ? <div><p className="border-b border-slate-100 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Other tasks</p>{otherGoals.map(goalRow)}</div> : null}
    {!activeGoals.length ? <p className="px-3 py-4 text-center text-xs text-slate-500">No active tasks.</p> : null}
    {archivedGoals.length ? <details className="group border-t border-slate-200 bg-slate-50"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-xs font-semibold text-slate-600"><Archive className="h-3.5 w-3.5" /><span className="flex-1">Archived goals</span><span>{archivedGoals.length}</span><ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" /></summary><div className="border-t border-slate-200">{archivedGoals.map(goalRow)}</div></details> : null}
    {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
  </section>;
}
