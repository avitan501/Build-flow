"use client";

import {
  Archive,
  ArrowLeft,
  Check,
  ChevronDown,
  FileInput,
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
  importRequestClientQuotePricesAction,
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
import { buildProductQuotePreview } from "@/lib/product-quote-preview";

type ProjectOption = { id: string; name: string; address: string | null };
type BidDraft = {
  deliveryCharge: string;
  taxPercent: string;
  leadTimeDays: string;
  notes: string;
};
type PriceDraft = { unitPrice: string; isAvailable: boolean; notes: string };
type RequestClientQuoteSource = {
  id: string;
  request_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
};

const commonUnits = ["each", "piece", "sheet", "box", "bag", "bundle", "linear ft", "sq. ft.", "yard", "gallon"];

function moneyInput(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function positiveDraftQuantity(value: number) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
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
  requestClientQuoteSources = [],
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
  requestClientQuoteSources?: RequestClientQuoteSource[];
  previewMode?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [activeStep, setActiveStep] = useState<0 | 1 | 2 | 3 | 4>(() => items.length === 0 ? 1 : bids.length === 0 ? 2 : 0);
  const [productSelections, setProductSelections] = useState<Record<string, string>>({});
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
  const [selectedClientQuoteSourceId, setSelectedClientQuoteSourceId] = useState(requestClientQuoteSources[0]?.id ?? "");

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
  const productPreview = useMemo(() => buildProductQuotePreview(liveItems, liveBids, productSelections), [liveItems, liveBids, productSelections]);
  const lowestPrices = useMemo(() => lowestSupplierPriceByItem(liveItems, liveBids), [liveItems, liveBids]);
  const mixedAnalysis = useMemo(() => buildMixedSupplierAnalysis(liveItems, liveBids), [liveItems, liveBids]);
  const clientReady = useMemo(() => buildClientReadyToPaySummary(
    liveItems,
    clientDeliveryDraft === "" ? null : draftNumber(clientDeliveryDraft),
    clientTaxDraft === "" ? null : draftNumber(clientTaxDraft),
  ), [clientDeliveryDraft, clientTaxDraft, liveItems]);
  const buyingOptions = useMemo(() => buildQuoteBuyingOptions(liveItems, liveBids, clientReady), [clientReady, liveBids, liveItems]);
  const partialComparisonByBid = useMemo(() => new Map(liveBids.map((bid) => {
    const prices = new Map((bid.quote_comparison_prices ?? []).map((price) => [price.item_id, price]));
    let clientTotal = 0;
    let supplierTotal = 0;
    let comparableRows = 0;
    for (const item of liveItems) {
      const clientUnitPrice = Number(item.client_unit_price);
      const supplierUnitPrice = Number(prices.get(item.id)?.unit_price);
      if (!(clientUnitPrice > 0) || !(supplierUnitPrice > 0) || prices.get(item.id)?.is_available === false) continue;
      const quantity = positiveDraftQuantity(item.quantity);
      clientTotal += clientUnitPrice * quantity;
      supplierTotal += supplierUnitPrice * quantity;
      comparableRows += 1;
    }
    const profit = clientTotal - supplierTotal;
    return [bid.id, { clientTotal, supplierTotal, profit, marginPercent: clientTotal > 0 ? (profit / clientTotal) * 100 : 0, comparableRows }];
  })), [liveBids, liveItems]);
  const unfinishedOptions = analyses.filter((analysis) => !analysis.eligible && !analysis.blocked).length;
  const hasMissingSupplierValues = unfinishedOptions > 0 || (!mixedAnalysis.complete && bids.length > 1);
  const locked = !previewMode && (comparison.status === "awarded" || comparison.status === "archived");
  const canManageStructure = !previewMode && !locked;
  const canManageRequestItems = canManageStructure && !comparison.request_id;
  const selectedBid = liveBids.find((bid) => bid.id === selectedBidId) ?? null;
  const pricedSupplierLines = liveBids.reduce((total, bid) => total + (bid.quote_comparison_prices ?? []).filter((price) => price.is_available && price.unit_price !== null && Number.isFinite(price.unit_price)).length, 0);
  const totalSupplierLines = items.length * bids.length;

  function routeReady(optionId: string) {
    if (optionId === "mixed") return mixedAnalysis.complete;
    return analyses.some((analysis) => analysis.bidId === optionId && analysis.eligible);
  }

  function routeMissing(optionId: string) {
    if (optionId === "mixed") return mixedAnalysis.missingFields;
    return analyses.find((analysis) => analysis.bidId === optionId)?.missingFields ?? ["supplier prices"];
  }

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
    if (previewMode) {
      setMessage("Entered sample prices updated locally. Unfilled rows were left open.");
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
      setMessage("Entered prices saved. Unfilled rows remain open for later.");
      router.refresh();
    });
  }

  function pullClientQuotePrices() {
    if (!selectedClientQuoteSourceId || previewMode) return;
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await importRequestClientQuotePricesAction({
        comparisonId: comparison.id,
        attachmentId: selectedClientQuoteSourceId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setClientTargetDrafts((current) => ({
        ...current,
        ...Object.fromEntries(result.data.prices.map((price) => [price.itemId, String(price.clientUnitPrice)])),
      }));
      if (result.data.deliveryCharge !== null) setClientDeliveryDraft(String(result.data.deliveryCharge));
      if (result.data.taxPercent !== null) setClientTaxDraft(String(result.data.taxPercent));
      setMessage(`Pulled ${result.data.matchedCount} of ${result.data.extractedCount} priced lines from ${result.data.fileName}. Unmatched rows remain open.`);
      router.refresh();
    });
  }

  function awardBid(bidId: string, supplierName: string) {
    const option = buyingOptions.find((entry) => entry.id === bidId);
    if (!option || !routeReady(bidId)) {
      setError(`Finish missing values before selecting ${supplierName}.`);
      window.requestAnimationFrame(() => document.getElementById("quote-inputs")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }
    if (!window.confirm(`Select ${supplierName} as the supplier for this comparison?`)) return;
    const showClientQuote = () => window.requestAnimationFrame(() => {
      setActiveStep(4);
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
      <div className="border-b border-slate-200 bg-white px-3 py-3 sm:px-8 sm:py-5 lg:px-10">
        <div className="mx-auto max-w-[96rem]">
          {previewMode ? <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0071e3]"><ArrowLeft className="h-4 w-4" /> Preview</span> : <Link href="/admin/quote-comparison" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0071e3]"><ArrowLeft className="h-4 w-4" /> Comparisons</Link>}
          <div className="mt-2 flex items-end justify-between gap-3 sm:mt-4">
            <div className="flex min-w-0 items-center gap-4">
              <AvantiaBuildLockup compact className="hidden shrink-0 sm:flex" />
              <div className="min-w-0 border-slate-200 sm:border-l sm:pl-4">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-lg font-bold tracking-tight sm:text-3xl">{comparison.title}</h1>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] sm:px-2.5 sm:py-1 sm:text-[10px] ${statusTone(comparison.status)}`}>{quoteComparisonStatusLabel(comparison.status)}</span>
              </div>
              <p className="mt-1 truncate text-[10px] text-slate-500 sm:mt-2 sm:text-sm">{comparison.job_address || "No delivery address"} · {comparison.department || "General materials"}</p>
              </div>
            </div>
            {!previewMode ? <details className="group relative shrink-0"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold">Tools <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" /></summary><div className="absolute right-0 top-11 z-30 grid min-w-40 gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              {canManageStructure ? <button type="button" onClick={() => setShowDetails((value) => !value)} className="min-h-10 rounded-lg px-3 text-left text-xs font-bold hover:bg-slate-50">Edit details</button> : null}
              {locked ? <button type="button" onClick={() => run(() => reopenQuoteComparisonAction(comparison.id), "Comparison reopened.")} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold hover:bg-slate-50"><RotateCcw className="h-4 w-4" /> Reopen</button> : null}
              {comparison.status !== "archived" ? <button type="button" onClick={() => run(() => archiveQuoteComparisonAction(comparison.id), "Comparison archived.")} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold hover:bg-slate-50"><Archive className="h-4 w-4" /> Archive</button> : null}
            </div></details> : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[96rem] px-2.5 py-3 sm:px-8 sm:py-5 lg:px-10">
        <nav className="sticky top-2 z-20 mb-4 grid grid-cols-5 overflow-hidden rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur" aria-label="Quote comparison steps">
          {([
            { step: 0 as const, label: "Products", meta: `${productPreview.comparableCount}/${items.length}` },
            { step: 1 as const, label: "Materials", meta: `${items.length}` },
            { step: 2 as const, label: "Edit prices", meta: `${pricedSupplierLines}/${totalSupplierLines}` },
            { step: 3 as const, label: "Route", meta: selectedBidId ? "✓" : "" },
            { step: 4 as const, label: "Client", meta: selectedBidId ? "Ready" : "Locked" },
          ]).map((entry) => <button key={entry.step} type="button" onClick={() => setActiveStep(entry.step)} disabled={entry.step === 4 && !selectedBidId} aria-current={activeStep === entry.step ? "page" : undefined} className={`min-h-11 min-w-0 rounded-lg px-1 py-1 text-center transition disabled:cursor-not-allowed disabled:opacity-40 ${activeStep === entry.step ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}><span className="block text-[9px] font-black sm:text-xs">{entry.label}</span><span className={`mt-0.5 block truncate text-[9px] font-bold ${activeStep === entry.step ? "text-white/70" : "text-slate-400"}`}>{entry.meta}</span></button>)}
        </nav>
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

        {activeStep === 0 ? <section aria-labelledby="product-comparison-heading" data-testid="product-comparison-overview" className="space-y-4">
          <header className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#0066cc]">Product-by-product comparison</p>
            <h2 id="product-comparison-heading" className="mt-1 text-xl font-bold sm:text-2xl">Find the lowest price for each product</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Compare the same requested quantity across suppliers. Unconfirmed product matches are excluded from lowest-price choices.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setProductSelections(productPreview.cheapestSelections)} disabled={!productPreview.comparableCount} className="min-h-11 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-40">Draft lowest price per product</button>
              <button type="button" onClick={() => setActiveStep(2)} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-bold">Edit prices / review matches</button>
            </div>
          </header>
          <aside aria-label="Draft selection summary" className="rounded-xl border border-sky-200 bg-sky-50 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-sky-950">Temporary preview · Not saved</h3><p className="mt-1 text-xs leading-5 text-sky-900">Materials only. Excludes delivery and tax.</p></div><button type="button" onClick={() => setProductSelections({})} disabled={!productPreview.selectedCount} className="min-h-11 shrink-0 rounded-lg border border-sky-200 bg-white px-3 text-xs font-bold text-sky-950 disabled:opacity-40">Clear draft</button></div>
            <details className="mt-1"><summary className="min-h-11 cursor-pointer py-3 text-xs font-bold text-sky-950">Preview details and ordering checks</summary><p className="text-xs leading-5 text-sky-900">Resets on reload. Does not place an order, select a final route, or contact suppliers. Splitting products can add delivery fees, minimum-order requirements, or change quoted prices. Prices use the current request-row units; no unit conversion is performed here. Confirm units, availability and final charges before ordering. This is not a lowest delivered-order total.</p></details>
            {productPreview.suppliers.length ? <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 text-xs font-bold text-sky-950">Draft subtotal by supplier</summary><ul className="space-y-2 border-t border-sky-200 pt-3">{productPreview.suppliers.map((supplier) => <li key={supplier.supplierId} className="flex justify-between gap-3 text-xs"><span className="min-w-0 break-words font-semibold">{supplier.supplierName} · {supplier.itemCount} products</span><span className="shrink-0 tabular-nums">{formatComparisonMoney(supplier.subtotal)}</span></li>)}</ul></details> : null}
          </aside>
          <div className="grid gap-4 xl:grid-cols-2">{productPreview.rows.map((row) => <article key={row.item.id} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-4"><h3 className="break-words text-base font-bold">{row.item.description}</h3>{row.item.specification ? <p className="mt-1 break-words text-xs leading-5 text-slate-600">{row.item.specification}</p> : null}<p className="mt-2 text-xs font-bold text-[#0066cc]">Requested: {row.item.quantity.toLocaleString()} {row.item.unit}</p>{!row.validQuantity ? <p className="mt-2 text-xs font-bold text-rose-700">Review the requested quantity before comparing.</p> : !row.lowest ? <p className="mt-2 text-xs font-bold text-amber-800">No confirmed comparable price yet.</p> : null}</div>
            <fieldset className="divide-y divide-slate-100"><legend className="sr-only">Draft supplier choice for {row.item.description}</legend>{row.offers.map((offer) => {
              const lowest = offer.eligible && offer.unitPrice === row.lowest?.unitPrice;
              return <label key={offer.bid.id} className={`flex min-h-16 items-start gap-3 px-4 py-3 ${offer.eligible ? "cursor-pointer" : "cursor-not-allowed"} ${row.selected?.bid.id === offer.bid.id ? "bg-sky-50" : ""}`}>
                <input type="radio" name={`draft-product-${row.item.id}`} value={offer.bid.id} checked={row.selected?.bid.id === offer.bid.id} disabled={!offer.eligible} onChange={() => setProductSelections((current) => ({ ...current, [row.item.id]: offer.bid.id }))} aria-label={`Choose ${offer.bid.supplier_name_snapshot} for ${row.item.description} in draft`} className="mt-1 h-5 w-5 shrink-0 accent-sky-700" />
                <span className="min-w-0 flex-1"><span className="block break-words text-sm font-bold">{offer.bid.supplier_name_snapshot}</span><span className="mt-1 flex flex-wrap gap-1 text-[10px] font-bold">{lowest ? <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-800">Lowest product price</span> : null}{offer.status === "review" ? <span className="rounded bg-amber-100 px-2 py-1 text-amber-900">Match needs review · excluded</span> : null}{offer.blocked ? <span className="rounded bg-rose-100 px-2 py-1 text-rose-800">Supplier excluded</span> : null}</span>{offer.unitPrice !== null && offer.status !== "unavailable" ? <span className="mt-1 block text-xs text-slate-600">{formatComparisonMoney(offer.unitPrice)} / {row.item.unit}</span> : null}</span>
                <span className="max-w-[40%] text-right text-sm font-bold tabular-nums">{offer.status === "unavailable" ? "Unavailable" : offer.status === "unknown" ? "No quote" : offer.lineTotal === null ? "—" : formatComparisonMoney(offer.lineTotal)}<span className="mt-1 block text-[10px] font-medium text-slate-500">{offer.status === "unknown" ? "Availability unknown" : offer.status === "unavailable" ? "Marked unavailable" : "Requested quantity total"}</span></span>
              </label>;
            })}{!row.offers.length ? <p className="px-4 py-5 text-sm text-slate-500">No supplier quotes have been added.</p> : null}</fieldset>
            {row.selected ? <button type="button" onClick={() => setProductSelections((current) => ({ ...current, [row.item.id]: "" }))} className="min-h-11 w-full border-t border-slate-100 px-4 text-left text-xs font-bold text-sky-800">Clear this product selection</button> : null}
          </article>)}</div>
          {!items.length ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm">Add materials to compare products.</p> : null}
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setActiveStep(3)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold">Whole-order routes and client pricing</button><p className="self-center text-xs text-slate-500">Draft product selections do not change the final route.</p></div>
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-4px_20px_rgba(15,23,42,.08)] backdrop-blur"><dl aria-live="polite" aria-label="Live temporary product selection totals" className="mx-auto grid max-w-[92rem] grid-cols-[1fr_1fr_auto] gap-3"><div><dt className="text-[10px] font-semibold text-slate-500">Draft products</dt><dd className="mt-0.5 text-sm font-bold">{productPreview.selectedCount}/{items.length}</dd></div><div><dt className="text-[10px] font-semibold text-slate-500">Suppliers</dt><dd className="mt-0.5 text-sm font-bold">{productPreview.suppliers.length}</dd></div><div className="text-right"><dt className="text-[10px] font-semibold text-slate-500">Materials · before delivery/tax</dt><dd className="mt-0.5 text-base font-bold tabular-nums">{formatComparisonMoney(productPreview.materialSubtotal)}</dd></div></dl></div>
        </section> : null}

        {activeStep === 1 ? <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="materials-heading">
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
          <div className="border-t border-slate-200 p-3 text-right"><button type="button" onClick={() => setActiveStep(2)} className="min-h-11 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white">Continue to quotes</button></div>
        </section> : null}

        {activeStep === 2 ? <section id="quote-inputs" className="mt-4 scroll-mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="quotes-heading">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#0066cc]">Step 2</p><h2 id="quotes-heading" className="mt-0.5 text-lg font-bold">Supplier prices</h2><p className="mt-1 text-xs text-slate-500">Enter each supplier’s price, delivery, tax, and lead time.</p><p className="mt-1 text-[10px] font-bold text-[#0066cc]">{pricedSupplierLines} of {totalSupplierLines} prices entered · {Math.max(totalSupplierLines - pricedSupplierLines, 0)} remaining</p></div>
            {!locked ? <div className="flex flex-wrap gap-2">
              {canManageStructure ? <button type="button" onClick={() => setShowSupplierForm((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"><Store className="h-4 w-4" /> Add supplier</button> : null}
              <button type="button" onClick={saveAllQuotes} disabled={pending || bids.length === 0} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-40"><Save className="h-4 w-4" /> Save entered prices</button>
            </div> : null}
          </div>

          {comparison.request_id ? <details className="group border-b border-amber-200 bg-amber-50/70">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-xs font-bold text-amber-950 sm:px-6"><span>Client price reference</span><span className="text-[10px] text-amber-700"><span className="group-open:hidden">Show</span><span className="hidden group-open:inline">Hide</span></span></summary>
            <div className="border-t border-amber-200 px-4 py-3 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-amber-900">Client quote for this request</p>
                <p className="mt-1 text-xs text-amber-800">Pull the client’s attached quote into Client Ready to Pay. Only matched rows are filled; all other rows stay open.</p>
              </div>
              {requestClientQuoteSources.length ? <>
                <label className="grid min-w-0 flex-1 gap-1 text-xs font-bold text-amber-900 lg:max-w-md">
                  Attached document
                  <select value={selectedClientQuoteSourceId} onChange={(event) => setSelectedClientQuoteSourceId(event.target.value)} disabled={pending || locked} className="min-h-11 min-w-0 rounded-lg border border-amber-300 bg-white px-3 text-sm text-slate-950 disabled:bg-slate-100">
                    {requestClientQuoteSources.map((source) => <option key={source.id} value={source.id}>{source.file_name}</option>)}
                  </select>
                </label>
                <button type="button" onClick={pullClientQuotePrices} disabled={pending || locked || !selectedClientQuoteSourceId} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-950 px-4 text-sm font-bold text-white disabled:opacity-40"><FileInput className="h-4 w-4" /> Pull client prices</button>
              </> : <p className="rounded-lg border border-dashed border-amber-300 bg-white px-4 py-3 text-xs font-bold text-amber-900">No client quote is attached yet. Add it under Documents &amp; photos in Step 1, then return here.</p>}
            </div>
            </div>
          </details> : null}

          {showSupplierForm && canManageStructure ? <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-end sm:px-6"><label className="grid flex-1 gap-1 text-xs font-bold text-slate-600">Supplier<select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Choose from Supplier Directory</option>{availableSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name} · {trustLabel(supplier.trustLevel || "not-reviewed")}</option>)}</select></label><button type="button" onClick={addSupplier} disabled={pending || !supplierId} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white disabled:opacity-40"><Plus className="h-4 w-4" /> Add supplier</button></div> : null}

          {bids.length > 0 && items.length > 0 ? (
            <><div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="sticky left-0 z-10 min-w-64 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{comparison.request_id ? "Client request" : "Material"}</th><th className="min-w-48 border-l border-amber-200 bg-amber-50 px-4 py-3 align-top text-xs font-bold text-amber-950">Client Ready to Pay<span className="mt-1 block text-[10px] font-medium text-amber-800">Client unit price</span></th>{bids.map((bid) => <th key={bid.id} className="min-w-56 border-l border-slate-200 px-4 py-3 align-top"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold normal-case tracking-normal text-slate-950">{bid.supplier_name_snapshot}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Supplier unit price · {trustLabel(bid.trust_level_snapshot)}</p></div>{canManageStructure ? <button type="button" onClick={() => window.confirm(`Remove ${bid.supplier_name_snapshot} from this comparison?`) && run(() => removeQuoteComparisonSupplierAction({ comparisonId: comparison.id, bidId: bid.id }), "Supplier removed.")} className="text-slate-400 hover:text-rose-600" aria-label={`Remove ${bid.supplier_name_snapshot}`}><X className="h-4 w-4" /></button> : null}</div></th>)}</tr></thead>
                <tbody>
                  {items.map((item) => <tr key={item.id} className="border-b border-slate-100"><th className="sticky left-0 z-10 bg-white px-5 py-3"><p className="text-sm font-bold">{item.description}</p><p className="mt-1 text-xs font-medium text-slate-500">{item.quantity.toLocaleString()} {item.unit}{item.specification ? ` · ${item.specification}` : ""}</p></th><td className="border-l border-amber-100 bg-amber-50/50 px-4 py-3"><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-700">$</span><input type="number" min="0" step="0.01" value={clientTargetDrafts[item.id] ?? ""} disabled={locked} onChange={(event) => setClientTargetDrafts((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="0.00" aria-label={`Client target unit price for ${item.description}`} className="min-h-10 w-full rounded-lg border border-amber-300 bg-white pl-7 pr-2 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /></div></td>{bids.map((bid) => {
                    const key = `${bid.id}:${item.id}`;
                    const price = priceDrafts[key] ?? { unitPrice: "", isAvailable: true, notes: "" };
                    const lowest = lowestPrices.get(item.id);
                    const isLowest = Boolean(price.isAvailable && price.unitPrice !== "" && lowest?.bidId === bid.id);
                    const matchStatus = quoteLineMatchStatus(item, price.notes);
                    const clientUnitPrice = Number(clientTargetDrafts[item.id]);
                    const supplierUnitPrice = Number(price.unitPrice);
                    const lineClientTotal = clientUnitPrice * positiveDraftQuantity(item.quantity);
                    const lineProfit = (clientUnitPrice - supplierUnitPrice) * positiveDraftQuantity(item.quantity);
                    const lineMargin = lineClientTotal > 0 ? (lineProfit / lineClientTotal) * 100 : 0;
                    const canCompareLine = clientUnitPrice > 0 && supplierUnitPrice > 0 && price.isAvailable;
                    return <td key={bid.id} className={`border-l border-slate-100 px-4 py-3 align-top ${isLowest ? "bg-emerald-50" : ""}`}><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span><input type="number" min="0" step="0.01" value={price.unitPrice} disabled={locked || !price.isAvailable} onChange={(event) => setPriceDrafts((current) => ({ ...current, [key]: { ...price, unitPrice: event.target.value } }))} placeholder="0.00" aria-label={`${bid.supplier_name_snapshot} unit price for ${item.description}`} className={`min-h-10 w-full rounded-lg border pl-7 pr-2 text-right text-sm font-bold tabular-nums disabled:bg-slate-100 disabled:text-slate-400 ${isLowest ? "border-emerald-400 bg-white" : "border-slate-300"}`} /></div>{canCompareLine ? <div className={`mt-2 rounded-md px-2 py-1.5 text-right ${lineProfit < 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}><p className="text-xs font-black tabular-nums">Line profit {formatComparisonMoney(lineProfit)}</p><p className="text-[10px] font-bold">{lineMargin.toFixed(1)}% margin</p></div> : <p className="mt-2 text-[10px] font-semibold text-slate-400">Enter both prices to compare this row.</p>}<div className="mt-2 flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500"><input type="checkbox" checked={!price.isAvailable} disabled={locked} onChange={(event) => setPriceDrafts((current) => ({ ...current, [key]: { ...price, isAvailable: !event.target.checked, unitPrice: event.target.checked ? "" : price.unitPrice } }))} /> Not available</label>{isLowest ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Lowest</span> : null}{matchStatus !== "manual" ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${matchStatus === "exact" ? "bg-sky-100 text-sky-800" : matchStatus === "possible" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>{matchStatus === "exact" ? "Exact match" : matchStatus === "possible" ? "Possible match" : "Needs review"}</span> : null}{!locked && ["possible", "review"].includes(matchStatus) ? <button type="button" onClick={() => confirmMatch(key, bid.id, item.id)} disabled={pending} className="text-[10px] font-bold text-[#0066cc] underline underline-offset-2">Confirm match</button> : null}</div></td>;
                  })}</tr>)}
                  <tr className="border-b border-slate-200 bg-slate-50"><th className="sticky left-0 bg-slate-50 px-5 py-3 text-sm font-bold">Delivery charge <span className="block text-[10px] font-medium text-slate-500">Whole order</span></th><td className="border-l border-amber-100 bg-amber-50/50 px-4 py-3"><input aria-label="Client delivery charge for whole order" type="number" min="0" step="0.01" value={clientDeliveryDraft} disabled={locked} onChange={(event) => setClientDeliveryDraft(event.target.value)} className="min-h-10 w-full rounded-lg border border-amber-300 bg-white px-3 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /></td>{bids.map((bid) => <td key={bid.id} className="border-l border-slate-200 px-4 py-3"><input aria-label={`${bid.supplier_name_snapshot} delivery charge for whole order`} type="number" min="0" step="0.01" value={bidDrafts[bid.id]?.deliveryCharge ?? ""} disabled={locked} onChange={(event) => setBidDrafts((current) => ({ ...current, [bid.id]: { ...current[bid.id], deliveryCharge: event.target.value } }))} className="min-h-10 w-full rounded-lg border border-slate-300 px-3 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /></td>)}</tr>
                  <tr className="border-b border-slate-200 bg-slate-50"><th className="sticky left-0 bg-slate-50 px-5 py-3 text-sm font-bold">Tax percentage <span className="block text-[10px] font-medium text-slate-500">Whole order</span></th><td className="border-l border-amber-100 bg-amber-50/50 px-4 py-3"><div className="relative"><input aria-label="Client tax percentage for whole order" type="number" min="0" max="100" step="0.001" value={clientTaxDraft} disabled={locked} onChange={(event) => setClientTaxDraft(event.target.value)} placeholder="8.875" className="min-h-10 w-full rounded-lg border border-amber-300 bg-white pl-3 pr-8 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-700">%</span></div></td>{bids.map((bid) => <td key={bid.id} className="border-l border-slate-200 px-4 py-3"><div className="relative"><input aria-label={`${bid.supplier_name_snapshot} tax percentage for whole order`} type="number" min="0" max="100" step="0.001" value={bidDrafts[bid.id]?.taxPercent ?? ""} disabled={locked} onChange={(event) => setBidDrafts((current) => ({ ...current, [bid.id]: { ...current[bid.id], taxPercent: event.target.value } }))} placeholder="8.875" className="min-h-10 w-full rounded-lg border border-slate-300 pl-3 pr-8 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span></div></td>)}</tr>
                  <tr className="bg-slate-50"><th className="sticky left-0 bg-slate-50 px-5 py-3 text-sm font-bold">Lead time in days</th><td className="border-l border-amber-100 bg-amber-50/50 px-4 py-3 text-xs font-semibold text-amber-800">Derived from each buying option</td>{bids.map((bid) => <td key={bid.id} className="border-l border-slate-200 px-4 py-3"><input aria-label={`${bid.supplier_name_snapshot} lead time in days`} type="number" min="0" step="1" value={bidDrafts[bid.id]?.leadTimeDays ?? ""} disabled={locked} onChange={(event) => setBidDrafts((current) => ({ ...current, [bid.id]: { ...current[bid.id], leadTimeDays: event.target.value } }))} className="min-h-10 w-full rounded-lg border border-slate-300 px-3 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /></td>)}</tr>
                  <tr className="border-t-2 border-emerald-200 bg-emerald-50"><th className="sticky left-0 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-950">Entered rows summary <span className="mt-1 block text-[10px] font-semibold text-emerald-800">Material prices entered on both sides only</span></th><td className="border-l border-emerald-200 px-4 py-4 text-right"><p className="text-xs font-bold text-amber-900">Each supplier is calculated separately</p></td>{bids.map((bid) => {
                    const partial = partialComparisonByBid.get(bid.id);
                    return <td key={bid.id} className="border-l border-emerald-200 px-4 py-4 text-right">{partial?.comparableRows ? <><p className={`text-lg font-black tabular-nums ${partial.profit < 0 ? "text-rose-700" : "text-emerald-800"}`}>{formatComparisonMoney(partial.profit)}</p><p className={`text-xs font-black ${partial.marginPercent < 0 ? "text-rose-700" : "text-emerald-800"}`}>{partial.marginPercent.toFixed(1)}% margin</p><p className="mt-1 text-[10px] font-semibold text-slate-600">{partial.comparableRows} of {items.length} rows · cost {formatComparisonMoney(partial.supplierTotal)} · client {formatComparisonMoney(partial.clientTotal)}</p></> : <p className="text-xs font-bold text-slate-500">No comparable rows yet</p>}</td>;
                  })}</tr>
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-200 md:hidden">{liveBids.map((bid, bidIndex) => {
              const prices = bid.quote_comparison_prices ?? [];
              const pricedCount = prices.filter((price) => price.is_available && price.unit_price !== null).length;
              return <details key={bid.id} open={bidIndex === 0} className="group bg-white"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2"><span className="min-w-0"><span className="block truncate text-sm font-bold">{bid.supplier_name_snapshot}</span><span className="mt-0.5 block text-[10px] font-semibold text-slate-500">{pricedCount}/{items.length} priced · {bid.lead_time_days === null ? "Lead time missing" : `${bid.lead_time_days} days`}</span></span><span className="shrink-0 text-[10px] font-bold text-[#0066cc]"><span className="group-open:hidden">Open</span><span className="hidden group-open:inline">Close</span></span></summary><div className="border-t border-slate-100 bg-slate-50 p-2">
                <div className="grid gap-2">{items.map((item) => {
                  const key = `${bid.id}:${item.id}`;
                  const price = priceDrafts[key] ?? { unitPrice: "", isAvailable: true, notes: "" };
                  const lowest = lowestPrices.get(item.id);
                  const isLowest = Boolean(price.isAvailable && price.unitPrice !== "" && lowest?.bidId === bid.id);
                  const matchStatus = quoteLineMatchStatus(item, price.notes);
                  return <div key={item.id} className={`rounded-lg border p-2.5 ${isLowest ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-bold">{item.description}</p><p className="mt-0.5 text-[10px] text-slate-500">{item.quantity.toLocaleString()} {item.unit}</p></div>{isLowest ? <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">Lowest</span> : null}</div><div className="mt-2 flex items-center gap-2"><div className="relative min-w-0 flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span><input type="number" min="0" step="0.01" value={price.unitPrice} disabled={locked || !price.isAvailable} onChange={(event) => setPriceDrafts((current) => ({ ...current, [key]: { ...price, unitPrice: event.target.value } }))} placeholder="Supplier price" aria-label={`${bid.supplier_name_snapshot} mobile price for ${item.description}`} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-7 pr-2 text-right text-sm font-bold disabled:bg-slate-100" /></div><label className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600"><input type="checkbox" checked={!price.isAvailable} disabled={locked} onChange={(event) => setPriceDrafts((current) => ({ ...current, [key]: { ...price, isAvailable: !event.target.checked, unitPrice: event.target.checked ? "" : price.unitPrice } }))} />No stock</label></div>{!locked && ["possible", "review"].includes(matchStatus) ? <button type="button" onClick={() => confirmMatch(key, bid.id, item.id)} disabled={pending} className="mt-2 text-[10px] font-bold text-[#0066cc] underline underline-offset-2">Confirm item match</button> : null}</div>;
                })}</div>
                <div className="mt-2 grid grid-cols-3 gap-2"><label className="grid gap-1 text-[9px] font-bold uppercase text-slate-500">Delivery<input aria-label={`${bid.supplier_name_snapshot} mobile delivery charge`} type="number" min="0" step="0.01" value={bidDrafts[bid.id]?.deliveryCharge ?? ""} disabled={locked} onChange={(event) => setBidDrafts((current) => ({ ...current, [bid.id]: { ...current[bid.id], deliveryCharge: event.target.value } }))} className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-right text-xs font-bold" /></label><label className="grid gap-1 text-[9px] font-bold uppercase text-slate-500">Tax %<input aria-label={`${bid.supplier_name_snapshot} mobile tax`} type="number" min="0" max="100" step="0.001" value={bidDrafts[bid.id]?.taxPercent ?? ""} disabled={locked} onChange={(event) => setBidDrafts((current) => ({ ...current, [bid.id]: { ...current[bid.id], taxPercent: event.target.value } }))} className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-right text-xs font-bold" /></label><label className="grid gap-1 text-[9px] font-bold uppercase text-slate-500">Days<input aria-label={`${bid.supplier_name_snapshot} mobile lead time`} type="number" min="0" step="1" value={bidDrafts[bid.id]?.leadTimeDays ?? ""} disabled={locked} onChange={(event) => setBidDrafts((current) => ({ ...current, [bid.id]: { ...current[bid.id], leadTimeDays: event.target.value } }))} className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-right text-xs font-bold" /></label></div>
                {canManageStructure ? <button type="button" onClick={() => window.confirm(`Remove ${bid.supplier_name_snapshot} from this comparison?`) && run(() => removeQuoteComparisonSupplierAction({ comparisonId: comparison.id, bidId: bid.id }), "Supplier removed.")} className="mt-3 text-[10px] font-bold text-rose-700">Remove supplier</button> : null}
              </div></details>;
            })}</div></>
          ) : <div className="px-5 py-10 text-center text-sm text-slate-500">{items.length === 0 ? "Add materials before entering supplier prices." : "Add at least one supplier from the directory."}</div>}
          <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-20 flex gap-2 border border-slate-200 bg-white/95 p-3 shadow-[0_10px_30px_rgba(15,23,42,.14)] backdrop-blur"><button type="button" onClick={saveAllQuotes} disabled={pending || bids.length === 0} className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold disabled:opacity-40">Save prices</button><button type="button" onClick={() => setActiveStep(3)} disabled={!bids.length} className="min-h-11 flex-1 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white disabled:opacity-40">Compare routes</button></div>
        </section> : null}

        {activeStep === 3 ? <section className="mt-4" aria-labelledby="analysis-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0071e3]">Step 3 · Purchase decision</p><h2 id="analysis-heading" className="mt-1 text-2xl font-bold">Choose the route</h2><p className="mt-1 text-xs leading-5 text-slate-500">Compare landed supplier cost, coverage, delivery, tax, and lead time before preparing client pricing.</p></div>
            {hasMissingSupplierValues && !locked ? <button type="button" onClick={() => setActiveStep(2)} className="min-h-10 shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-900">Finish supplier prices</button> : null}
          </div>

          {clientReady.complete ? <div className="mt-4 border border-amber-300 bg-amber-50 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-amber-950">Client Ready to Pay</h3><p className="mt-1 text-xs text-amber-800">Same final whole-order amount for every complete buying option.</p></div><p className="text-2xl font-bold tabular-nums text-amber-950">{clientReady.complete ? formatComparisonMoney(clientReady.finalTotal) : "Incomplete"}</p></div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4"><div><dt className="text-amber-800">Material · whole order</dt><dd className="mt-1 font-bold tabular-nums">{formatComparisonMoney(clientReady.materialSubtotal)}</dd></div><div><dt className="text-amber-800">Delivery · whole order</dt><dd className="mt-1 font-bold tabular-nums">{formatComparisonMoney(clientReady.deliveryCharge)}</dd></div><div><dt className="text-amber-800">Tax · whole order</dt><dd className="mt-1 font-bold tabular-nums">{formatComparisonMoney(clientReady.taxAmount)} ({clientReady.taxPercent.toFixed(3).replace(/\.?0+$/, "")}%)</dd></div><div><dt className="text-amber-800">Lead time</dt><dd className="mt-1 font-bold">Derived per option below</dd></div></dl>
            {!clientReady.complete ? <p className="mt-3 text-xs font-bold text-amber-900">Missing: {clientReady.missingFields.join(", ")}.</p> : null}
          </div> : null}

          {buyingOptions.length > 0 ? <>
            <div className="mt-4 hidden overflow-hidden border border-slate-200 bg-white shadow-sm md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead><tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500"><th className="px-4 py-3">Option / Supplier</th><th className="px-3 py-3 text-right">Supplier total</th><th className="px-3 py-3 text-right">Client total</th><th className="px-3 py-3 text-right">Estimated gross profit</th><th className="px-3 py-3 text-right">Margin</th><th className="px-3 py-3 text-right">Lead time</th><th className="px-4 py-3 text-right">Select</th></tr></thead>
                <tbody>{buyingOptions.map((option) => { const ready = routeReady(option.id); const missing = routeMissing(option.id); return <tr key={option.id} className={`border-b border-slate-100 last:border-b-0 ${option.isLowestCost ? "bg-emerald-50/60" : ""}`}><td className="px-4 py-3 align-top"><p className="font-bold">{option.label} {option.isLowestCost ? <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800">Lowest complete cost</span> : null}</p><p className={`mt-1 text-xs font-semibold ${ready ? "text-emerald-700" : "text-amber-700"}`}>{ready ? option.kind === "mixed" ? option.supplierNames.join(" + ") : "Complete" : `Missing: ${missing.join(", ") || "required values"}`}</p><details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer font-bold text-[#0066cc]">Cost details</summary><div className="mt-2 grid gap-1"><span>Material: {formatComparisonMoney(option.supplierMaterialSubtotal)}</span><span>Delivery: {formatComparisonMoney(option.supplierDeliveryCharge)}</span><span>Tax: {formatComparisonMoney(option.supplierTaxAmount)}</span></div></details></td><td className="px-3 py-3 text-right align-top font-bold tabular-nums">{ready ? formatComparisonMoney(option.supplierTotal) : "—"}</td><td className="px-3 py-3 text-right align-top font-bold tabular-nums">{clientReady.complete ? formatComparisonMoney(option.clientTotal) : "Later"}</td><td className={`px-3 py-3 text-right align-top font-bold tabular-nums ${option.estimatedGrossProfit < 0 ? "text-rose-700" : "text-emerald-700"}`}>{ready && clientReady.complete ? formatComparisonMoney(option.estimatedGrossProfit) : "Later"}</td><td className="px-3 py-3 text-right align-top font-bold tabular-nums">{ready && clientReady.complete ? `${option.grossMarginPercent.toFixed(1)}%` : "Later"}</td><td className="px-3 py-3 text-right align-top font-semibold">{option.leadTimeDays === null ? "Missing" : `${option.leadTimeDays} day${option.leadTimeDays === 1 ? "" : "s"}`}</td><td className="px-4 py-3 text-right align-top">{option.kind === "mixed" ? <span className="text-xs font-semibold text-slate-500" title="Mixed routing remains a review view until each supplier route is confirmed.">Review split</span> : selectedBidId === option.id ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><Check className="h-4 w-4" /> Selected</span> : !locked ? <button type="button" onClick={() => awardBid(option.id, option.label)} disabled={pending || !ready} className="min-h-9 rounded-md bg-slate-950 px-3 text-xs font-bold text-white disabled:bg-slate-200 disabled:text-slate-500">Select</button> : null}</td></tr>})}</tbody>
              </table>
            </div>
            <div className="mt-3 grid gap-2 md:hidden">{buyingOptions.map((option) => { const ready = routeReady(option.id); const missing = routeMissing(option.id); return <article key={option.id} className={`rounded-xl border bg-white p-3 shadow-sm ${option.isLowestCost ? "border-emerald-300" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-bold">{option.label}</h3><p className={`mt-1 text-[10px] font-semibold ${ready ? "text-emerald-700" : "text-amber-700"}`}>{ready ? option.isLowestCost ? "Lowest landed cost" : `${items.length}/${items.length} covered` : `Missing: ${missing.join(", ")}`}</p></div><p className="shrink-0 text-right text-lg font-black tabular-nums">{ready ? formatComparisonMoney(option.supplierTotal) : "—"}<span className="block text-[9px] font-semibold text-slate-500">Landed cost</span></p></div><dl className="mt-3 grid grid-cols-3 gap-2 text-[10px]"><div><dt className="text-slate-500">Delivery</dt><dd className="mt-0.5 font-bold">{formatComparisonMoney(option.supplierDeliveryCharge)}</dd></div><div><dt className="text-slate-500">Lead time</dt><dd className="mt-0.5 font-bold">{option.leadTimeDays === null ? "Missing" : `${option.leadTimeDays} days`}</dd></div><div><dt className="text-slate-500">Suppliers</dt><dd className="mt-0.5 font-bold">{option.supplierNames.length}</dd></div></dl>{option.kind === "mixed" ? <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-600">Review split: {option.supplierNames.join(" + ")}</p> : selectedBidId === option.id ? <button type="button" onClick={() => setActiveStep(4)} className="mt-3 min-h-11 w-full rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white">Selected · Continue</button> : !locked ? <button type="button" onClick={() => awardBid(option.id, option.label)} disabled={pending || !ready} className="mt-3 min-h-11 w-full rounded-lg bg-slate-950 px-3 text-xs font-bold text-white disabled:bg-slate-200 disabled:text-slate-500">Choose route</button> : null}</article>})}</div>
          </> : <div className="mt-4 border border-dashed border-slate-300 bg-white px-5 py-10 text-center"><p className="text-sm font-bold">Enter supplier prices to compare them.</p></div>}
        </section> : null}

        {activeStep === 4 && selectedBid ? <div className="mt-4 overflow-hidden rounded-xl"><ClientQuoteBuilder
          key={selectedBidId || "no-supplier"}
          comparison={{ ...comparison, client_delivery_charge: clientReady.deliveryCharge, client_tax_percent: clientReady.taxPercent }}
          items={liveItems}
          selectedBid={selectedBid}
          clients={clients}
          initialAttachments={clientQuoteAttachments}
          previewMode={previewMode}
        /></div> : null}

        {!previewMode ? <details className="mt-8 border-t border-slate-300 pt-4"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-slate-500"><ChevronDown className="h-4 w-4" /> Comparison controls</summary><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={deleteComparison} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700"><Trash2 className="h-4 w-4" /> Delete comparison</button></div></details> : null}
      </div>
    </main>
  );
}
