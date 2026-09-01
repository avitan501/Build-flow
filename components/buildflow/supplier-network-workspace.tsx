"use client";

import {
  ExternalLink,
  MoreHorizontal,
  Phone,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";

import { updateSupplierNetworkRowAction } from "@/app/admin/supplier-network/actions";

import {
  SUPPLIER_NETWORK_CHANNELS,
  type SupplierNetworkChannel,
  type SupplierNetworkOverride,
  type SupplierNetworkRow,
  type SupplierNetworkSource,
  type SupplierNetworkStage,
} from "@/lib/supplier-network";

const CHANNEL_LABELS: Record<SupplierNetworkChannel, string> = {
  API: "API",
  Affiliate: "AF",
  Partner: "P",
  Referral: "R",
  Trade: "T",
  Resale: "$",
};

const CHANNEL_COLORS: Record<SupplierNetworkChannel, string> = {
  API: "border-sky-200 bg-sky-50 text-sky-800",
  Affiliate: "border-violet-200 bg-violet-50 text-violet-800",
  Partner: "border-amber-200 bg-amber-50 text-amber-900",
  Referral: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Trade: "border-blue-200 bg-blue-50 text-blue-800",
  Resale: "border-rose-200 bg-rose-50 text-rose-800",
};

const CHANNEL_DESCRIPTIONS: Record<SupplierNetworkChannel, string> = {
  API: "Direct catalog, stock, or pricing connection",
  Affiliate: "Commission through a tracked link or program",
  Partner: "Direct working partnership with the supplier",
  Referral: "Referral fee for a lead or completed order",
  Trade: "Contractor account with trade pricing or terms",
  Resale: "Buy from the supplier and resell with a margin",
};

const STAGES: Array<{ key: SupplierNetworkStage; label: string }> = [
  { key: "approved", label: "Approved" },
  { key: "contact", label: "In contact" },
  { key: "more", label: "More suppliers" },
];

const STATUS_OPTIONS = [
  "Not contacted",
  "Research ready",
  "Contacted",
  "Waiting for reply",
  "In Progress",
  "Applied",
  "Approved",
  "Paused",
  "Not a fit",
] as const;

type SupplierNetworkView = SupplierNetworkStage | "hidden";

const VIEWS: Array<{ key: SupplierNetworkView; label: string }> = [
  ...STAGES,
  { key: "hidden", label: "Hidden" },
];

const SOURCES: SupplierNetworkSource[] = [
  "Show",
  "Friends",
  "Google",
  "Nearby",
];

export function SupplierNetworkWorkspace({
  rows,
}: {
  rows: SupplierNetworkRow[];
}) {
  const [stage, setStage] = useState<SupplierNetworkView>("contact");
  const [source, setSource] = useState<SupplierNetworkSource | "All">("All");
  const [query, setQuery] = useState("");
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [expanded, setExpanded] = useState<{
    key: string;
    mode: "actions" | "options";
  } | null>(null);
  const [rowEdits, setRowEdits] = useState<
    Record<string, Required<SupplierNetworkOverride>>
  >(() =>
    Object.fromEntries(
      rows.map((row) => [
        row.key,
        {
          channels: row.channels,
          stage: row.stage,
          status: row.status,
          note: row.note,
          hidden: row.hidden,
          priority: row.priority,
        },
      ]),
    ),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const currentEdit = useCallback(
    (row: SupplierNetworkRow) =>
      rowEdits[row.key] ?? {
        channels: row.channels,
        stage: row.stage,
        status: row.status,
        note: row.note,
        hidden: row.hidden,
        priority: row.priority,
      },
    [rowEdits],
  );

  function saveRow(
    row: SupplierNetworkRow,
    next: Required<SupplierNetworkOverride>,
    previous = currentEdit(row),
  ) {
    setRowEdits((value) => ({ ...value, [row.key]: next }));
    setSaveError(null);
    startSaving(async () => {
      const result = await updateSupplierNetworkRowAction({
        key: row.key,
        supplierName: row.name,
        ...next,
      });
      if (!result.ok) {
        setRowEdits((value) => ({ ...value, [row.key]: previous }));
        setSaveError(result.error);
      }
    });
  }

  function toggleChannel(
    row: SupplierNetworkRow,
    channel: SupplierNetworkChannel,
  ) {
    const current = currentEdit(row);
    const channels = current.channels.includes(channel)
      ? current.channels.filter((item) => item !== channel)
      : [...current.channels, channel];
    saveRow(row, { ...current, channels }, current);
  }

  const stageCounts = useMemo(
    () =>
      Object.fromEntries(
        VIEWS.map((item) => [
          item.key,
          rows.filter((row) => {
            const edit = currentEdit(row);
            return item.key === "hidden"
              ? edit.hidden
              : !edit.hidden && edit.stage === item.key;
          }).length,
        ]),
      ),
    [currentEdit, rows],
  );
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const edit = currentEdit(row);
        return (
          (stage === "hidden"
            ? edit.hidden
            : !edit.hidden && edit.stage === stage) &&
          (!priorityOnly || edit.priority) &&
          (source === "All" || row.sources.includes(source)) &&
          (!search ||
            `${row.name} ${row.departments} ${row.ask} ${edit.note}`
              .toLowerCase()
              .includes(search))
        );
      })
      .sort((a, b) => {
        const priorityDifference =
          Number(currentEdit(b).priority) - Number(currentEdit(a).priority);
        return priorityDifference || a.name.localeCompare(b.name);
      });
  }, [currentEdit, priorityOnly, query, rows, source, stage]);

  const priorityCount = rows.filter(
    (row) => !currentEdit(row).hidden && currentEdit(row).priority,
  ).length;

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-1.5">
        {VIEWS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setStage(item.key);
              setSource("All");
              setExpanded(null);
              setDeleteConfirm(null);
            }}
            className={`h-8 rounded-md px-2.5 text-[11px] font-semibold ${stage === item.key ? "bg-slate-950 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
          >
            {item.label}{" "}
            <span className="ml-1 tabular-nums opacity-70">
              {stageCounts[item.key]}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPriorityOnly((value) => !value)}
          className={`inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-[11px] font-bold ${priorityOnly ? "bg-amber-400 text-slate-950" : "bg-white text-amber-700 hover:bg-amber-50"}`}
          aria-pressed={priorityOnly}
        >
          <Star
            className={`h-3.5 w-3.5 ${priorityOnly ? "fill-current" : ""}`}
          />
          Priority{" "}
          <span className="tabular-nums opacity-70">{priorityCount}</span>
        </button>
        <label className="ml-auto flex h-8 min-w-36 flex-1 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 sm:max-w-56">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find supplier"
            className="min-w-0 flex-1 bg-transparent text-xs outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </label>
      </div>

      {stage === "more" ? (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 px-1.5 py-1">
          {(["All", ...SOURCES] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSource(item)}
              className={`h-6 shrink-0 rounded px-2 text-[10px] font-bold ${source === item ? "bg-blue-50 text-[#0066cc]" : "text-slate-500 hover:bg-slate-50"}`}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[#071225] text-[9px] uppercase tracking-[.08em] text-white">
            <tr>
              <th className="w-40 px-2 py-1.5">Supplier</th>
              <th className="w-48 px-2 py-1.5">Sells / departments</th>
              <th className="w-32 px-2 py-1.5">Options</th>
              <th className="px-2 py-1.5">What to ask</th>
              <th className="w-20 px-2 py-1.5">Status</th>
              <th className="w-16 px-2 py-1.5 text-center">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((row) => {
              const edit = currentEdit(row);
              const open = expanded?.key === row.key;
              const optionsOpen = open && expanded.mode === "options";
              const actionsOpen = open && expanded.mode === "actions";
              const selectedChannels = edit.channels;
              return (
                <tr
                  key={row.key}
                  className="group align-top hover:bg-sky-50/40"
                >
                  <td className="p-0" colSpan={6}>
                    <div className="grid min-h-11 w-full grid-cols-[10rem_12rem_8rem_minmax(12rem,1fr)_5rem_4rem] items-center text-left">
                      <label className="flex min-w-0 items-center gap-1.5 px-2 text-xs font-bold text-slate-950">
                        <input
                          type="checkbox"
                          checked={edit.priority}
                          onChange={(event) =>
                            saveRow(row, {
                              ...edit,
                              priority: event.target.checked,
                            })
                          }
                          className="h-3.5 w-3.5 shrink-0 accent-amber-500"
                          aria-label={`Priority ${row.name}`}
                        />
                        <span className="truncate">{row.name}</span>
                      </label>
                      <span className="line-clamp-2 px-2 text-[10px] leading-3.5 text-slate-600">
                        {row.departments}
                      </span>
                      <span className="flex flex-wrap gap-0.5 px-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded(
                              optionsOpen
                                ? null
                                : { key: row.key, mode: "options" },
                            )
                          }
                          className="flex min-h-8 w-full flex-wrap items-center gap-0.5 rounded px-1 text-left hover:bg-sky-50"
                          aria-label={`Choose options for ${row.name}`}
                          aria-expanded={optionsOpen}
                        >
                          {SUPPLIER_NETWORK_CHANNELS.map((channel) =>
                            selectedChannels.includes(channel) ? (
                              <span
                                key={channel}
                                title={channel}
                                aria-label={channel}
                                className={`inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-[4px] border px-1 text-[8px] font-black ${CHANNEL_COLORS[channel]}`}
                              >
                                {CHANNEL_LABELS[channel]}
                              </span>
                            ) : null,
                          )}
                          {!selectedChannels.length ? (
                            <span className="text-[9px] font-semibold text-slate-400">
                              Choose
                            </span>
                          ) : null}
                          <span className="ml-auto text-[9px] text-[#0066cc]">
                            ⌄
                          </span>
                        </button>
                      </span>
                      <span className="truncate px-2 text-[10px] text-slate-600">
                        {row.ask}
                      </span>
                      <span className="truncate px-2 text-[9px] font-semibold text-slate-500">
                        {edit.status}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(
                            actionsOpen
                              ? null
                              : { key: row.key, mode: "actions" },
                          )
                        }
                        className={`mx-auto inline-flex h-8 w-8 items-center justify-center rounded-md border transition ${actionsOpen ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-[#0066cc] hover:bg-sky-50"}`}
                        aria-label={`Actions for ${row.name}`}
                        aria-expanded={actionsOpen}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                    {optionsOpen ? (
                      <div className="border-t border-amber-100 bg-amber-50/60 px-2 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <strong className="mr-1 text-[10px] uppercase tracking-wide text-slate-600">
                            Choose options
                          </strong>
                          {SUPPLIER_NETWORK_CHANNELS.map((channel) => (
                            <label
                              key={channel}
                              className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-[10px] font-bold ${selectedChannels.includes(channel) ? CHANNEL_COLORS[channel] : "border-slate-200 bg-white text-slate-500"}`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedChannels.includes(channel)}
                                onChange={() => toggleChannel(row, channel)}
                                className="h-3.5 w-3.5 accent-[#0071e3]"
                              />
                              {channel}
                            </label>
                          ))}
                          <span className="ml-auto text-[9px] font-medium text-slate-500">
                            {saving ? "Saving…" : "Saved automatically"}
                          </span>
                        </div>
                        {saveError ? (
                          <p
                            className="mt-1 text-[10px] font-semibold text-rose-700"
                            role="alert"
                          >
                            {saveError}
                          </p>
                        ) : null}
                      </div>
                    ) : actionsOpen ? (
                      <div className="border-t border-sky-100 bg-sky-50/50 px-2 py-2">
                        {edit.hidden ? (
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-slate-600">
                              This supplier is hidden from the working lists.
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                saveRow(row, { ...edit, hidden: false })
                              }
                              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-950 px-3 text-[10px] font-bold text-white"
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Restore
                            </button>
                          </div>
                        ) : (
                          <div className="grid gap-2 lg:grid-cols-[10rem_11rem_minmax(14rem,1fr)_auto] lg:items-end">
                            <label className="grid gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                              Move to
                              <select
                                value={edit.stage}
                                onChange={(event) =>
                                  saveRow(row, {
                                    ...edit,
                                    stage: event.target
                                      .value as SupplierNetworkStage,
                                  })
                                }
                                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold normal-case text-slate-900 outline-none focus:border-[#0071e3]"
                              >
                                {STAGES.map((item) => (
                                  <option key={item.key} value={item.key}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="grid gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                              Status
                              <select
                                value={edit.status}
                                onChange={(event) =>
                                  saveRow(row, {
                                    ...edit,
                                    status: event.target.value,
                                  })
                                }
                                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold normal-case text-slate-900 outline-none focus:border-[#0071e3]"
                              >
                                {!STATUS_OPTIONS.includes(
                                  edit.status as (typeof STATUS_OPTIONS)[number],
                                ) ? (
                                  <option value={edit.status}>
                                    {edit.status}
                                  </option>
                                ) : null}
                                {STATUS_OPTIONS.map((item) => (
                                  <option key={item} value={item}>
                                    {item}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="grid gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                              Note
                              <textarea
                                value={edit.note}
                                onChange={(event) =>
                                  setRowEdits((value) => ({
                                    ...value,
                                    [row.key]: {
                                      ...edit,
                                      note: event.target.value,
                                    },
                                  }))
                                }
                                onBlur={() => saveRow(row, currentEdit(row))}
                                placeholder="Write a short note…"
                                rows={1}
                                className="min-h-9 resize-y rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-medium normal-case text-slate-900 outline-none focus:border-[#0071e3]"
                              />
                            </label>
                            <div className="flex items-center gap-1 lg:justify-end">
                              {row.phoneHref ? (
                                <a
                                  href={row.phoneHref}
                                  className="inline-flex h-8 items-center gap-1 rounded-md bg-slate-950 px-2 text-[10px] font-bold text-white"
                                >
                                  <Phone className="h-3 w-3" />
                                  {row.phone}
                                </a>
                              ) : null}
                              {row.link ? (
                                <a
                                  href={row.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold text-[#0066cc]"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Program
                                </a>
                              ) : null}
                              {deleteConfirm === row.key ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirm(null)}
                                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-600"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteConfirm(null);
                                      saveRow(row, { ...edit, hidden: true });
                                    }}
                                    className="inline-flex h-8 items-center gap-1 rounded-md bg-rose-600 px-2 text-[10px] font-bold text-white"
                                  >
                                    <Trash2 className="h-3 w-3" /> Erase
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirm(row.key)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-600"
                                  aria-label={`Erase ${row.name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="mt-2 flex items-start justify-between gap-3 border-t border-sky-100 pt-2">
                          <p className="line-clamp-2 text-[10px] leading-4 text-slate-600">
                            <strong>Ask:</strong> {row.ask}
                          </p>
                          <span className="shrink-0 text-[9px] font-semibold text-slate-500">
                            {saving ? "Saving…" : "Saved automatically"}
                          </span>
                        </div>
                        {saveError ? (
                          <p
                            className="mt-1 text-[10px] font-semibold text-rose-700"
                            role="alert"
                          >
                            {saveError}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length ? (
          <p className="px-3 py-8 text-center text-xs text-slate-500">
            No suppliers in this section yet.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-200 bg-slate-50 px-2 py-1.5">
        {SUPPLIER_NETWORK_CHANNELS.map((channel) => (
          <span
            key={channel}
            className="inline-flex items-center gap-1 text-[9px] text-slate-500"
          >
            <span
              className={`inline-flex h-4 min-w-4 items-center justify-center rounded-[3px] border px-0.5 text-[7px] font-black ${CHANNEL_COLORS[channel]}`}
            >
              {CHANNEL_LABELS[channel]}
            </span>
            {channel}
          </span>
        ))}
      </div>
      <div
        className="grid gap-x-4 gap-y-1 border-t border-slate-200 bg-white px-2 py-2 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Supplier option symbol meanings"
      >
        {SUPPLIER_NETWORK_CHANNELS.map((channel) => (
          <p
            key={channel}
            className="flex gap-1.5 text-[9px] leading-4 text-slate-600"
          >
            <strong className="w-12 shrink-0 text-slate-900">
              {CHANNEL_LABELS[channel]}
            </strong>
            <span>{CHANNEL_DESCRIPTIONS[channel]}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
