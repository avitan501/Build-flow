"use client";

import { ArrowRight, Check, ClipboardList, Handshake, Plus, RotateCcw, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";

import { createDavidDashboardItemAction, saveDashboardTaskAction, setDashboardTaskStatusAction, setDavidTaskPublishedAction } from "@/app/admin/goals-progress/website-work/actions";
import type { DavidDashboardItem } from "@/components/buildflow/david-dashboard-board";
import { DashboardLeadRoster } from "@/components/buildflow/dashboard-lead-roster";
import { LEAD_OUTREACH_TASK_KEY } from "@/lib/dashboard-outreach";
import { useTaskCircleMotion } from "@/components/buildflow/use-task-circle-motion";
import { isWorkspaceTask, taskWorkflowHref } from "@/lib/dashboard-workspace";
import styles from "./dashboard-task-workspace.module.css";

type View = "workspace" | "completed" | "all" | "archived";
const PAGE_SIZE = 6;
const inactive = new Set(["completed", "archived", "superseded"]);

function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  window.addEventListener("storage", callback);
  window.addEventListener("avantia-task-motion", callback);
  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener("avantia-task-motion", callback);
  };
}

export function DashboardTaskWorkspace({ items, userName, userId }: { items: DavidDashboardItem[]; userName: string; userId: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>("workspace");
  const [pageIndex, setPageIndex] = useState(0);
  const [selection, setSelection] = useState<DavidDashboardItem | "new" | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const motionKey = `avantia:dashboard:v5:motion:${userId}`;
  const getMotion = useCallback(() => {
    try {
      const saved = window.localStorage.getItem(motionKey);
      if (saved === "on" || saved === "off") return saved === "on";
    } catch { /* Storage can be disabled; system preference still works. */ }
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, [motionKey]);
  const preferredMotion = useSyncExternalStore(subscribeMotion, getMotion, () => false);
  const motionEnabled = motionOverride ?? preferredMotion;
  const tasks = items.filter((item) => item.item_kind === "task");
  const filtered = tasks.filter((item) => view === "completed" ? item.status === "completed"
    : view === "archived" ? item.status === "archived"
      : !inactive.has(item.status) && (view === "all" || isWorkspaceTask(item)));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const visibleTasks = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const itemsKey = visibleTasks.map((item) => item.id).join(",");
  useTaskCircleMotion(arenaRef, itemsKey, motionEnabled, selection !== null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (selection && dialog && !dialog.open) dialog.showModal();
    if (!selection && dialog?.open) dialog.close();
  }, [selection]);

  function openTask(item: DavidDashboardItem | "new") {
    setError(null); setConfirmDelete(false);
    setTitle(item === "new" ? "" : item.title);
    setSummary(item === "new" ? "" : item.summary);
    setNextStep(item === "new" ? "" : item.next_step);
    setSelection(item);
  }
  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, message: string) {
    startTransition(async () => {
      setError(null);
      try {
        const result = await action();
        if (!result.ok) { setError(result.error); return; }
        setNotice(message); setSelection(null); setConfirmDelete(false);
        router.refresh();
      } catch { setError("This change could not be saved. Please try again."); }
    });
  }
  function changeView(next: View) { setView(next); setPageIndex(0); }
  function toggleMotion() {
    const value = !motionEnabled;
    setMotionOverride(value);
    try { window.localStorage.setItem(motionKey, value ? "on" : "off"); } catch { /* Keep the session control usable. */ }
    window.dispatchEvent(new Event("avantia-task-motion"));
  }
  const selected = selection && selection !== "new" ? selection : null;
  const isOutreachTask = selected?.task_key === LEAD_OUTREACH_TASK_KEY;
  const workflowHref = selected ? taskWorkflowHref(selected) : null;
  const initials = userName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  const taskForm = (
      <form onSubmit={(event) => {
        event.preventDefault();
        if (selection === "new") run(() => createDavidDashboardItemAction({ title, nextStep, kind: "task" }), "Task added.");
        else if (selected) run(() => saveDashboardTaskAction({ id: selected.id, title, summary, nextStep, updatedAt: selected.updated_at }), "Task saved.");
      }}>
        <label htmlFor="dashboard-task-name">Task name</label>
        <input id="dashboard-task-name" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required minLength={2} disabled={pending} autoComplete="off" />
        {selected && <><label htmlFor="dashboard-task-notes">Context</label><textarea id="dashboard-task-notes" value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={500} rows={3} disabled={pending} /></>}
        <label htmlFor="dashboard-task-next">Next step</label>
        <textarea id="dashboard-task-next" value={nextStep} onChange={(event) => setNextStep(event.target.value)} maxLength={500} rows={3} disabled={pending} placeholder="One clear action to move this forward" />
        {selected?.source_chat_title && <p className={styles.source}>Source: {selected.source_chat_title}</p>}
        <button className={styles.primary} type="submit" disabled={pending || title.trim().length < 2}>{pending ? "Saving…" : selection === "new" ? "Add to my workspace" : "Save changes"}</button>
      </form>
  );

  return <section className={styles.workspace} aria-label="Your task workspace">
    <header className={styles.topbar}>
      <Link className={styles.brand} href="/admin/build-map" aria-label="Avantia Build dashboard">AVANTIA<span>BUILD</span></Link>
      <nav className={styles.tabs} aria-label="Task views">
        {([["workspace", "My workspace"], ["completed", "Completed"], ["all", "All tasks"]] as const).map(([key, label]) =>
          <button key={key} type="button" disabled={pending} onClick={() => changeView(key)} aria-current={view === key ? "page" : undefined}>{label}</button>,
        )}
      </nav>
      <button type="button" className={styles.add} disabled={pending} onClick={() => openTask("new")}><Plus size={18} aria-hidden="true" /> Add Task</button>
      <span className={styles.avatar} title={userName} aria-label={userName}>{initials}</span>
    </header>
    <div className={styles.intro}>
      <p className={styles.eyebrow}>BUILD YOUR NEXT WIN</p>
      <h1>Great things are built<br className={styles.desktopBreak} /> one step at a time.</h1>
      <p className={styles.subtitle}>Pick one task. Make today count.</p>
    </div>
    <div className={styles.taskHeading}>
      <h2>{view === "completed" ? "Your completed tasks" : view === "archived" ? "Archived tasks" : view === "all" ? "All active tasks" : "Your next steps"}</h2>
      <span>{filtered.length} {filtered.length === 1 ? "task" : "tasks"}</span>
    </div>
    <div ref={arenaRef} className={styles.arena} data-testid="task-arena" aria-label="Tasks">
      {visibleTasks.map((item, index) => <button type="button" key={item.id} disabled={pending} data-task-circle data-task-id={item.id}
        className={`${styles.circle} ${styles[["mint", "gold", "blue", "lilac"][index % 4]]}`}
        aria-label={`Open task: ${item.title}`} title={item.title} onClick={() => openTask(item)}>
        {item.status === "completed" ? <Check className={styles.taskIcon} aria-hidden="true" /> : item.category === "suppliers_pricing" ? <Handshake className={styles.taskIcon} aria-hidden="true" /> : <ClipboardList className={styles.taskIcon} aria-hidden="true" />}
        <span className={styles.taskTitle}>{item.title}</span>
        <span className={styles.taskStatus}>{item.status.replaceAll("_", " ")}</span>
        <span className={styles.taskArrow} aria-hidden="true"><ArrowRight size={17} /></span>
      </button>)}
      {!visibleTasks.length && <p className={styles.empty}>{view === "completed" ? "No completed tasks yet. Your next small win starts here." : view === "archived" ? "No archived tasks." : "A clear workspace. Add your next task when you’re ready."}</p>}
    </div>
    {pageCount > 1 && <nav className={styles.pagination} aria-label="Task pages">
      <button type="button" disabled={pending || currentPage === 0} onClick={() => setPageIndex(currentPage - 1)}>Previous</button>
      <span>{currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
      <button type="button" disabled={pending || currentPage + 1 === pageCount} onClick={() => setPageIndex(currentPage + 1)}>Next</button>
    </nav>}
    <footer className={styles.footer}>
      <p>Small steps. Strong foundations. Keep building.</p>
      <button type="button" className={styles.motion} role="switch" aria-checked={motionEnabled} aria-label="Task motion" onClick={toggleMotion}>{motionEnabled ? "Pause motion" : "Start motion"}<span className={styles.switch} aria-hidden="true"><span /></span></button>
      <button type="button" className={styles.archived} disabled={pending} onClick={() => changeView("archived")}>Archived tasks</button>
    </footer>
    <p className={styles.notice} role="status">{notice}</p>
    <dialog ref={dialogRef} className={`${styles.dialog} ${isOutreachTask ? styles.outreachDialog : ""}`} aria-labelledby="dashboard-task-title"
      onCancel={(event) => { if (pending) event.preventDefault(); }}
      onClose={() => { setSelection(null); setConfirmDelete(false); }}>
      <button type="button" className={styles.close} aria-label="Close task" disabled={pending} onClick={() => setSelection(null)}><X size={22} /></button>
      <p className={styles.eyebrow}>{selection === "new" ? "YOUR NEXT MOVE" : "ONE STEP FORWARD"}</p>
      <h2 id="dashboard-task-title">{selection === "new" ? "What’s your next task?" : selected?.title}</h2>
      {isOutreachTask && <DashboardLeadRoster key={selected.id} />}
      {isOutreachTask ? <details className={styles.taskEditor}><summary>Edit task details</summary>{taskForm}</details> : taskForm}
      {selected && <div className={styles.taskActions}>
        {workflowHref && <Link className={styles.workflowLink} href={workflowHref}>Open workflow <ArrowRight size={16} /></Link>}
        {selected.status === "archived" ? <button type="button" disabled={pending} onClick={() => run(() => setDashboardTaskStatusAction({ id: selected.id, status: "open", updatedAt: selected.updated_at }), "Task restored.")}><RotateCcw size={17} /> Restore task</button>
          : <>
            <button type="button" disabled={pending} onClick={() => run(() => setDashboardTaskStatusAction({ id: selected.id, status: selected.status === "completed" ? "open" : "completed", updatedAt: selected.updated_at }), selected.status === "completed" ? "Task reopened." : "Task completed. One step forward!")}><Check size={17} />{selected.status === "completed" ? "Reopen task" : "Mark complete"}</button>
            <label className={styles.publish}><input type="checkbox" checked={selected.published_to_carlos} disabled={pending} onChange={(event) => { const published = event.target.checked; run(() => setDavidTaskPublishedAction({ id: selected.id, published }), published ? "Task shared with Carlos." : "Task is private."); }} /> Show Carlos</label>
            <button type="button" className={styles.delete} disabled={pending} onClick={() => setConfirmDelete(true)}><Trash2 size={17} /> Delete task</button>
          </>}
      </div>}
      {confirmDelete && selected && <div className={styles.confirm} role="group" aria-label="Confirm task deletion">
        <p>Remove this task from the workspace? You can restore it from Archived tasks.</p>
        <button type="button" disabled={pending} onClick={() => run(() => setDashboardTaskStatusAction({ id: selected.id, status: "archived", updatedAt: selected.updated_at }), "Task deleted. You can restore it from Archived tasks.")}>Yes, delete task</button>
        <button type="button" disabled={pending} onClick={() => setConfirmDelete(false)}>Keep task</button>
      </div>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </dialog>
  </section>;
}
