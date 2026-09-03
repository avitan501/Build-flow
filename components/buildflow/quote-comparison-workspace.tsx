"use client";

import {
  Archive,
  ArrowLeft,
  Check,
  ChevronDown,
  PackagePlus,
  Plus,
  RotateCcw,
  Save,
  Store,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  addQuoteComparisonItemAction,
  addQuoteComparisonSupplierAction,
  archiveQuoteComparisonAction,
  awardQuoteComparisonBidAction,
  confirmQuoteComparisonPriceMatchAction,
  deleteQuoteComparisonAction,
  deleteQuoteComparisonItemAction,
  removeQuoteComparisonSupplierAction,
  reopenQuoteComparisonAction,
  saveQuoteComparisonBidAction,
  saveQuoteComparisonClientTargetsAction,
  updateQuoteComparisonAction,
} from "@/app/admin/quote-comparison/actions";
import {
  ClientQuoteBuilder,
  type QuoteClientOption,
} from "@/components/buildflow/client-quote-builder";
import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";
import {
  analyzeQuoteComparison,
  buildClientReadyToPaySummary,
  buildMixedSupplierAnalysis,
  buildQuoteBuyingOptions,
  formatComparisonMoney,
  lowestSupplierPriceByItem,
  quoteLineMatchStatus,
  quoteComparisonStatusLabel,
  type ClientQuoteAttachmentRecord,
  type QuoteComparisonBidRecord,
  type QuoteComparisonItemRecord,
  type QuoteComparisonPriceRecord,
  type QuoteComparisonRecord,
} from "@/lib/quote-comparison";
import type { SupplierRoutingOption } from "@/lib/shop-qualification";

type ProjectOption = { id: string; name: string; address: string | null };
type BidDraft = {
  deliveryCharge: string;
  taxPercent: string;
  leadTimeDays: string;
  notes: string;
};
type PriceDraft = { unitPrice: string; isAvailable: boolean; notes: string };

const commonUnits = ["each", "piece", "sheet", "box", "bag", "bundle", "linear ft", "sq. ft.", "yard", "gallon"];

