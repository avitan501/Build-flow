"use client";

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  archiveOwnerMaterialsRows,
  publishOwnerMaterialsRows,
  saveOwnerMaterialsReview,
  type OwnerMaterialsActionBatch,
  type OwnerMaterialsActionResult,
} from "@/app/owner/materials/actions";
import {
  buildOwnerReviewDuplicateKey,
  imageMetadataForOwnerMaterial,
  inferOwnerMaterialCategory,
  seededOwnerReviewBatches,
  type OwnerMaterialsReviewBatch,
  type OwnerMaterialsReviewRow,
} from "@/lib/owner-materials-quote";
import { MATERIAL_REAL_PHOTO_OPTIONS, type ShopProductImage } from "@/lib/shop-catalog";
import { SHOP_CATEGORY_NAMES, type ShopSupplierEstimateRecord } from "@/lib/shop";

type Props = {
  savedEstimates: ShopSupplierEstimateRecord[];
  publishedKeys: string[];
};

type ParseStatus = {
  tone: "neutral" | "success" | "error";
  message: string;
};

const initialBatches = seededOwnerReviewBatches();
const STORAGE_KEY = "buildflow-owner-material-review-batches-v3";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function numeric(value: number) {
  return Number.isFinite(value) ? String(Number(value.toFixed(2))) : "0";
}

function csvSplit(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells.map((cell) => cell.replace(/^"|"$/g, "").trim());
}

function parseMoney(value: string) {
  const next = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(next) ? next : 0;
}

function parseQuantity(value: string | undefined) {
  const next = Number((value ?? "").replace(/,/g, ""));
  return Number.isFinite(next) && next > 0 ? next : 1;
}

function headerIndex(headers: string[], patterns: RegExp[]) {
  return headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));
}

function parseDelimitedRows(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const delimiter = lines[0].includes(",") ? "csv" : "whitespace";
  const table = lines.map((line) => (delimiter === "csv" ? csvSplit(line) : line.split(/\t|\s{2,}/).map((cell) => cell.trim())));
  const headers = table[0].map((cell) => cell.toLowerCase().replace(/[^a-z0-9]+/g, " "));
  const itemIndex = headerIndex(headers, [/item/, /sku/, /part/]);
  const descriptionIndex = headerIndex(headers, [/description/, /desc/, /name/, /material/]);
  const qtyIndex = headerIndex(headers, [/qty/, /quantity/]);
  const unitIndex = headerIndex(headers, [/unit/, /uom/]);
  const priceIndex = headerIndex(headers, [/unit price/, /price/, /cost/, /rate/]);

  if (descriptionIndex < 0 || priceIndex < 0) {
    return [];
  }

  return table.slice(1).flatMap((cells, index) => {
    const description = cells[descriptionIndex]?.trim() ?? "";

    if (!description) {
      return [];
    }

    const qty = qtyIndex >= 0 ? Number(cells[qtyIndex]?.replace(/,/g, "") || 1) : 1;
    const unit = unitIndex >= 0 ? cells[unitIndex] || "EA" : "EA";
    const supplierUnitPrice = parseMoney(cells[priceIndex] || "0");

    return [
      {
        id: `parsed-${Date.now()}-${index}`,
        qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
        itemNo: itemIndex >= 0 ? cells[itemIndex] || "" : "",
        description,
        unit,
        supplierUnitPrice,
        markupPercent: 0,
        markupDollar: 0,
        finalUnitPrice: supplierUnitPrice,
        category: inferOwnerMaterialCategory(description),
        ...imageMetadataForOwnerMaterial({ supplierName: "Uploaded Supplier" }, { description, category: inferOwnerMaterialCategory(description) }),
        photoGallery: [imageMetadataForOwnerMaterial({ supplierName: "Uploaded Supplier" }, { description, category: inferOwnerMaterialCategory(description) })],
        publish: false,
      } satisfies OwnerMaterialsReviewRow,
    ];
  });
}

