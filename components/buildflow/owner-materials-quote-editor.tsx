"use client";

import { useMemo, useState } from "react";

import { buildOwnerQuoteDuplicateKey, supplierQuotes, type SupplierQuoteBatch } from "@/lib/owner-materials-quote";

type EditableRow = {
  qty: number;
  itemNo: string;
  description: string;
  unit: string;
  supplierUnitPrice: number;
  markupPercent: number;
  markupDollar: number;
  finalUnitPrice: number;
  duplicateKey: string;
};

type EditableBatch = {
  quoteId: string;
  supplierName: string;
  quoteDate: string;
  quoteNumber: string;
  effective: string;
  expires: string;
  customer: string;
  jobAddress: string;
  totals: SupplierQuoteBatch["totals"];
  rows: EditableRow[];
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function numberInput(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

const initialBatches: EditableBatch[] = supplierQuotes.map((batch) => ({
  ...batch,
  rows: batch.rows.map((row) => ({
    qty: row.qty,
    itemNo: row.itemNo,
    description: row.description,
    unit: row.unit,
    supplierUnitPrice: row.unitPrice,
    markupPercent: 0,
    markupDollar: 0,
    finalUnitPrice: row.unitPrice,
    duplicateKey: buildOwnerQuoteDuplicateKey(batch, row),
  })),
}));

export function OwnerMaterialsQuoteEditor() {
  const [batches, setBatches] = useState<EditableBatch[]>(initialBatches);
  const [activeQuoteId, setActiveQuoteId] = useState<string>(initialBatches[0]?.quoteId ?? "");

  const activeBatch = batches.find((batch) => batch.quoteId === activeQuoteId) ?? batches[0] ?? null;

  const batchSummaries = useMemo(
    () =>
      batches.map((batch) => {
        const clientTotal = batch.rows.reduce((sum, row) => sum + row.qty * row.finalUnitPrice, 0);
        return {
          quoteId: batch.quoteId,
          supplierName: batch.supplierName,
          quoteNumber: batch.quoteNumber,
          quoteDate: batch.quoteDate,
          itemsCount: batch.rows.length,
          supplierTotal: batch.totals.total,
          clientTotal,
        };
      }),
    [batches],
  );

  function updateBatchRow(quoteId: string, rowIndex: number, updater: (row: EditableRow) => EditableRow) {
    setBatches((current) =>
      current.map((batch) => {
        if (batch.quoteId !== quoteId) return batch;
        return {
          ...batch,
          rows: batch.rows.map((row, index) => (index === rowIndex ? updater(row) : row)),
        };
      }),
    );
  }

  function recalcFromMarkup(rowIndex: number, patch: Partial<EditableRow>) {
    if (!activeBatch) return;
    updateBatchRow(activeBatch.quoteId, rowIndex, (row) => {
      const next = { ...row, ...patch };
      const finalUnitPrice = next.supplierUnitPrice * (1 + next.markupPercent / 100) + next.markupDollar;
      return { ...next, finalUnitPrice };
    });
  }

  function updateFinalPrice(rowIndex: number, nextFinal: number) {
    if (!activeBatch) return;
    updateBatchRow(activeBatch.quoteId, rowIndex, (row) => {
      const baseWithPercent = row.supplierUnitPrice * (1 + row.markupPercent / 100);
      return {
        ...row,
        finalUnitPrice: nextFinal,
        markupDollar: nextFinal - baseWithPercent,
      };
    });
  }

  if (!activeBatch) {
    return null;
  }

  const activeClientTotal = activeBatch.rows.reduce((sum, row) => sum + row.qty * row.finalUnitPrice, 0);
  const activeSupplierTotal = activeBatch.rows.reduce((sum, row) => sum + row.qty * row.supplierUnitPrice, 0);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Owner Materials Inbox</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Supplier quote review and shop publishing prep</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">New supplier quote batches can be added here for review. Edit unit price, markup percent/dollar, and final client price before publishing. Live publish to client shop is blocked until protected shop publishing is connected.</p>
          </div>
          <div className="rounded-[22px] border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-slate-700">
            <div>Current batch: {activeBatch.supplierName}</div>
            <div className="mt-1">Quote #{activeBatch.quoteNumber}</div>
            <div className="mt-1">Customer: {activeBatch.customer}</div>
            <div className="mt-1">Job: {activeBatch.jobAddress}</div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Quote batches</h2>
            <p className="mt-1 text-sm text-slate-600">Future supplier quote batches can be appended to the shared quote data array and reviewed here.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {batchSummaries.map((batch) => (
            <button
              key={batch.quoteId}
              type="button"
              onClick={() => setActiveQuoteId(batch.quoteId)}
              className={`rounded-[24px] border p-4 text-left shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition ${batch.quoteId === activeBatch.quoteId ? "border-sky-200 bg-sky-50/80" : "border-slate-200 bg-white"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">{batch.supplierName}</div>
                  <div className="mt-1 text-sm text-slate-600">Quote #{batch.quoteNumber} · {batch.quoteDate}</div>
                </div>
                <div className="grid gap-1 text-right text-sm text-slate-600 sm:grid-cols-2 sm:gap-x-6">
                  <div>Items: <span className="font-semibold text-slate-900">{batch.itemsCount}</span></div>
                  <div>Supplier total: <span className="font-semibold text-slate-900">{money(batch.supplierTotal)}</span></div>
                  <div className="sm:col-span-2">Client total after markup: <span className="font-semibold text-slate-900">{money(batch.clientTotal)}</span></div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current quote lines</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{activeBatch.rows.length}</div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Supplier total from edits</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{money(activeSupplierTotal)}</div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Client/shop total after markup</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{money(activeClientTotal)}</div>
        </div>
      </section>

      <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 shadow-[0_14px_36px_rgba(220,168,69,0.08)]">
        <p className="font-semibold">Live publishing is still safely blocked.</p>
        <p className="mt-1">Missing pieces: a real protected shop schema/write path and a connected client shop reader. Until that exists, this inbox is for owner review, markup prep, and quote organization only.</p>
        <p className="mt-1">Duplicate key rule is ready: supplier + quoteDate + itemNo, fallback supplier + normalizedDescription + unit.</p>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active supplier batch</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">{activeBatch.supplierName} · Quote #{activeBatch.quoteNumber}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Effective {activeBatch.effective} · Expires {activeBatch.expires}</p>
          </div>
          <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2">Quote date: <span className="font-semibold text-slate-900">{activeBatch.quoteDate}</span></div>
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2">Supplier total: <span className="font-semibold text-slate-900">{money(activeBatch.totals.total)}</span></div>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {activeBatch.rows.map((row, index) => {
          const extendedClientPrice = row.qty * row.finalUnitPrice;

          return (
            <section key={`${activeBatch.quoteId}-${row.itemNo}-${index}`} className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">{row.description}</div>
                  <div className="mt-1 text-sm text-slate-600">Item #{row.itemNo} · Qty {row.qty} {row.unit}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    {row.duplicateKey}
                  </div>
                  <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                    Publish status: blocked
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <label className="grid gap-1 text-sm text-slate-700">
                  <span className="font-medium">Supplier unit price</span>
                  <input
                    type="number"
                    step="0.01"
                    value={numberInput(row.supplierUnitPrice)}
                    onChange={(event) => recalcFromMarkup(index, { supplierUnitPrice: Number(event.target.value || 0) })}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  <span className="font-medium">Markup %</span>
                  <input
                    type="number"
                    step="0.01"
                    value={numberInput(row.markupPercent)}
                    onChange={(event) => recalcFromMarkup(index, { markupPercent: Number(event.target.value || 0) })}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  <span className="font-medium">Markup $</span>
                  <input
                    type="number"
                    step="0.01"
                    value={numberInput(row.markupDollar)}
                    onChange={(event) => recalcFromMarkup(index, { markupDollar: Number(event.target.value || 0) })}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  <span className="font-medium">Final client/shop unit price</span>
                  <input
                    type="number"
                    step="0.01"
                    value={numberInput(row.finalUnitPrice)}
                    onChange={(event) => updateFinalPrice(index, Number(event.target.value || 0))}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                  />
                </label>
                <div className="rounded-[22px] border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-slate-700">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Extended client price</div>
                  <div className="mt-1 text-base font-semibold text-slate-950">{money(extendedClientPrice)}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 opacity-60"
                >
                  Add to Client Shop / Publish to Shop
                </button>
                <span className="text-sm text-slate-500">Blocked until protected shop publishing is connected.</span>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