function moneyInput(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function draftNumber(value: string | undefined) {
  if (value === undefined || value.trim() === "") return Number.NaN;
  return Number(value);
}

function statusTone(status: QuoteComparisonRecord["status"]) {
  if (status === "awarded") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "review") return "border-sky-200 bg-sky-50 text-sky-800";
  if (status === "archived") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function trustLabel(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function QuoteComparisonWorkspace({
  comparison,
  items,
  bids,
  suppliers,
  projects,
  departments,
  clients,
  clientQuoteAttachments,
  previewMode = false,
}: {
  comparison: QuoteComparisonRecord;
  items: QuoteComparisonItemRecord[];
  bids: QuoteComparisonBidRecord[];
  suppliers: SupplierRoutingOption[];
  projects: ProjectOption[];
  departments: string[];
  clients: QuoteClientOption[];
  clientQuoteAttachments: ClientQuoteAttachmentRecord[];
  previewMode?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [showItemForm, setShowItemForm] = useState(items.length === 0);
  const [showSupplierForm, setShowSupplierForm] = useState(bids.length === 0);
  const [selectedBidId, setSelectedBidId] = useState(comparison.awarded_bid_id || "");
  const [details, setDetails] = useState({
    title: comparison.title,
    department: comparison.department,
    jobAddress: comparison.job_address,
    projectId: comparison.project_id || "",
  });
  const [itemDraft, setItemDraft] = useState({ description: "", specification: "", quantity: "", unit: "each" });
  const [supplierId, setSupplierId] = useState("");
  const [bidDrafts, setBidDrafts] = useState<Record<string, BidDraft>>(() => Object.fromEntries(bids.map((bid) => [bid.id, {
    deliveryCharge: String(bid.delivery_charge),
    taxPercent: String(bid.tax_percent),
    leadTimeDays: bid.lead_time_days === null ? "" : String(bid.lead_time_days),
    notes: bid.notes,
  }])));
  const [priceDrafts, setPriceDrafts] = useState<Record<string, PriceDraft>>(() => {
    const values: Record<string, PriceDraft> = {};
    for (const bid of bids) {
      const prices = new Map((bid.quote_comparison_prices ?? []).map((price) => [price.item_id, price]));
      for (const item of items) {
        const price = prices.get(item.id);
        values[`${bid.id}:${item.id}`] = {
          unitPrice: price?.unit_price === null || price?.unit_price === undefined ? "" : String(price.unit_price),
          isAvailable: price?.is_available ?? true,
          notes: price?.notes ?? "",
        };
      }
    }
    return values;
  });
  const [clientTargetDrafts, setClientTargetDrafts] = useState<Record<string, string>>(() => Object.fromEntries(items.map((item) => [item.id, item.client_unit_price === null || item.client_unit_price === undefined ? "" : String(item.client_unit_price)])));
  const [clientDeliveryDraft, setClientDeliveryDraft] = useState(String(comparison.client_delivery_charge));
  const [clientTaxDraft, setClientTaxDraft] = useState(String(comparison.client_tax_percent));

  const availableSuppliers = suppliers.filter((supplier) => !bids.some((bid) => bid.supplier_id === supplier.id));
  const liveBids = useMemo<QuoteComparisonBidRecord[]>(() => bids.map((bid) => {
    const draft = bidDrafts[bid.id];
    return {
      ...bid,
      delivery_charge: draftNumber(draft?.deliveryCharge),
      tax_percent: draftNumber(draft?.taxPercent),
      lead_time_days: draft?.leadTimeDays ? Number(draft.leadTimeDays) : null,
      notes: draft?.notes ?? "",
      quote_comparison_prices: items.map((item) => {
        const draftPrice = priceDrafts[`${bid.id}:${item.id}`];
        return {
          bid_id: bid.id,
          item_id: item.id,
          unit_price: draftPrice?.unitPrice === "" || draftPrice?.unitPrice === undefined ? null : draftNumber(draftPrice.unitPrice),
          is_available: draftPrice?.isAvailable ?? true,
          notes: draftPrice?.notes ?? "",
        } satisfies QuoteComparisonPriceRecord;
      }),
    };
  }), [bidDrafts, bids, items, priceDrafts]);
  const liveItems = useMemo(() => items.map((item) => ({
    ...item,
    client_unit_price: clientTargetDrafts[item.id] === "" || clientTargetDrafts[item.id] === undefined ? null : draftNumber(clientTargetDrafts[item.id]),
  })), [clientTargetDrafts, items]);
  const analyses = useMemo(() => analyzeQuoteComparison(liveItems, liveBids), [liveItems, liveBids]);
  const lowestPrices = useMemo(() => lowestSupplierPriceByItem(liveItems, liveBids), [liveItems, liveBids]);
  const mixedAnalysis = useMemo(() => buildMixedSupplierAnalysis(liveItems, liveBids), [liveItems, liveBids]);
  const clientReady = useMemo(() => buildClientReadyToPaySummary(
    liveItems,
    clientDeliveryDraft === "" ? null : draftNumber(clientDeliveryDraft),
    clientTaxDraft === "" ? null : draftNumber(clientTaxDraft),
  ), [clientDeliveryDraft, clientTaxDraft, liveItems]);
  const buyingOptions = useMemo(() => buildQuoteBuyingOptions(liveItems, liveBids, clientReady), [clientReady, liveBids, liveItems]);
  const unfinishedOptions = analyses.filter((analysis) => !analysis.eligible && !analysis.blocked).length;
  const hasMissingValues = !clientReady.complete || unfinishedOptions > 0 || (!mixedAnalysis.complete && bids.length > 1);
  const locked = !previewMode && (comparison.status === "awarded" || comparison.status === "archived");
  const canManageStructure = !previewMode && !locked;
  const canManageRequestItems = canManageStructure && !comparison.request_id;
  const selectedBid = liveBids.find((bid) => bid.id === selectedBidId) ?? null;

  function run(action: () => Promise<{ ok: boolean; error?: string }>, successMessage: string, after?: () => void) {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error || "The change could not be saved.");
        return;
      }
      setMessage(successMessage);
      after?.();
      router.refresh();
    });
  }

  function saveDetails() {
    run(() => updateQuoteComparisonAction({ comparisonId: comparison.id, ...details }), "Comparison details saved.", () => setShowDetails(false));
  }

  function addItem() {
    const quantity = Number(itemDraft.quantity);
    run(
      () => addQuoteComparisonItemAction({ comparisonId: comparison.id, description: itemDraft.description, specification: itemDraft.specification, quantity, unit: itemDraft.unit }),
      "Material added.",
      () => setItemDraft({ description: "", specification: "", quantity: "", unit: "each" }),
    );
  }

  function addSupplier() {
    if (!supplierId) return;
    run(() => addQuoteComparisonSupplierAction({ comparisonId: comparison.id, supplierId }), "Supplier added.", () => {
      setSupplierId("");
      setShowSupplierForm(false);
    });
  }

  function confirmMatch(key: string, bidId: string, itemId: string) {
    run(
      () => confirmQuoteComparisonPriceMatchAction({ comparisonId: comparison.id, bidId, itemId }),
      "Supplier item match confirmed.",
      () => setPriceDrafts((current) => ({ ...current, [key]: { ...current[key], notes: "" } })),
    );
  }

  function saveAllQuotes() {
    setError("");
    setMessage("");
    if (hasMissingValues) {
      setError("Finish the missing client and supplier values before saving the comparison.");
      window.requestAnimationFrame(() => document.getElementById("quote-inputs")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }
    if (previewMode) {
      setMessage("Sample supplier prices updated locally. No data was saved.");
      return;
    }
    startTransition(async () => {
      const results = await Promise.all([saveQuoteComparisonClientTargetsAction({
        comparisonId: comparison.id,
        clientDeliveryCharge: clientReady.deliveryCharge,
        clientTaxPercent: clientReady.taxPercent,
        items: items.map((item) => ({ itemId: item.id, clientUnitPrice: clientTargetDrafts[item.id] === "" ? null : moneyInput(clientTargetDrafts[item.id]) })),
      }), ...liveBids.map((bid) => saveQuoteComparisonBidAction({
        comparisonId: comparison.id,
        bidId: bid.id,
        deliveryCharge: bid.delivery_charge,
        taxPercent: bid.tax_percent,
        leadTimeDays: bid.lead_time_days,
        notes: bid.notes,
        prices: (bid.quote_comparison_prices ?? []).map((price) => ({ itemId: price.item_id, unitPrice: price.unit_price, isAvailable: price.is_available })),
      }))]);
      const failed = results.find((result) => !result.ok);
      if (failed && !failed.ok) {
        setError(failed.error);
        return;
      }
      setMessage("All supplier quotes saved.");
      router.refresh();
    });
  }

  function awardBid(bidId: string, supplierName: string) {
    const option = buyingOptions.find((entry) => entry.id === bidId);
    if (!option?.selectable) {
      setError(`Finish missing values before selecting ${supplierName}.`);
      window.requestAnimationFrame(() => document.getElementById("quote-inputs")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }
    if (!window.confirm(`Select ${supplierName} as the supplier for this comparison?`)) return;
    const showClientQuote = () => window.requestAnimationFrame(() => {
      document.getElementById("client-quote-builder")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    if (previewMode) {
      setSelectedBidId(bidId);
      setMessage(`${supplierName} selected for the sample client quote.`);
      setError("");
      showClientQuote();
      return;
    }
    const bid = liveBids.find((entry) => entry.id === bidId);
    if (!bid) return;
    setError("");
    setMessage("");
    startTransition(async () => {
      const targetResult = await saveQuoteComparisonClientTargetsAction({
        comparisonId: comparison.id,
        clientDeliveryCharge: clientReady.deliveryCharge,
        clientTaxPercent: clientReady.taxPercent,
        items: liveItems.map((item) => ({ itemId: item.id, clientUnitPrice: item.client_unit_price })),
      });
      if (!targetResult.ok) {
        setError(targetResult.error);
        return;
      }
      const saveResult = await saveQuoteComparisonBidAction({
        comparisonId: comparison.id,
        bidId: bid.id,
        deliveryCharge: bid.delivery_charge,
        taxPercent: bid.tax_percent,
        leadTimeDays: bid.lead_time_days,
        notes: bid.notes,
        prices: (bid.quote_comparison_prices ?? []).map((price) => ({
          itemId: price.item_id,
          unitPrice: price.unit_price,
          isAvailable: price.is_available,
        })),
      });
      if (!saveResult.ok) {
        setError(saveResult.error);
        return;
      }

      const awardResult = await awardQuoteComparisonBidAction({ comparisonId: comparison.id, bidId });
      if (!awardResult.ok) {
        setError(awardResult.error);
        return;
      }
      setSelectedBidId(bidId);
      setMessage(`${supplierName} prices saved and supplier selected.`);
      showClientQuote();
      router.refresh();
    });
  }

  function deleteComparison() {
    if (!window.confirm("Delete this entire quote comparison? This cannot be undone.")) return;
    if (!window.confirm("Confirm again: permanently delete the comparison and all entered prices?")) return;
    run(() => deleteQuoteComparisonAction(comparison.id), "Comparison deleted.", () => router.push("/admin/quote-comparison"));
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] pb-24 text-slate-950">
      <div className="border-b border-slate-200 bg-white px-4 py-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[96rem]">
          {previewMode ? <span className="inline-flex items-center gap-2 text-sm font-bold text-[#0071e3]"><ArrowLeft className="h-4 w-4" /> Public design preview</span> : <Link href="/admin/quote-comparison" className="inline-flex items-center gap-2 text-sm font-bold text-[#0071e3]"><ArrowLeft className="h-4 w-4" /> All comparisons</Link>}
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <AvantiaBuildLockup compact className="shrink-0" />
              <div className="min-w-0 border-slate-200 sm:border-l sm:pl-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{comparison.title}</h1>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${statusTone(comparison.status)}`}>{quoteComparisonStatusLabel(comparison.status)}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{comparison.job_address || "No delivery address"} · {comparison.department || "General materials"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManageStructure ? <button type="button" onClick={() => setShowDetails((value) => !value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800">Edit details</button> : null}
              {locked && !previewMode ? <button type="button" onClick={() => run(() => reopenQuoteComparisonAction(comparison.id), "Comparison reopened.")} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold"><RotateCcw className="h-4 w-4" /> Reopen</button> : null}
              {!previewMode && comparison.status !== "archived" ? <button type="button" onClick={() => run(() => archiveQuoteComparisonAction(comparison.id), "Comparison archived.")} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold"><Archive className="h-4 w-4" /> Archive</button> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[96rem] px-4 py-5 sm:px-8 lg:px-10">
        {showDetails ? (
          <section className="mb-5 border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-1.5 text-sm font-semibold">Name<input value={details.title} onChange={(event) => setDetails((value) => ({ ...value, title: event.target.value }))} className="min-h-11 rounded-lg border border-slate-300 px-3" /></label>
              <label className="grid gap-1.5 text-sm font-semibold">Project<select value={details.projectId} onChange={(event) => setDetails((value) => ({ ...value, projectId: event.target.value }))} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
              <label className="grid gap-1.5 text-sm font-semibold">Department<select value={details.department} onChange={(event) => setDetails((value) => ({ ...value, department: event.target.value }))} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"><option value="">General materials</option>{departments.map((department) => <option key={department}>{department}</option>)}</select></label>
              <label className="grid gap-1.5 text-sm font-semibold">Delivery address<input value={details.jobAddress} onChange={(event) => setDetails((value) => ({ ...value, jobAddress: event.target.value }))} className="min-h-11 rounded-lg border border-slate-300 px-3" /></label>
            </div>
            <div className="mt-4 flex justify-end"><button type="button" onClick={saveDetails} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white"><Save className="h-4 w-4" /> Save details</button></div>
          </section>
        ) : null}

        {error ? <div role="alert" className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div> : null}
        {message ? <div role="status" className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</div> : null}
        {previewMode ? <div className="mb-4 border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">Interactive sample only. Changes stay in this browser and nothing is emailed.</div> : null}
        {locked ? <div className="mb-4 border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">The supplier comparison is locked. Client markup and quote details remain editable below.</div> : null}

        <section className="mt-5 border border-slate-200 bg-white shadow-sm" aria-labelledby="materials-heading">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><h2 id="materials-heading" className="text-lg font-bold">Material list</h2><p className="mt-1 text-xs text-slate-500">Every supplier is compared against the same quantities.</p></div>
            {canManageRequestItems ? <button type="button" onClick={() => setShowItemForm((value) => !value)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"><PackagePlus className="h-4 w-4" /> Add material</button> : comparison.request_id ? <span className="text-xs font-semibold text-slate-500">Locked to client request</span> : null}
          </div>
          {showItemForm && canManageRequestItems ? (
            <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(12rem,1.4fr)_minmax(12rem,1fr)_8rem_9rem_auto] sm:items-end sm:px-6">
              <label className="grid gap-1 text-xs font-bold text-slate-600">Material<input value={itemDraft.description} onChange={(event) => setItemDraft((value) => ({ ...value, description: event.target.value }))} placeholder="2 x 4 x 10 ft. stud" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">Specification <span className="sr-only">Optional</span><input value={itemDraft.specification} onChange={(event) => setItemDraft((value) => ({ ...value, specification: event.target.value }))} placeholder="Grade, brand, color…" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">Quantity<input type="number" min="0.001" step="any" value={itemDraft.quantity} onChange={(event) => setItemDraft((value) => ({ ...value, quantity: event.target.value }))} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">Unit<select value={itemDraft.unit} onChange={(event) => setItemDraft((value) => ({ ...value, unit: event.target.value }))} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm">{commonUnits.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
              <button type="button" onClick={addItem} disabled={pending || !itemDraft.description.trim() || !itemDraft.quantity} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white disabled:opacity-40"><Plus className="h-4 w-4" /> Add</button>
            </div>
          ) : null}
          {items.length ? <div className="divide-y divide-slate-100">{items.map((item) => <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-5 py-3 sm:px-6"><div><p className="text-sm font-bold">{item.description}</p>{item.specification ? <p className="mt-0.5 text-xs text-slate-500">{item.specification}</p> : null}<p className="mt-1 text-xs font-semibold text-[#0071e3]">{item.quantity.toLocaleString()} {item.unit}</p></div>{canManageRequestItems ? <button type="button" onClick={() => window.confirm(`Remove ${item.description}?`) && run(() => deleteQuoteComparisonItemAction({ comparisonId: comparison.id, itemId: item.id }), "Material removed.")} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${item.description}`}><Trash2 className="h-4 w-4" /></button> : null}</div>)}</div> : <p className="px-5 py-8 text-center text-sm text-slate-500">Add at least one material to begin comparing prices.</p>}
        </section>

        <section id="quote-inputs" className="mt-5 scroll-mt-4 border border-slate-200 bg-white shadow-sm" aria-labelledby="quotes-heading">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><h2 id="quotes-heading" className="text-lg font-bold">Client target and supplier prices</h2><p className="mt-1 text-xs text-slate-500">Unit prices are per listed unit. Delivery, tax, and totals are for the whole order.</p></div>
            {!locked ? <div className="flex flex-wrap gap-2">
              {canManageStructure ? <button type="button" onClick={() => setShowSupplierForm((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"><Store className="h-4 w-4" /> Add supplier</button> : null}
              <button type="button" onClick={saveAllQuotes} disabled={pending || bids.length === 0} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-40"><Save className="h-4 w-4" /> Save prices</button>
            </div> : null}
          </div>

          {showSupplierForm && canManageStructure ? <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-end sm:px-6"><label className="grid flex-1 gap-1 text-xs font-bold text-slate-600">Supplier<select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Choose from Supplier Directory</option>{availableSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name} · {trustLabel(supplier.trustLevel || "not-reviewed")}</option>)}</select></label><button type="button" onClick={addSupplier} disabled={pending || !supplierId} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white disabled:opacity-40"><Plus className="h-4 w-4" /> Add supplier</button></div> : null}

          {bids.length > 0 && items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="sticky left-0 z-10 min-w-64 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{comparison.request_id ? "Client request" : "Material"}</th><th className="min-w-48 border-l border-amber-200 bg-amber-50 px-4 py-3 align-top text-xs font-bold text-amber-950">Client Ready to Pay<span className="mt-1 block text-[10px] font-medium text-amber-800">Client unit price</span></th>{bids.map((bid) => <th key={bid.id} className="min-w-56 border-l border-slate-200 px-4 py-3 align-top"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold normal-case tracking-normal text-slate-950">{bid.supplier_name_snapshot}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Supplier unit price · {trustLabel(bid.trust_level_snapshot)}</p></div>{canManageStructure ? <button type="button" onClick={() => window.confirm(`Remove ${bid.supplier_name_snapshot} from this comparison?`) && run(() => removeQuoteComparisonSupplierAction({ comparisonId: comparison.id, bidId: bid.id }), "Supplier removed.")} className="text-slate-400 hover:text-rose-600" aria-label={`Remove ${bid.supplier_name_snapshot}`}><X className="h-4 w-4" /></button> : null}</div></th>)}</tr></thead>
                <tbody>
                  {items.map((item) => <tr key={item.id} className="border-b border-slate-100"><th className="sticky left-0 z-10 bg-white px-5 py-3"><p className="text-sm font-bold">{item.description}</p><p className="mt-1 text-xs font-medium text-slate-500">{item.quantity.toLocaleString()} {item.unit}{item.specification ? ` · ${item.specification}` : ""}</p></th><td className="border-l border-amber-100 bg-amber-50/50 px-4 py-3"><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-700">$</span><input type="number" min="0" step="0.01" value={clientTargetDrafts[item.id] ?? ""} disabled={locked} onChange={(event) => setClientTargetDrafts((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="0.00" aria-label={`Client target unit price for ${item.description}`} className="min-h-10 w-full rounded-lg border border-amber-300 bg-white pl-7 pr-2 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /></div></td>{bids.map((bid) => {
                    const key = `${bid.id}:${item.id}`;
                    const price = priceDrafts[key] ?? { unitPrice: "", isAvailable: true, notes: "" };
                    const lowest = lowestPrices.get(item.id);
                    const isLowest = Boolean(price.isAvailable && price.unitPrice !== "" && lowest?.bidId === bid.id);
                    const matchStatus = quoteLineMatchStatus(item, price.notes);
                    return <td key={bid.id} className={`border-l border-slate-100 px-4 py-3 align-top ${isLowest ? "bg-emerald-50" : ""}`}><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span><input type="number" min="0" step="0.01" value={price.unitPrice} disabled={locked || !price.isAvailable} onChange={(event) => setPriceDrafts((current) => ({ ...current, [key]: { ...price, unitPrice: event.target.value } }))} placeholder="0.00" aria-label={`${bid.supplier_name_snapshot} unit price for ${item.description}`} className={`min-h-10 w-full rounded-lg border pl-7 pr-2 text-right text-sm font-bold tabular-nums disabled:bg-slate-100 disabled:text-slate-400 ${isLowest ? "border-emerald-400 bg-white" : "border-slate-300"}`} /></div><div className="mt-2 flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500"><input type="checkbox" checked={!price.isAvailable} disabled={locked} onChange={(event) => setPriceDrafts((current) => ({ ...current, [key]: { ...price, isAvailable: !event.target.checked, unitPrice: event.target.checked ? "" : price.unitPrice } }))} /> Not available</label>{isLowest ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Lowest</span> : null}{matchStatus !== "manual" ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${matchStatus === "exact" ? "bg-sky-100 text-sky-800" : matchStatus === "possible" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>{matchStatus === "exact" ? "Exact match" : matchStatus === "possible" ? "Possible match" : "Needs review"}</span> : null}{!locked && ["possible", "review"].includes(matchStatus) ? <button type="button" onClick={() => confirmMatch(key, bid.id, item.id)} disabled={pending} className="text-[10px] font-bold text-[#0066cc] underline underline-offset-2">Confirm match</button> : null}</div></td>;
                  })}</tr>)}
                  <tr className="border-b border-slate-200 bg-slate-50"><th className="sticky left-0 bg-slate-50 px-5 py-3 text-sm font-bold">Delivery charge <span className="block text-[10px] font-medium text-slate-500">Whole order</span></th><td className="border-l border-amber-100 bg-amber-50/50 px-4 py-3"><input aria-label="Client delivery charge for whole order" type="number" min="0" step="0.01" value={clientDeliveryDraft} disabled={locked} onChange={(event) => setClientDeliveryDraft(event.target.value)} className="min-h-10 w-full rounded-lg border border-amber-300 bg-white px-3 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /></td>{bids.map((bid) => <td key={bid.id} className="border-l border-slate-200 px-4 py-3"><input aria-label={`${bid.supplier_name_snapshot} delivery charge for whole order`} type="number" min="0" step="0.01" value={bidDrafts[bid.id]?.deliveryCharge ?? ""} disabled={locked} onChange={(event) => setBidDrafts((current) => ({ ...current, [bid.id]: { ...current[bid.id], deliveryCharge: event.target.value } }))} className="min-h-10 w-full rounded-lg border border-slate-300 px-3 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /></td>)}</tr>
                  <tr className="border-b border-slate-200 bg-slate-50"><th className="sticky left-0 bg-slate-50 px-5 py-3 text-sm font-bold">Tax percentage <span className="block text-[10px] font-medium text-slate-500">Whole order</span></th><td className="border-l border-amber-100 bg-amber-50/50 px-4 py-3"><div className="relative"><input aria-label="Client tax percentage for whole order" type="number" min="0" max="100" step="0.001" value={clientTaxDraft} disabled={locked} onChange={(event) => setClientTaxDraft(event.target.value)} placeholder="8.875" className="min-h-10 w-full rounded-lg border border-amber-300 bg-white pl-3 pr-8 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-700">%</span></div></td>{bids.map((bid) => <td key={bid.id} className="border-l border-slate-200 px-4 py-3"><div className="relative"><input aria-label={`${bid.supplier_name_snapshot} tax percentage for whole order`} type="number" min="0" max="100" step="0.001" value={bidDrafts[bid.id]?.taxPercent ?? ""} disabled={locked} onChange={(event) => setBidDrafts((current) => ({ ...current, [bid.id]: { ...current[bid.id], taxPercent: event.target.value } }))} placeholder="8.875" className="min-h-10 w-full rounded-lg border border-slate-300 pl-3 pr-8 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span></div></td>)}</tr>
                  <tr className="bg-slate-50"><th className="sticky left-0 bg-slate-50 px-5 py-3 text-sm font-bold">Lead time in days</th><td className="border-l border-amber-100 bg-amber-50/50 px-4 py-3 text-xs font-semibold text-amber-800">Derived from each buying option</td>{bids.map((bid) => <td key={bid.id} className="border-l border-slate-200 px-4 py-3"><input aria-label={`${bid.supplier_name_snapshot} lead time in days`} type="number" min="0" step="1" value={bidDrafts[bid.id]?.leadTimeDays ?? ""} disabled={locked} onChange={(event) => setBidDrafts((current) => ({ ...current, [bid.id]: { ...current[bid.id], leadTimeDays: event.target.value } }))} className="min-h-10 w-full rounded-lg border border-slate-300 px-3 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /></td>)}</tr>
                </tbody>
              </table>
            </div>
          ) : <div className="px-5 py-10 text-center text-sm text-slate-500">{items.length === 0 ? "Add materials before entering supplier prices." : "Add at least one supplier from the directory."}</div>}
        </section>

        <section className="mt-5" aria-labelledby="analysis-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0071e3]">One client amount, every option</p><h2 id="analysis-heading" className="mt-1 text-2xl font-bold">Buying option comparison</h2><p className="mt-1 text-xs leading-5 text-slate-500">Estimated gross profit is the client pre-tax amount minus the supplier total. It does not include overhead.</p></div>
            {hasMissingValues && !locked ? <button type="button" onClick={() => document.getElementById("quote-inputs")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="min-h-10 shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-900">Finish missing values</button> : null}
          </div>

          <div className={`mt-4 border p-4 shadow-sm ${clientReady.complete ? "border-amber-300 bg-amber-50" : "border-amber-300 bg-white"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-amber-950">Client Ready to Pay</h3><p className="mt-1 text-xs text-amber-800">Same final whole-order amount for every complete buying option.</p></div><p className="text-2xl font-bold tabular-nums text-amber-950">{clientReady.complete ? formatComparisonMoney(clientReady.finalTotal) : "Incomplete"}</p></div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4"><div><dt className="text-amber-800">Material · whole order</dt><dd className="mt-1 font-bold tabular-nums">{formatComparisonMoney(clientReady.materialSubtotal)}</dd></div><div><dt className="text-amber-800">Delivery · whole order</dt><dd className="mt-1 font-bold tabular-nums">{formatComparisonMoney(clientReady.deliveryCharge)}</dd></div><div><dt className="text-amber-800">Tax · whole order</dt><dd className="mt-1 font-bold tabular-nums">{formatComparisonMoney(clientReady.taxAmount)} ({clientReady.taxPercent.toFixed(3).replace(/\.?0+$/, "")}%)</dd></div><div><dt className="text-amber-800">Lead time</dt><dd className="mt-1 font-bold">Derived per option below</dd></div></dl>
            {!clientReady.complete ? <p className="mt-3 text-xs font-bold text-amber-900">Missing: {clientReady.missingFields.join(", ")}.</p> : null}
          </div>

          {buyingOptions.length > 0 ? <>
            <div className="mt-4 hidden overflow-hidden border border-slate-200 bg-white shadow-sm md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead><tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500"><th className="px-4 py-3">Option / Supplier</th><th className="px-3 py-3 text-right">Supplier total</th><th className="px-3 py-3 text-right">Client total</th><th className="px-3 py-3 text-right">Estimated gross profit</th><th className="px-3 py-3 text-right">Margin</th><th className="px-3 py-3 text-right">Lead time</th><th className="px-4 py-3 text-right">Select</th></tr></thead>
                <tbody>{buyingOptions.map((option) => <tr key={option.id} className={`border-b border-slate-100 last:border-b-0 ${option.isLowestCost ? "bg-emerald-50/60" : ""}`}><td className="px-4 py-3 align-top"><p className="font-bold">{option.label} {option.isLowestCost ? <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800">Lowest complete cost</span> : null}</p><p className={`mt-1 text-xs font-semibold ${option.complete ? "text-emerald-700" : "text-amber-700"}`}>{option.complete ? option.kind === "mixed" ? option.supplierNames.join(" + ") : "Complete" : `Missing: ${option.missingFields.join(", ") || "required values"}`}</p><details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer font-bold text-[#0066cc]">Details</summary><div className="mt-2 grid gap-1"><span>Supplier material: {formatComparisonMoney(option.supplierMaterialSubtotal)}</span><span>Supplier delivery: {formatComparisonMoney(option.supplierDeliveryCharge)}</span><span>Supplier tax: {formatComparisonMoney(option.supplierTaxAmount)}</span><span>Client material: {formatComparisonMoney(option.clientMaterialSubtotal)}</span><span>Client delivery: {formatComparisonMoney(option.clientDeliveryCharge)}</span><span>Client tax: {formatComparisonMoney(option.clientTaxAmount)}</span></div></details></td><td className="px-3 py-3 text-right align-top font-bold tabular-nums">{option.complete ? formatComparisonMoney(option.supplierTotal) : "—"}</td><td className="px-3 py-3 text-right align-top font-bold tabular-nums">{clientReady.complete ? formatComparisonMoney(option.clientTotal) : "—"}</td><td className={`px-3 py-3 text-right align-top font-bold tabular-nums ${option.estimatedGrossProfit < 0 ? "text-rose-700" : "text-emerald-700"}`}>{option.complete ? formatComparisonMoney(option.estimatedGrossProfit) : "—"}</td><td className={`px-3 py-3 text-right align-top font-bold tabular-nums ${option.grossMarginPercent < 0 ? "text-rose-700" : ""}`}>{option.complete ? `${option.grossMarginPercent.toFixed(1)}%` : "—"}</td><td className="px-3 py-3 text-right align-top font-semibold">{option.leadTimeDays === null ? "Missing" : `${option.leadTimeDays} day${option.leadTimeDays === 1 ? "" : "s"}`}</td><td className="px-4 py-3 text-right align-top">{option.kind === "mixed" ? <span className="text-xs font-semibold text-slate-500" title="The current record supports one awarded supplier.">Review only</span> : selectedBidId === option.id ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><Check className="h-4 w-4" /> Selected</span> : !locked ? <button type="button" onClick={() => awardBid(option.id, option.label)} disabled={pending || !option.selectable} className="min-h-9 rounded-md bg-slate-950 px-3 text-xs font-bold text-white disabled:bg-slate-200 disabled:text-slate-500">Select</button> : null}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-3 md:hidden">{buyingOptions.map((option) => <article key={option.id} className={`border bg-white p-4 shadow-sm ${option.isLowestCost ? "border-emerald-300" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{option.label}</h3><p className={`mt-1 text-xs font-semibold ${option.complete ? "text-emerald-700" : "text-amber-700"}`}>{option.complete ? option.isLowestCost ? "Lowest complete cost" : "Complete" : `Missing: ${option.missingFields.join(", ") || "required values"}`}</p></div><p className="text-right text-lg font-bold tabular-nums">{option.complete ? formatComparisonMoney(option.supplierTotal) : "Incomplete"}<span className="block text-[10px] font-semibold text-slate-500">Supplier total</span></p></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">Client total</dt><dd className="mt-1 font-bold tabular-nums">{clientReady.complete ? formatComparisonMoney(option.clientTotal) : "—"}</dd></div><div><dt className="text-slate-500">Lead time</dt><dd className="mt-1 font-bold">{option.leadTimeDays === null ? "Missing" : `${option.leadTimeDays} days`}</dd></div><div><dt className="text-slate-500">Estimated gross profit</dt><dd className={`mt-1 font-bold tabular-nums ${option.estimatedGrossProfit < 0 ? "text-rose-700" : "text-emerald-700"}`}>{option.complete ? formatComparisonMoney(option.estimatedGrossProfit) : "—"}</dd></div><div><dt className="text-slate-500">Gross margin</dt><dd className={`mt-1 font-bold tabular-nums ${option.grossMarginPercent < 0 ? "text-rose-700" : ""}`}>{option.complete ? `${option.grossMarginPercent.toFixed(1)}%` : "—"}</dd></div></dl><details className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600"><summary className="cursor-pointer font-bold text-[#0066cc]">Details</summary><div className="mt-2 grid grid-cols-2 gap-2"><span>Supplier material<br /><b>{formatComparisonMoney(option.supplierMaterialSubtotal)}</b></span><span>Supplier delivery<br /><b>{formatComparisonMoney(option.supplierDeliveryCharge)}</b></span><span>Supplier tax<br /><b>{formatComparisonMoney(option.supplierTaxAmount)}</b></span><span>Client material<br /><b>{formatComparisonMoney(option.clientMaterialSubtotal)}</b></span></div></details>{option.kind === "mixed" ? <p className="mt-4 text-xs font-semibold text-slate-500">Review only · current records support one awarded supplier.</p> : selectedBidId === option.id ? <p className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-emerald-700"><Check className="h-4 w-4" /> Selected</p> : !locked ? <button type="button" onClick={() => awardBid(option.id, option.label)} disabled={pending || !option.selectable} className="mt-4 min-h-11 w-full rounded-lg bg-slate-950 px-4 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-500">Select supplier</button> : null}</article>)}</div>
          </> : <div className="mt-4 border border-dashed border-slate-300 bg-white px-5 py-10 text-center"><p className="text-sm font-bold">Enter supplier prices to compare them.</p></div>}
        </section>

        <ClientQuoteBuilder
          key={selectedBidId || "no-supplier"}
          comparison={{ ...comparison, client_delivery_charge: clientReady.deliveryCharge, client_tax_percent: clientReady.taxPercent }}
          items={liveItems}
          selectedBid={selectedBid}
          clients={clients}
          initialAttachments={clientQuoteAttachments}
          previewMode={previewMode}
        />

        {!previewMode ? <details className="mt-8 border-t border-slate-300 pt-4"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-slate-500"><ChevronDown className="h-4 w-4" /> Comparison controls</summary><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={deleteComparison} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700"><Trash2 className="h-4 w-4" /> Delete comparison</button></div></details> : null}
      </div>
    </main>
  );
}