function parseLooseSupplierRows(text: string, sourceId: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .flatMap((line, index) => {
      const match = line.match(/^(.+?)\s+(\d+(?:,\d{3})*(?:\.\d+)?)\s+([A-Za-z]{1,8})?\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)T?$/);
      if (!match) return [];

      const description = match[1].trim();
      const qty = parseQuantity(match[2]);
      const unit = match[3]?.trim() || "EA";
      const supplierUnitPrice = parseMoney(match[4]);

      if (!description || supplierUnitPrice <= 0) return [];

      return [
        {
          id: `loose-${Date.now()}-${index}`,
          qty,
          itemNo: `${sourceId.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-L${String(index + 1).padStart(3, "0")}`,
          description,
          unit,
          supplierUnitPrice,
          markupPercent: 0,
          markupDollar: 0,
          finalUnitPrice: supplierUnitPrice,
          category: inferOwnerMaterialCategory(description),
          ...imageMetadataForOwnerMaterial({ supplierName: "Uploaded Supplier" }, { description, category: inferOwnerMaterialCategory(description) }),
          photoGallery: [imageMetadataForOwnerMaterial({ supplierName: "Uploaded Supplier" }, { description, category: inferOwnerMaterialCategory(description) })],
          publish: false,
        } satisfies OwnerMaterialsReviewRow,
      ];
    });
}

function extractBasicPdfText(buffer: ArrayBuffer) {
  const raw = new TextDecoder("latin1").decode(buffer);
  const literalStrings = Array.from(raw.matchAll(/\(([^()]*(?:\\.[^()]*)*)\)\s*Tj/g), (match) => match[1]);
  const arrayStrings = Array.from(raw.matchAll(/\[((?:\s*\([^()]*(?:\\.[^()]*)*\)\s*)+)\]\s*TJ/g), (match) => match[1]);
  const parts = [
    ...literalStrings,
    ...arrayStrings.flatMap((chunk) => Array.from(chunk.matchAll(/\(([^()]*(?:\\.[^()]*)*)\)/g), (match) => match[1])),
  ];

  return parts
    .map((part) =>
      part
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\n")
        .replace(/\\t/g, " ")
        .replace(/\\([()\\])/g, "$1")
        .replace(/\\\d{3}/g, " "),
    )
    .join("\n");
}

function fileKind(fileName: string): OwnerMaterialsReviewBatch["sourceFileKind"] {
  const value = fileName.toLowerCase();

  if (value.endsWith(".csv")) return "csv";
  if (value.endsWith(".txt")) return "txt";
  if (value.endsWith(".pdf")) return "pdf";
  if (value.endsWith(".xls") || value.endsWith(".xlsx")) return "spreadsheet";

  return "manual";
}

function makeActionBatch(batch: OwnerMaterialsReviewBatch): OwnerMaterialsActionBatch {
  return {
    supplierName: batch.supplierName,
    quoteNumber: batch.quoteNumber,
    quoteDate: batch.quoteDate,
    sourceFileName: batch.sourceFileName,
    rows: batch.rows,
  };
}

type OwnerMaterialsReviewRowInput = Omit<OwnerMaterialsReviewRow, "imageUrl" | "imageAlt" | "imageSource" | "imageLicense" | "imageCredit" | "imageCategory" | "photoGallery"> &
  Partial<Pick<OwnerMaterialsReviewRow, "imageUrl" | "imageAlt" | "imageSource" | "imageLicense" | "imageCredit" | "imageCategory" | "photoGallery">>;

function dedupeGallery(images: ShopProductImage[]) {
  return images.filter((image, index, all) => all.findIndex((candidate) => candidate.imageUrl === image.imageUrl) === index);
}

function withImageMetadata(batch: Pick<OwnerMaterialsReviewBatch, "supplierName">, row: OwnerMaterialsReviewRowInput): OwnerMaterialsReviewRow {
  const image = imageMetadataForOwnerMaterial(batch, row);
  const primaryImage: ShopProductImage = {
    imageUrl: row.imageUrl || image.imageUrl,
    imageAlt: row.imageAlt || image.imageAlt,
    imageSource: row.imageSource || image.imageSource,
    imageLicense: row.imageLicense || image.imageLicense,
    imageCredit: row.imageCredit || image.imageCredit,
    imageCategory: row.imageCategory || image.imageCategory,
  };
  const existingGallery = row.photoGallery ?? [];
  const usesOnlyAutoImage = existingGallery.length <= 1 && (!existingGallery[0] || existingGallery[0].imageUrl === row.imageUrl || existingGallery[0].imageUrl === image.imageUrl);
  const photoGallery = usesOnlyAutoImage ? [primaryImage] : dedupeGallery([primaryImage, ...existingGallery]);

  return {
    ...row,
    imageUrl: primaryImage.imageUrl,
    imageAlt: primaryImage.imageAlt,
    imageSource: primaryImage.imageSource,
    imageLicense: primaryImage.imageLicense,
    imageCredit: primaryImage.imageCredit,
    imageCategory: primaryImage.imageCategory,
    photoGallery,
  };
}

