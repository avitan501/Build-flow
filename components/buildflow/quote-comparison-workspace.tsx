"use client";

import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Award,
  Ban,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  PackagePlus,
  Plus,
  RotateCcw,
  Save,
  Store,
  Trash2,
  Truck,
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
  deleteQuoteComparisonAction,
  deleteQuoteComparisonItemAction,
  removeQuoteComparisonSupplierAction,
  reopenQuoteComparisonAction,
  saveQuoteComparisonBidAction,
  updateQuoteComparisonAction,
} from "@/app/admin/quote-comparison/actions";
import {
  ClientQuoteBuilder,
  type QuoteClientOption,
} from "@/components/buildflow/client-quote-builder";
import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";
import {
  analyzeQuoteComparison,
  formatComparisonMoney,
  quoteComparisonStatusLabel,
  type QuoteComparisonBidRecord,
  type QuoteComparisonItemRecord,
  type QuoteComparisonPriceRecord,
  type QuoteComparisonRecord,
} from "@/lib/quote-comparison";
import type { SupplierRoutingOption } from "@/lib/shop-qualification";

type ProjectOption = { id: string; name: string; address: string | null };
type BidDraft = {
  deliveryCharge: string;
  taxAmount: string;
  leadTimeDays: string;
  notes: string;
};
type PriceDraft = { unitPrice: string; isAvailable: boolean };

const commonUnits = ["each", "piece", "sheet", "box", "bag", "bundle", "linear ft", "sq. ft.", "yard", "gallon"];

