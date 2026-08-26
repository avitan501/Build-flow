"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  FileText,
  LockKeyhole,
  Mail,
  Save,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import {
  saveClientQuoteAction,
  sendClientQuoteAction,
} from "@/app/admin/quote-comparison/actions";
import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";
import {
  buildClientQuoteSummary,
  formatComparisonMoney,
  type QuoteComparisonBidRecord,
  type QuoteComparisonItemRecord,
  type QuoteComparisonRecord,
} from "@/lib/quote-comparison";
import { CREDIT_CARD_PROCESSING_TERM } from "@/lib/proposal-terms";

export type QuoteClientOption = {
  id: string;
  name: string;
  email: string;
  companyName: string;
  phone: string;
};

type PriceDraft = { markupPercent: string; clientUnitPrice: string };

function nonNegativeNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function statusLabel(status: QuoteComparisonRecord["client_quote_status"]) {
  if (status === "ready") return "Ready to send";
  if (status === "sent") return "Sent";
  if (status === "accepted") return "Accepted";
  if (status === "declined") return "Declined";
  return "Draft";
}

function profitTone(value: number) {
  return value < 0 ? "text-rose-700" : "text-emerald-700";
}

export function ClientQuoteBuilder({
  comparison,
  items,
  selectedBid,
  clients,
  previewMode,
}: {
  comparison: QuoteComparisonRecord;
  items: QuoteComparisonItemRecord[];
  selectedBid: QuoteComparisonBidRecord | null;
  clients: QuoteClientOption[];
  previewMode: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [selectedClientId, setSelectedClientId] = useState(comparison.client_id || "");
  const [quoteNumber, setQuoteNumber] = useState(comparison.quote_number);
  const [clientMessage, setClientMessage] = useState(comparison.client_message);
  const [clientDeliveryCharge, setClientDeliveryCharge] = useState(String(comparison.client_delivery_charge || ""));
  const [bulkMarkup, setBulkMarkup] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [clientQuoteStatus, setClientQuoteStatus] = useState(comparison.client_quote_status);

  const supplierPrices = useMemo(
    () => new Map((selectedBid?.quote_comparison_prices ?? []).map((price) => [price.item_id, price])),
    [selectedBid],
  );
  const [priceDrafts, setPriceDrafts] = useState<Record<string, PriceDraft>>(() => {
    const values: Record<string, PriceDraft> = {};
    const prices = new Map((selectedBid?.quote_comparison_prices ?? []).map((price) => [price.item_id, price]));
    for (const item of items) {
      const supplierPrice = prices.get(item.id);
      const supplierCost = supplierPrice?.is_available && supplierPrice.unit_price !== null
        ? Number(supplierPrice.unit_price)
        : null;
      const markup = Number(item.markup_percent || 0);
      const clientPrice = item.client_unit_price === null || item.client_unit_price === undefined
        ? supplierCost === null ? "" : String(roundMoney(supplierCost * (1 + markup / 100)))
        : String(item.client_unit_price);
      values[item.id] = { markupPercent: String(markup), clientUnitPrice: clientPrice };
    }
    return values;
  });

  const draftItems = useMemo<QuoteComparisonItemRecord[]>(() => items.map((item) => ({
    ...item,
    markup_percent: nonNegativeNumber(priceDrafts[item.id]?.markupPercent ?? ""),
    client_unit_price: priceDrafts[item.id]?.clientUnitPrice === "" || priceDrafts[item.id]?.clientUnitPrice === undefined
      ? null
      : nonNegativeNumber(priceDrafts[item.id].clientUnitPrice),
  })), [items, priceDrafts]);
  const summary = useMemo(
    () => buildClientQuoteSummary(draftItems, selectedBid, nonNegativeNumber(clientDeliveryCharge)),
    [clientDeliveryCharge, draftItems, selectedBid],
  );
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const canPrepare = Boolean(selectedClient && selectedBid && summary.complete && quoteNumber.trim());

  function updateMarkup(itemId: string, rawValue: string) {
    const supplierPrice = supplierPrices.get(itemId);
    const supplierCost = supplierPrice?.is_available && supplierPrice.unit_price !== null
      ? Number(supplierPrice.unit_price)
      : null;
    const markup = nonNegativeNumber(rawValue);
    setPriceDrafts((current) => ({
      ...current,
      [itemId]: {
        markupPercent: rawValue,
        clientUnitPrice: supplierCost === null ? "" : String(roundMoney(supplierCost * (1 + markup / 100))),
      },
    }));
  }

  function updateClientPrice(itemId: string, rawValue: string) {
    const supplierPrice = supplierPrices.get(itemId);
    const supplierCost = supplierPrice?.is_available && supplierPrice.unit_price !== null
      ? Number(supplierPrice.unit_price)
      : null;
    const clientPrice = nonNegativeNumber(rawValue);
    const markup = supplierCost && rawValue !== ""
      ? Math.max(0, Math.round(((clientPrice / supplierCost) - 1) * 100_000) / 1_000)
      : 0;
    setPriceDrafts((current) => ({
      ...current,
      [itemId]: { markupPercent: String(markup), clientUnitPrice: rawValue },
    }));
  }

  function applyMarkupToAll() {
    const markup = nonNegativeNumber(bulkMarkup);
    const next: Record<string, PriceDraft> = {};
    for (const item of items) {
      const supplierPrice = supplierPrices.get(item.id);
      const supplierCost = supplierPrice?.is_available && supplierPrice.unit_price !== null
        ? Number(supplierPrice.unit_price)
        : null;
      next[item.id] = {
        markupPercent: String(markup),
        clientUnitPrice: supplierCost === null ? "" : String(roundMoney(supplierCost * (1 + markup / 100))),
      };
    }
    setPriceDrafts(next);
    setMessage(`Applied ${markup}% markup to every priced item.`);
    setError("");
  }

  function quotePayload() {
    return {
      comparisonId: comparison.id,
      clientId: selectedClientId,
      quoteNumber,
      expiresOn: null,
      clientMessage,
      clientDeliveryCharge: nonNegativeNumber(clientDeliveryCharge),
      items: draftItems.map((item) => ({
        itemId: item.id,
        markupPercent: item.markup_percent,
        clientUnitPrice: item.client_unit_price ?? 0,
      })),
    };
  }

  function saveQuote() {
    setError("");
    setMessage("");
    if (!canPrepare) {
      setError("Choose a client and supplier, then complete every client price.");
      return;
    }
    if (previewMode) {
      setMessage("Sample quote saved locally. No data was sent.");
      setClientQuoteStatus("ready");
      return;
    }
    startTransition(async () => {
      const result = await saveClientQuoteAction(quotePayload());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setClientQuoteStatus("ready");
      setMessage("Client quote saved. Profit remains visible only to your team.");
    });
  }

  function sendQuote() {
    setError("");
    setMessage("");
    if (!canPrepare || !selectedClient) {
      setError("Choose a client and supplier, then complete every client price.");
      return;
    }
    if (previewMode) {
      setMessage(`Preview complete. A branded PDF would be sent to ${selectedClient.email}.`);
      setClientQuoteStatus("sent");
      return;
    }
    startTransition(async () => {
      const saved = await saveClientQuoteAction(quotePayload());
      if (!saved.ok) {
        setError(saved.error);
        return;
      }
      const sent = await sendClientQuoteAction(comparison.id);
      if (!sent.ok) {
        setError(sent.error);
        return;
      }
      setClientQuoteStatus("sent");
      setMessage(`Quote sent to ${sent.data.recipient} with the branded PDF attached.`);
    });
  }

  return (
    <section id="client-quote-builder" className="border border-slate-200 bg-white shadow-sm" aria-labelledby="client-quote-heading">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <AvantiaBuildLockup compact className="shrink-0" />
          <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0066cc]">Client proposal</p>
            <h2 id="client-quote-heading" className="mt-1 text-xl font-bold">Prepare the client quote</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex w-fit rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">{statusLabel(clientQuoteStatus)}</span>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
            <LockKeyhole className="h-3.5 w-3.5" /> Costs and profit are private
          </span>
        </div>
      </div>

      <div className="grid gap-4 border-b border-slate-200 bg-slate-50/70 p-5 sm:grid-cols-2 sm:px-6 xl:grid-cols-[minmax(15rem,1.4fr)_minmax(10rem,.7fr)_minmax(10rem,.7fr)]">
        <label className="grid gap-1.5 text-xs font-bold text-slate-600">
          Client
          <span className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm font-semibold">
              <option value="">Choose a client</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.email}</option>)}
            </select>
          </span>
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-600">Quote number<input value={quoteNumber} onChange={(event) => setQuoteNumber(event.target.value.toUpperCase())} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold uppercase" /></label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-600">Client delivery charge<input type="number" min="0" step="0.01" value={clientDeliveryCharge} onChange={(event) => setClientDeliveryCharge(event.target.value)} placeholder="$0.00" className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-right text-sm font-semibold tabular-nums" /></label>
      </div>

      {!selectedBid ? (
        <div className="p-5 sm:px-6">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0" />
            <div><p className="font-bold">Select a supplier below to prepare client pricing.</p><p className="mt-1 text-xs leading-5">The winning supplier cost becomes your private cost basis.</p></div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div><p className="text-sm font-bold">Pricing from {selectedBid.supplier_name_snapshot}</p><p className="mt-1 text-xs text-slate-500">Set a markup or type the final client unit price. Both fields stay synchronized.</p></div>
            <div className="flex items-end gap-2">
              <label className="grid gap-1 text-xs font-bold text-slate-600">Markup for all<div className="relative"><input type="number" min="0" step="0.1" value={bulkMarkup} onChange={(event) => setBulkMarkup(event.target.value)} placeholder="15" className="min-h-10 w-28 rounded-lg border border-slate-300 pr-8 pl-3 text-right text-sm font-bold" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span></div></label>
              <button type="button" onClick={applyMarkupToAll} disabled={!bulkMarkup} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold disabled:opacity-40">Apply</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead><tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500"><th className="px-5 py-3 sm:px-6">Material</th><th className="px-4 py-3 text-right">Supplier cost</th><th className="px-4 py-3 text-right">Markup</th><th className="px-4 py-3 text-right">Client unit price</th><th className="px-5 py-3 text-right sm:px-6">Line profit</th></tr></thead>
              <tbody>{summary.lines.map((line) => {
                const draft = priceDrafts[line.itemId] ?? { markupPercent: "", clientUnitPrice: "" };
                return <tr key={line.itemId} className="border-b border-slate-100 last:border-b-0">
                  <th className="px-5 py-3 sm:px-6"><p className="text-sm font-bold">{line.description}</p><p className="mt-1 text-xs font-medium text-slate-500">{line.quantity.toLocaleString()} {line.unit}{line.specification ? ` · ${line.specification}` : ""}</p></th>
                  <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-slate-500">{line.supplierUnitCost === null ? "Missing" : formatComparisonMoney(line.supplierUnitCost)}</td>
                  <td className="px-4 py-3"><div className="relative ml-auto w-28"><input type="number" min="0" step="0.1" value={draft.markupPercent} onChange={(event) => updateMarkup(line.itemId, event.target.value)} disabled={line.supplierUnitCost === null} className="min-h-10 w-full rounded-lg border border-slate-300 pr-8 pl-2 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span></div></td>
                  <td className="px-4 py-3"><div className="relative ml-auto w-32"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span><input type="number" min="0" step="0.01" value={draft.clientUnitPrice} onChange={(event) => updateClientPrice(line.itemId, event.target.value)} disabled={line.supplierUnitCost === null} className="min-h-10 w-full rounded-lg border border-slate-300 pl-7 pr-3 text-right text-sm font-bold tabular-nums disabled:bg-slate-100" /></div></td>
                  <td className={`px-5 py-3 text-right text-sm font-bold tabular-nums sm:px-6 ${profitTone(line.profit)}`}>{formatComparisonMoney(line.profit)}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>

          <div className="grid gap-3 border-y border-slate-200 bg-[#f5f5f7] p-5 sm:grid-cols-2 sm:px-6 xl:grid-cols-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Supplier landed cost</p><p className="mt-1 text-lg font-bold tabular-nums">{formatComparisonMoney(summary.supplierLandedCost)}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Client quote total</p><p className="mt-1 text-lg font-bold tabular-nums">{formatComparisonMoney(summary.clientTotal)}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Private profit</p><p className={`mt-1 text-lg font-bold tabular-nums ${profitTone(summary.profit)}`}>{formatComparisonMoney(summary.profit)}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Margin</p><p className={`mt-1 text-lg font-bold tabular-nums ${profitTone(summary.marginPercent)}`}>{summary.marginPercent.toFixed(1)}%</p></div>
          </div>

          <div className="grid gap-4 p-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <label className="grid gap-1.5 text-xs font-bold text-slate-600">Message on client quote <span className="font-medium text-slate-400">Optional</span><textarea value={clientMessage} onChange={(event) => setClientMessage(event.target.value)} rows={2} placeholder="Delivery terms, exclusions, or a short note to the client" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium" /></label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setShowPreview(true)} disabled={!canPrepare} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold disabled:opacity-40"><Eye className="h-4 w-4" /> Preview client copy</button>
              <button type="button" onClick={saveQuote} disabled={pending || !canPrepare} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-40"><Save className="h-4 w-4" /> Save quote</button>
              <button type="button" onClick={sendQuote} disabled={pending || !canPrepare} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-5 text-sm font-bold text-white disabled:opacity-40"><Mail className="h-4 w-4" /> Send to client</button>
            </div>
          </div>
        </>
      )}

      {error ? <div role="alert" className="mx-5 mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 sm:mx-6">{error}</div> : null}
      {message ? <div role="status" className="mx-5 mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 sm:mx-6"><CheckCircle2 className="h-4 w-4 shrink-0" /> {message}</div> : null}

      {showPreview && selectedClient ? (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="client-preview-title">
          <div className="my-8 w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-7"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0066cc]">Client view</p><h3 id="client-preview-title" className="mt-1 text-lg font-bold">Branded quote preview</h3></div><button type="button" onClick={() => setShowPreview(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200" aria-label="Close quote preview"><X className="h-4 w-4" /></button></div>
            <div className="p-5 sm:p-8">
              <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between"><AvantiaBuildLockup /><div className="sm:text-right"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0066cc]">Material quote</p><p className="mt-1 text-lg font-bold">{quoteNumber}</p></div></div>
              <div className="grid gap-4 border-b border-slate-200 py-6 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase text-slate-400">Prepared for</p><p className="mt-1 text-lg font-bold">{selectedClient.name}</p><p className="text-sm text-slate-600">{selectedClient.companyName || selectedClient.email}</p></div><div><p className="text-xs font-bold uppercase text-slate-400">Job location</p><p className="mt-1 text-sm font-semibold">{comparison.job_address || "No delivery address"}</p></div></div>
              <div className="divide-y divide-slate-100">{summary.lines.map((line) => <div key={line.itemId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4"><div><p className="text-sm font-bold">{line.description}</p><p className="mt-1 text-xs text-slate-500">{line.quantity.toLocaleString()} {line.unit}{line.specification ? ` · ${line.specification}` : ""} · {formatComparisonMoney(line.clientUnitPrice ?? 0)} each</p></div><p className="text-sm font-bold tabular-nums">{formatComparisonMoney(line.clientLineTotal)}</p></div>)}</div>
              <div className="ml-auto mt-5 max-w-xs border-t-2 border-slate-950 pt-4"><div className="flex justify-between gap-8 text-sm text-slate-600"><span>Materials</span><span className="tabular-nums">{formatComparisonMoney(summary.clientMaterialSubtotal)}</span></div>{summary.clientDeliveryCharge > 0 ? <div className="mt-2 flex justify-between gap-8 text-sm text-slate-600"><span>Delivery</span><span className="tabular-nums">{formatComparisonMoney(summary.clientDeliveryCharge)}</span></div> : null}<div className="mt-3 flex justify-between gap-8 text-lg font-bold"><span>Quote total</span><span className="tabular-nums">{formatComparisonMoney(summary.clientTotal)}</span></div></div>
              {clientMessage ? <p className="mt-6 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">{clientMessage}</p> : null}
              <div className="mt-6 border-t border-slate-200 pt-5"><p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Terms &amp; conditions</p><p className="mt-2 text-xs leading-5 text-slate-600">{CREDIT_CARD_PROCESSING_TERM}</p></div>
              <div className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Avantia Build · (516) 908-8319 · office@build.avantiap.com</span><span className="inline-flex items-center gap-1 font-bold text-[#0066cc]">build.avantiap.com <ArrowRight className="h-3.5 w-3.5" /></span></div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-7"><span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><FileText className="h-4 w-4" /> PDF attached when sent</span><button type="button" onClick={() => setShowPreview(false)} className="min-h-10 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white">Done</button></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
