"use client";

import { useMemo, useState } from "react";

import { OwnerMaterialsAdminTable, type EditableOwnerMaterialRow } from "@/components/buildflow/owner-materials-admin-table";
import { buildOwnerQuoteDuplicateKey, ownerQuoteRows, ownerQuoteSummary } from "@/lib/owner-materials-quote";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

const initialRows: EditableOwnerMaterialRow[] = ownerQuoteRows.map((row, index) => ({
  id: index,
  qty: row.qty,
  itemNo: row.itemNo,
  description: row.description,
  unit: row.unit,
  supplier: ownerQuoteSummary.supplier,
  supplierUnitPrice: row.unitPrice,
  markupPercent: 0,
  markupDollar: 0,
  finalUnitPrice: row.unitPrice,
  duplicateKey: buildOwnerQuoteDuplicateKey(row),
  publishStatus: "Blocked",
}));

const sidebarItems = [
  { label: "Materials", active: true },
  { label: "Quote batches" },
  { label: "Pricing review" },
  { label: "Publish queue" },
];

export function OwnerMaterialsAdminShell() {
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("All suppliers");
  const [unitFilter, setUnitFilter] = useState("All units");
  const [publishFilter, setPublishFilter] = useState("All statuses");

  const suppliers = useMemo(() => ["All suppliers", ...Array.from(new Set(rows.map((row) => row.supplier)))], [rows]);
  const units = useMemo(() => ["All units", ...Array.from(new Set(rows.map((row) => row.unit)))], [rows]);
  const statuses = ["All statuses", "Blocked"];

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query || row.itemNo.toLowerCase().includes(query) || row.description.toLowerCase().includes(query);
      const matchesSupplier = supplierFilter === "All suppliers" || row.supplier === supplierFilter;
      const matchesUnit = unitFilter === "All units" || row.unit === unitFilter;
      const matchesStatus = publishFilter === "All statuses" || row.publishStatus === publishFilter;

      return matchesSearch && matchesSupplier && matchesUnit && matchesStatus;
    });
  }, [publishFilter, rows, search, supplierFilter, unitFilter]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.quoteValue += row.qty * row.supplierUnitPrice;
        if (row.publishStatus === "Blocked") acc.blocked += 1;
        if (row.publishStatus === "Ready") acc.ready += 1;
        return acc;
      },
      { quoteValue: 0, blocked: 0, ready: 0 },
    );
  }, [rows]);

  function recalcFromMarkup(index: number, patch: Partial<EditableOwnerMaterialRow>) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== index) return row;
        const next = { ...row, ...patch };
        const finalUnitPrice = next.supplierUnitPrice * (1 + next.markupPercent / 100) + next.markupDollar;
        return { ...next, finalUnitPrice };
      }),
    );
  }

  function updateFinalPrice(index: number, nextFinal: number) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== index) return row;
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
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
      <section className="mx-auto grid w-full max-w-[1600px] gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-[#d7e2f2] bg-[linear-gradient(180deg,#0f172a_0%,#16233d_100%)] p-5 text-white shadow-[0_22px_70px_rgba(15,23,42,0.28)]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/80">BuildFlow</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Owner admin</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Material pricing review for quote {ownerQuoteSummary.quoteNumber}.</p>
          </div>

          <nav className="mt-8 space-y-2">
            {sidebarItems.map((item) => (
              <div
                key={item.label}
                className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                  item.active ? "bg-white text-slate-950 shadow-[0_10px_30px_rgba(255,255,255,0.16)]" : "text-slate-300"
                }`}
              >
                {item.label}
              </div>
            ))}
          </nav>

          <div className="mt-8 rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            <div className="font-semibold text-white">Publish Status: Blocked</div>
            <p className="mt-2 leading-6 text-slate-300">Publishing will be enabled after protected shop write action is connected.</p>
          </div>
        </aside>

        <div className="space-y-5">
          <section className="rounded-[28px] border border-[#d7e2f2] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Materials Admin</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Materials Admin</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Manage supplier quote items, pricing, markup, and shop-ready materials.</p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <div className="font-semibold text-slate-950">{ownerQuoteSummary.supplier} quote {ownerQuoteSummary.quoteNumber}</div>
                <div className="mt-1">Quote date {ownerQuoteSummary.quoteDate}</div>
                <div className="mt-1">Customer {ownerQuoteSummary.customer}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: "Total Items", value: rows.length },
                { label: "Quote Batches", value: 1 },
                { label: "Ready to Publish", value: totals.ready },
                { label: "Blocked Publish", value: totals.blocked },
                { label: "Total Quote Value", value: money(totals.quoteValue) },
              ].map((card) => (
                <div key={card.label} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{card.value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#d7e2f2] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.6fr)_repeat(3,minmax(0,1fr))]">
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Search by item number or description</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search materials"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none ring-0 placeholder:text-slate-400"
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Filter by supplier</span>
                <select
                  value={supplierFilter}
                  onChange={(event) => setSupplierFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none"
                >
                  {suppliers.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Filter by unit</span>
                <select
                  value={unitFilter}
                  onChange={(event) => setUnitFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none"
                >
                  {units.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Filter by publish status</span>
                <select
                  value={publishFilter}
                  onChange={(event) => setPublishFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none"
                >
                  {statuses.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <OwnerMaterialsAdminTable
            rows={filteredRows}
            onMarkupChange={recalcFromMarkup}
            onFinalPriceChange={updateFinalPrice}
          />
        </div>
      </section>
    </main>
  );
}