function moneyInput(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
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
  previewMode = false,
}: {
  comparison: QuoteComparisonRecord;
  items: QuoteComparisonItemRecord[];
  bids: QuoteComparisonBidRecord[];
  suppliers: SupplierRoutingOption[];
  projects: ProjectOption[];
  departments: string[];
  clients: QuoteClientOption[];
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
    deliveryCharge: String(bid.delivery_charge || ""),
    taxAmount: String(bid.tax_amount || ""),
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
        };
      }
    }
    return values;
  });

  const availableSuppliers = suppliers.filter((supplier) => !bids.some((bid) => bid.supplier_id === supplier.id));
  const liveBids = useMemo<QuoteComparisonBidRecord[]>(() => bids.map((bid) => {
    const draft = bidDrafts[bid.id];
    return {
      ...bid,
      delivery_charge: moneyInput(draft?.deliveryCharge ?? ""),
      tax_amount: moneyInput(draft?.taxAmount ?? ""),
      lead_time_days: draft?.leadTimeDays ? Number(draft.leadTimeDays) : null,
      notes: draft?.notes ?? "",
      quote_comparison_prices: items.map((item) => {
        const draftPrice = priceDrafts[`${bid.id}:${item.id}`];
        return {
          bid_id: bid.id,
          item_id: item.id,
          unit_price: draftPrice?.unitPrice === "" || draftPrice?.unitPrice === undefined ? null : moneyInput(draftPrice.unitPrice),
          is_available: draftPrice?.isAvailable ?? true,
          notes: "",
        } satisfies QuoteComparisonPriceRecord;
      }),
    };
  }), [bidDrafts, bids, items, priceDrafts]);
  const analyses = useMemo(() => analyzeQuoteComparison(items, liveBids), [items, liveBids]);
  const recommended = analyses.find((analysis) => analysis.isRecommended);
  const locked = !previewMode && (comparison.status === "awarded" || comparison.status === "archived");
  const canManageStructure = !previewMode && !locked;
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

  function saveAllQuotes() {
    setError("");
    setMessage("");
    if (previewMode) {
      setMessage("Sample supplier prices updated locally. No data was saved.");
      return;
    }
    startTransition(async () => {
      const results = await Promise.all(liveBids.map((bid) => saveQuoteComparisonBidAction({
        comparisonId: comparison.id,
        bidId: bid.id,
        deliveryCharge: bid.delivery_charge,
        taxAmount: bid.tax_amount,
        leadTimeDays: bid.lead_time_days,
        notes: bid.notes,
        prices: (bid.quote_comparison_prices ?? []).map((price) => ({ itemId: price.item_id, unitPrice: price.unit_price, isAvailable: price.is_available })),
      })));
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
      const saveResult = await saveQuoteComparisonBidAction({
        comparisonId: comparison.id,
        bidId: bid.id,
        deliveryCharge: bid.delivery_charge,
        taxAmount: bid.tax_amount,
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

        <ClientQuoteBuilder
          key={selectedBidId || "no-supplier"}
          comparison={comparison}
          items={items}
          selectedBid={selectedBid}
          clients={clients}
          previewMode={previewMode}
        />

        <section className="mt-5 border border-slate-200 bg-white shadow-sm" aria-labelledby="materials-heading">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><h2 id="materials-heading" className="text-lg font-bold">Material list</h2><p className="mt-1 text-xs text-slate-500">Every supplier is compared against the same quantities.</p></div>
            {canManageStructure ? <button type="button" onClick={() => setShowItemForm((value) => !value)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"><PackagePlus className="h-4 w-4" /> Add material</button> : null}
          </div>
          {showItemForm && canManageStructure ? (
            <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(12rem,1.4fr)_minmax(12rem,1fr)_8rem_9rem_auto] sm:items-end sm:px-6">
              <label className="grid gap-1 text-xs font-bold text-slate-600">Material<input value={itemDraft.description} onChange={(event) => setItemDraft((value) => ({ ...value, description: event.target.value }))} placeholder="2 x 4 x 10 ft. stud" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">Specification <span className="sr-only">Optional</span><input value={itemDraft.specification} onChange={(event) => setItemDraft((value) => ({ ...value, specification: event.target.value }))} placeholder="Grade, brand, color…" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">Quantity<input type="number" min="0.001" step="any" value={itemDraft.quantity} onChange={(event) => setItemDraft((value) => ({ ...value, quantity: event.target.value }))} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">Unit<select value={itemDraft.unit} onChange={(event) => setItemDraft((value) => ({ ...value, unit: event.target.value }))} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm">{commonUnits.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
              <button type="button" onClick={addItem} disabled={pending || !itemDraft.description.trim() || !itemDraft.quantity} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white disabled:opacity-40"><Plus className="h-4 w-4" /> Add</button>
            </div>
          ) : null}
          {items.length ? <div className="divide-y divide-slate-100">{items.map((item) => <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-5 py-3 sm:px-6"><div><p className="text-sm font-bold">{item.description}</p>{item.specification ? <p className="mt-0.5 text-xs text-slate-500">{item.specification}</p> : null}<p className="mt-1 text-xs font-semibold text-[#0071e3]">{item.quantity.toLocaleString()} {item.unit}</p></div>{canManageStructure ? <button type="button" onClick={() => window.confirm(`Remove ${item.description}?`) && run(() => deleteQuoteComparisonItemAction({ comparisonId: comparison.id, itemId: item.id }), "Material removed.")} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${item.description}`}><Trash2 className="h-4 w-4" /></button> : null}</div>)}</div> : <p className="px-5 py-8 text-center text-sm text-slate-500">Add at least one material to begin comparing prices.</p>}
        </section>

        <section className="mt-5 border border-slate-200 bg-white shadow-sm" aria-labelledby="quotes-heading">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><h2 id="quotes-heading" className="text-lg font-bold">Supplier prices</h2><p className="mt-1 text-xs text-slate-500">Enter unit prices. Delivery and tax are added to the delivered total.</p></div>
            {!locked ? <div className="flex flex-wrap gap-2">
              {canManageStructure ? <button type="button" onClick={() => setShowSupplierForm((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"><Store className="h-4 w-4" /> Add supplier</button> : null}
              <button type="button" onClick={saveAllQuotes} disabled={pending || bids.length === 0} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-40"><Save className="h-4 w-4" /> Save prices</button>
            </div> : null}
          </div>

          {showSupplierForm && canManageStructure ? <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-end sm:px-6"><label className="grid flex-1 gap-1 text-xs font-bold text-slate-600">Supplier<select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Choose from Supplier Directory</option>{availableSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name} · {trustLabel(supplier.trustLevel || "not-reviewed")}</option>)}</select></label><button type="button" onClick={addSupplier} disabled={pending || !supplierId} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white disabled:opacity-40"><Plus className="h-4 w-4" /> Add supplier</button></div> : null}

          {bids.length > 0 && items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="sticky left-0 z-10 min-w-64 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Material</th>{bids.map((bid) => <th key={bid.id} className="min-w-56 border-l border-slate-200 px-4 py-3 align-top"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold normal-case tracking-normal text-slate-950">{bid.supplier_name_snapshot}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{trustLabel(bid.trust_level_snapshot)}</p></div>{canManageStructure ? <button type="button" onClick={() => window.confirm(`Remove ${bid.supplier_name_snapshot} from this comparison?`) && run(() => removeQuoteComparisonSupplierAction({ comparisonId: comparison.id, bidId: bid.id }), "Supplier removed.")} className="text-slate-400 hover:text-rose-600" aria-label={`Remove ${bid.supplier_name_snapshot}`}><X className="h-4 w-4" /></button> : null}</div></th>)}</tr></thead>
                <tbody>
                  {items.map((item) => <tr key={item.id} className="border-b border-slate-100"><th className="sticky left-0 z-10 bg-white px-5 py-3"><p className="text-sm font-bold">{item.description}</p><p className="mt-1 text-xs font-medium text-slate-500">{item.quantity.toLocaleString()} {item.unit}{item.specification ? ` · ${item.specification}` : ""}</p></th>{bids.map((bid) => { const key = `${bid.id}:${item.id}`; const price = priceDrafts[key] ?? { unitPrice: "", isAvailable: true }; return <td key={bid.id} className="border-l border-slate-100 px-4 py-3 align-top"><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span><input type="number" min="0" step="0.01" value={price.unitPrice} disabled={locked || !price.isAvailable} onChange={(event) => setPriceDrafts((current) => ({ ...current, [key]: { ...price, unitPrice: event.target.value } }))} placeholder="0.00" aria-label={`${bid.supplier_name_snapshot} unit price for ${item.description}`} className="min-h-10 w-full rounded-lg border border-slate-300 pl-7 pr-2 text-right text-sm font-bold tabular-nums disabled:bg-slate-100 disabled:text-slate-400" /></div><label className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-slate-500"><input type="checkbox" checked={!price.isAvailable} disabled={locked} onChange={(event) => setPriceDrafts((current) => ({ ...current, [key]: { ...price, isAvailable: !event.target.checked, unitPrice: event.target.checked ? "" : price.unitPrice } }))} /> Not available</label></td>; })}</tr>)}
                  <tr className="border-b border-slate-200 bg-slate-50"><th className="sticky left-0 bg-slate-50 px-5 py-3 text-sm font-bold">Delivery charge</th>{bids.map((bid) => <td key={bid.id} className="border-l border-slate-200 px-4 py-3"><input type="number" min="0" step="0.01" value={bidDrafts[bid.id]?.deliveryCharge ?? ""} disabled={locked} onChange={(event) => setBidDrafts((current) => ({ ...current, [bid.id]: { ...current[bid.id], deliveryCharge: event.target.value } }))} className="min-h-10 w-full rounded-lg border border-slate-300 px-3 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /></td>)}</tr>
                  <tr className="border-b border-slate-200 bg-slate-50"><th className="sticky left-0 bg-slate-50 px-5 py-3 text-sm font-bold">Tax amount</th>{bids.map((bid) => <td key={bid.id} className="border-l border-slate-200 px-4 py-3"><input type="number" min="0" step="0.01" value={bidDrafts[bid.id]?.taxAmount ?? ""} disabled={locked} onChange={(event) => setBidDrafts((current) => ({ ...current, [bid.id]: { ...current[bid.id], taxAmount: event.target.value } }))} className="min-h-10 w-full rounded-lg border border-slate-300 px-3 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /></td>)}</tr>
                  <tr className="bg-slate-50"><th className="sticky left-0 bg-slate-50 px-5 py-3 text-sm font-bold">Lead time in days</th>{bids.map((bid) => <td key={bid.id} className="border-l border-slate-200 px-4 py-3"><input type="number" min="0" step="1" value={bidDrafts[bid.id]?.leadTimeDays ?? ""} disabled={locked} onChange={(event) => setBidDrafts((current) => ({ ...current, [bid.id]: { ...current[bid.id], leadTimeDays: event.target.value } }))} className="min-h-10 w-full rounded-lg border border-slate-300 px-3 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /></td>)}</tr>
                </tbody>
              </table>
            </div>
          ) : <div className="px-5 py-10 text-center text-sm text-slate-500">{items.length === 0 ? "Add materials before entering supplier prices." : "Add at least one supplier from the directory."}</div>}
        </section>

        <section className="mt-5" aria-labelledby="analysis-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0071e3]">Decision support</p><h2 id="analysis-heading" className="mt-1 text-2xl font-bold">Best supplier for this request</h2></div><p className="max-w-xl text-xs leading-5 text-slate-500">Score: delivered cost 60 points, completeness 20, lead time 10, trust 10. Missing prices are estimated from the highest entered price plus 10%.</p></div>
          {analyses.length > 0 ? <div className="mt-4 grid gap-4 xl:grid-cols-3">{analyses.map((analysis) => { const bid = liveBids.find((entry) => entry.id === analysis.bidId)!; const selected = selectedBidId === bid.id; return <article key={bid.id} className={`relative border bg-white p-5 shadow-sm ${analysis.isRecommended ? "border-[#0071e3] ring-1 ring-[#0071e3]" : selected ? "border-emerald-300" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-3"><div>{analysis.isRecommended ? <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f3ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#0066cc]"><Award className="h-3.5 w-3.5" /> Best overall</span> : selected ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-800"><Check className="h-3.5 w-3.5" /> Selected</span> : null}<h3 className="mt-2 text-lg font-bold">{analysis.supplierName}</h3><p className="mt-1 text-xs font-semibold text-slate-500">{trustLabel(bid.trust_level_snapshot)}</p></div><div className="text-right"><p className="text-3xl font-bold tabular-nums">{analysis.score}</p><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">of 100</p></div></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${analysis.blocked ? "bg-rose-500" : "bg-[#0071e3]"}`} style={{ width: `${analysis.score}%` }} /></div>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-slate-100 py-4"><div><dt className="text-[10px] font-bold uppercase text-slate-400">Delivered total</dt><dd className="mt-1 text-lg font-bold tabular-nums">{formatComparisonMoney(analysis.landedTotal)}</dd></div><div><dt className="text-[10px] font-bold uppercase text-slate-400">Quoted items</dt><dd className="mt-1 text-lg font-bold tabular-nums">{analysis.pricedItemCount}/{analysis.itemCount}</dd></div><div><dt className="text-[10px] font-bold uppercase text-slate-400">Lead time</dt><dd className="mt-1 text-sm font-bold">{bid.lead_time_days === null ? "Not entered" : `${bid.lead_time_days} days`}</dd></div><div><dt className="text-[10px] font-bold uppercase text-slate-400">Completeness</dt><dd className="mt-1 text-sm font-bold">{Math.round(analysis.completeness * 100)}%</dd></div></dl>
            <div className="mt-4 flex flex-wrap gap-2">{analysis.isLowestCost ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800"><CircleDollarSign className="h-3.5 w-3.5" /> Lowest delivered</span> : null}{analysis.isFastest ? <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800"><Clock3 className="h-3.5 w-3.5" /> Fastest</span> : null}{analysis.missingItemCount > 0 ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800"><AlertTriangle className="h-3.5 w-3.5" /> {analysis.missingItemCount} missing</span> : null}{analysis.blocked ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-800"><Ban className="h-3.5 w-3.5" /> Not eligible</span> : null}</div>
            {!selected && !locked ? <button type="button" onClick={() => awardBid(bid.id, bid.supplier_name_snapshot)} disabled={pending || analysis.blocked || analysis.pricedItemCount === 0} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"><Award className="h-4 w-4" /> Save prices & select supplier</button> : null}
          </article>; })}</div> : <div className="mt-4 border border-dashed border-slate-300 bg-white px-5 py-10 text-center"><Truck className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-bold">Enter supplier prices to see the recommendation.</p></div>}
          {!recommended && analyses.some((analysis) => analysis.pricedItemCount > 0) ? <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-800"><AlertTriangle className="h-4 w-4" /> No reliable winner yet. Complete more line prices before selecting a supplier.</p> : null}
        </section>

        {!previewMode ? <details className="mt-8 border-t border-slate-300 pt-4"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-slate-500"><ChevronDown className="h-4 w-4" /> Comparison controls</summary><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={deleteComparison} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700"><Trash2 className="h-4 w-4" /> Delete comparison</button></div></details> : null}
      </div>
    </main>
  );
}
