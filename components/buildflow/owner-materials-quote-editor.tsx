"use client";

import { useMemo, useState } from "react";

import { buildOwnerQuoteDuplicateKey, ownerQuoteRows, ownerQuoteSummary } from "@/lib/owner-materials-quote";

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

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function numberInput(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

const initialRows: EditableRow[] = ownerQuoteRows.map((row) => ({
  qty: row.qty,
  itemNo: row.itemNo,
  description: row.description,
  unit: row.unit,
  supplierUnitPrice: row.unitPrice,
  markupPercent: 0,
  markupDollar: 0,
  finalUnitPrice: row.unitPrice,
  duplicateKey: buildOwnerQuoteDuplicateKey(row),
}));

export function OwnerMaterialsQuoteEditor() {
  const [rows, setRows] = useState<EditableRow[]>(initialRows);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.supplier += row.qty * row.supplierUnitPrice;
        acc.client += row.qty * row.finalUnitPrice;
        return acc;
      },
      { supplier: 0, client: 0 },
    );
  }, [rows]);

  function updateRow(index: number, patch: Partial<EditableRow>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function recalcFromMarkup(index: number, patch: Partial<EditableRow>) {
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const next = { ...row, ...patch };
        const finalUnitPrice = next.supplierUnitPrice * (1 + next.markupPercent / 100) + next.markupDollar;
        return { ...next, finalUnitPrice };
      }),
    );
  }

  function updateFinalPrice(index: number, nextFinal: number) {
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const baseWithPercent = row.supplierUnitPrice * (1 + row.markupPercent / 100);
        return {
          ...row,
          finalUnitPrice: nextFinal,
          markupDollar: nextFinal - baseWithPercent,
        };
      }),
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Owner materials quote</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{ownerQuoteSummary.supplier}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Open backend quote review page for pricing, markup, and later shop publishing.</p>
          </div>
          <div className="rounded-[22px] border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-slate-700">
            <div>Quote #{ownerQuoteSummary.quoteNumber}</div>
            <div className="mt-1">Customer: {ownerQuoteSummary.customer}</div>
            <div className="mt-1">Job: {ownerQuoteSummary.job}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Quote date</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{ownerQuoteSummary.quoteDate}</div>
          </div>
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Expires</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{ownerQuoteSummary.expires}</div>
          </div>
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Supplier subtotal</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{money(ownerQuoteSummary.subtotal)}</div>
          </div>
          <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Supplier total</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{money(ownerQuoteSummary.total)}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Quote lines</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{rows.length}</div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Supplier extended total</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{money(totals.supplier)}</div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Client/shop extended total</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{money(totals.client)}</div>
        </div>
      </section>

      <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 shadow-[0_14px_36px_rgba(220,168,69,0.08)]">
        <p className="font-semibold">Publishing is not wired to a live shop write action on this page yet.</p>
        <p className="mt-1">Buttons stay local-only/disabled for safety until the existing shop write action is connected. Duplicate note key pattern: supplier + quoteDate + itemNo, fallback supplier + normalizedDescription + unit.</p>
        {helperMessage ? <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-slate-700">{helperMessage}</p> : null}
      </section>

      <div className="space-y-4">
        {rows.map((row, index) => {
          const extendedClientPrice = row.qty * row.finalUnitPrice;

          return (
            <section key={`${row.itemNo}-${index}`} className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">{row.description}</div>
                  <div className="mt-1 text-sm text-slate-600">Item #{row.itemNo} · Qty {row.qty} {row.unit}</div>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  {row.duplicateKey}
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
                  onClick={() => {
                    updateRow(index, row);
                    setHelperMessage(`Live shop publishing still needs the shop write action connected for ${row.itemNo}.`);
                  }}
                  className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 opacity-60"
                >
                  Add to Client Shop / Publish to Shop
                </button>
                <span className="text-sm text-slate-500">Local pricing preview only for now.</span>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
