"use client";

import { ExternalLink, Phone, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import {
  SUPPLIER_NETWORK_CHANNELS,
  type SupplierNetworkChannel,
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
  const [stage, setStage] = useState<SupplierNetworkStage>("contact");
  const [source, setSource] = useState<SupplierNetworkSource | "All">("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const stageCounts = useMemo(
    () =>
      Object.fromEntries(
        STAGES.map((item) => [
          item.key,
          rows.filter((row) => row.stage === item.key).length,
        ]),
      ),
    [rows],
  );
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter(
      (row) =>
        row.stage === stage &&
        (source === "All" || row.sources.includes(source)) &&
        (!search ||
          `${row.name} ${row.departments} ${row.ask}`
            .toLowerCase()
            .includes(search)),
    );
  }, [query, rows, source, stage]);

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-1.5">
        {STAGES.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setStage(item.key);
              setSelected(null);
            }}
            className={`h-8 rounded-md px-2.5 text-[11px] font-semibold ${stage === item.key ? "bg-slate-950 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
          >
            {item.label}{" "}
            <span className="ml-1 tabular-nums opacity-70">
              {stageCounts[item.key]}
            </span>
          </button>
        ))}
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
              const open = selected === row.key;
              return (
                <tr
                  key={row.key}
                  className="group align-top hover:bg-sky-50/40"
                >
                  <td className="p-0" colSpan={6}>
                    <button
                      type="button"
                      onClick={() => setSelected(open ? null : row.key)}
                      className="grid min-h-11 w-full grid-cols-[10rem_12rem_8rem_minmax(12rem,1fr)_5rem_4rem] items-center text-left"
                    >
                      <span className="truncate px-2 text-xs font-bold text-slate-950">
                        {row.name}
                      </span>
                      <span className="line-clamp-2 px-2 text-[10px] leading-3.5 text-slate-600">
                        {row.departments}
                      </span>
                      <span className="flex flex-wrap gap-0.5 px-2">
                        {SUPPLIER_NETWORK_CHANNELS.map((channel) =>
                          row.channels.includes(channel) ? (
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
                      </span>
                      <span className="truncate px-2 text-[10px] text-slate-600">
                        {row.ask}
                      </span>
                      <span className="truncate px-2 text-[9px] font-semibold text-slate-500">
                        {row.status}
                      </span>
                      <span className="px-2 text-center text-xs font-bold text-[#0066cc]">
                        {open ? "−" : "+"}
                      </span>
                    </button>
                    {open ? (
                      <div className="grid gap-2 border-t border-sky-100 bg-sky-50/50 px-2 py-2 sm:grid-cols-[8rem_1fr_auto] sm:items-center">
                        <div className="flex flex-wrap gap-1">
                          {row.sources.map((item) => (
                            <span
                              key={item}
                              className="rounded bg-white px-1.5 py-1 text-[9px] font-bold text-slate-500 ring-1 ring-slate-200"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs leading-5 text-slate-700">
                          <strong>Say / ask:</strong> {row.ask}
                        </p>
                        <div className="flex gap-1">
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
                        </div>
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
