"use client";

import { Check, Plus, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";

import {
  createManagerGoalAction,
  deleteManagerGoalAction,
  setManagerGoalCompletedAction,
} from "@/app/admin/goals-progress/goal-actions";

export type ManagerGoalRecord = {
  id: string;
  assignee: "david" | "carlos";
  title: string;
  details: string | null;
  status: "open" | "completed";
};

export function AddManagerGoal({ assignee }: { assignee: "david" | "carlos" }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
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
      const result = await createManagerGoalAction({ assignee, title, details });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setDetails("");
      setOpen(false);
    });
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white">
      <Plus className="h-4 w-4" /> Add goal
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
            {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4"><button type="button" onClick={close} disabled={pending} className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</button><button type="button" onClick={submit} disabled={pending || title.trim().length < 2} className="min-h-11 rounded-md bg-[#0071e3] px-5 text-sm font-semibold text-white disabled:opacity-40">{pending ? "Adding..." : "Add goal"}</button></footer>
        </section>
      </div>, document.body) : null}
  </>;
}

export function CustomManagerGoals({ goals }: { goals: ManagerGoalRecord[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!goals.length) return null;

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  }

  return <div className="mt-4 grid gap-2">
    {goals.map((goal) => <details key={goal.id} className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-2"><span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${goal.status === "completed" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-transparent"}`}><Check className="h-3.5 w-3.5" /></span><h3 className={`min-w-0 flex-1 truncate text-sm font-semibold ${goal.status === "completed" ? "text-slate-500 line-through" : "text-slate-950"}`}>{goal.title}</h3><span className="text-xs font-semibold text-[#0066cc]">Open</span></summary>
      <div className="border-t border-slate-100 p-3"><p className="text-xs leading-5 text-slate-500">{goal.details || "No notes added."}</p><div className="mt-3 flex gap-2"><button type="button" disabled={pending} onClick={() => run(() => setManagerGoalCompletedAction({ id: goal.id, completed: goal.status !== "completed" }))} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold"><Check className="h-4 w-4" />{goal.status === "completed" ? "Reopen" : "Complete"}</button><button type="button" disabled={pending} onClick={() => window.confirm(`Delete “${goal.title}”?`) && run(() => deleteManagerGoalAction(goal.id))} className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" />Delete</button></div></div>
    </details>)}
    {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
  </div>;
}
