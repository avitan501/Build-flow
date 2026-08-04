"use client";

import { useMemo, useState, useTransition, type ChangeEvent, type FormEvent } from "react";

import { publishOwnerMaterialsSelection, saveOwnerMaterialsAdmin, unpublishOwnerMaterialsSelection } from "@/app/owner/materials/actions";
import type { OwnerMaterialBatchState, OwnerMaterialRowState, OwnerMaterialsAdminState } from "@/lib/owner-materials-admin-data";
import { realPhotoForMaterialCategory } from "@/lib/material-photo-catalog";
import { SHOP_CATEGORY_NAMES, mapExistingCategoryToShopCategory, suggestShopCategory, type ShopCategoryName } from "@/lib/shop";

type FlowMode = "manual" | "pdf";
type QueueFilter = "all" | "draft" | "ready" | "needs-work" | "published";

type ManualDraft = {
  supplier: string;
  itemNo: string;
  name: string;
  category: ShopCategoryName;
  quantity: string;
  unit: string;
  supplierCost: string;
  markupPercent: string;
  markupDollar: string;
  sellPrice: string;
  imageUrl: string;
  description: string;
};

type ExtractResult = {
  rows: OwnerMaterialRowState[];
  fileName: string;
  supplier: string;
  note: string;
};

const fallbackSupplier = "Owner manual";
const fallbackUnit = "EA";

