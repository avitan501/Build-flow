"use client";
import { useEffect, useRef, useState } from "react";
import { saveCarlosGoals } from "@/app/admin/daily-summary/goals-actions";
import { CARLOS_GOAL_OPTIONS, initialCarlosGoals, validCarlosGoals, type CarlosGoal, type CarlosGoalBoard } from "@/lib/carlos-five-goals";

export function CarlosFiveGoals({ board, actorId }: { board: CarlosGoalBoard; actorId: string }) {
  const [goals, setGoals] = useState(() => initialCarlosGoals(board.goals));
  const [message, setMessage] = useState("Saved");
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [choosing, setChoosing] = useState(board.goals.filter(g => g.selected).length < 5);
  const current = useRef(goals);
  const acknowledged = useRef(JSON.stringify(goals));
  const revision = useRef(board.revision);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = `carlos-five-goals:v1:${actorId}`;
  const selected = goals.filter(g => g.selected);
  function remember() { try { sessionStorage.setItem(storageKey, JSON.stringify({ revision: revision.current, goals: current.current })); } catch { /* Before-unload warning remains available. */ } }
  async function flush() {
    if (busy.current || JSON.stringify(current.current) === acknowledged.current) return;
    busy.current = true; setError(false); setMessage("Saving…");
    const sent = current.current;
    try {
      const result = await saveCarlosGoals(revision.current, sent);
      if (!result.ok) { setError(true); setMessage(result.error); return; }
      revision.current = result.board.revision;
      acknowledged.current = JSON.stringify(sent);
      if (JSON.stringify(current.current) === acknowledged.current) {
        setMessage("Saved"); try { sessionStorage.removeItem(storageKey); } catch { /* No stored draft. */ }
      } else { remember(); timer.current = setTimeout(() => void flush(), 0); }
    } catch { setError(true); setMessage("Not saved. Check your connection and retry."); }
    finally { busy.current = false; }
  }
  function update(id: number, patch: Partial<CarlosGoal>) {
    const next = current.current.map(g => g.id === id ? { ...g, ...patch } : g);
    if (next.filter(g => g.selected).length > 5) return;
    current.current = next; setGoals(next); remember(); setError(false); setMessage("Unsaved changes");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 800);
  }
  useEffect(() => {
    const hydrate = setTimeout(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (validCarlosGoals(draft.goals) && Number.isSafeInteger(draft.revision) && draft.revision >= 0 && JSON.stringify(draft.goals) !== acknowledged.current) {
          current.current = draft.goals; revision.current = draft.revision;
          setGoals(draft.goals); setError(true); setMessage("Recovered unsaved edits. Review them, then retry saving.");
        }
      }
    } catch { /* Keep authoritative server values if a local draft cannot be read. */ }
    setReady(true);
    }, 0);
    const warn = (event: BeforeUnloadEvent) => { if (JSON.stringify(current.current) !== acknowledged.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => { clearTimeout(hydrate); window.removeEventListener("beforeunload", warn); if (timer.current) clearTimeout(timer.current); };
  }, [storageKey]);
  return <section aria-label="My 5 Goals" className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">My 5 Goals</h2><span className="text-sm text-slate-600">{selected.filter(g => g.status === "done").length}/{selected.length || 5} done</span></div>
    <p className="mt-1 text-xs text-slate-500">Choose five outcomes. Keep them until finished — no automatic reset.</p>
    <p role="status" className={`mt-2 text-xs ${error ? "text-red-700" : "text-slate-500"}`}>{message}</p>
    {error && <div className="mt-2 flex flex-wrap gap-3 text-sm"><button type="button" className="min-h-11 text-blue-700 underline" onClick={() => void flush()}>Retry saving</button><button type="button" className="min-h-11 text-slate-600 underline" onClick={() => { if (window.confirm("Discard your unsaved edits and load the latest saved board?")) { sessionStorage.removeItem(storageKey); acknowledged.current = JSON.stringify(current.current); window.location.reload(); } }}>Reload latest</button></div>}
    <details className="mt-3 border-t border-slate-100 pt-2" open={choosing} onToggle={e => setChoosing(e.currentTarget.open)}>
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Choose goals · {selected.length}/5 selected</summary>
      <div className="grid gap-1 sm:grid-cols-2">{goals.map(g => <label key={g.id} className="flex min-h-11 items-start gap-3 rounded-lg p-2 text-sm hover:bg-slate-50"><input className="mt-1 h-4 w-4" type="checkbox" disabled={!ready || (!g.selected && selected.length === 5)} checked={g.selected} onChange={e => update(g.id, { selected: e.target.checked })} /><span>{CARLOS_GOAL_OPTIONS[g.id][0]}</span></label>)}</div>
      <p className="pb-2 text-xs text-slate-500">Changing your selection keeps previous notes. Count each outcome once.</p>
    </details>
    <div className="divide-y divide-slate-100">{selected.map(g => <details key={g.id} className="py-2">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-2 text-sm font-semibold"><span>{CARLOS_GOAL_OPTIONS[g.id][0]}{g.id === 0 && <span className="ml-2 font-normal text-slate-500">{g.count}/5</span>}</span><span className="shrink-0 text-xs font-normal text-slate-600">{g.status === "done" ? "Done" : g.status === "blocked" ? "Blocked" : "In progress"}</span></summary>
      <p className="mb-3 text-xs leading-5 text-slate-500">{CARLOS_GOAL_OPTIONS[g.id][1]}</p>
      <fieldset disabled={!ready} className="grid gap-3 text-sm">
        {g.id === 0 && <label>Quotes received<select aria-label="Quotes received" className="ml-3 min-h-11 rounded-md border p-2" value={g.count} onChange={e => update(g.id, { count: Number(e.target.value), ...(Number(e.target.value) < 5 && g.status === "done" ? { status: "in_progress" } : {}) })}>{[0, 1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}</select></label>}
        <label>What I did / what I need<textarea className="mt-1 block min-h-24 w-full rounded-md border border-slate-300 p-3" maxLength={1200} value={g.note} onChange={e => update(g.id, { note: e.target.value, ...(!e.target.value.trim() ? { status: "in_progress" } : {}) })} placeholder="Result, next step, or what is blocking you" /></label>
        <label>Related request / quote link<input type="url" className="mt-1 block min-h-11 w-full rounded-md border border-slate-300 p-3" maxLength={1000} value={g.link} onChange={e => update(g.id, { link: e.target.value, ...(!e.target.value.trim() && g.status === "done" ? { status: "in_progress" } : {}) })} placeholder="https://…" /></label>
        <label>Status<select aria-label="Status" className="ml-3 min-h-11 rounded-md border p-2" value={g.status} onChange={e => update(g.id, { status: e.target.value as CarlosGoal["status"] })}><option value="in_progress">In progress</option><option value="blocked" disabled={!g.note.trim()}>Blocked</option><option value="done" disabled={!g.note.trim() || !/^https?:\/\//i.test(g.link) || (g.id === 0 && g.count < 5)}>Done</option></select></label>
        <p className="text-xs text-slate-500">Done needs a result and a related link. Blocked needs an explanation.</p>
      </fieldset>
    </details>)}</div>
  </section>;
}
