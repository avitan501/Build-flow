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
  sku: `BF-${row.itemNo}`,
  description: row.description,
  category: row.unit === "LF" ? "Engineered lumber" : row.description.includes("SIMP") || row.description.includes("HANGER") ? "Hardware" : "Framing",
  unit: row.unit,
  supplier: ownerQuoteSummary.supplier,
  supplierUnitPrice: row.unitPrice,
  markupPercent: 0,
  markupDollar: 0,
  finalUnitPrice: row.unitPrice,
  duplicateKey: buildOwnerQuoteDuplicateKey(row),
  publishStatus: "Blocked",
  reviewStatus: row.unitPrice > 80 ? "Needs review" : "Prep only",
  photoCount: 0,
  imageAlt: `${row.description} photo`,
  imageSource: "Not added",
  imageLicense: "Pending",
  imageCredit: "Pending",
  imageCategory: "Material",
  galleryCount: 0,
}));

const sidebarItems = [
  { label: "Dashboard" },
  { label: "Materials", active: true },
  { label: "Quote Batches" },
  { label: "Published" },
  { label: "Suppliers" },
  { label: "Images" },
  { label: "Settings" },
];

const tabs = ["All Materials", "Published", "Unpublished", "Needs Review", "Missing Images"] as const;

type TabKey = (typeof tabs)[number];