const initialManualDraft: ManualDraft = {
  supplier: fallbackSupplier,
  itemNo: "",
  name: "",
  category: "Framing",
  quantity: "1",
  unit: fallbackUnit,
  supplierCost: "0.00",
  markupPercent: "20",
  markupDollar: "0.00",
  sellPrice: "0.00",
  imageUrl: "",
  description: "",
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function numberInput(value: number) {
  return Number.isFinite(value) ? String(Number(value.toFixed(2))) : "0";
}

function roundCurrency(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function parseCurrency(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanItemNo(value: string) {
  return value.replace(/[^a-zA-Z0-9./#-]/g, "").slice(0, 40);
}

function duplicateKeyFor(params: { supplier: string; itemNo: string; name: string; unit: string }) {
  const supplier = normalizeText(params.supplier || fallbackSupplier);
  if (params.itemNo.trim()) return `${supplier}|${params.itemNo.trim().toUpperCase()}`;
  return `${supplier}|${slugify(params.name)}|${params.unit.trim().toUpperCase() || fallbackUnit}`;
}

function photoCategoryForShopCategory(category: string) {
  switch (category) {
    case "Framing":
      return "Lumber";
    case "Sheet rock":
      return "Drywall";
    case "Kitchen":
      return "Cabinets";
    case "Carpentry":
      return "Trim";
    case "Exterior":
    case "Eitan":
      return "Windows";
    case "Tile work":
      return "Tile";
    case "Services":
      return "Tools";
    default:
      return "Materials";
  }
}

function fallbackPhoto(category: string) {
  return realPhotoForMaterialCategory(photoCategoryForShopCategory(category));
}

function makeMaterialRow(input: {
  idPrefix: string;
  supplier: string;
  itemNo?: string;
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  supplierCost?: number;
  markupPercent?: number;
  markupDollar?: number;
  sellPrice?: number;
  imageUrl?: string;
  notes?: string;
  source?: "manual" | "pdf";
}): OwnerMaterialRowState {
  const supplier = normalizeText(input.supplier || fallbackSupplier);
  const itemNo = cleanItemNo(input.itemNo || "");
  const name = normalizeText(input.name || "New material");
  const category = mapExistingCategoryToShopCategory(input.category, { name, description: name, itemNo });
  const quantity = Math.max(0, Number(input.quantity || 1));
  const supplierCost = roundCurrency(Number(input.supplierCost || 0));
  const markupPercent = Number(input.markupPercent || 0);
  const markupDollar = roundCurrency(Number(input.markupDollar || 0));
  const sellPrice =
    input.sellPrice && input.sellPrice > 0
      ? roundCurrency(input.sellPrice)
      : roundCurrency(supplierCost * (1 + markupPercent / 100) + markupDollar);
  const imageUrl = normalizeText(input.imageUrl || "");
  const duplicateKey = duplicateKeyFor({ supplier, itemNo, name, unit: input.unit || fallbackUnit });
  const idSeed = `${input.idPrefix}-${itemNo || slugify(name)}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  return {
    id: idSeed,
    qty: quantity,
    itemNo,
    sku: `${slugify(supplier).slice(0, 3).toUpperCase()}-${itemNo || slugify(name).slice(0, 10).toUpperCase()}`,
    description: name,
    category,
    unit: normalizeText(input.unit || fallbackUnit).toUpperCase(),
    supplier,
    supplierUnitPrice: supplierCost,
    markupPercent,
    markupDollar,
    finalUnitPrice: sellPrice,
    duplicateKey,
    publishStatus: "Draft",
    reviewStatus: imageUrl && sellPrice > 0 ? "Ready" : sellPrice > 0 ? "Missing image" : "Needs review",
    photoCount: imageUrl ? 1 : 0,
    imageUrl,
    imageAlt: `${name} photo`,
    imageSource: imageUrl ? "Owner provided" : "Not added",
    imageLicense: imageUrl ? "Owner provided" : "Pending",
    imageCredit: imageUrl ? "Owner upload" : "Pending",
    imageCategory: category,
    galleryCount: imageUrl ? 1 : 0,
    notes: input.notes || (input.source === "pdf" ? "Extracted from supplier PDF. Review before publishing." : ""),
  };
}

function recalcRow(row: OwnerMaterialRowState, patch: Partial<OwnerMaterialRowState>) {
  const category = mapExistingCategoryToShopCategory(patch.category ?? row.category, {
    name: patch.description ?? row.description,
    description: patch.description ?? row.description,
    itemNo: patch.itemNo ?? row.itemNo,
  });
  const patched = { ...row, ...patch, category, imageCategory: category };
  const supplierUnitPrice = Number(patched.supplierUnitPrice || 0);
  const markupPercent = Number(patched.markupPercent || 0);
  let markupDollar = Number(patched.markupDollar || 0);
  let finalUnitPrice = Number(patched.finalUnitPrice || 0);

  if (("supplierUnitPrice" in patch || "markupPercent" in patch || "markupDollar" in patch) && !("finalUnitPrice" in patch)) {
    finalUnitPrice = roundCurrency(supplierUnitPrice * (1 + markupPercent / 100) + markupDollar);
  }

  if ("finalUnitPrice" in patch && !("markupDollar" in patch)) {
    markupDollar = roundCurrency(finalUnitPrice - supplierUnitPrice * (1 + markupPercent / 100));
  }

  const photoCount = patched.imageUrl?.trim() ? 1 : Number(patched.photoCount || 0);

  return {
    ...patched,
    qty: Number(patched.qty || 0),
    supplierUnitPrice,
    markupPercent,
    markupDollar,
    finalUnitPrice: roundCurrency(finalUnitPrice),
    photoCount,
    galleryCount: photoCount,
    reviewStatus: photoCount > 0 && finalUnitPrice > 0 ? "Ready" : finalUnitPrice > 0 ? "Missing image" : "Needs review",
    duplicateKey: duplicateKeyFor({
      supplier: patched.supplier,
      itemNo: patched.itemNo,
      name: patched.description,
      unit: patched.unit,
    }),
    error: undefined,
  } satisfies OwnerMaterialRowState;
}

function isPublishReady(row: OwnerMaterialRowState) {
  return Boolean(row.description.trim() && row.category.trim() && row.unit.trim() && row.qty > 0 && row.finalUnitPrice > 0 && row.imageUrl.trim());
}

function readinessIssues(row: OwnerMaterialRowState) {
  return [
    !row.description.trim() ? "name" : null,
    !row.category.trim() ? "category" : null,
    !row.unit.trim() ? "unit" : null,
    row.qty <= 0 ? "quantity" : null,
    row.finalUnitPrice <= 0 ? "sell price" : null,
    !row.imageUrl.trim() ? "photo" : null,
  ].filter((issue): issue is string => Boolean(issue));
}

async function extractPdfTextInBrowser(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const content = await page.getTextContent();
    const grouped = new Map<number, string[]>();

    content.items.forEach((item) => {
      const text = "str" in item && typeof item.str === "string" ? item.str.trim() : "";
      const transform = "transform" in item && Array.isArray(item.transform) ? item.transform : [];
      if (!text) return;
      const y = Math.round(Number(transform[5] || 0));
      grouped.set(y, [...(grouped.get(y) || []), text]);
    });

    const lines = Array.from(grouped.entries())
      .sort((left, right) => right[0] - left[0])
      .map(([, parts]) => normalizeText(parts.join(" ")))
      .filter(Boolean);

    pages.push(`Page ${pageNumber}\n${lines.join("\n")}`);
  }

  return pages.join("\n\n").trim();
}

function parsePdfMaterialRows(text: string, fileName: string, supplier: string): OwnerMaterialRowState[] {
  const sourceLines = text
    .split(/\n+/)
    .map(normalizeText)
    .filter((line) => line.length > 8 && /\d/.test(line));

  const rows: OwnerMaterialRowState[] = [];
  const seen = new Set<string>();
  const unitPattern = "(EA|LF|SF|SQFT|BOX|BAG|ROLL|SET|PAIR|PC|PCS|EACH|BDL|SHT|SHEET|GAL)";
  const rowPattern = new RegExp(
    `^(\\d+(?:\\.\\d+)?)\\s+([A-Za-z0-9.#/-]{2,})\\s+(.+?)\\s+${unitPattern}\\s+\\$?([\\d,]+(?:\\.\\d{1,2})?)\\s+(?:\\$?[\\d,]+(?:\\.\\d{1,2})?)?$`,
    "i",
  );
  const altPattern = new RegExp(
    `^([A-Za-z0-9.#/-]{2,})\\s+(.+?)\\s+${unitPattern}\\s+(\\d+(?:\\.\\d+)?)\\s+\\$?([\\d,]+(?:\\.\\d{1,2})?)`,
    "i",
  );

  for (const line of sourceLines) {
    let qty = 1;
    let itemNo = "";
    let name = "";
    let unit = fallbackUnit;
    let price = 0;
    const match = line.match(rowPattern);
    const altMatch = line.match(altPattern);

    if (match) {
      qty = Number(match[1]);
      itemNo = match[2];
      name = match[3];
      unit = match[4];
      price = parseCurrency(match[5]);
    } else if (altMatch) {
      itemNo = altMatch[1];
      name = altMatch[2];
      unit = altMatch[3];
      qty = Number(altMatch[4]);
      price = parseCurrency(altMatch[5]);
    } else {
      continue;
    }

    if (!name || !Number.isFinite(qty) || qty <= 0 || price <= 0) continue;
    const normalizedName = normalizeText(name).replace(/\s+\d+$/, "");
    const key = duplicateKeyFor({ supplier, itemNo, name: normalizedName, unit });
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push(
      makeMaterialRow({
        idPrefix: `pdf-${slugify(fileName)}`,
        supplier,
        itemNo,
        name: normalizedName,
        category: suggestShopCategory({ name: normalizedName, description: normalizedName, itemNo }),
        quantity: qty,
        unit,
        supplierCost: price,
        markupPercent: 20,
        source: "pdf",
      }),
    );

    if (rows.length >= 200) break;
  }

  return rows;
}

function inferSupplierFromFile(fileName: string) {
  const cleaned = fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b(quote|estimate|invoice|materials?|supply|pdf)\b/gi, "")
    .trim();
  return cleaned ? normalizeText(cleaned) : "PDF supplier";
}

function addRowsToBatch(state: OwnerMaterialsAdminState, batch: OwnerMaterialBatchState, rows: OwnerMaterialRowState[]) {
  const existing = state.batches.find((entry) => entry.id === batch.id);
  if (existing) {
    return {
      selectedBatchId: batch.id,
      batches: state.batches.map((entry) =>
        entry.id === batch.id
          ? {
              ...entry,
              documents: Array.from(new Set([...entry.documents, ...batch.documents])),
              rows: [...rows, ...entry.rows],
            }
          : entry,
      ),
    };
  }

  return {
    selectedBatchId: batch.id,
    batches: [{ ...batch, rows }, ...state.batches],
  };
}

function StatusPill({ row }: { row: OwnerMaterialRowState }) {
  const ready = isPublishReady(row);
  const label = row.publishStatus === "Published" ? "Published" : ready ? "Ready" : row.reviewStatus;
  const tone =
    row.publishStatus === "Published"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : ready
        ? "border-sky-200 bg-sky-50 text-sky-800"
        : "border-amber-200 bg-amber-50 text-amber-800";

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

function ProductPreviewCard({ row }: { row: OwnerMaterialRowState | null }) {
  const fallback = fallbackPhoto(row?.category || "Materials");
  const imageUrl = row?.imageUrl?.trim() || fallback.imageUrl;

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
      <div
        className="min-h-[190px] bg-slate-100"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.03), rgba(15,23,42,0.18)), url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{row?.category || "Category"}</p>
            <h3 className="mt-2 text-xl font-semibold leading-tight text-slate-950">{row?.description || "Select a material to preview"}</h3>
          </div>
          <div className="rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white">{row ? money(row.finalUnitPrice) : "$0.00"}</div>
        </div>
        <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">
          {row?.notes?.trim() || row?.description || "This is the customer-facing shop card preview before the item goes live."}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-600">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="font-semibold text-slate-950">{row?.unit || "-"}</div>
            <div>Unit</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="font-semibold text-slate-950">{row?.supplier || "-"}</div>
            <div>Supplier</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="font-semibold text-slate-950">{row?.itemNo || "-"}</div>
            <div>Item no</div>
          </div>
        </div>
        <button type="button" disabled className="mt-5 w-full rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 opacity-80">
          Add to cart preview
        </button>
      </div>
    </article>
  );
}

export function OwnerMaterialsAdminShell({ initialState }: { initialState: OwnerMaterialsAdminState }) {
  const [state, setState] = useState(initialState);
  const [mode, setMode] = useState<FlowMode>("manual");
  const [manualDraft, setManualDraft] = useState<ManualDraft>(initialManualDraft);
  const [extracted, setExtracted] = useState<ExtractResult | null>(null);
  const [selectedExtractedIds, setSelectedExtractedIds] = useState<string[]>([]);
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(initialState.batches[0]?.rows[0]?.id ?? null);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"info" | "success" | "error">("info");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const batches = state.batches;
  const activeBatch = batches.find((batch) => batch.id === state.selectedBatchId) ?? batches[0];
  const allRows = useMemo(() => batches.flatMap((batch) => batch.rows), [batches]);
  const editingRow = activeBatch?.rows.find((row) => row.id === editingRowId) ?? activeBatch?.rows[0] ?? allRows[0] ?? null;
  const duplicateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allRows.forEach((row) => counts.set(row.duplicateKey, (counts.get(row.duplicateKey) || 0) + 1));
    return counts;
  }, [allRows]);

  const queueRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (activeBatch?.rows ?? []).filter((row) => {
      const matchesSearch = !query || [row.description, row.itemNo, row.supplier, row.category].some((value) => value.toLowerCase().includes(query));
      const ready = isPublishReady(row);
      const matchesFilter =
        queueFilter === "all" ||
        (queueFilter === "draft" && row.publishStatus === "Draft") ||
        (queueFilter === "ready" && row.publishStatus !== "Published" && ready) ||
        (queueFilter === "needs-work" && row.publishStatus !== "Published" && !ready) ||
        (queueFilter === "published" && row.publishStatus === "Published");
      return matchesSearch && matchesFilter;
    });
  }, [activeBatch?.rows, queueFilter, search]);

  const counts = useMemo(() => {
    const published = allRows.filter((row) => row.publishStatus === "Published").length;
    const ready = allRows.filter((row) => row.publishStatus !== "Published" && isPublishReady(row)).length;
    const needsWork = allRows.filter((row) => row.publishStatus !== "Published" && !isPublishReady(row)).length;
    return {
      extracted: extracted?.rows.length ?? 0,
      drafts: allRows.length - published,
      ready,
      published,
      needsWork,
    };
  }, [allRows, extracted?.rows.length]);

  function updateManualDraft(patch: Partial<ManualDraft>) {
    setManualDraft((current) => {
      const next = { ...current, ...patch };
      if ("supplierCost" in patch || "markupPercent" in patch || "markupDollar" in patch) {
        next.sellPrice = numberInput(
          roundCurrency(parseCurrency(next.supplierCost) * (1 + parseCurrency(next.markupPercent) / 100) + parseCurrency(next.markupDollar)),
        );
      }
      if ("name" in patch || "itemNo" in patch) {
        next.category = suggestShopCategory({ name: next.name, description: next.description || next.name, itemNo: next.itemNo });
      }
      return next;
    });
  }

  function setActiveBatch(batchId: string) {
    setState((current) => ({ ...current, selectedBatchId: batchId }));
    setSelectedQueueIds([]);
    setEditingRowId(batches.find((batch) => batch.id === batchId)?.rows[0]?.id ?? null);
  }

  function updateRow(rowId: string, patch: Partial<OwnerMaterialRowState>) {
    setState((current) => ({
      ...current,
      batches: current.batches.map((batch) =>
        batch.id !== current.selectedBatchId
          ? batch
          : {
              ...batch,
              rows: batch.rows.map((row) => (row.id === rowId ? recalcRow(row, patch) : row)),
            },
      ),
    }));
  }

  function addManualMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = normalizeText(manualDraft.name);
    if (!name) {
      setNoticeTone("error");
      setNotice("Add a material name before saving.");
      return;
    }

    const supplier = normalizeText(manualDraft.supplier || fallbackSupplier);
    const row = makeMaterialRow({
      idPrefix: "manual",
      supplier,
      itemNo: manualDraft.itemNo,
      name,
      category: manualDraft.category,
      quantity: parseCurrency(manualDraft.quantity) || 1,
      unit: manualDraft.unit || fallbackUnit,
      supplierCost: parseCurrency(manualDraft.supplierCost),
      markupPercent: parseCurrency(manualDraft.markupPercent),
      markupDollar: parseCurrency(manualDraft.markupDollar),
      sellPrice: parseCurrency(manualDraft.sellPrice),
      imageUrl: manualDraft.imageUrl,
      notes: manualDraft.description,
      source: "manual",
    });
    const batchId = `manual-${slugify(supplier)}`;
    const batch: OwnerMaterialBatchState = {
      id: batchId,
      supplier,
      quoteNumber: "Manual",
      quoteDate: new Date().toISOString().slice(0, 10),
      documents: ["Manual entry"],
      rows: [],
    };

    setState((current) => addRowsToBatch(current, batch, [row]));
    setEditingRowId(row.id);
    setManualDraft({ ...initialManualDraft, supplier });
    setMode("manual");
    setNoticeTone("success");
    setNotice("Manual material added to the review queue.");
  }

  async function handlePdfFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsExtracting(true);
    setNoticeTone("info");
    setNotice("Reading the PDF in the browser and looking for material line items.");

    try {
      const supplier = inferSupplierFromFile(file.name);
      const text = await extractPdfTextInBrowser(file);
      const rows = parsePdfMaterialRows(text, file.name, supplier);
      setExtracted({
        rows,
        fileName: file.name,
        supplier,
        note: rows.length > 0 ? `${rows.length} possible material item(s) extracted. Review and choose what to add.` : "No clear item rows were found. Try a supplier quote PDF with item, quantity, unit, and price columns.",
      });
      setSelectedExtractedIds(rows.map((row) => row.id));
      setMode("pdf");
      setNoticeTone(rows.length > 0 ? "success" : "error");
      setNotice(rows.length > 0 ? `${rows.length} item(s) extracted from ${file.name}.` : "No usable material rows were found in that PDF.");
    } catch (error) {
      console.error("Owner PDF extraction failed", error);
      setNoticeTone("error");
      setNotice("Could not read that PDF. Try another supplier quote PDF or add the items manually.");
    } finally {
      setIsExtracting(false);
      event.target.value = "";
    }
  }

  function toggleExtracted(rowId: string) {
    setSelectedExtractedIds((current) => (current.includes(rowId) ? current.filter((id) => id !== rowId) : [...current, rowId]));
  }

  function addSelectedExtracted() {
    if (!extracted || selectedExtractedIds.length === 0) {
      setNoticeTone("error");
      setNotice("Select at least one extracted item to add.");
      return;
    }

    const selected = extracted.rows.filter((row) => selectedExtractedIds.includes(row.id));
    const batchId = `pdf-${slugify(extracted.supplier)}-${slugify(extracted.fileName)}-${Date.now()}`;
    const batch: OwnerMaterialBatchState = {
      id: batchId,
      supplier: extracted.supplier,
      quoteNumber: "PDF import",
      quoteDate: new Date().toISOString().slice(0, 10),
      documents: [extracted.fileName],
      rows: [],
    };

    setState((current) => addRowsToBatch(current, batch, selected));
    setEditingRowId(selected[0]?.id ?? null);
    setSelectedExtractedIds([]);
    setNoticeTone("success");
    setNotice(`${selected.length} extracted item(s) added to the review queue.`);
  }

  function toggleQueueRow(rowId: string) {
    setSelectedQueueIds((current) => (current.includes(rowId) ? current.filter((id) => id !== rowId) : [...current, rowId]));
    setEditingRowId(rowId);
  }

  function removeSelectedQueueRows() {
    if (selectedQueueIds.length === 0) {
      setNoticeTone("error");
      setNotice("Select at least one queue item to skip.");
      return;
    }
    const ids = new Set(selectedQueueIds);
    setState((current) => ({
      ...current,
      batches: current.batches.map((batch) => (batch.id === current.selectedBatchId ? { ...batch, rows: batch.rows.filter((row) => !ids.has(row.id)) } : batch)),
    }));
    setSelectedQueueIds([]);
    setEditingRowId(null);
    setNoticeTone("success");
    setNotice("Selected item(s) skipped from this review queue.");
  }

  function saveWorkspace() {
    startTransition(async () => {
      const result = await saveOwnerMaterialsAdmin(state);
      setState(result.state);
      setNoticeTone(result.ok ? "success" : "error");
      setNotice(result.message);
    });
  }

  function publishSelected() {
    if (!activeBatch || selectedQueueIds.length === 0) {
      setNoticeTone("error");
      setNotice("Select at least one queue item to publish.");
      return;
    }
    const selected = activeBatch.rows.filter((row) => selectedQueueIds.includes(row.id));
    const notReady = selected.filter((row) => !isPublishReady(row));
    if (notReady.length > 0) {
      setNoticeTone("error");
      setNotice(`${notReady.length} selected item(s) still need a name, unit, quantity, sell price, and photo.`);
      return;
    }

    startTransition(async () => {
      const result = await publishOwnerMaterialsSelection(state, activeBatch.id, selectedQueueIds);
      setState(result.state);
      setNoticeTone(result.ok ? "success" : "error");
      setNotice(result.message);
      if (result.ok) setSelectedQueueIds([]);
    });
  }

  function unpublishSelected() {
    if (!activeBatch || selectedQueueIds.length === 0) {
      setNoticeTone("error");
      setNotice("Select at least one published item to unpublish.");
      return;
    }
    startTransition(async () => {
      const result = await unpublishOwnerMaterialsSelection(state, activeBatch.id, selectedQueueIds);
      setState(result.state);
      setSelectedQueueIds([]);
      setNoticeTone(result.ok ? "success" : "error");
      setNotice(result.message);
    });
  }

  const previewRows = allRows.filter((row) => row.publishStatus === "Published" || isPublishReady(row)).slice(0, 6);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef4f8] px-3 py-4 text-slate-950 sm:px-6 sm:py-8">
      <section className="mx-auto grid w-full max-w-[1680px] gap-4">
        <header className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.1)]">
          <div className="grid gap-5 p-5 lg:grid-cols-[1.1fr_0.9fr] lg:p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Materials Command Center</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">Bring items in, review them, preview the shop, publish.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Add materials manually or import a supplier PDF. Every item lands in a review queue first, so you can fix pricing, category, photo, and description before it appears in the shop.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => setMode("manual")} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${mode === "manual" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
                  Add manually
                </button>
                <button type="button" onClick={() => setMode("pdf")} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${mode === "pdf" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
                  Import PDF
                </button>
                <button type="button" onClick={saveWorkspace} disabled={isPending} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-60">
                  Save workspace
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {[
                ["Extracted", counts.extracted, "PDF rows waiting"],
                ["Drafts", counts.drafts, "Not live yet"],
                ["Ready", counts.ready, "Can publish"],
                ["Published", counts.published, "In shop source"],
              ].map(([label, value, detail]) => (
                <div key={label} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
                  <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
                  <div className="mt-1 text-xs text-slate-500">{detail}</div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {notice ? (
          <div className={`rounded-[24px] border px-4 py-3 text-sm font-medium ${noticeTone === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : noticeTone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-sky-200 bg-sky-50 text-sky-900"}`}>
            {notice}
          </div>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(310px,0.85fr)_minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <aside className="grid gap-4 self-start">
            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Intake</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">{mode === "manual" ? "Add one item" : "Extract from PDF"}</h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">Step 1</span>
              </div>

              {mode === "manual" ? (
                <form onSubmit={addManualMaterial} className="mt-5 grid gap-3">
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Item name
                    <input value={manualDraft.name} onChange={(event) => updateManualDraft({ name: event.target.value })} placeholder="2x4 premium stud" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Supplier
                      <input value={manualDraft.supplier} onChange={(event) => updateManualDraft({ supplier: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Item no
                      <input value={manualDraft.itemNo} onChange={(event) => updateManualDraft({ itemNo: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Category
                      <select value={manualDraft.category} onChange={(event) => updateManualDraft({ category: event.target.value as ShopCategoryName })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none">
                        {SHOP_CATEGORY_NAMES.map((category) => <option key={category}>{category}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Unit
                      <input value={manualDraft.unit} onChange={(event) => updateManualDraft({ unit: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Quantity
                      <input type="number" min="0" step="0.01" value={manualDraft.quantity} onChange={(event) => updateManualDraft({ quantity: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Supplier cost
                      <input type="number" min="0" step="0.01" value={manualDraft.supplierCost} onChange={(event) => updateManualDraft({ supplierCost: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Markup %
                      <input type="number" step="0.01" value={manualDraft.markupPercent} onChange={(event) => updateManualDraft({ markupPercent: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Markup $
                      <input type="number" step="0.01" value={manualDraft.markupDollar} onChange={(event) => updateManualDraft({ markupDollar: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Sell price
                      <input type="number" min="0" step="0.01" value={manualDraft.sellPrice} onChange={(event) => updateManualDraft({ sellPrice: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                    </label>
                  </div>
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Photo URL
                    <input value={manualDraft.imageUrl} onChange={(event) => updateManualDraft({ imageUrl: event.target.value })} placeholder="https://..." className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Shop description
                    <textarea value={manualDraft.description} onChange={(event) => updateManualDraft({ description: event.target.value })} rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                  </label>
                  <button type="submit" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Add to review queue</button>
                </form>
              ) : (
                <div className="mt-5 grid gap-4">
                  <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[26px] border border-dashed border-sky-300 bg-sky-50 px-4 py-6 text-center">
                    <span className="text-sm font-semibold text-slate-950">{isExtracting ? "Reading PDF..." : "Choose supplier PDF"}</span>
                    <span className="mt-2 max-w-sm text-xs leading-5 text-slate-600">The file is read in the browser. Extracted rows stay in review until you choose what to add.</span>
                    <input type="file" accept="application/pdf" onChange={handlePdfFile} disabled={isExtracting} className="sr-only" />
                  </label>
                  {extracted ? (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-950">{extracted.fileName}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{extracted.note}</p>
                      <button type="button" onClick={addSelectedExtracted} className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                        Add selected to review
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            {extracted && mode === "pdf" ? (
              <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-950">Extracted items</h2>
                  <button type="button" onClick={() => setSelectedExtractedIds(extracted.rows.map((row) => row.id))} className="text-sm font-semibold text-sky-700">Select all</button>
                </div>
                <div className="mt-4 grid max-h-[520px] gap-3 overflow-auto pr-1">
                  {extracted.rows.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No rows extracted yet.</div>
                  ) : (
                    extracted.rows.map((row) => {
                      const alreadyExists = duplicateCounts.has(row.duplicateKey);
                      return (
                        <label key={row.id} className="flex cursor-pointer gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-3">
                          <input type="checkbox" checked={selectedExtractedIds.includes(row.id)} onChange={() => toggleExtracted(row.id)} className="mt-1" />
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-sm font-semibold text-slate-950">{row.description}</span>
                            <span className="mt-1 block text-xs text-slate-500">{row.qty} {row.unit} · {money(row.finalUnitPrice)} · {row.category}</span>
                            {alreadyExists ? <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">Possible duplicate</span> : null}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </section>
            ) : null}
          </aside>

          <section className="min-w-0 rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Review queue</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Clean up before publishing</h2>
                <p className="mt-1 text-sm text-slate-500">Choose a batch, edit the selected item, then publish only ready materials.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <select value={state.selectedBatchId} onChange={(event) => setActiveBatch(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none">
                  {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.supplier} · {batch.quoteNumber}</option>)}
                </select>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search queue" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none" />
                <select value={queueFilter} onChange={(event) => setQueueFilter(event.target.value as QueueFilter)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none">
                  <option value="all">All queue</option>
                  <option value="draft">Draft</option>
                  <option value="ready">Ready</option>
                  <option value="needs-work">Needs work</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={publishSelected} disabled={isPending || selectedQueueIds.length === 0} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Publish selected ready</button>
              <button type="button" onClick={unpublishSelected} disabled={isPending || selectedQueueIds.length === 0} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">Unpublish selected</button>
              <button type="button" onClick={removeSelectedQueueRows} disabled={selectedQueueIds.length === 0} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 disabled:opacity-50">Skip selected</button>
              <span className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{selectedQueueIds.length} selected</span>
            </div>

            <div className="mt-5 grid gap-3">
              {queueRows.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">No materials match this queue filter.</div>
              ) : (
                queueRows.map((row) => {
                  const issues = readinessIssues(row);
                  const isEditing = editingRowId === row.id;
                  const duplicate = duplicateCounts.get(row.duplicateKey) && duplicateCounts.get(row.duplicateKey)! > 1;
                  return (
                    <article key={row.id} className={`rounded-[24px] border p-4 transition ${isEditing ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-950"}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <label className="flex min-w-0 cursor-pointer gap-3">
                          <input type="checkbox" checked={selectedQueueIds.includes(row.id)} onChange={() => toggleQueueRow(row.id)} className="mt-1" />
                          <span className="min-w-0">
                            <span className="block break-words text-sm font-semibold">{row.description}</span>
                            <span className={`mt-1 block text-xs ${isEditing ? "text-slate-300" : "text-slate-500"}`}>{row.itemNo || "No item no"} · {row.supplier} · {row.qty} {row.unit}</span>
                          </span>
                        </label>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <StatusPill row={row} />
                          {duplicate ? <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Duplicate</span> : null}
                        </div>
                      </div>
                      <div className={`mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 ${isEditing ? "text-slate-200" : "text-slate-600"}`}>
                        <div><strong className={isEditing ? "text-white" : "text-slate-950"}>{money(row.supplierUnitPrice)}</strong><br />Cost</div>
                        <div><strong className={isEditing ? "text-white" : "text-slate-950"}>{money(row.finalUnitPrice)}</strong><br />Sell</div>
                        <div><strong className={isEditing ? "text-white" : "text-slate-950"}>{row.category}</strong><br />Category</div>
                        <div><strong className={isEditing ? "text-white" : "text-slate-950"}>{issues.length ? issues.join(", ") : "Ready"}</strong><br />Missing</div>
                      </div>
                      <button type="button" onClick={() => setEditingRowId(row.id)} className={`mt-4 rounded-2xl px-4 py-2 text-sm font-semibold ${isEditing ? "bg-white text-slate-950" : "bg-white text-slate-700"}`}>
                        Edit and preview
                      </button>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <aside className="grid gap-4 self-start">
            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Shop preview</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">What customers see</h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">Step 3</span>
              </div>
              <div className="mt-5">
                <ProductPreviewCard row={editingRow} />
              </div>
            </section>

            {editingRow ? (
              <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
                <h2 className="text-lg font-semibold text-slate-950">Edit selected item</h2>
                <div className="mt-4 grid gap-3">
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Name
                    <input value={editingRow.description} onChange={(event) => updateRow(editingRow.id, { description: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Item no
                      <input value={editingRow.itemNo} onChange={(event) => updateRow(editingRow.id, { itemNo: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Unit
                      <input value={editingRow.unit} onChange={(event) => updateRow(editingRow.id, { unit: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Qty
                      <input type="number" min="0" step="0.01" value={numberInput(editingRow.qty)} onChange={(event) => updateRow(editingRow.id, { qty: parseCurrency(event.target.value) })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Category
                      <select value={editingRow.category} onChange={(event) => updateRow(editingRow.id, { category: event.target.value as ShopCategoryName })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none">
                        {SHOP_CATEGORY_NAMES.map((category) => <option key={category}>{category}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Cost
                      <input type="number" min="0" step="0.01" value={numberInput(editingRow.supplierUnitPrice)} onChange={(event) => updateRow(editingRow.id, { supplierUnitPrice: parseCurrency(event.target.value) })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Markup %
                      <input type="number" step="0.01" value={numberInput(editingRow.markupPercent)} onChange={(event) => updateRow(editingRow.id, { markupPercent: parseCurrency(event.target.value) })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Sell
                      <input type="number" min="0" step="0.01" value={numberInput(editingRow.finalUnitPrice)} onChange={(event) => updateRow(editingRow.id, { finalUnitPrice: parseCurrency(event.target.value) })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                    </label>
                  </div>
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Photo URL
                    <input value={editingRow.imageUrl} onChange={(event) => updateRow(editingRow.id, { imageUrl: event.target.value })} placeholder="Paste image URL" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Description
                    <textarea value={editingRow.notes ?? ""} onChange={(event) => updateRow(editingRow.id, { notes: event.target.value })} rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none" />
                  </label>
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <div className="flex justify-between gap-3"><span>Extended cost</span><strong className="text-slate-950">{money(editingRow.qty * editingRow.supplierUnitPrice)}</strong></div>
                    <div className="mt-2 flex justify-between gap-3"><span>Extended sell</span><strong className="text-slate-950">{money(editingRow.qty * editingRow.finalUnitPrice)}</strong></div>
                    <div className="mt-2 flex justify-between gap-3"><span>Margin</span><strong className="text-slate-950">{money(editingRow.qty * (editingRow.finalUnitPrice - editingRow.supplierUnitPrice))}</strong></div>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
              <h2 className="text-lg font-semibold text-slate-950">Ready and live preview</h2>
              <div className="mt-4 grid gap-3">
                {previewRows.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">Ready items will appear here.</div>
                ) : (
                  previewRows.map((row) => (
                    <button key={row.id} type="button" onClick={() => setEditingRowId(row.id)} className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-3 text-left">
                      <span
                        className="h-14 w-14 shrink-0 rounded-2xl bg-slate-200"
                        style={{
                          backgroundImage: `url(${row.imageUrl || fallbackPhoto(row.category).imageUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-950">{row.description}</span>
                        <span className="mt-1 block text-xs text-slate-500">{money(row.finalUnitPrice)} · {row.publishStatus}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}
