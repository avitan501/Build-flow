"use client";

import { useMemo, useState, useTransition } from "react";

import { publishOwnerMaterialsSelection, restoreOwnerMaterialsAdminBatches, saveOwnerMaterialsAdmin, unpublishOwnerMaterialsSelection } from "@/app/owner/materials/actions";
import { OwnerMaterialsAdminTable, type EditableOwnerMaterialRow } from "@/components/buildflow/owner-materials-admin-table";
import type { OwnerMaterialBatchState, OwnerMaterialsAdminState } from "@/lib/owner-materials-admin-data";
import { ownerSupplierDocuments } from "@/lib/owner-materials-admin-data";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

const sidebarItems = ["Dashboard", "Materials", "Quote Batches", "Published", "Suppliers", "Images", "Settings"];
const tabs = ["All Materials", "Published", "Unpublished", "Needs Review", "Missing Images"] as const;
type TabKey = (typeof tabs)[number];

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeBlankRow(batch: OwnerMaterialBatchState): EditableOwnerMaterialRow {
  const id = `${batch.id}:manual-${Date.now()}`;
  return {
    id,
    qty: 1,
    itemNo: `NEW-${batch.rows.length + 1}`,
    sku: `${batch.supplier.slice(0, 3).toUpperCase()}-NEW-${batch.rows.length + 1}`,
    description: "New material",
    category: "Materials",
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
    imageCategory: "Materials",
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"info" | "success" | "error">("info");
  const [isPending, startTransition] = useTransition();

  const batches = state.batches;
  const activeBatch = batches.find((batch) => batch.id === state.selectedBatchId) ?? batches[0];
  const rows = activeBatch?.rows ?? [];
  const categories = useMemo(() => ["All categories", ...Array.from(new Set(rows.map((row) => row.category)))], [rows]);
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
                const next = { ...row, ...patch };
                const finalUnitPrice = Number(next.finalUnitPrice || 0);
                const photoCount = next.photoCount || 0;
                return {
                  ...next,
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

  return (
    <main className="min-h-screen bg-[#f3f6fb] px-3 py-4 text-slate-900 sm:px-6 sm:py-8">
      <section className="mx-auto grid w-full max-w-[1720px] gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className={`${isSidebarOpen ? "block" : "hidden"} xl:block`}>
          <div className="rounded-[30px] border border-[#d7e2f2] bg-[linear-gradient(180deg,#0f172a_0%,#16233d_100%)] p-5 text-white shadow-[0_22px_70px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/80">BuildFlow</div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">Materials admin</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">Quote review, image cleanup, staging, and publish to shop.</p>
              </div>
              <button type="button" onClick={() => setIsSidebarOpen(false)} className="rounded-full border border-white/15 px-3 py-1 text-xs xl:hidden">Close</button>
            </div>

            <nav className="mt-8 space-y-2">
              {sidebarItems.map((item) => (
                <div key={item} className={`rounded-2xl px-4 py-3 text-sm font-medium ${item === "Materials" ? "bg-white text-slate-950 shadow-[0_10px_30px_rgba(255,255,255,0.16)]" : "text-slate-300"}`}>
                  {item}
                </div>
              ))}
            </nav>

            <div className="mt-8 rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <div className="font-semibold text-white">Imported supplier documents</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {allDocuments.map((document) => (
                  <span key={document} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100">{document}</span>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <section className="rounded-[28px] border border-[#d7e2f2] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setIsSidebarOpen((current) => !current)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 xl:hidden">Menu</button>
                <div className="flex flex-1 items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 lg:min-w-[360px]">
                  <span className="text-slate-400">⌕</span>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search materials, SKU, or supplier" className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select value={state.selectedBatchId} onChange={(event) => setSelectedBatch(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none">
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>{batch.supplier} • {batch.quoteNumber} • {batch.quoteDate}</option>
                  ))}
                </select>
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

          <section className="rounded-[30px] border border-[#d7e2f2] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Materials</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Owner materials dashboard</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Review imported supplier batches, edit rows, attach photos, and publish selected materials into the shop feed.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={exportCsv} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Export CSV</button>
                <button type="button" onClick={restoreBatches} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Import / Restore batches</button>
                <button type="button" onClick={handleAddMaterial} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Add Material</button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: "All materials", value: counts.total, tone: "bg-slate-50" },
                { label: "Published", value: counts.published, tone: "bg-emerald-50" },
                { label: "Unpublished / Draft", value: counts.unpublished, tone: "bg-slate-50" },
                { label: "Missing image", value: counts.missingImages, tone: "bg-amber-50" },
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
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-full px-4 py-2 text-sm font-semibold ${isActive ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
                    {tab}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(220px,1.6fr)_repeat(3,minmax(0,1fr))_auto]">
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Search</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search materials" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400" />
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Category</span>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none">
                  {categories.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Supplier</span>
                <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none">
                  {suppliers.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none">
                  {statuses.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <button type="button" onClick={resetFilters} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 xl:self-end">Reset filters</button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={saveStateToServer} disabled={isPending} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">Save</button>
              <button type="button" onClick={() => publishSelection(selectedRowIds)} disabled={isPending} aria-disabled={isPending || selectedRowIds.length === 0} className={`rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white ${isPending || selectedRowIds.length === 0 ? "opacity-60" : ""}`}>Publish selected</button>
              <button type="button" onClick={() => unpublishSelection(selectedRowIds)} disabled={isPending} aria-disabled={isPending || selectedRowIds.length === 0} className={`rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 ${isPending || selectedRowIds.length === 0 ? "opacity-60" : ""}`}>Unpublish selected</button>
              <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">{selectedRowIds.length} selected</div>
            </div>

            {notice ? <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${noticeTone === "error" ? "border border-rose-200 bg-rose-50 text-rose-900" : noticeTone === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-900" : "border border-sky-200 bg-sky-50 text-sky-900"}`}>{notice}</div> : null}
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(260px,0.62fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(260px,0.62fr)_minmax(0,1.55fr)_minmax(320px,0.9fr)]">
            <article className="rounded-[30px] border border-[#d7e2f2] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Quote batches</div>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Restored supplier documents & batches</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">All restored supplier documents and quote batches stay visible here even if the original PDFs are unavailable.</p>
              <div className="mt-4 space-y-3">
                {batches.map((batch) => {
                  const isActive = batch.id === activeBatch?.id;
                  return (
                    <button
                      key={batch.id}
                      type="button"
                      onClick={() => setSelectedBatch(batch.id)}
                      className={`w-full rounded-[22px] border p-4 text-left transition ${isActive ? "border-slate-900 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{batch.supplier}</div>
                          <div className={`mt-1 text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>Quote {batch.quoteNumber} • {batch.quoteDate}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isActive ? "bg-white/10 text-white" : "bg-white text-slate-700"}`}>{batch.rows.length} rows</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {batch.documents.map((document) => (
                          <span key={document} className={`rounded-full px-2.5 py-1 text-[11px] ${isActive ? "bg-white/10 text-slate-100" : "border border-slate-200 bg-white text-slate-600"}`}>{document}</span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </article>
            <div className="rounded-[30px] border border-[#d7e2f2] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] 2xl:col-start-2">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{activeBatch?.supplier} batch</h2>
                  <p className="text-sm text-slate-500">Quote {activeBatch?.quoteNumber} • {activeBatch?.quoteDate} • {filteredRows.length} visible rows</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  {activeBatch?.documents.map((document) => <span key={document} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{document}</span>)}
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
              />
            </div>

            <section className="rounded-[30px] border border-[#d7e2f2] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] 2xl:col-start-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Editor</div>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">{editingRow?.description ?? "Select a material"}</h2>
                </div>
                {editingRow?.publishStatus ? <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">{editingRow.publishStatus}</span> : null}
              </div>

              {editingRow ? (
                <div className="mt-5 grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Item no / SKU</span><input value={editingRow.itemNo} onChange={(event) => updateRow(editingRow.id, { itemNo: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">SKU</span><input value={editingRow.sku} onChange={(event) => updateRow(editingRow.id, { sku: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                  </div>
                  <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Description / Name</span><input value={editingRow.description} onChange={(event) => updateRow(editingRow.id, { description: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Category</span><input value={editingRow.category} onChange={(event) => updateRow(editingRow.id, { category: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Supplier</span><input value={editingRow.supplier} onChange={(event) => updateRow(editingRow.id, { supplier: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Unit</span><input value={editingRow.unit} onChange={(event) => updateRow(editingRow.id, { unit: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Qty</span><input type="number" value={editingRow.qty} onChange={(event) => updateRow(editingRow.id, { qty: Number(event.target.value) })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Cost</span><input type="number" step="0.01" value={editingRow.supplierUnitPrice} onChange={(event) => updateRow(editingRow.id, { supplierUnitPrice: Number(event.target.value) })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Markup %</span><input type="number" step="0.01" value={editingRow.markupPercent} onChange={(event) => { const markupPercent = Number(event.target.value); const finalUnitPrice = editingRow.supplierUnitPrice * (1 + markupPercent / 100) + editingRow.markupDollar; updateRow(editingRow.id, { markupPercent, finalUnitPrice }); }} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Markup $</span><input type="number" step="0.01" value={editingRow.markupDollar} onChange={(event) => { const markupDollar = Number(event.target.value); const finalUnitPrice = editingRow.supplierUnitPrice * (1 + editingRow.markupPercent / 100) + markupDollar; updateRow(editingRow.id, { markupDollar, finalUnitPrice }); }} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                    <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Sell price</span><input type="number" step="0.01" value={editingRow.finalUnitPrice} onChange={(event) => updateRow(editingRow.id, { finalUnitPrice: Number(event.target.value) })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                  </div>
                  <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Photo URL / label</span><input value={editingRow.imageUrl} onChange={(event) => updateRow(editingRow.id, { imageUrl: event.target.value, photoCount: event.target.value.trim() ? 1 : 0, galleryCount: event.target.value.trim() ? 1 : 0 })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
                  <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium">Notes</span><textarea value={editingRow.notes ?? ""} onChange={(event) => updateRow(editingRow.id, { notes: event.target.value })} rows={4} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>

                  <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-3"><span>Extended cost</span><strong className="text-slate-950">{money(editingRow.qty * editingRow.supplierUnitPrice)}</strong></div>
                    <div className="flex flex-wrap items-center justify-between gap-3"><span>Extended sell</span><strong className="text-slate-950">{money(editingRow.qty * editingRow.finalUnitPrice)}</strong></div>
                    <div className="flex flex-wrap items-center justify-between gap-3"><span>Review status</span><strong className="text-slate-950">{editingRow.reviewStatus}</strong></div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={saveStateToServer} disabled={isPending} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">Save</button>
                    <button type="button" onClick={() => publishSelection([editingRow.id])} disabled={isPending} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">Publish item</button>
                    {editingRow.publishStatus === "Published" ? <button type="button" onClick={() => unpublishSelection([editingRow.id])} disabled={isPending} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-60">Unpublish item</button> : null}
                    <button type="button" onClick={() => handleAddPhoto(editingRow.id)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">{editingRow.photoCount > 0 ? "Replace photo" : "Add photo"}</button>
                    {editingRow.photoCount > 0 ? <button type="button" onClick={() => handleRemovePhoto(editingRow.id)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Remove photo</button> : null}
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">Select a material row to edit it here.</div>
              )}
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}
