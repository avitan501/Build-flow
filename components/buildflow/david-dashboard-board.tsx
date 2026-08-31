"use client";

import {
  Archive,
  Check,
  CheckSquare,
  ChevronDown,
  CircleAlert,
  Lightbulb,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createDavidDashboardItemAction,
  deleteDavidDashboardItemAction,
  rewriteDavidDashboardItemAction,
  setDavidTaskPublishedAction,
  updateDavidDashboardItemAction,
} from "@/app/admin/goals-progress/website-work/actions";

export type DavidDashboardItem = {
  id: string;
  task_key: string;
  title: string;
  category: string;
  status: string;
  assigned_agent: string | null;
  progress_percent: number;
  summary: string;
  next_step: string;
  updated_at: string;
  source_chat_title: string | null;
  item_kind: "task" | "pain" | "idea";
  published_to_carlos: boolean;
};

type EditableKind = "pain" | "idea";

const statusStyles: Record<string, string> = {
  in_progress: "bg-sky-50 text-sky-700",
  testing: "bg-violet-50 text-violet-700",
  ready: "bg-emerald-50 text-emerald-700",
  blocked: "bg-amber-50 text-amber-800",
  open: "bg-slate-100 text-slate-700",
};

function PrivateItemRow({
  item,
  pending,
  editing,
  editTitle,
  onEditTitle,
  onStartEdit,
  onCancelEdit,
  onSave,
  onRewrite,
  onDelete,
}: {
  item: DavidDashboardItem;
  pending: boolean;
  editing: boolean;
  editTitle: string;
  onEditTitle: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onRewrite: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex min-h-14 items-center gap-2 px-3 py-2 sm:px-4">
      {editing ? (
        <input
          autoFocus
          aria-label={`Edit ${item.item_kind}`}
          value={editTitle}
          onChange={(event) => onEditTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSave();
            if (event.key === "Escape") onCancelEdit();
          }}
          maxLength={160}
          className="min-h-10 min-w-0 flex-1 rounded-lg border border-sky-300 bg-white px-3 text-sm outline-none ring-2 ring-sky-100"
        />
      ) : (
        <p className="min-w-0 flex-1 text-sm font-medium leading-5 text-slate-800">
          {item.title}
        </p>
      )}
      <div className="flex shrink-0 items-center gap-1">
        {editing ? (
          <>
            <button
              type="button"
              aria-label={`Save ${item.item_kind}`}
              disabled={pending || editTitle.trim().length < 2}
              onClick={onSave}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white disabled:opacity-40"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Cancel editing"
              disabled={pending}
              onClick={onCancelEdit}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              aria-label={`Rewrite ${item.item_kind} with AI`}
              title="Rewrite with AI"
              disabled={pending}
              onClick={onRewrite}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 text-xs font-bold text-[#0066cc] disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              AI
            </button>
            <button
              type="button"
              aria-label={`Edit ${item.item_kind}`}
              title="Edit"
              disabled={pending}
              onClick={onStartEdit}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Delete ${item.item_kind}`}
              title="Delete"
              disabled={pending}
              onClick={onDelete}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 text-rose-600 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function DavidDashboardBoard({
  items,
}: {
  items: DavidDashboardItem[];
}) {
  const router = useRouter();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNext, setTaskNext] = useState("");
  const [painTitle, setPainTitle] = useState("");
  const [ideaTitle, setIdeaTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const tasks = items.filter((item) => item.item_kind === "task");
  const pains = items.filter((item) => item.item_kind === "pain");
  const ideas = items.filter((item) => item.item_kind === "idea");
  const keptTaskKeys = new Set(["whatsapp-coexistence", "abc-private-pricing"]);
  const carlosFixedTaskKeys = new Set([
    "carlos-fixed-client-target",
    "carlos-fixed-call-suppliers",
    "carlos-fixed-supplier-affiliate-program",
    "carlos-fixed-supplier-partnerships",
    "carlos-fixed-abc-supply-demo",
  ]);
  const davidTasks = tasks.filter(
    (item) =>
      keptTaskKeys.has(item.task_key) ||
      carlosFixedTaskKeys.has(item.task_key) ||
      item.source_chat_title === "David Dashboard",
  );
  const aiTasks = tasks.filter((item) => !davidTasks.includes(item));

  function run(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
  ) {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await action();
      if (!result.ok) return setError(result.error);
      setNotice(success);
      setEditingId(null);
      router.refresh();
    });
  }

  function add(kind: "task" | "pain" | "idea") {
    const title =
      kind === "task" ? taskTitle : kind === "pain" ? painTitle : ideaTitle;
    run(
      () =>
        createDavidDashboardItemAction({
          title,
          nextStep: kind === "task" ? taskNext : "",
          kind,
        }),
      `${kind === "idea" ? "Idea" : kind === "pain" ? "Pain" : "Task"} added.`,
    );
    if (kind === "task") {
      setTaskTitle("");
      setTaskNext("");
    } else if (kind === "pain") setPainTitle("");
    else setIdeaTitle("");
  }

  function publish(id: string, published: boolean) {
    run(
      () => setDavidTaskPublishedAction({ id, published }),
      published ? "Task is now shown to Carlos." : "Task is now David only.",
    );
  }

  function save(item: DavidDashboardItem, kind: EditableKind) {
    run(
      () =>
        updateDavidDashboardItemAction({ id: item.id, title: editTitle, kind }),
      `${kind === "pain" ? "Pain" : "Idea"} updated.`,
    );
  }

  function rewrite(item: DavidDashboardItem, kind: EditableKind) {
    run(
      () => rewriteDavidDashboardItemAction({ id: item.id, kind }),
      "AI created a new version. Press AI again for another.",
    );
  }

  function remove(item: DavidDashboardItem, kind: EditableKind) {
    if (!window.confirm(`Delete this ${kind}? This cannot be undone.`)) return;
    run(
      () => deleteDavidDashboardItemAction({ id: item.id, kind }),
      `${kind === "pain" ? "Pain" : "Idea"} deleted.`,
    );
  }

  function editableRows(rows: DavidDashboardItem[], kind: EditableKind) {
    return rows.map((item) => (
      <PrivateItemRow
        key={item.id}
        item={item}
        pending={pending}
        editing={editingId === item.id}
        editTitle={editingId === item.id ? editTitle : item.title}
        onEditTitle={setEditTitle}
        onStartEdit={() => {
          setEditingId(item.id);
          setEditTitle(item.title);
        }}
        onCancelEdit={() => setEditingId(null)}
        onSave={() => save(item, kind)}
        onRewrite={() => rewrite(item, kind)}
        onDelete={() => remove(item, kind)}
      />
    ));
  }

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <CheckSquare className="h-4 w-4 text-[#0066cc]" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-950">Tasks</h2>
            <p className="text-xs text-slate-500">
              Use Show Carlos to control his dashboard.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {davidTasks.length}
          </span>
        </header>
        <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <input
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
            maxLength={160}
            placeholder="New task"
            aria-label="New task"
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-400"
          />
          <input
            value={taskNext}
            onChange={(event) => setTaskNext(event.target.value)}
            maxLength={500}
            placeholder="Next step (optional)"
            aria-label="Task next step"
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-400"
          />
          <button
            type="button"
            disabled={pending || taskTitle.trim().length < 2}
            onClick={() => add("task")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {davidTasks.map((item) => (
            <article
              key={item.id}
              className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-950">
                    {item.title}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusStyles[item.status] ?? statusStyles.open}`}
                  >
                    {item.status.replaceAll("_", " ")}
                  </span>
                </div>
                {item.next_step ? (
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.next_step}
                  </p>
                ) : null}
              </div>
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={item.published_to_carlos}
                  disabled={pending}
                  onChange={(event) => publish(item.id, event.target.checked)}
                  className="h-4 w-4 accent-[#0071e3]"
                />
                <Send className="h-3.5 w-3.5 text-[#0066cc]" />
                Show Carlos
              </label>
            </article>
          ))}
          {!davidTasks.length ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              Your task list is empty.
            </p>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <CircleAlert className="h-4 w-4 text-amber-600" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-950">
              Pain I&apos;m Resolving
            </h2>
            <p className="text-xs text-slate-500">
              Private problems you are actively solving.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {pains.length}
          </span>
        </header>
        <div className="flex gap-2 border-b border-slate-200 bg-slate-50 p-3">
          <input
            value={painTitle}
            onChange={(event) => setPainTitle(event.target.value)}
            maxLength={160}
            placeholder="Add a pain to resolve"
            aria-label="Add a pain to resolve"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-400"
          />
          <button
            type="button"
            disabled={pending || painTitle.trim().length < 2}
            onClick={() => add("pain")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {editableRows(pains, "pain")}
          {!pains.length ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              No pains added yet.
            </p>
          ) : null}
        </div>
      </section>

      <details className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900">
              Ideas
            </span>
            <span className="block text-xs text-slate-500">
              Private ideas to develop later
            </span>
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {ideas.length}
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-slate-200">
          <div className="flex gap-2 border-b border-slate-200 bg-slate-50 p-3">
            <input
              value={ideaTitle}
              onChange={(event) => setIdeaTitle(event.target.value)}
              maxLength={160}
              placeholder="Add an idea"
              aria-label="Add an idea"
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-400"
            />
            <button
              type="button"
              disabled={pending || ideaTitle.trim().length < 2}
              onClick={() => add("idea")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {editableRows(ideas, "idea")}
            {!ideas.length ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                No ideas added yet.
              </p>
            ) : null}
          </div>
        </div>
      </details>

      {aiTasks.length ? (
        <details className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3">
            <Archive className="h-4 w-4 text-slate-500" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900">
                AI Task Archive
              </span>
              <span className="block text-xs text-slate-500">
                Previous AI-created tasks
              </span>
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {aiTasks.length}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
          </summary>
          <div className="divide-y divide-slate-100 border-t border-slate-200">
            {aiTasks.map((item) => (
              <article
                key={item.id}
                className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">
                      {item.title}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusStyles[item.status] ?? statusStyles.open}`}
                    >
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  {item.next_step ? (
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                      {item.next_step}
                    </p>
                  ) : null}
                </div>
                <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={item.published_to_carlos}
                    disabled={pending}
                    onChange={(event) => publish(item.id, event.target.checked)}
                    className="h-4 w-4 accent-[#0071e3]"
                  />
                  <Send className="h-3.5 w-3.5 text-[#0066cc]" />
                  Show Carlos
                </label>
              </article>
            ))}
          </div>
        </details>
      ) : null}

      <div aria-live="polite" className="grid gap-2">
        {notice ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