function reviewKey(batch: Pick<OwnerMaterialsReviewBatch, "supplierName" | "quoteDate">, row: Pick<OwnerMaterialsReviewRow, "itemNo" | "description" | "unit">) {
  return buildOwnerReviewDuplicateKey(batch, row);
}

function mergeStoredBatches(current: OwnerMaterialsReviewBatch[], stored: OwnerMaterialsReviewBatch[]) {
  const merged = [...current];

  for (const batch of stored) {
    const normalizedBatch = {
      ...batch,
      rows: batch.rows.map((row) => withImageMetadata(batch, row)),
    };
    const index = merged.findIndex((item) => item.quoteId === normalizedBatch.quoteId);
    if (index >= 0) {
      merged[index] = { ...merged[index], ...normalizedBatch };
    } else {
      merged.unshift(normalizedBatch);
    }
  }

  return merged;
}

function loadInitialBatches() {
  if (typeof window === "undefined") return initialBatches;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialBatches;
    const parsed = JSON.parse(stored) as OwnerMaterialsReviewBatch[];
    if (!Array.isArray(parsed) || parsed.length === 0) return initialBatches;
    return mergeStoredBatches(initialBatches, parsed);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return initialBatches;
  }
}

function cloneManualRow(): OwnerMaterialsReviewRow {
  return withImageMetadata({ supplierName: "Manual Supplier" }, {
    id: `manual-${Date.now()}`,
    qty: 1,
    itemNo: "",
    description: "",
    unit: "EA",
    supplierUnitPrice: 0,
    markupPercent: 0,
    markupDollar: 0,
    finalUnitPrice: 0,
    category: "Materials",
    publish: false,
  });
}

