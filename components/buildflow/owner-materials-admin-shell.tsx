"use client";

import { useMemo, useState, useTransition } from "react";

import { publishOwnerMaterialsSelection, restoreOwnerMaterialsAdminBatches, saveOwnerMaterialsAdmin, unpublishOwnerMaterialsSelection } from "@/app/owner/materials/actions";
import { OwnerMaterialsAdminTable, type EditableOwnerMaterialRow } from "@/components/buildflow/owner-materials-admin-table";
import type { OwnerMaterialBatchState, OwnerMaterialsAdminState } from "@/lib/owner-materials-admin-data";
import { ownerSupplierDocuments } from "@/lib/owner-materials-admin-data";
import { SHOP_CATEGORY_NAMES, mapExistingCategoryToShopCategory, suggestShopCategory, type ShopCategoryName } from "@/lib/shop";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function roundCurrency(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function isPlaceholderImageUrl(value: string) {
  return /(^|\.)example\.com\//i.test(value.trim());
}

const tabs = ["All Materials", "Published", "Unpublished", "Needs Review", "Missing Images"] as const;
type TabKey = (typeof tabs)[number];

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nextSuggestedCategory(row: Pick<EditableOwnerMaterialRow, "category" | "description" | "itemNo">, patch: Partial<EditableOwnerMaterialRow>) {
  const previousSuggested = mapExistingCategoryToShopCategory(row.category, {
    name: row.description,
    description: row.description,
    itemNo: row.itemNo,
  });
  const nextDescription = typeof patch.description === "string" ? patch.description : row.description;
  const nextItemNo = typeof patch.itemNo === "string" ? patch.itemNo : row.itemNo;
  const suggested = suggestShopCategory({ category: patch.category ?? row.category, name: nextDescription, description: nextDescription, itemNo: nextItemNo });

  if (patch.category) {
    return mapExistingCategoryToShopCategory(patch.category, { name: nextDescription, description: nextDescription, itemNo: nextItemNo });
  }

  if (row.category === previousSuggested || !row.category?.trim()) {
    return suggested;
  }

  return mapExistingCategoryToShopCategory(row.category, { name: nextDescription, description: nextDescription, itemNo: nextItemNo });
}

function makeBlankRow(batch: OwnerMaterialBatchState): EditableOwnerMaterialRow {
  const id = `${batch.id}:manual-${Date.now()}`;
  return {
    id,
    qty: 1,
    itemNo: `NEW-${batch.rows.length + 1}`,
    sku: `${batch.supplier.slice(0, 3).toUpperCase()}-NEW-${batch.rows.length + 1}`,
    description: "New material",
    category: "Miscellaneous",
    unit: "EA",
    supplier: batch.supplier,
    supplierUnitPrice: 0,
    markupPercent: 0,
    markupDollar: 0,
    finalUnitPrice: 0,
    duplicateKey: `${batch.id}-manual-${Date.now()}`,
    publishStatus: "Draft",
    reviewStatus: "Needs review",
    photoCount: 0,
    imageUrl: "",
    imageAlt: "New material photo",
    imageSource: "Not added",
    imageLicense: "Pending",
    imageCredit: "Pending",
    imageCategory: "Miscellaneous",
    galleryCount: 0,
    notes: "",
  };
}

export function OwnerMaterialsAdminShell({ initialState }: { initialState: OwnerMaterialsAdminState }) {
  const [state, setState] = useState(initialState);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [supplierFilter, setSupplierFilter] = useState("All suppliers");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [activeTab, setActiveTab] = useState<TabKey>("All Materials");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(initialState.batches[0]?.rows[0]?.id ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"info" | "success" | "error">("info");
  const [isPending, startTransition] = useTransition();

  const batches = state.batches;
  const activeBatch = batches.find((batch) => batch.id === state.selectedBatchId) ?? batches[0];
  const rows = useMemo(() => activeBatch?.rows ?? [], [activeBatch]);
  const categories = useMemo(() => ["All categories", ...SHOP_CATEGORY_NAMES], []);
  const suppliers = useMemo(() => ["All suppliers", ...Array.from(new Set(batches.map((batch) => batch.supplier)))], [batches]);
  const statuses = ["All statuses", "Published", "Draft", "Needs review", "Missing image", "Ready"];

  const counts = useMemo(() => {
    const allRows = batches.flatMap((batch) => batch.rows);
    const missingImages = allRows.filter((row) => row.photoCount === 0).length;
    const needsReview = allRows.filter((row) => row.reviewStatus === "Needs review" || row.reviewStatus === "Missing image").length;
    const published = allRows.filter((row) => row.publishStatus === "Published").length;
    return { missingImages, needsReview, published, unpublished: allRows.length - published, total: allRows.length };
  }, [batches]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !query || [row.itemNo, row.sku, row.description, row.supplier].some((value) => value.toLowerCase().includes(query));
      const matchesCategory = categoryFilter === "All categories" || row.category === categoryFilter;
      const matchesSupplier = supplierFilter === "All suppliers" || row.supplier === supplierFilter;
      const matchesStatus =
        statusFilter === "All statuses" || row.publishStatus === statusFilter || row.reviewStatus === statusFilter;
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
      return matchesSearch && matchesCategory && matchesSupplier && matchesStatus && matchesTab;
    });
  }, [activeTab, categoryFilter, rows, search, statusFilter, supplierFilter]);

  const editingRow = rows.find((row) => row.id === editingRowId) ?? filteredRows[0] ?? rows[0] ?? null;
  const allDocuments = useMemo(() => Array.from(new Set(batches.flatMap((batch) => batch.documents))), [batches]);

  function updateState(mutator: (current: OwnerMaterialsAdminState) => OwnerMaterialsAdminState) {
    setState((current) => mutator(cloneState(current)));
  }

  function updateRow(rowId: string, patch: Partial<EditableOwnerMaterialRow>) {
    updateState((current) => ({
      ...current,
      batches: current.batches.map((batch) =>
        batch.id !== current.selectedBatchId
          ? batch
          : {
              ...batch,
              rows: batch.rows.map((row) => {
                if (row.id !== rowId) return row;
                const category = nextSuggestedCategory(row, patch);
                const patched = { ...row, ...patch, category, imageCategory: category };
                const supplierUnitPrice = Number(patched.supplierUnitPrice || 0);
                const markupPercent = Number(patched.markupPercent || 0);
                let markupDollar = Number(patched.markupDollar || 0);
                let finalUnitPrice = Number(patched.finalUnitPrice || 0);

                if (
                  ("supplierUnitPrice" in patch || "markupPercent" in patch || "markupDollar" in patch) &&
                  !("finalUnitPrice" in patch)
                ) {
                  finalUnitPrice = roundCurrency(supplierUnitPrice * (1 + markupPercent / 100) + markupDollar);
                }

                if ("finalUnitPrice" in patch && !("markupDollar" in patch)) {
                  markupDollar = roundCurrency(finalUnitPrice - supplierUnitPrice * (1 + markupPercent / 100));
                }

                finalUnitPrice = roundCurrency(finalUnitPrice);
                const photoCount = patched.photoCount || 0;
                return {
                  ...patched,
                  supplierUnitPrice,
                  markupPercent,
                  markupDollar,
                  finalUnitPrice,
                  reviewStatus: photoCount > 0 && finalUnitPrice > 0 ? "Ready" : finalUnitPrice > 0 ? "Missing image" : "Needs review",
                  error: undefined,
                };
              }),
            },
      ),
    }));
  }

  function setSelectedBatch(batchId: string) {
    setSelectedRowIds([]);
    setEditingRowId(null);
    setState((current) => ({ ...current, selectedBatchId: batchId }));
    setNotice(null);
    setNoticeTone("info");
  }

  function toggleSelectedRow(rowId: string) {
    setSelectedRowIds((current) => (current.includes(rowId) ? current.filter((id) => id !== rowId) : [...current, rowId]));
  }

  function toggleSelectAll() {
    const visibleIds = filteredRows.map((row) => row.id);
    if (visibleIds.length === 0) {
      setNoticeTone("error");
      setNotice("No visible materials match the current filters.");
      return;
    }
    setSelectedRowIds((current) => (visibleIds.every((id) => current.includes(id)) ? current.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds]))));
    setNoticeTone("info");
    setNotice(visibleIds.every((id) => selectedRowIds.includes(id)) ? "Visible materials unselected." : "Visible materials selected.");
  }

  function resetFilters() {
    setSearch("");
    setCategoryFilter("All categories");
    setSupplierFilter("All suppliers");
    setStatusFilter("All statuses");
    setActiveTab("All Materials");
  }

  function handleAddMaterial() {
    if (!activeBatch) return;
    const nextRow = makeBlankRow(activeBatch);
    updateState((current) => ({
      ...current,
      batches: current.batches.map((batch) => (batch.id === activeBatch.id ? { ...batch, rows: [nextRow, ...batch.rows] } : batch)),
    }));
    setEditingRowId(nextRow.id);
    setNoticeTone("success");
    setNotice("New material added to the current batch.");
  }

  function handleDuplicateRow(rowId: string) {
    if (!activeBatch) return;
    const sourceRow = rows.find((row) => row.id === rowId);
    if (!sourceRow) return;
    const nextRow = { ...sourceRow, id: `${sourceRow.id}-copy-${Date.now()}`, itemNo: `${sourceRow.itemNo}-COPY`, publishStatus: "Draft" as const, error: undefined };
    updateState((current) => ({
      ...current,
      batches: current.batches.map((batch) => (batch.id === activeBatch.id ? { ...batch, rows: [nextRow, ...batch.rows] } : batch)),
    }));
    setEditingRowId(nextRow.id);
    setNoticeTone("success");
    setNotice("Material duplicated.");
  }

  function handleRemoveRow(rowId: string) {
    updateState((current) => ({
      ...current,
      batches: current.batches.map((batch) =>
        batch.id !== current.selectedBatchId ? batch : { ...batch, rows: batch.rows.filter((row) => row.id !== rowId) },
      ),
    }));
    setSelectedRowIds((current) => current.filter((id) => id !== rowId));
    if (editingRowId === rowId) setEditingRowId(null);
    setNoticeTone("success");
    setNotice("Material removed from the current batch.");
  }

  function handleAddPhoto(rowId: string) {
    const nextUrl = window.prompt("Paste an image URL or file label for this material", editingRow?.imageUrl || "");
    if (nextUrl === null) return;
    updateRow(rowId, {
      imageUrl: nextUrl.trim(),
      photoCount: nextUrl.trim() ? 1 : 0,
      galleryCount: nextUrl.trim() ? 1 : 0,
      imageSource: nextUrl.trim() ? "Owner upload" : "Not added",
      imageLicense: nextUrl.trim() ? "Owner provided" : "Pending",
      imageCredit: nextUrl.trim() ? "Owner upload" : "Pending",
    });
    setNoticeTone("success");
    setNotice(nextUrl.trim() ? "Photo attached to material." : "Photo cleared.");
  }

  function handleRemovePhoto(rowId: string) {
    updateRow(rowId, { imageUrl: "", photoCount: 0, galleryCount: 0, imageSource: "Not added", imageLicense: "Pending", imageCredit: "Pending" });
    setNoticeTone("success");
    setNotice("Photo removed.");
  }

  function exportCsv() {
    const header = ["batch", "supplier", "quote", "item_no", "sku", "description", "category", "unit", "qty", "cost", "sell", "status"];
    const lines = [header.join(",")].concat(
      rows.map((row) =>
        [activeBatch?.id, row.supplier, activeBatch?.quoteNumber, row.itemNo, row.sku, row.description, row.category, row.unit, row.qty, row.supplierUnitPrice, row.finalUnitPrice, row.publishStatus]
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(","),
      ),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${activeBatch?.supplier ?? "materials"}-${activeBatch?.quoteNumber ?? "export"}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNoticeTone("success");
    setNotice("CSV export downloaded.");
  }

  function saveStateToServer() {
    startTransition(async () => {
      const result = await saveOwnerMaterialsAdmin(state);
      setState(result.state);
      setNoticeTone(result.ok ? "success" : "error");
      setNotice(result.message);
    });
  }

  function restoreBatches() {
    startTransition(async () => {
      const result = await restoreOwnerMaterialsAdminBatches();
      if (result.state) {
        setState(result.state);
        setSelectedRowIds([]);
        setEditingRowId(result.state.batches.find((batch) => batch.id === result.state.selectedBatchId)?.rows[0]?.id ?? null);
      }
      setNoticeTone(result.ok ? "success" : "error");
      setNotice(result.ok ? `Restored ${result.state?.batches.length ?? 0} quote batches and ${ownerSupplierDocuments.length} supplier documents.` : result.message);
    });
  }

  function publishSelection(rowIds: string[]) {
    if (!activeBatch || rowIds.length === 0) {
      setNoticeTone("error");
      setNotice("Select at least one material to publish.");
      return;
    }

    const selectedRows = rows.filter((row) => rowIds.includes(row.id));
    const placeholderImages = selectedRows.filter((row) => row.imageUrl && isPlaceholderImageUrl(row.imageUrl));
    if (placeholderImages.length > 0) {
      setNoticeTone("error");
      setNotice(`${placeholderImages.length} item(s) still use a placeholder image URL. Replace or clear the image before publishing.`);
      return;
    }

    startTransition(async () => {
      const result = await publishOwnerMaterialsSelection(state, activeBatch.id, rowIds);
      setState(result.state);
      setNoticeTone(result.ok ? "success" : "error");
      if (result.ok) {
        setSelectedRowIds((current) => current.filter((id) => !rowIds.includes(id)));
      }
      setNotice(result.message);
    });
  }

  function unpublishSelection(rowIds: string[]) {
    if (!activeBatch || rowIds.length === 0) {
      setNoticeTone("error");
      setNotice("Select at least one material to unpublish.");
      return;
    }
    startTransition(async () => {
      const result = await unpublishOwnerMaterialsSelection(state, activeBatch.id, rowIds);
      setState(result.state);
      setSelectedRowIds((current) => current.filter((id) => !rowIds.includes(id)));
      setNoticeTone(result.ok ? "success" : "error");
      setNotice(result.message);
    });
  }

  function handleEditRow(rowId: string) {
    setEditingRowId(rowId);
    setNoticeTone("info");
    setNotice("Material loaded into the editor.");
  }

  const editingIssues = editingRow
    ? [
        !editingRow.description.trim() ? "Add a description." : null,
        !editingRow.category.trim() ? "Choose a category." : null,
        !editingRow.unit.trim() ? "Add a unit." : null,
        editingRow.qty <= 0 ? "Quantity must be more than 0." : null,
        editingRow.finalUnitPrice <= 0 ? "Sell price must be more than $0." : null,
        editingRow.imageUrl && isPlaceholderImageUrl(editingRow.imageUrl) ? "Replace the placeholder image URL." : null,
      ].filter((issue): issue is string => Boolean(issue))
    : [];

  const canPublishEditingRow = editingRow ? editingIssues.length === 0 : false;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f3f6fb] px-3 py-4 text-slate-900 sm:px-6 sm:py-8">
      <section className="mx-auto w-full max-w-[1720px] min-w-0 space-y-4">
        <section className="rounded-[30px] border border-[#d7e2f2] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Material Admin</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Add materials, review, publish</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">Create or clean up material items, add pricing and images, then publish ready rows to the shop.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400" title="PDF extraction is not connected yet.">
                PDF import pending
              </button>
              <button type="button" onClick={handleAddMaterial} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Add material</button>
              <button type="button" onClick={exportCsv} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Export CSV</button>
              <button type="button" onClick={restoreBatches} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Restore batches</button>
              <button type="button" onClick={saveStateToServer} disabled={isPending} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">Save</button>
              <button type="button" onClick={() => publishSelection(selectedRowIds)} disabled={isPending} aria-disabled={isPending || selectedRowIds.length === 0} className={`rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white ${isPending || selectedRowIds.length === 0 ? "opacity-60" : ""}`}>Publish selected</button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Restored PDFs</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {allDocuments.map((document) => (
                  <span key={document} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">{document}</span>
                ))}
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Items</div><div className="mt-2 text-2xl font-semibold text-slate-950">{counts.total}</div></div>
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4"><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Published</div><div className="mt-2 text-2xl font-semibold text-slate-950">{counts.published}</div></div>
              <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4"><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Needs review</div><div className="mt-2 text-2xl font-semibold text-slate-950">{counts.needsReview}</div></div>
            </div>
          </div>

          {notice ? <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${noticeTone === "error" ? "border border-rose-200 bg-rose-50 text-rose-900" : noticeTone === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-900" : "border border-sky-200 bg-sky-50 text-sky-900"}`}>{notice}</div> : null}
        </section>

        <section className="rounded-[30px] border border-[#d7e2f2] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Quote batches</h2>
              <p className="mt-1 text-sm text-slate-500">Select a restored quote batch to review its extracted material items.</p>
            </div>
            <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Batch</span>
                <select value={state.selectedBatchId} onChange={(event) => setSelectedBatch(event.target.value)} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none">
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>{batch.supplier} • {batch.quoteNumber}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Search</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search items" className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400" />
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Category</span>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none">
                  {categories.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Supplier</span>
                <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none">
                  {suppliers.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none">
                  {statuses.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-full px-4 py-2 text-sm font-semibold ${isActive ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
                  {tab}
                </button>
              );
            })}
            <button type="button" onClick={resetFilters} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">Reset</button>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">{selectedRowIds.length} selected</div>
          </div>

          <div className="mt-4 grid min-w-0 gap-4 2xl:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.4fr)_minmax(320px,0.9fr)]">
            <article className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Restored batches</div>
              <div className="mt-3 space-y-3">
                {batches.map((batch) => {
                  const isActive = batch.id === activeBatch?.id;
                  return (
                    <button key={batch.id} type="button" onClick={() => setSelectedBatch(batch.id)} className={`w-full rounded-[20px] border p-4 text-left transition ${isActive ? "border-slate-900 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{batch.supplier}</div>
                          <div className={`mt-1 text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>{batch.quoteNumber} • {batch.quoteDate}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isActive ? "bg-white/10 text-white" : "bg-slate-50 text-slate-700"}`}>{batch.rows.length} items</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {batch.documents.map((document) => (
                          <span key={document} className={`rounded-full px-2.5 py-1 text-[11px] ${isActive ? "bg-white/10 text-slate-100" : "border border-slate-200 bg-slate-50 text-slate-600"}`}>{document}</span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </article>

            <div className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{activeBatch?.supplier} items</h2>
                  <p className="text-sm text-slate-500">{filteredRows.length} visible rows ready for review and publishing.</p>
                </div>
              </div>
              <OwnerMaterialsAdminTable
                rows={filteredRows}
                selectedRowIds={selectedRowIds}
                onToggleRow={toggleSelectedRow}
                onToggleAll={toggleSelectAll}
                onEditRow={handleEditRow}
                onPublishRow={(rowId) => publishSelection([rowId])}
                onUnpublishRow={(rowId) => unpublishSelection([rowId])}
                onDuplicateRow={handleDuplicateRow}
                onRemoveRow={handleRemoveRow}
                onAddPhoto={handleAddPhoto}
                onRemovePhoto={handleRemovePhoto}
                editingRowId={editingRowId}
                categoryOptions={SHOP_CATEGORY_NAMES}
                onChangeCategory={(rowId, category) => updateRow(rowId, { category })}
              />
            </div>

            <section className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Edit item</div>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">{editingRow?.description ?? "Select a material"}</h2>
                </div>
                {editingRow?.publishStatus ? <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">{editingRow.publishStatus}</span> : null}
              </div>

              {editingRow ? (
                <div className="mt-5 grid gap-4">
                  {editingIssues.length > 0 ? (
                    <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <div className="font-semibold">Before publishing</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {editingIssues.map((issue) => <li key={issue}>{issue}</li>)}
                      </ul>
                    </div>
                  ) : (
                    <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">This item is ready to publish.</div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Item no</span><input value={editingRow.itemNo} onChange={(event) => updateRow(editingRow.id, { itemNo: event.target.value })} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Quantity</span><input type="number" min="0" step="0.01" value={editingRow.qty} onChange={(event) => updateRow(editingRow.id, { qty: Number(event.target.value) })} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Unit</span><input value={editingRow.unit} onChange={(event) => updateRow(editingRow.id, { unit: event.target.value })} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                  </div>
                  <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Description / Name</span><input value={editingRow.description} onChange={(event) => updateRow(editingRow.id, { description: event.target.value })} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Category</span><select value={editingRow.category} onChange={(event) => updateRow(editingRow.id, { category: event.target.value as ShopCategoryName })} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">{SHOP_CATEGORY_NAMES.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Supplier</span><input value={editingRow.supplier} onChange={(event) => updateRow(editingRow.id, { supplier: event.target.value })} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-4">
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Supplier cost</span><input type="number" min="0" step="0.01" value={editingRow.supplierUnitPrice} onChange={(event) => updateRow(editingRow.id, { supplierUnitPrice: Number(event.target.value) })} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Markup %</span><input type="number" step="0.01" value={editingRow.markupPercent} onChange={(event) => updateRow(editingRow.id, { markupPercent: Number(event.target.value) })} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Markup $</span><input type="number" step="0.01" value={editingRow.markupDollar} onChange={(event) => updateRow(editingRow.id, { markupDollar: Number(event.target.value) })} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Sell price</span><input type="number" min="0" step="0.01" value={editingRow.finalUnitPrice} onChange={(event) => updateRow(editingRow.id, { finalUnitPrice: Number(event.target.value) })} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                  </div>
                  <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Photo URL / label</span><input value={editingRow.imageUrl} onChange={(event) => updateRow(editingRow.id, { imageUrl: event.target.value, photoCount: event.target.value.trim() ? 1 : 0, galleryCount: event.target.value.trim() ? 1 : 0 })} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                  <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Notes</span><textarea value={editingRow.notes ?? ""} onChange={(event) => updateRow(editingRow.id, { notes: event.target.value })} rows={4} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>

                  <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-3"><span>Extended cost</span><strong className="text-slate-950">{money(editingRow.qty * editingRow.supplierUnitPrice)}</strong></div>
                    <div className="flex flex-wrap items-center justify-between gap-3"><span>Extended sell</span><strong className="text-slate-950">{money(editingRow.qty * editingRow.finalUnitPrice)}</strong></div>
                    <div className="flex flex-wrap items-center justify-between gap-3"><span>Gross margin</span><strong className="text-slate-950">{money(editingRow.qty * (editingRow.finalUnitPrice - editingRow.supplierUnitPrice))}</strong></div>
                    <div className="flex flex-wrap items-center justify-between gap-3"><span>Review status</span><strong className="text-slate-950">{editingRow.reviewStatus}</strong></div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={saveStateToServer} disabled={isPending} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">Save</button>
                    <button type="button" onClick={() => publishSelection([editingRow.id])} disabled={isPending || !canPublishEditingRow} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">Publish item</button>
                    <button type="button" onClick={() => handleAddPhoto(editingRow.id)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">{editingRow.photoCount > 0 ? "Replace photo" : "Add photo"}</button>
                    {editingRow.photoCount > 0 ? <button type="button" onClick={() => handleRemovePhoto(editingRow.id)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Remove photo</button> : null}
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">Select a material row to edit it here.</div>
              )}
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
