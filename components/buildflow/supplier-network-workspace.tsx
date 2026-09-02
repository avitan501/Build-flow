"use client";

import {
  ExternalLink,
  LoaderCircle,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Fragment, useCallback, useMemo, useState, useTransition } from "react";

import { addDiscoveredSupplierNetworkAction, updateSupplierNetworkRowAction } from "@/app/admin/supplier-network/actions";
import { SupplierProgramBadges, SUPPLIER_PROGRAM_COLORS as CHANNEL_COLORS, SUPPLIER_PROGRAM_DESCRIPTIONS as CHANNEL_DESCRIPTIONS, SUPPLIER_PROGRAM_LABELS as CHANNEL_LABELS } from "@/components/buildflow/supplier-program-badges";
import type { SupplierDiscoveryCandidate } from "@/lib/supplier-discovery";
import { supplierIdentityKeys } from "@/lib/supplier-identity";

import {
  SUPPLIER_NETWORK_CHANNELS,
  type SupplierNetworkChannel,
  type SupplierNetworkOverride,
  type SupplierNetworkRow,
  type SupplierNetworkSource,
  type SupplierNetworkStage,
} from "@/lib/supplier-network";

const STAGES: Array<{ key: SupplierNetworkStage; label: string }> = [
  { key: "approved", label: "Approved" },
  { key: "contact", label: "Building Relationship" },
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

const EMPTY_CANDIDATE_REVIEW = {
  officialSource: false,
  departmentFit: false,
  serviceArea: false,
};

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
  const [discoveryDepartment, setDiscoveryDepartment] = useState("");
  const [discoveryZip, setDiscoveryZip] = useState("11516");
  const [discoveryResults, setDiscoveryResults] = useState<SupplierDiscoveryCandidate[]>([]);
  const [discoveryError, setDiscoveryError] = useState("");
  const [discoveryNotice, setDiscoveryNotice] = useState("");
  const [discoveryPending, setDiscoveryPending] = useState(false);
  const [discoveryContext, setDiscoveryContext] = useState({ department: "", zipCode: "" });
  const [reviewingCandidate, setReviewingCandidate] = useState<SupplierDiscoveryCandidate | null>(null);
  const [reviewedSupplierName, setReviewedSupplierName] = useState("");
  const [candidateReview, setCandidateReview] = useState(EMPTY_CANDIDATE_REVIEW);
  const [addedIdentities, setAddedIdentities] = useState<string[]>([]);

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
    reviewConfirmed = false,
  ) {
    setRowEdits((value) => ({ ...value, [row.key]: next }));
    setSaveError(null);
    startSaving(async () => {
      const result = await updateSupplierNetworkRowAction({
        key: row.key,
        supplierName: row.name,
        directorySupplierId: row.directorySupplierId,
        departments: row.departments,
        phone: row.phone,
        link: row.link,
        ask: row.ask,
        reviewConfirmed,
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

  async function discoverSuppliers(more = false) {
    if (!discoveryDepartment.trim() || !/^\d{5}(?:-\d{4})?$/.test(discoveryZip)) {
      setDiscoveryError("Enter a department and a valid ZIP code.");
      return;
    }
    setDiscoveryPending(true);
    setDiscoveryError("");
    setDiscoveryNotice("");
    try {
      const department = discoveryDepartment.trim();
      const sameSearch = discoveryContext.department === department && discoveryContext.zipCode === discoveryZip;
      const append = more && sameSearch;
      const networkIdentities = rows.flatMap((row) =>
        supplierIdentityKeys({ name: row.name, url: row.link }),
      );
      const previousIdentities = append
        ? discoveryResults.flatMap((supplier) =>
            supplierIdentityKeys(supplier),
          )
        : [];
      const excludeIdentities = [...new Set([...networkIdentities, ...previousIdentities])];
      const response = await fetch("/api/admin/suppliers/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department, zipCode: discoveryZip, excludeIdentities }),
      });
      const payload = await response.json() as {
        ok?: boolean;
        error?: string;
        suppliers?: SupplierDiscoveryCandidate[];
        partial?: boolean;
      };
      if (!response.ok || !payload.ok) setDiscoveryError(payload.error || "Supplier discovery is temporarily unavailable.");
      else {
        const suppliers = payload.suppliers ?? [];
        setDiscoveryContext({ department, zipCode: discoveryZip });
        setDiscoveryResults((current) => append ? [...current, ...suppliers] : suppliers);
        setReviewingCandidate(null);
        setReviewedSupplierName("");
        setCandidateReview(EMPTY_CANDIDATE_REVIEW);
        if (payload.partial) {
          setDiscoveryNotice(
            suppliers.length
              ? `Found ${suppliers.length} new source-backed candidate${suppliers.length === 1 ? "" : "s"} after safety and duplicate checks.`
              : "No new source-backed candidates passed the safety and duplicate checks. Try another department or ZIP code.",
          );
        }
      }
    } catch {
      setDiscoveryError("Supplier discovery is temporarily unavailable.");
    } finally {
      setDiscoveryPending(false);
    }
  }

  function beginCandidateReview(supplier: SupplierDiscoveryCandidate) {
    setReviewingCandidate(supplier);
    setReviewedSupplierName(supplier.name);
    setCandidateReview(EMPTY_CANDIDATE_REVIEW);
    setDiscoveryError("");
  }

  function addDiscoveredSupplier(supplier: SupplierDiscoveryCandidate) {
    if (
      reviewedSupplierName.trim().length < 2 ||
      !Object.values(candidateReview).every(Boolean)
    ) {
      setDiscoveryError("Complete the three review checks before adding this candidate.");
      return;
    }
    startSaving(async () => {
      const result = await addDiscoveredSupplierNetworkAction({
        name: reviewedSupplierName.trim(),
        url: supplier.url,
        summary: supplier.summary,
        department: discoveryContext.department,
        zipCode: discoveryContext.zipCode,
        reviewConfirmed: true,
      });
      if (!result.ok) setDiscoveryError(result.error);
      else {
        setAddedIdentities((current) => [...current, supplier.identity]);
        setReviewingCandidate(null);
        setReviewedSupplierName("");
        setCandidateReview(EMPTY_CANDIDATE_REVIEW);
        setDiscoveryNotice(
          result.status === "already-exists"
            ? `${result.supplierName} is already in the canonical Supplier Directory.`
            : `${result.supplierName} was added to More suppliers for continued human review. No outreach was sent.`,
        );
        if (result.status === "added") window.setTimeout(() => window.location.reload(), 700);
      }
    });
  }

  function moveRow(row: SupplierNetworkRow, nextStage: SupplierNetworkStage) {
    const edit = currentEdit(row);
    const requiresReview =
      nextStage === "approved" ||
      (nextStage === "contact" && row.directoryTrustLevel === "not-reviewed");
    if (
      requiresReview &&
      !window.confirm(
        `Confirm you reviewed ${row.name}'s official source, department fit, and service area. This promotion does not send outreach.`,
      )
    ) {
      return;
    }
    saveRow(
      row,
      {
        ...edit,
        stage: nextStage,
        priority:
          nextStage === "contact"
            ? true
            : nextStage === "more"
              ? false
              : edit.priority,
      },
      edit,
      requiresReview,
    );
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
          {stage === "approved" ? "Top vendors" : "Current focus"}{" "}
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
        <div className="border-b border-slate-200">
        <div className="flex items-center gap-1 overflow-x-auto px-1.5 py-1">
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
        <details className="group border-t border-slate-100 bg-sky-50/60">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-xs font-bold text-sky-950">
            <Sparkles className="h-4 w-4 text-[#0071e3]" />
            Find 10 suppliers with AI
            <span className="ml-auto text-[10px] font-semibold text-sky-700 group-open:hidden">
              Department + ZIP
            </span>
          </summary>
          <div className="border-t border-sky-100 p-3">
            <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-950">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <p>
                AI returns source-backed candidates only. Review the official page,
                department fit, and service area before adding. Contact details are
                never populated from search results, and no outreach is sent.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(12rem,1fr)_9rem_auto]">
              <input
                value={discoveryDepartment}
                onChange={(event) => setDiscoveryDepartment(event.target.value)}
                placeholder="Department, e.g. Roofing"
                aria-label="Supplier search department"
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium"
              />
              <label className="relative">
                <MapPin className="pointer-events-none absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  value={discoveryZip}
                  onChange={(event) =>
                    setDiscoveryZip(
                      event.target.value.replace(/[^0-9-]/g, "").slice(0, 10),
                    )
                  }
                  inputMode="numeric"
                  aria-label="Supplier search ZIP code"
                  className="h-10 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2 text-sm font-medium"
                />
              </label>
              <button
                type="button"
                onClick={() => void discoverSuppliers(false)}
                disabled={discoveryPending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-xs font-bold text-white disabled:opacity-50"
              >
                {discoveryPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Generate 10
              </button>
            </div>
            {discoveryError ? (
              <p className="mt-2 text-xs font-semibold text-rose-700" role="alert">
                {discoveryError}
              </p>
            ) : null}
            {discoveryNotice ? (
              <p className="mt-2 text-xs font-semibold text-sky-800" role="status">
                {discoveryNotice}
              </p>
            ) : null}
            {discoveryResults.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {discoveryResults.map((supplier) => {
                  const added = addedIdentities.includes(supplier.identity);
                  const reviewing = reviewingCandidate?.identity === supplier.identity;
                  return (
                    <article
                      key={supplier.identity}
                      className={`grid gap-2 rounded-md border bg-white p-3 ${reviewing ? "border-amber-300 ring-2 ring-amber-100" : "border-sky-100"}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-bold text-slate-950">
                            {supplier.name}
                          </p>
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                            Needs review
                          </span>
                        </div>
                        <p className="truncate text-[10px] text-slate-500">
                          {supplier.domain}
                        </p>
                        <p className="mt-1 line-clamp-3 text-[10px] leading-4 text-slate-600">
                          {supplier.summary ||
                            "Open the source page to verify products and service area."}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={supplier.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2 text-[10px] font-bold text-[#0066cc]"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open source
                        </a>
                        <button
                          type="button"
                          onClick={() => beginCandidateReview(supplier)}
                          disabled={added || saving}
                          className="inline-flex h-8 items-center gap-1 rounded-md bg-[#0071e3] px-2 text-[10px] font-bold text-white disabled:bg-emerald-600"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {added ? "Added" : reviewing ? "Reviewing" : "Review candidate"}
                        </button>
                      </div>
                      {reviewing ? (
                        <div className="grid gap-2 border-t border-amber-100 pt-2">
                          <label className="grid gap-1 text-[10px] font-bold text-slate-700">
                            Verified supplier name
                            <input
                              value={reviewedSupplierName}
                              onChange={(event) =>
                                setReviewedSupplierName(event.target.value.slice(0, 160))
                              }
                              minLength={2}
                              maxLength={160}
                              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-950"
                            />
                          </label>
                          {[
                            ["officialSource", "The source appears to be this company’s official page."],
                            ["departmentFit", `The source supports the ${discoveryContext.department} department fit.`],
                            ["serviceArea", `The company appears able to serve ${discoveryContext.zipCode}.`],
                          ].map(([key, label]) => (
                            <label
                              key={key}
                              className="flex cursor-pointer items-start gap-2 text-[10px] leading-4 text-slate-700"
                            >
                              <input
                                type="checkbox"
                                checked={candidateReview[key as keyof typeof candidateReview]}
                                onChange={(event) =>
                                  setCandidateReview((current) => ({
                                    ...current,
                                    [key]: event.target.checked,
                                  }))
                                }
                                className="mt-0.5 h-3.5 w-3.5 accent-[#0071e3]"
                              />
                              {label}
                            </label>
                          ))}
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setReviewingCandidate(null);
                                setReviewedSupplierName("");
                                setCandidateReview(EMPTY_CANDIDATE_REVIEW);
                              }}
                              className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => addDiscoveredSupplier(supplier)}
                              disabled={
                                saving ||
                                reviewedSupplierName.trim().length < 2 ||
                                !Object.values(candidateReview).every(Boolean)
                              }
                              className="inline-flex h-8 items-center gap-1 rounded-md bg-slate-950 px-3 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {saving ? (
                                <LoaderCircle className="h-3 w-3 animate-spin" />
                              ) : (
                                <Plus className="h-3 w-3" />
                              )}
                              Add to More suppliers
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : null}
            {discoveryResults.length ? (
              <button
                type="button"
                onClick={() => void discoverSuppliers(true)}
                disabled={discoveryPending}
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-sky-300 bg-white px-3 text-xs font-bold text-[#0066cc] disabled:opacity-50"
              >
                {discoveryPending ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Generate 10 more
              </button>
            ) : null}
          </div>
        </details>
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
            {filtered.map((row, index) => {
              const edit = currentEdit(row);
              const open = expanded?.key === row.key;
              const optionsOpen = open && expanded.mode === "options";
              const actionsOpen = open && expanded.mode === "actions";
              const selectedChannels = edit.channels;
              const approvedGroup = stage === "approved" && (index === 0 || currentEdit(filtered[index - 1]).priority !== edit.priority)
              return (
                <Fragment key={row.key}>
                {approvedGroup ? <tr className="bg-slate-100"><td colSpan={6} className="px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-slate-600">{edit.priority ? "Top vendors · actively working together" : "Approved suppliers · ready when needed"}</td></tr> : null}
                <tr
                  className="group align-top hover:bg-sky-50/40"
                >
                  <td className="p-0" colSpan={6}>
                    <div className="grid min-h-11 w-full grid-cols-[10rem_12rem_8rem_minmax(12rem,1fr)_5rem_4rem] items-center text-left">
                      <label className="flex min-w-0 items-center gap-1.5 px-2 text-xs font-bold text-slate-950">
                        <input
                          type="checkbox"
                          checked={edit.priority}
                          onChange={(event) => {
                            if (
                              edit.stage === "more" &&
                              event.target.checked &&
                              row.directoryTrustLevel === "not-reviewed"
                            ) {
                              moveRow(row, "contact");
                              return;
                            }
                            saveRow(row, {
                              ...edit,
                              priority: event.target.checked,
                              stage:
                                edit.stage === "contact" && !event.target.checked
                                  ? "more"
                                  : edit.stage === "more" && event.target.checked
                                    ? "contact"
                                    : edit.stage,
                            });
                          }}
                          className="h-3.5 w-3.5 shrink-0 accent-amber-500"
                          aria-label={`${stage === "approved" ? "Top vendor" : "Current priority"} ${row.name}`}
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
                          <SupplierProgramBadges channels={selectedChannels} />
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
                        {row.directorySupplierId ? `${edit.status} · ${row.directoryTrustLevel === "verified" || row.directoryTrustLevel === "trusted" || row.directoryTrustLevel === "preferred" ? "Verified" : "Directory"}` : edit.status}
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
                                onChange={(event) => {
                                  const nextStage = event.target.value as SupplierNetworkStage;
                                  moveRow(row, nextStage);
                                }}
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
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-[10px] leading-4 text-slate-600">
                              <strong>Ask:</strong> {row.ask}
                            </p>
                            <p className="mt-1 text-[9px] font-semibold text-emerald-700">
                              Moving to Approved adds or updates this company in the Verified Supplier Directory.
                            </p>
                            <p className="mt-1 text-[9px] font-semibold text-slate-500">
                              Candidate promotions require human confirmation and never send outreach.
                            </p>
                          </div>
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
                </Fragment>
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