export function OwnerMaterialsQuoteEditor({ savedEstimates, publishedKeys }: Props) {
  const [batches, setBatches] = useState<OwnerMaterialsReviewBatch[]>(loadInitialBatches);
  const [activeQuoteId, setActiveQuoteId] = useState(() => loadInitialBatches()[0]?.quoteId ?? "");
  const [supplierName, setSupplierName] = useState("Builders FirstSource");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [parseStatus, setParseStatus] = useState<ParseStatus>({
    tone: "neutral",
    message: "CSV/TXT files can be parsed now. PDF and spreadsheet files can be staged for manual review.",
  });
  const [actionResult, setActionResult] = useState<OwnerMaterialsActionResult | null>(null);
  const [localPublishedKeys, setLocalPublishedKeys] = useState(new Set(publishedKeys));
  const [photoUrlDrafts, setPhotoUrlDrafts] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeBatch = batches.find((batch) => batch.quoteId === activeQuoteId) ?? batches[0] ?? null;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  }, [batches]);

  const summaries = useMemo(
    () =>
      batches.map((batch) => {
        const selected = batch.rows.filter((row) => row.publish).length;
        const total = batch.rows.reduce((sum, row) => sum + row.qty * row.finalUnitPrice, 0);

        return { ...batch, selected, total };
      }),
    [batches],
  );

  const savedEstimateLabel = savedEstimates.length === 0 ? "No saved estimate metadata yet" : `${savedEstimates.length} saved estimate${savedEstimates.length === 1 ? "" : "s"}`;

  function setActiveBatchPatch(patch: Partial<OwnerMaterialsReviewBatch>) {
    if (!activeBatch) return;
    setBatches((current) => current.map((batch) => (batch.quoteId === activeBatch.quoteId ? { ...batch, ...patch } : batch)));
  }

  function addOrUpdateBatch(nextBatch: OwnerMaterialsReviewBatch) {
    setBatches((current) => {
      const next = [...current];
      const existingIndex = next.findIndex(
        (batch) =>
          batch.supplierName.trim().toLowerCase() === nextBatch.supplierName.trim().toLowerCase() &&
          batch.quoteDate === nextBatch.quoteDate &&
          (batch.quoteNumber || batch.sourceFileName || batch.quoteId) === (nextBatch.quoteNumber || nextBatch.sourceFileName || nextBatch.quoteId),
      );

      if (existingIndex < 0) {
        return [{ ...nextBatch, rows: nextBatch.rows.map((row) => withImageMetadata(nextBatch, row)) }, ...next];
      }

      const existing = next[existingIndex];
      const rowMap = new Map(existing.rows.map((row) => [reviewKey(existing, row), withImageMetadata(existing, row)]));

      for (const row of nextBatch.rows) {
        rowMap.set(reviewKey(nextBatch, row), withImageMetadata(nextBatch, row));
      }

      next[existingIndex] = {
        ...existing,
        ...nextBatch,
        rows: Array.from(rowMap.values()),
      };
      return next;
    });
    setActiveQuoteId(nextBatch.quoteId);
  }

  function updateRow(rowId: string, patch: Partial<OwnerMaterialsReviewRow>, recalc: "markup" | "final" | "none" = "none") {
    if (!activeBatch) return;

    setBatches((current) =>
      current.map((batch) => {
        if (batch.quoteId !== activeBatch.quoteId) return batch;

        return {
          ...batch,
          rows: batch.rows.map((row) => {
            if (row.id !== rowId) return row;
            const next = { ...row, ...patch };

            if (recalc === "markup") {
              next.finalUnitPrice = next.supplierUnitPrice * (1 + next.markupPercent / 100) + next.markupDollar;
            }

            if (recalc === "final") {
              next.markupDollar = next.finalUnitPrice - next.supplierUnitPrice * (1 + next.markupPercent / 100);
            }

            if (patch.description !== undefined || patch.category !== undefined) {
              return withImageMetadata(batch, next);
            }

            return next;
          }),
        };
      }),
    );
  }

  function setPrimaryPhoto(rowId: string, photo: ShopProductImage) {
    if (!activeBatch) return;

    setBatches((current) =>
      current.map((batch) => {
        if (batch.quoteId !== activeBatch.quoteId) return batch;

        return {
          ...batch,
          rows: batch.rows.map((row) => {
            if (row.id !== rowId) return row;
            const nextGallery = dedupeGallery([photo, ...(row.photoGallery ?? []).filter((entry) => entry.imageUrl !== photo.imageUrl)]);
            return withImageMetadata(batch, {
              ...row,
              imageUrl: photo.imageUrl,
              imageAlt: photo.imageAlt,
              imageSource: photo.imageSource,
              imageLicense: photo.imageLicense,
              imageCredit: photo.imageCredit,
              imageCategory: photo.imageCategory,
              photoGallery: nextGallery,
            });
          }),
        };
      }),
    );
  }

  function addPhotoToRow(rowId: string, photo: ShopProductImage) {
    if (!activeBatch) return;

    setBatches((current) =>
      current.map((batch) => {
        if (batch.quoteId !== activeBatch.quoteId) return batch;

        return {
          ...batch,
          rows: batch.rows.map((row) => {
            if (row.id !== rowId) return row;
            const nextGallery = dedupeGallery([...(row.photoGallery ?? []), photo]);
            const primary = nextGallery[0] ?? photo;
            return withImageMetadata(batch, {
              ...row,
              imageUrl: primary.imageUrl,
              imageAlt: primary.imageAlt,
              imageSource: primary.imageSource,
              imageLicense: primary.imageLicense,
              imageCredit: primary.imageCredit,
              imageCategory: primary.imageCategory,
              photoGallery: nextGallery,
            });
          }),
        };
      }),
    );
  }

  function removePhotoFromRow(rowId: string, imageUrl: string) {
    if (!activeBatch) return;

    setBatches((current) =>
      current.map((batch) => {
        if (batch.quoteId !== activeBatch.quoteId) return batch;

        return {
          ...batch,
          rows: batch.rows.map((row) => {
            if (row.id !== rowId) return row;
            const fallback = imageMetadataForOwnerMaterial(batch, row);
            const nextGallery = (row.photoGallery ?? []).filter((photo) => photo.imageUrl !== imageUrl);
            const primary = nextGallery[0] ?? fallback;
            return withImageMetadata(batch, {
              ...row,
              imageUrl: primary.imageUrl,
              imageAlt: primary.imageAlt,
              imageSource: primary.imageSource,
              imageLicense: primary.imageLicense,
              imageCredit: primary.imageCredit,
              imageCategory: primary.imageCategory,
              photoGallery: nextGallery.length > 0 ? nextGallery : [fallback],
            });
          }),
        };
      }),
    );
  }

  async function handlePhotoUpload(rowId: string, files: FileList | null) {
    if (!files || files.length === 0) return;

    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    const uploads = await Promise.all(
      Array.from(files)
        .filter((file) => allowed.has(file.type))
        .map(
          (file) =>
            new Promise<ShopProductImage>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  imageUrl: String(reader.result || ""),
                  imageAlt: `${file.name.replace(/\.[^.]+$/, "")} material photo`,
                  imageSource: `Owner upload (staged in browser) – ${file.name}`,
                  imageLicense: "Owner-provided upload",
                  imageCredit: "Owner upload",
                  imageCategory: "Materials",
                });
              reader.onerror = () => reject(new Error(`Failed to read ${file.name}.`));
              reader.readAsDataURL(file);
            }),
        ),
    );

    uploads.forEach((photo) => addPhotoToRow(rowId, photo));
    setActionResult({ ok: true, message: `${uploads.length} photo${uploads.length === 1 ? "" : "s"} staged for this material.`, publishedKeys: [] });
  }

  function addPhotoUrl(rowId: string) {
    const nextUrl = (photoUrlDrafts[rowId] ?? "").trim();
    if (!nextUrl) return;

    addPhotoToRow(rowId, {
      imageUrl: nextUrl,
      imageAlt: "Material photo",
      imageSource: `Manual URL – ${nextUrl}`,
      imageLicense: "Manual URL (verify rights before publish)",
      imageCredit: "Manual URL",
      imageCategory: "Materials",
    });
    setPhotoUrlDrafts((current) => ({ ...current, [rowId]: "" }));
  }

  function applyCatalogPhoto(rowId: string, imageUrl: string) {
    const photo = MATERIAL_REAL_PHOTO_OPTIONS.find((entry) => entry.imageUrl === imageUrl);
    if (!photo) return;
    addPhotoToRow(rowId, photo);
  }

  function removeRow(rowId: string) {
    if (!activeBatch) return;
    setBatches((current) =>
      current.map((batch) => (batch.quoteId === activeBatch.quoteId ? { ...batch, rows: batch.rows.filter((row) => row.id !== rowId) } : batch)),
    );
  }

  function addManualRow() {
    if (!activeBatch) return;
    setBatches((current) =>
      current.map((batch) => (batch.quoteId === activeBatch.quoteId ? { ...batch, rows: [cloneManualRow(), ...batch.rows] } : batch)),
    );
  }

  async function prepareReview() {
    const file = fileInputRef.current?.files?.[0] ?? null;

    if (!file) {
      const manualBatch: OwnerMaterialsReviewBatch = {
        quoteId: `manual-${Date.now()}`,
        supplierName: supplierName.trim() || "Manual Supplier",
        quoteNumber: quoteNumber.trim(),
        quoteDate,
        sourceFileKind: "manual",
        extractionStatus: "manual_review",
        rows: [cloneManualRow()],
      };
      addOrUpdateBatch(manualBatch);
      setParseStatus({ tone: "success", message: "Manual review batch created. Add line items below." });
      return;
    }

    const kind = fileKind(file.name);

    if (kind === "spreadsheet") {
      const placeholderBatch: OwnerMaterialsReviewBatch = {
        quoteId: `upload-${Date.now()}`,
        supplierName: supplierName.trim() || "Uploaded Supplier",
        quoteNumber: quoteNumber.trim(),
        quoteDate,
        sourceFileName: file.name,
        sourceFileKind: kind,
        extractionStatus: "manual_review",
        rows: [{ ...cloneManualRow(), itemNo: `${file.name.replace(/[^a-z0-9]+/gi, "-").toUpperCase()}-L001`, publish: false }],
      };
      addOrUpdateBatch(placeholderBatch);
      setParseStatus({
        tone: "neutral",
        message: `${file.name} is accepted and staged for manual review. XLS/XLSX parsing needs a spreadsheet parser dependency before automatic row extraction.`,
      });
      return;
    }

    const text = kind === "pdf" ? extractBasicPdfText(await file.arrayBuffer()) : await file.text();
    const parsedRows = [...parseDelimitedRows(text), ...parseLooseSupplierRows(text, file.name)];

    if (parsedRows.length === 0) {
      if (kind === "pdf") {
        const pdfBatch: OwnerMaterialsReviewBatch = {
          quoteId: `pdf-${Date.now()}`,
          supplierName: supplierName.trim() || "Uploaded Supplier",
          quoteNumber: quoteNumber.trim(),
          quoteDate,
          sourceFileName: file.name,
          sourceFileKind: "pdf",
          extractionStatus: "manual_review",
          rows: [{ ...cloneManualRow(), itemNo: `${file.name.replace(/[^a-z0-9]+/gi, "-").toUpperCase()}-L001`, publish: false }],
        };
        addOrUpdateBatch(pdfBatch);
        setParseStatus({
          tone: "neutral",
          message: `${file.name} is staged. This PDF did not expose embedded text in-browser, so add or paste rows for manual review.`,
        });
        return;
      }

      setParseStatus({ tone: "error", message: "No usable rows found. CSV/TXT needs columns resembling item no, description/name, qty, unit, and unit price." });
      return;
    }

    const parsedBatch: OwnerMaterialsReviewBatch = {
      quoteId: `parsed-${Date.now()}`,
      supplierName: supplierName.trim() || "Uploaded Supplier",
      quoteNumber: quoteNumber.trim(),
      quoteDate,
      sourceFileName: file.name,
      sourceFileKind: kind,
      extractionStatus: "parsed",
      rows: parsedRows,
    };
    addOrUpdateBatch(parsedBatch);
    setParseStatus({ tone: "success", message: `${parsedRows.length} row${parsedRows.length === 1 ? "" : "s"} parsed from ${file.name}.` });
  }

  function runAction(action: "save" | "publish" | "archive") {
    if (!activeBatch) return;
    setActionResult(null);

    startTransition(async () => {
      const payload = makeActionBatch(activeBatch);
      const result =
        action === "save"
          ? await saveOwnerMaterialsReview(payload)
          : action === "publish"
            ? await publishOwnerMaterialsRows(payload)
            : await archiveOwnerMaterialsRows(payload);

      setActionResult(result);

      if (result.ok && action === "publish" && result.publishedKeys) {
        const nextPublishedKeys = result.publishedKeys;
        setLocalPublishedKeys((current) => new Set([...Array.from(current), ...nextPublishedKeys]));
      }

      if (result.ok && action === "archive") {
        const archivedKeys = activeBatch.rows
          .filter((row) => row.publish)
          .map((row) => buildOwnerReviewDuplicateKey(activeBatch, row));
        setLocalPublishedKeys((current) => new Set(Array.from(current).filter((key) => !archivedKeys.includes(key))));
      }
    });
  }

  if (!activeBatch) {
    return null;
  }

  const selectedCount = activeBatch.rows.filter((row) => row.publish).length;
  const activePublishedCount = activeBatch.rows.filter((row) => localPublishedKeys.has(buildOwnerReviewDuplicateKey(activeBatch, row))).length;
  const activeReviewCount = activeBatch.rows.length - activePublishedCount;
  const totalRows = batches.reduce((sum, batch) => sum + batch.rows.length, 0);
  const clientTotal = activeBatch.rows.reduce((sum, row) => sum + row.qty * row.finalUnitPrice, 0);
  const documentSummary = `${activeBatch.supplierName || "No supplier"} / ${activeBatch.quoteNumber || activeBatch.sourceFileName || "No document"} / ${activeBatch.quoteDate || "No date"}`;

  return (
    <div className="space-y-3">
      <section className="sticky top-20 z-20 rounded-lg border border-slate-200 bg-white p-3 shadow-sm xl:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-slate-950">Material Admin</h1>
              <p className="mt-0.5 truncate text-xs text-slate-500">{documentSummary}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5 xl:min-w-[520px]">
              <div className="rounded-md border border-slate-200 px-3 py-2">
                <div className="text-[11px] text-slate-500">Draft</div>
                <div className="font-semibold">{activeReviewCount}</div>
              </div>
              <div className="rounded-md border border-slate-200 px-3 py-2">
                <div className="text-[11px] text-slate-500">Published</div>
                <div className="font-semibold">{activePublishedCount}</div>
              </div>
              <div className="rounded-md border border-slate-200 px-3 py-2">
                <div className="text-[11px] text-slate-500">Selected</div>
                <div className="font-semibold">{selectedCount}</div>
              </div>
              <div className="rounded-md border border-slate-200 px-3 py-2">
                <div className="text-[11px] text-slate-500">Rows</div>
                <div className="font-semibold">{totalRows}</div>
              </div>
              <div className="rounded-md border border-slate-200 px-3 py-2">
                <div className="text-[11px] text-slate-500">Client total</div>
                <div className="font-semibold">{money(clientTotal)}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_auto] xl:items-end">
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-slate-600">Supplier</span>
                <input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-slate-600">Quote #</span>
                <input value={quoteNumber} onChange={(event) => setQuoteNumber(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-slate-600">Quote date</span>
                <input type="date" value={quoteDate} onChange={(event) => setQuoteDate(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2" />
              </label>
            </div>

            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input ref={fileInputRef} type="file" accept=".csv,.txt,.pdf,.xls,.xlsx" className="block w-full text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white" />
                <button type="button" onClick={prepareReview} className="rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white">
                  Import file
                </button>
              </div>
              <p className={`mt-2 text-xs ${parseStatus.tone === "error" ? "text-red-700" : parseStatus.tone === "success" ? "text-emerald-700" : "text-slate-600"}`}>
                {parseStatus.message}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <button type="button" onClick={addManualRow} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
                Add item
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!activeBatch) return;
                  const allSelected = activeBatch.rows.every((row) => row.publish);
                  setBatches((current) =>
                    current.map((batch) =>
                      batch.quoteId === activeBatch.quoteId ? { ...batch, rows: batch.rows.map((row) => ({ ...row, publish: !allSelected })) } : batch,
                    ),
                  );
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
              >
                {activeBatch.rows.every((row) => row.publish) ? "Clear" : "Select all"}
              </button>
              <button type="button" onClick={() => runAction("save")} disabled={isPending} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60">
                Save
              </button>
              <button type="button" onClick={() => runAction("publish")} disabled={isPending || selectedCount === 0} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                Publish selected
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Quote batches</h2>
            <span className="text-[11px] font-medium text-slate-500">{savedEstimateLabel}</span>
          </div>
          <div className="mt-3 grid max-h-[60vh] gap-2 overflow-y-auto">
            {summaries.map((batch) => (
              <button
                key={batch.quoteId}
                type="button"
                onClick={() => setActiveQuoteId(batch.quoteId)}
                className={`rounded-md border px-3 py-2 text-left text-sm ${batch.quoteId === activeBatch.quoteId ? "border-slate-900 bg-slate-100" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-950">{batch.supplierName}</div>
                    <div className="mt-0.5 truncate text-xs text-slate-600">Quote {batch.quoteNumber || "—"} · {batch.quoteDate || "No date"}</div>
                  </div>
                  <div className="text-right text-xs text-slate-600">
                    <div>{batch.rows.length} rows</div>
                    <div>{money(batch.total)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm xl:p-4">
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Supplier name</span>
              <input value={activeBatch.supplierName} onChange={(event) => setActiveBatchPatch({ supplierName: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Quote number</span>
              <input value={activeBatch.quoteNumber} onChange={(event) => setActiveBatchPatch({ quoteNumber: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Quote/estimate date</span>
              <input type="date" value={activeBatch.quoteDate} onChange={(event) => setActiveBatchPatch({ quoteDate: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2" />
            </label>
          </div>

        {actionResult ? (
          <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${actionResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
            {actionResult.message}
          </div>
        ) : null}

        <div className="overflow-x-auto xl:overflow-x-auto">
          <table className="min-w-[1240px] w-full border-collapse text-left text-sm xl:min-w-[1360px]">
            <thead className="bg-slate-100 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
              <tr>
                <th className="border border-slate-200 px-2 py-2">Select</th>
                <th className="border border-slate-200 px-2 py-2">Item no</th>
                <th className="border border-slate-200 px-2 py-2">Description/name</th>
                <th className="border border-slate-200 px-2 py-2">Category</th>
                <th className="border border-slate-200 px-2 py-2">Qty</th>
                <th className="border border-slate-200 px-2 py-2">Unit</th>
                <th className="border border-slate-200 px-2 py-2">Supplier unit price</th>
                <th className="border border-slate-200 px-2 py-2">Markup %</th>
                <th className="border border-slate-200 px-2 py-2">Final client unit price</th>
                <th className="border border-slate-200 px-2 py-2">Status</th>
                <th className="border border-slate-200 px-2 py-2">Extended</th>
                <th className="border border-slate-200 px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeBatch.rows.map((row) => {
                const key = buildOwnerReviewDuplicateKey(activeBatch, row);
                const isPublished = localPublishedKeys.has(key);

                return (
                  <Fragment key={row.id}>
                    <tr className="align-top">
                      <td className="border border-slate-200 px-2 py-1.5 text-center">
                        <input type="checkbox" checked={row.publish} onChange={(event) => updateRow(row.id, { publish: event.target.checked })} />
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5">
                        <input value={row.itemNo} onChange={(event) => updateRow(row.id, { itemNo: event.target.value })} className="w-24 rounded border border-slate-300 px-2 py-1" />
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5">
                        <textarea value={row.description} onChange={(event) => updateRow(row.id, { description: event.target.value, category: inferOwnerMaterialCategory(event.target.value) })} className="min-h-8 w-64 rounded border border-slate-300 px-2 py-1 leading-5" />
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5">
                        <select value={row.category} onChange={(event) => updateRow(row.id, { category: event.target.value })} className="w-32 rounded border border-slate-300 px-2 py-1">
                          {SHOP_CATEGORY_NAMES.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5">
                        <input type="number" step="0.001" value={numeric(row.qty)} onChange={(event) => updateRow(row.id, { qty: Number(event.target.value || 0) })} className="w-16 rounded border border-slate-300 px-2 py-1" />
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5">
                        <input value={row.unit} onChange={(event) => updateRow(row.id, { unit: event.target.value })} className="w-16 rounded border border-slate-300 px-2 py-1" />
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5">
                        <input type="number" step="0.01" value={numeric(row.supplierUnitPrice)} onChange={(event) => updateRow(row.id, { supplierUnitPrice: Number(event.target.value || 0) }, "markup")} className="w-24 rounded border border-slate-300 px-2 py-1" />
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5">
                        <input type="number" step="0.01" value={numeric(row.markupPercent)} onChange={(event) => updateRow(row.id, { markupPercent: Number(event.target.value || 0) }, "markup")} className="w-20 rounded border border-slate-300 px-2 py-1" />
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5">
                        <input type="number" step="0.01" value={numeric(row.finalUnitPrice)} onChange={(event) => updateRow(row.id, { finalUnitPrice: Number(event.target.value || 0) }, "final")} className="w-24 rounded border border-slate-300 px-2 py-1" />
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${isPublished ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                          {isPublished ? "Published" : "Review"}
                        </span>
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5 font-medium text-slate-900">{money(row.qty * row.finalUnitPrice)}</td>
                      <td className="border border-slate-200 px-2 py-1.5">
                        <div className="flex flex-wrap gap-1.5">
                          <details className="group">
                            <summary className="cursor-pointer list-none rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">Edit</summary>
                            <div className="mt-2 w-[520px] max-w-[70vw] rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-lg">
                              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                                <div>
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold text-slate-900">Photos</div>
                                    <div className="text-xs text-slate-500">{row.photoGallery.length} photo{row.photoGallery.length === 1 ? "" : "s"}</div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {row.photoGallery.map((photo, index) => (
                                      <div key={`${row.id}-${photo.imageUrl}-${index}`} className="w-[72px] rounded-md border border-slate-200 bg-white p-1.5">
                                        <img src={photo.imageUrl} alt={photo.imageAlt} className="h-14 w-full rounded object-cover" />
                                        <div className="mt-1 flex flex-col gap-1">
                                          <button type="button" onClick={() => setPrimaryPhoto(row.id, photo)} className="rounded border border-slate-300 px-1 py-0.5 text-[10px] font-semibold text-slate-700">
                                            {index === 0 ? "Primary" : "Primary"}
                                          </button>
                                          <button type="button" onClick={() => removePhotoFromRow(row.id, photo.imageUrl)} className="rounded border border-red-200 px-1 py-0.5 text-[10px] font-semibold text-red-700">
                                            Remove
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-2 rounded-md border border-slate-200 bg-white p-2.5">
                                  <label className="grid gap-1 text-xs">
                                    <span className="font-medium text-slate-700">Upload</span>
                                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void handlePhotoUpload(row.id, event.target.files)} className="block w-full text-[11px] text-slate-700 file:mr-2 file:rounded-md file:border-0 file:bg-slate-900 file:px-2 file:py-1.5 file:text-[11px] file:font-semibold file:text-white" />
                                  </label>
                                  <label className="grid gap-1 text-xs">
                                    <span className="font-medium text-slate-700">Image URL</span>
                                    <div className="flex gap-2">
                                      <input value={photoUrlDrafts[row.id] ?? ""} onChange={(event) => setPhotoUrlDrafts((current) => ({ ...current, [row.id]: event.target.value }))} placeholder="https://..." className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5" />
                                      <button type="button" onClick={() => addPhotoUrl(row.id)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800">Add</button>
                                    </div>
                                  </label>
                                  <label className="grid gap-1 text-xs">
                                    <span className="font-medium text-slate-700">Local photo</span>
                                    <select defaultValue="" onChange={(event) => {
                                      if (!event.target.value) return;
                                      applyCatalogPhoto(row.id, event.target.value);
                                      event.target.value = "";
                                    }} className="rounded-md border border-slate-300 px-2 py-1.5">
                                      <option value="">Choose…</option>
                                      {MATERIAL_REAL_PHOTO_OPTIONS.map((photo) => (
                                        <option key={`${row.id}-${photo.imageUrl}`} value={photo.imageUrl}>{photo.category} · {photo.imageCredit}</option>
                                      ))}
                                    </select>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </details>
                          <button type="button" onClick={() => removeRow(row.id)} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        </section>
      </section>
    </div>
  );
}