export function OwnerMaterialsAdminShell() {
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [supplierFilter, setSupplierFilter] = useState("All suppliers");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [stockFilter, setStockFilter] = useState("All stock states");
  const [activeTab, setActiveTab] = useState<TabKey>("All Materials");
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [editingRowId, setEditingRowId] = useState<number | null>(rows[0]?.id ?? null);

  const categories = useMemo(() => ["All categories", ...Array.from(new Set(rows.map((row) => row.category)))], [rows]);
  const suppliers = useMemo(() => ["All suppliers", ...Array.from(new Set(rows.map((row) => row.supplier)))], [rows]);
  const statuses = ["All statuses", "Blocked", "Needs review", "Prep only"];
  const stockStates = ["All stock states", "Needs review", "Ready"];

  const counts = useMemo(() => {
    const missingImages = rows.filter((row) => row.photoCount === 0).length;
    const needsReview = rows.filter((row) => row.reviewStatus === "Needs review").length;
    const published = rows.filter((row) => row.publishStatus === "Published").length;
    const unpublished = rows.length - published;

    return { missingImages, needsReview, published, unpublished };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        row.itemNo.toLowerCase().includes(query) ||
        row.sku.toLowerCase().includes(query) ||
        row.description.toLowerCase().includes(query) ||
        row.supplier.toLowerCase().includes(query);
      const matchesCategory = categoryFilter === "All categories" || row.category === categoryFilter;
      const matchesSupplier = supplierFilter === "All suppliers" || row.supplier === supplierFilter;
      const matchesStatus =
        statusFilter === "All statuses" ||
        row.publishStatus === statusFilter ||
        row.reviewStatus === statusFilter;
      const matchesStock =
        stockFilter === "All stock states" || (stockFilter === "Needs review" ? row.reviewStatus === "Needs review" : row.reviewStatus !== "Needs review");
      const matchesTab =
        activeTab === "All Materials"
          ? true
          : activeTab === "Published"
            ? row.publishStatus === "Published"
            : activeTab === "Unpublished"
              ? row.publishStatus !== "Published"
              : activeTab === "Needs Review"
                ? row.reviewStatus === "Needs review"
                : row.photoCount === 0;

      return matchesSearch && matchesCategory && matchesSupplier && matchesStatus && matchesStock && matchesTab;
    });
  }, [activeTab, categoryFilter, rows, search, statusFilter, stockFilter, supplierFilter]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.quoteValue += row.qty * row.supplierUnitPrice;
        acc.clientValue += row.qty * row.finalUnitPrice;
        if (row.publishStatus === "Blocked") acc.blocked += 1;
        if (row.publishStatus === "Published") acc.ready += 1;
        return acc;
      },
      { quoteValue: 0, clientValue: 0, blocked: 0, ready: 0 },
    );
  }, [rows]);

  const editingRow = rows.find((row) => row.id === editingRowId) ?? rows[0] ?? null;

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

  function updateRow(index: number, patch: Partial<EditableOwnerMaterialRow>) {
    setRows((current) => current.map((row) => (row.id === index ? { ...row, ...patch } : row)));
  }

  function toggleSelectedRow(rowId: number) {
    setSelectedRowIds((current) => (current.includes(rowId) ? current.filter((id) => id !== rowId) : [...current, rowId]));
  }

  function toggleSelectAll() {
    const visibleIds = filteredRows.map((row) => row.id);
    setSelectedRowIds((current) => (visibleIds.every((id) => current.includes(id)) ? current.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds]))));
  }

  function resetFilters() {
    setSearch("");
    setCategoryFilter("All categories");
    setSupplierFilter("All suppliers");
    setStatusFilter("All statuses");
    setStockFilter("All stock states");
    setActiveTab("All Materials");
  }

  return (
    <main className="min-h-screen bg-[#f3f6fb] px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
      <section className="mx-auto grid w-full max-w-[1700px] gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-[32px] border border-[#d7e2f2] bg-[linear-gradient(180deg,#0f172a_0%,#16233d_100%)] p-5 text-white shadow-[0_22px_70px_rgba(15,23,42,0.28)]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/80">BuildFlow</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Materials admin</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Admin-only dashboard for quote review, photos, and shop prep.</p>
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
            <div className="font-semibold text-white">Quote batch</div>
            <p className="mt-2 text-slate-300">{ownerQuoteSummary.supplier}</p>
            <p className="mt-1 text-slate-300">Quote {ownerQuoteSummary.quoteNumber}</p>
            <p className="mt-1 text-slate-300">Date {ownerQuoteSummary.quoteDate}</p>
          </div>

          <div className="mt-4 rounded-[22px] border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-50">
            <div className="font-semibold">Publish to shop is still blocked</div>
            <p className="mt-2 leading-6 text-amber-100/90">Protected write action is not connected yet, so publish controls stay visible but disabled.</p>
          </div>
        </aside>

        <div className="space-y-5">
          <section className="rounded-[30px] border border-[#d7e2f2] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-slate-400">⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search materials, SKU, or supplier"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 md:block">Owner workspace</div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">BF</div>
                  <div>
                    <div className="text-sm font-semibold text-slate-950">BuildFlow Admin</div>
                    <div className="text-xs text-slate-500">owner@buildflow</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-[#d7e2f2] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Materials</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Materials</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Manage and publish shop materials.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Export</button>
                <button type="button" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Import</button>
                <button type="button" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Add Material</button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: "All materials", value: rows.length, tone: "bg-slate-50" },
                { label: "Published", value: counts.published, tone: "bg-emerald-50" },
                { label: "Unpublished / Draft", value: counts.unpublished, tone: "bg-slate-50" },
                { label: "Missing price or image", value: counts.missingImages, tone: "bg-amber-50" },
                { label: "Needs review", value: counts.needsReview, tone: "bg-rose-50" },
              ].map((card) => (
                <div key={card.label} className={`rounded-[22px] border border-slate-200 px-4 py-4 ${card.tone}`}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{card.value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-[#d7e2f2] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      isActive ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(260px,1.5fr)_repeat(4,minmax(0,1fr))_auto]">
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Search by name / item no / SKU</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search materials"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Category</span>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none">
                  {categories.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Supplier</span>
                <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none">
                  {suppliers.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none">
                  {statuses.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Stock / review</span>
                <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none">
                  {stockStates.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button type="button" onClick={resetFilters} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 xl:w-auto">Reset</button>
              </div>
            </div>
          </section>

          <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <section className="rounded-[26px] border border-[#d7e2f2] bg-white px-5 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">Bulk actions</div>
                    <p className="mt-1 text-sm text-slate-500">{selectedRowIds.length} selected · Publish controls remain visible but blocked.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Save</button>
                    <button type="button" disabled className="cursor-not-allowed rounded-2xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500">Publish selected</button>
                  </div>
                </div>
              </section>

              <OwnerMaterialsAdminTable
                rows={filteredRows}
                selectedRowIds={selectedRowIds}
                onToggleSelectedRow={toggleSelectedRow}
                onToggleSelectAll={toggleSelectAll}
                allVisibleSelected={filteredRows.length > 0 && filteredRows.every((row) => selectedRowIds.includes(row.id))}
                onMarkupChange={recalcFromMarkup}
                onFinalPriceChange={updateFinalPrice}
                onEditRow={setEditingRowId}
                editingRowId={editingRowId}
              />

              <section className="rounded-[26px] border border-[#d7e2f2] bg-white px-5 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">Showing {filteredRows.length} materials</div>
                    <p className="mt-1 text-sm text-slate-500">Quote batch {ownerQuoteSummary.quoteNumber} · Supplier value {money(totals.quoteValue)} · Client value {money(totals.clientValue)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <button type="button" className="rounded-xl border border-slate-200 px-3 py-2">Prev</button>
                    <span className="rounded-xl bg-slate-50 px-3 py-2">Page 1 of 1</span>
                    <button type="button" className="rounded-xl border border-slate-200 px-3 py-2">Next</button>
                  </div>
                </div>
              </section>
            </div>

            <aside className="rounded-[30px] border border-[#d7e2f2] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">Edit material</div>
                  <p className="mt-1 text-sm text-slate-500">Compact side panel for the selected row.</p>
                </div>
                {editingRow ? (
                  <button type="button" onClick={() => toggleSelectedRow(editingRow.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                    {selectedRowIds.includes(editingRow.id) ? "Selected" : "Select"}
                  </button>
                ) : null}
              </div>

              {editingRow ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Item</div>
                    <div className="mt-2 text-lg font-semibold text-slate-950">{editingRow.description}</div>
                    <div className="mt-1 text-sm text-slate-600">{editingRow.itemNo} · {editingRow.sku}</div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium">Category</span>
                      <input value={editingRow.category} onChange={(event) => updateRow(editingRow.id, { category: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900" />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium">Supplier</span>
                      <input value={editingRow.supplier} onChange={(event) => updateRow(editingRow.id, { supplier: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900" />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium">Unit</span>
                      <input value={editingRow.unit} onChange={(event) => updateRow(editingRow.id, { unit: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900" />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium">Markup %</span>
                      <input type="number" step="0.01" value={editingRow.markupPercent} onChange={(event) => recalcFromMarkup(editingRow.id, { markupPercent: Number(event.target.value || 0) })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900" />
                    </label>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">Photo controls</div>
                        <p className="mt-1 text-xs text-slate-500">Compact image UI only.</p>
                      </div>
                      <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Add photo</button>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-[11px] font-medium text-slate-500">No image</div>
                      <div className="text-sm text-slate-600">
                        <div>{editingRow.photoCount} photos</div>
                        <div className="mt-1">Primary image: not set</div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-slate-600">
                      <div>imageAlt: {editingRow.imageAlt}</div>
                      <div>imageSource: {editingRow.imageSource}</div>
                      <div>imageLicense: {editingRow.imageLicense}</div>
                      <div>imageCredit: {editingRow.imageCredit}</div>
                      <div>imageCategory: {editingRow.imageCategory}</div>
                      <div>gallery fields: {editingRow.galleryCount}</div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                    <div className="font-semibold">Publish status: Blocked</div>
                    <p className="mt-2 leading-6">Publishing will be enabled after protected shop write action is connected.</p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 text-sm text-slate-500">Select a material row to edit it here.</div>
              )}
            </aside>
          </section>
        </div>
      </section>
    </main>
  );
}
