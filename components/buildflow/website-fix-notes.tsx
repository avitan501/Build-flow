"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import {
  createWebsiteFixNoteAction,
  deleteManagerGoalAction,
  setManagerGoalCompletedAction,
} from "@/app/admin/goals-progress/goal-actions";
import type { ManagerGoalRecord } from "@/components/buildflow/manager-goals";

const NOTE_PREFIX = "website_fix_note:";

function noteKind(goal: ManagerGoalRecord) {
  const value = goal.details?.startsWith(NOTE_PREFIX) ? goal.details.slice(NOTE_PREFIX.length) : "fix";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function WebsiteFixNotes({ notes }: { notes: ManagerGoalRecord[] }) {
  const [kind, setKind] = useState("Fix");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, clear = false) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (clear) setNote("");
    });
  }

  return <div>
    <div className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)_auto]">
      <label className="sr-only" htmlFor="website-note-kind">Action</label>
      <select id="website-note-kind" value={kind} onChange={(event) => setKind(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold">
        <option>Fix</option><option>Add</option><option>Change</option><option>Remove</option>
      </select>
      <label className="sr-only" htmlFor="website-note">Website note</label>
      <input id="website-note" value={note} maxLength={120} onChange={(event) => setNote(event.target.value)} placeholder="What should change on the website?" className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" />
      <button type="button" disabled={pending || note.trim().length < 2} onClick={() => run(() => createWebsiteFixNoteAction({ kind, note }), true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-40"><Plus className="h-4 w-4" />Add note</button>
    </div>

    <div className="mt-3 overflow-hidden rounded-md border border-slate-200">
      <div className="bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500">Website notes</div>
      {notes.length ? notes.map((item) => <article key={item.id} className="flex items-center gap-3 border-t border-slate-100 px-3 py-2.5">
        <button type="button" disabled={pending} onClick={() => run(() => setManagerGoalCompletedAction({ id: item.id, completed: item.status !== "completed" }))} aria-label={`${item.status === "completed" ? "Reopen" : "Complete"} ${item.title}`} className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${item.status === "completed" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-transparent"}`}><Check className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1"><span className="mr-2 inline-flex rounded bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase text-[#0066cc]">{noteKind(item)}</span><span className={`text-sm font-semibold ${item.status === "completed" ? "text-slate-400 line-through" : "text-slate-900"}`}>{item.title}</span></div>
        <button type="button" disabled={pending} onClick={() => window.confirm(`Delete “${item.title}”?`) && run(() => deleteManagerGoalAction(item.id))} aria-label={`Delete ${item.title}`} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
      </article>) : <p className="border-t border-slate-100 px-3 py-4 text-sm text-slate-500">No website notes yet.</p>}
    </div>
    {error ? <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
  </div>;
}
