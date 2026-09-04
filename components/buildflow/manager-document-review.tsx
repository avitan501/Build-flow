"use client";

import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Columns3,
  ExternalLink,
  FileSearch,
  LoaderCircle,
  RotateCw,
  Save,
  Send,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";

import {
  addManagerDocumentItemsToCatalogAction,
  approveManagerDocumentAction,
  retryManagerDocumentExtractionAction,
  routeManagerDocumentToSupplierPricingAction,
  saveManagerDocumentReviewAction,
} from "@/app/admin/documents/actions";
import {
  createClientQuoteFromSupplierQuoteAction,
  sendSupplierQuoteToComparisonAction,
} from "@/app/admin/supplier-quotes/actions";
import { normalizeMaterialCatalogDepartment } from "@/lib/material-catalog";
import {
  confidenceLabel,
  managerDocumentTypeLabel,
  managerDocumentTypes,
  type ManagerDocumentItemRecord,
  type ManagerDocumentRecord,
} from "@/lib/manager-documents";
import {
  documentLineValidationStatus,
  isObsoleteSelectionSubtotalWarning,
  managerDocumentReviewLineIncomplete,
  normalizeDocumentPricingBasis,
} from "@/lib/manager-document-validation";

function inputMoney(value: number | null) {
  return value === null ? "" : String(value);
}
function numberOrNull(value: string) {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeReviewLine(line: ManagerDocumentItemRecord) {
  const normalized = normalizeDocumentPricingBasis({
    quantity: line.quantity,
    unit: line.unit,
    unitPrice: line.unit_price,
    lineTotal: line.line_total,
    sourceText: line.source_text,
  });
  return {
    ...line,
    quantity: normalized.quantity,
    unit: normalized.unit ?? line.unit,
    unit_price: normalized.unitPrice,
  };
}

export function ManagerDocumentReview({
  document,
  items,
  documentUrl,
  departments,
  requests,
  canApprove,
}: {
  document: ManagerDocumentRecord;
  items: ManagerDocumentItemRecord[];
  documentUrl: string;
  departments: string[];
  requests: Array<{ id: string; label: string }>;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(document);
  const [lines, setLines] = useState(() =>
    items.map(normalizeReviewLine),
  );
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [selectionChanged, setSelectionChanged] = useState(false);
  const [rowImportNotice, setRowImportNotice] = useState<{
    lineId: string;
    message: string;
  } | null>(null);
  const [importingLineId, setImportingLineId] = useState<string | null>(null);
  const suggestedDepartment = draft.suggested_department
    ? normalizeMaterialCatalogDepartment(draft.suggested_department)
    : "";
  const initialRowDepartment =
    suggestedDepartment ||
    (draft.department !== "Test" ? draft.department : "");
  const [rowDepartments, setRowDepartments] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(items.map((line) => [line.id, initialRowDepartment])),
  );
  const [catalogVendor, setCatalogVendor] = useState(draft.party_name);
  const [catalogContact, setCatalogContact] = useState("");
  const [comparisonRequestId, setComparisonRequestId] = useState(
    document.request_id || "",
  );
  const [deliveryPromptTarget, setDeliveryPromptTarget] = useState<
    string | "selected" | null
  >(null);
  const [deliveryChoice, setDeliveryChoice] = useState<"" | "free" | "amount">(
    "",
  );
  const [deliveryAmount, setDeliveryAmount] = useState("");
  const [pending, startTransition] = useTransition();
  const supplierDocument = [
    "supplier_quote",
    "supplier_invoice",
    "receipt",
    "catalog_price_list",
    "purchase_order",
  ].includes(draft.document_type);
  const selectedLines = lines.filter((line) => line.selected);
  const selectedImportLines = selectedLines.filter(
    (line) => line.catalog_import_status !== "imported",
  );
  const actionableWarnings = document.warnings.filter(
    (warning) => !isObsoleteSelectionSubtotalWarning(warning),
  );
  const selectedProductCount = new Set(
    selectedLines
      .map((line) => line.description.trim().toLowerCase())
      .filter(Boolean),
  ).size;
  const allSelectedValid =
    (!supplierDocument || selectedLines.length > 0) &&
    selectedLines.every((line) => line.validation_status === "valid");
  const departmentChosen = draft.department !== "Test";
  const approved = document.status === "ready" || document.status === "routed";
  const catalogPricingSaved =
    document.status === "routed" && Boolean(document.supplier_id);
  const directImportBlocker = !selectedImportLines.length
    ? "Select at least one product."
    : selectedImportLines.some(
          (line) =>
            !rowDepartments[line.id] || rowDepartments[line.id] === "Test",
        )
      ? "Choose a category beside each selected product."
      : "";

  function run(work: () => Promise<void>) {
    setError("");
    setFeedback("");
    startTransition(work);
  }
  function save() {
    run(async () => {
      const result = await saveManagerDocumentReviewAction({
        documentId: document.id,
        documentType: draft.document_type,
        title: draft.title,
        partyName: draft.party_name,
        documentNumber: draft.document_number,
        documentDate: draft.document_date || "",
        dueDate: draft.due_date || "",
        expiresOn: draft.expires_on || "",
        department: draft.department,
        subtotal: draft.subtotal,
        discount: draft.discount,
        deliveryCharge: draft.delivery_charge,
        taxAmount: draft.tax_amount,
        taxPercent: draft.tax_percent,
        total: draft.total,
        acknowledgeWarnings,
        evidence: draft.evidence,
        items: lines.map((line) => ({
          id: line.id,
          description: line.description,
          itemCode: line.item_code,
          specification: line.specification,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unit_price,
          lineTotal: line.line_total,
          sourceText: line.source_text,
          selected: line.selected,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelectionChanged(false);
      setFeedback(result.message);
      router.refresh();
    });
  }
  function saveAndApprove() {
    run(async () => {
      const saved = await saveManagerDocumentReviewAction({
        documentId: document.id,
        documentType: draft.document_type,
        title: draft.title,
        partyName: draft.party_name,
        documentNumber: draft.document_number,
        documentDate: draft.document_date || "",
        dueDate: draft.due_date || "",
        expiresOn: draft.expires_on || "",
        department: draft.department,
        subtotal: draft.subtotal,
        discount: draft.discount,
        deliveryCharge: draft.delivery_charge,
        taxAmount: draft.tax_amount,
        taxPercent: draft.tax_percent,
        total: draft.total,
        acknowledgeWarnings,
        evidence: draft.evidence,
        items: lines.map((line) => ({
          id: line.id,
          description: line.description,
          itemCode: line.item_code,
          specification: line.specification,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unit_price,
          lineTotal: line.line_total,
          sourceText: line.source_text,
          selected: line.selected,
        })),
      });
      if (!saved.ok) {
        setError(saved.error);
        return;
      }
      if (saved.data.warningCount > 0) {
        setError(
          "The review was saved. Fix the remaining warning before approval.",
        );
        router.refresh();
        return;
      }
      const approvedResult = await approveManagerDocumentAction(document.id);
      if (!approvedResult.ok) {
        setError(approvedResult.error);
        router.refresh();
        return;
      }
      setSelectionChanged(false);
      setFeedback(
        "Approved. Choose what you want to do with this document next.",
      );
      router.refresh();
    });
  }
  function retry() {
    const replaceExisting = lines.length > 0;
    if (
      replaceExisting &&
      !window.confirm(
        "Re-read with AI and replace the current extracted lines? The original document will stay unchanged.",
      )
    )
      return;
    run(async () => {
      const result = await retryManagerDocumentExtractionAction(
        document.id,
        replaceExisting,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFeedback(result.message);
      router.refresh();
    });
  }
  function importBlocker(lineId?: string, confirmDetails = true) {
    if (!lineId) return directImportBlocker;
    const rowDepartment = rowDepartments[lineId];
    const line = lines.find((entry) => entry.id === lineId);
    return !canApprove
      ? "Manager approval access is required."
      : confirmDetails && !catalogVendor.trim()
        ? "Confirm the vendor."
        : confirmDetails && (!rowDepartment || rowDepartment === "Test")
          ? "Choose a category."
          : !line?.description.trim()
            ? "Product name is required."
            : "";
  }
  function askDeliveryThenImport(lineId?: string) {
    const blocker = importBlocker(lineId, false);
    if (blocker) {
      setFeedback("");
      setError(blocker);
      if (lineId) setRowImportNotice({ lineId, message: blocker });
      return;
    }
    setError("");
    setRowImportNotice(null);
    setDeliveryChoice("");
    setDeliveryAmount("");
    setDeliveryPromptTarget(lineId ?? "selected");
  }
  function saveApproveAndImport(
    lineId: string | undefined,
    deliveryPrice: number,
  ) {
    const importTargets = lineId
      ? lines.filter((line) => line.id === lineId)
      : selectedImportLines;
    const linesForImport = lineId
      ? lines.map((line) =>
          line.id === lineId ? { ...line, selected: true } : line,
        )
      : lines;
    const blocker = importBlocker(lineId);
    if (blocker) {
      setFeedback("");
      setError(blocker);
      if (lineId) setRowImportNotice({ lineId, message: blocker });
      return;
    }
    setImportingLineId(lineId ?? null);
    setRowImportNotice(null);
    run(async () => {
      const saved = await saveManagerDocumentReviewAction({
        documentId: document.id,
        documentType: draft.document_type,
        title: draft.title,
        partyName: draft.party_name,
        documentNumber: draft.document_number,
        documentDate: draft.document_date || "",
        dueDate: draft.due_date || "",
        expiresOn: draft.expires_on || "",
        department: draft.department,
        subtotal: draft.subtotal,
        discount: draft.discount,
        deliveryCharge: draft.delivery_charge,
        taxAmount: draft.tax_amount,
        taxPercent: draft.tax_percent,
        total: draft.total,
        acknowledgeWarnings,
        evidence: draft.evidence,
        items: linesForImport.map((line) => ({
          id: line.id,
          description: line.description,
          itemCode: line.item_code,
          specification: line.specification,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unit_price,
          lineTotal: line.line_total,
          sourceText: line.source_text,
          selected: line.selected,
        })),
      });
      if (!saved.ok) {
        setError(saved.error);
        if (lineId) setRowImportNotice({ lineId, message: saved.error });
        setImportingLineId(null);
        return;
      }
      let itemCount = 0;
      let priceCount = 0;
      const importDepartments = [
        ...new Set(importTargets.map((target) => rowDepartments[target.id])),
      ];
      if (importDepartments.length !== 1) {
        setError(
          "For one safe import, selected products must use the same category. Import the other category separately.",
        );
        setImportingLineId(null);
        return;
      }
      const imported = await addManagerDocumentItemsToCatalogAction(
        document.id,
        importTargets.map((target) => target.id),
        {
          directRowImport: true,
          catalogDepartment: importDepartments[0],
          vendorName: catalogVendor,
          contactName: catalogContact,
          deliveryMode: deliveryPrice === 0 ? "free" : "amount",
          deliveryAmount: deliveryPrice,
        },
      );
      if (!imported.ok) {
        setError(imported.error);
        if (lineId) setRowImportNotice({ lineId, message: imported.error });
        setImportingLineId(null);
        router.refresh();
        return;
      }
      itemCount += imported.data.itemCount;
      priceCount += imported.data.priceCount;
      setSelectionChanged(false);
      setFeedback(
        `${itemCount} selected product${itemCount === 1 ? "" : "s"} added to Catalog with ${priceCount} supplier price${priceCount === 1 ? "" : "s"}.`,
      );
      setDeliveryPromptTarget(null);
      setImportingLineId(null);
      router.refresh();
    });
  }
  function routeSupplier() {
    if (selectionChanged) {
      setError("Save and approve the edited review before routing it.");
      return;
    }
    run(async () => {
      const result = await routeManagerDocumentToSupplierPricingAction(
        document.id,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/supplier-quotes/${result.data.quoteId}`);
    });
  }
  function routeQuote(destination: "comparison" | "client", lineId?: string) {
    if (selectionChanged) {
      setError("Save and approve the edited review before routing it.");
      return;
    }
    run(async () => {
      const routed = await routeManagerDocumentToSupplierPricingAction(
        document.id,
        comparisonRequestId || undefined,
        lineId ? [lineId] : undefined,
      );
      if (!routed.ok) {
        setError(routed.error);
        return;
      }
      const result =
        destination === "comparison"
          ? await sendSupplierQuoteToComparisonAction(
              routed.data.quoteId,
              routed.data.itemIds,
            )
          : await createClientQuoteFromSupplierQuoteAction(
              routed.data.quoteId,
              routed.data.itemIds,
            );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(
        `/admin/quote-comparison/${result.data.comparisonId}${destination === "client" ? "?prepare=client" : ""}`,
      );
    });
  }
  function setEveryLineSelected(selected: boolean) {
    setSelectionChanged(true);
    setLines((current) => current.map((line) => ({ ...line, selected })));
  }
  function updateLine(
    index: number,
    changes: Partial<ManagerDocumentItemRecord>,
  ) {
    if (Object.prototype.hasOwnProperty.call(changes, "selected"))
      setSelectionChanged(true);
    setLines((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const next = normalizeReviewLine({ ...line, ...changes });
        const mismatch =
          documentLineValidationStatus({
            description: next.description,
            quantity: next.quantity,
            unit: next.unit,
            unitPrice: next.unit_price,
            lineTotal: next.line_total,
            sourceText: next.source_text,
            confidence: next.confidence ?? 1,
          }) === "mismatch";
        const incomplete = managerDocumentReviewLineIncomplete({
          documentType: draft.document_type,
          selected: next.selected,
          description: next.description,
          quantity: next.quantity,
          unit: next.unit,
          unitPrice: next.unit_price,
          lineTotal: next.line_total,
        });
        return {
          ...next,
          validation_status: mismatch
            ? "mismatch"
            : incomplete
              ? "needs_review"
              : "valid",
        };
      }),
    );
  }

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div
        className="flex min-w-0 flex-col gap-3"
        onChangeCapture={(event) => {
          const target = event.target as HTMLElement;
          if (!target.closest("[data-workflow-control]"))
            setSelectionChanged(true);
        }}
      >
        {actionableWarnings.length ? (
          <section
            className="order-2 border border-amber-200 bg-amber-50 p-4"
            aria-labelledby="document-warnings-heading"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
              <h2
                id="document-warnings-heading"
                className="font-bold text-amber-950"
              >
                Check before approval
              </h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-amber-950">
              {actionableWarnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
            <label className="mt-4 flex items-start gap-2 text-sm font-semibold text-amber-950">
              <input
                type="checkbox"
                checked={acknowledgeWarnings}
                onChange={(event) =>
                  setAcknowledgeWarnings(event.target.checked)
                }
                className="mt-0.5 h-4 w-4 accent-amber-700"
              />
              I compared these warnings with the original and want to save my
              corrected values.
            </label>
          </section>
        ) : (
          <div className="order-2 flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            No calculation warning is currently open. Human approval is still
            required.
          </div>
        )}

        <details className="order-3 border border-slate-200 bg-white shadow-sm">
          <summary
            id="document-details-heading"
            className="cursor-pointer px-4 py-3 text-sm font-bold"
          >
            Document details
          </summary>
          <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-3">
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Document type
              <select
                value={draft.document_type}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    document_type: event.target
                      .value as ManagerDocumentRecord["document_type"],
                  })
                }
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950"
              >
                {managerDocumentTypes.map((type) => (
                  <option key={type} value={type}>
                    {managerDocumentTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Title
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-950"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Vendor / customer / party
              <input
                value={draft.party_name}
                onChange={(event) =>
                  setDraft({ ...draft, party_name: event.target.value })
                }
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-950"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Document number
              <input
                value={draft.document_number}
                onChange={(event) =>
                  setDraft({ ...draft, document_number: event.target.value })
                }
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-950"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Document date
              <input
                type="date"
                value={draft.document_date || ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    document_date: event.target.value || null,
                  })
                }
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Due date
              <input
                type="date"
                value={draft.due_date || ""}
                onChange={(event) =>
                  setDraft({ ...draft, due_date: event.target.value || null })
                }
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Expires on
              <input
                type="date"
                value={draft.expires_on || ""}
                onChange={(event) =>
                  setDraft({ ...draft, expires_on: event.target.value || null })
                }
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
              />
            </label>
          </div>
        </details>

        <section
          className="order-1 border border-slate-200 bg-white shadow-sm"
          aria-labelledby="document-lines-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 id="document-lines-heading" className="text-lg font-bold">
                Items
              </h2>
              <p className="text-xs text-slate-500">
                Select only products to keep.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="catalog-department">
                Catalog department
              </label>
              <select
                id="catalog-department"
                value={draft.department}
                onChange={(event) => {
                  setDraft({ ...draft, department: event.target.value });
                  setSelectionChanged(true);
                }}
                className="hidden h-9 max-w-56 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold"
              >
                {departments.map((department) => (
                  <option key={department}>{department}</option>
                ))}
              </select>
              <span className="text-xs font-bold text-slate-600">
                {selectedLines.length} selected
              </span>
              <button
                type="button"
                onClick={() => setEveryLineSelected(true)}
                className="min-h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setEveryLineSelected(false)}
                className="min-h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700"
              >
                Clear
              </button>
            </div>
          </div>
          <div
            data-workflow-control
            className="grid gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:grid-cols-[auto_minmax(14rem,1fr)] sm:items-end"
          >
            <button
              type="button"
              onClick={() => askDeliveryThenImport()}
              disabled={!canApprove || pending || !selectedImportLines.length}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <BookOpenCheck className="h-4 w-4" />
              {pending
                ? "Adding…"
                : `Add selected (${selectedImportLines.length})`}
            </button>
            {directImportBlocker ? (
              <p className="text-xs font-semibold text-amber-800">
                {directImportBlocker}
              </p>
            ) : null}
            {supplierDocument ? (
              <div className="grid gap-2 rounded-lg border border-sky-200 bg-white p-2 sm:grid-cols-[minmax(14rem,1fr)_auto] sm:items-end">
                <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Request for quote compare
                  <select
                    value={comparisonRequestId}
                    onChange={(event) =>
                      setComparisonRequestId(event.target.value)
                    }
                    className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-950"
                  >
                    <option value="">Choose a material request</option>
                    {requests.map((request) => (
                      <option key={request.id} value={request.id}>
                        {request.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => routeQuote("comparison")}
                  disabled={
                    !canApprove ||
                    pending ||
                    !approved ||
                    !selectedLines.length ||
                    !comparisonRequestId ||
                    selectionChanged
                  }
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-violet-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Columns3 className="h-4 w-4" />
                  Add to Quote Compare
                </button>
                {selectionChanged ? (
                  <p className="text-[11px] font-semibold text-amber-800 sm:col-span-2">
                    Save and approve the changed selection first.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          {lines.length ? (
            <>
              <div className="divide-y divide-slate-200 md:hidden">
                {lines.map((line, index) => (
                  <article
                    key={line.id}
                    className={`grid gap-3 p-4 ${line.selected ? "bg-sky-50/40" : "bg-slate-50"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex min-h-10 items-center gap-2 text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          aria-label={`Select ${line.description || `line ${index + 1}`} for catalog import`}
                          checked={line.selected}
                          onChange={(event) =>
                            updateLine(index, {
                              selected: event.target.checked,
                            })
                          }
                          className="h-5 w-5 accent-[#0071e3]"
                        />
                        Select
                      </label>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${line.validation_status === "valid" ? "bg-emerald-50 text-emerald-800" : line.validation_status === "mismatch" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-800"}`}
                      >
                        {line.validation_status === "valid"
                          ? "Ready"
                          : line.validation_status === "mismatch"
                            ? "Math mismatch"
                            : "Review"}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      <input
                        value={line.description}
                        aria-label={`Product name for line ${index + 1}`}
                        onChange={(event) =>
                          updateLine(index, { description: event.target.value })
                        }
                        className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-bold"
                      />
                      <input
                        value={line.specification}
                        aria-label={`Specification for ${line.description || `line ${index + 1}`}`}
                        onChange={(event) =>
                          updateLine(index, {
                            specification: event.target.value,
                          })
                        }
                        placeholder="Specification"
                        className="min-h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-600"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Quantity
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={line.quantity ?? ""}
                          aria-label={`Quantity for ${line.description || `line ${index + 1}`}`}
                          onChange={(event) =>
                            updateLine(index, {
                              quantity: numberOrNull(event.target.value),
                            })
                          }
                          className="h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
                        />
                      </label>
                      <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Unit
                        <input
                          value={line.unit}
                          aria-label={`Unit for ${line.description || `line ${index + 1}`}`}
                          onChange={(event) =>
                            updateLine(index, { unit: event.target.value })
                          }
                          className="h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
                        />
                      </label>
                      <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Unit price
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price ?? ""}
                          aria-label={`Unit price for ${line.description || `line ${index + 1}`}`}
                          onChange={(event) =>
                            updateLine(index, {
                              unit_price: numberOrNull(event.target.value),
                            })
                          }
                          className="h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
                        />
                      </label>
                      <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Line total
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.line_total ?? ""}
                          aria-label={`Line total for ${line.description || `line ${index + 1}`}`}
                          onChange={(event) =>
                            updateLine(index, {
                              line_total: numberOrNull(event.target.value),
                            })
                          }
                          className="h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
                        />
                      </label>
                    </div>
                    {line.catalog_import_status === "imported" &&
                    line.matched_catalog_item_id ? (
                      <Link
                        href="/admin/catalog"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-800"
                      >
                        <CheckCircle2 className="h-4 w-4" /> In Catalog
                      </Link>
                    ) : (
                      <div data-workflow-control className="grid gap-2">
                        <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Category
                          <select
                            value={rowDepartments[line.id] || ""}
                            onChange={(event) =>
                              setRowDepartments((current) => ({
                                ...current,
                                [line.id]: event.target.value,
                              }))
                            }
                            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-950"
                          >
                            <option value="">Choose category</option>
                            {departments
                              .filter((department) => department !== "Test")
                              .map((department) => (
                                <option key={department}>{department}</option>
                              ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => askDeliveryThenImport(line.id)}
                          disabled={!canApprove || pending}
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-3 text-sm font-bold text-white disabled:opacity-40"
                        >
                          <BookOpenCheck className="h-4 w-4" /> Add to Catalog
                        </button>
                      </div>
                    )}
                    {supplierDocument ? (
                      <button
                        type="button"
                        onClick={() => routeQuote("comparison", line.id)}
                        disabled={
                          !canApprove ||
                          pending ||
                          !approved ||
                          !comparisonRequestId ||
                          !line.selected ||
                          selectionChanged
                        }
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-violet-300 bg-white px-3 text-sm font-bold text-violet-800 disabled:opacity-40"
                      >
                        <Columns3 className="h-4 w-4" /> Add to Request Compare
                      </button>
                    ) : null}
                    {rowImportNotice?.lineId === line.id ? (
                      <p
                        role="alert"
                        className="text-xs font-semibold text-rose-700"
                      >
                        {rowImportNotice.message}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[58rem] border-collapse text-left text-xs">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      <th className="min-w-32 px-3 py-3">Catalog</th>
                      <th className="min-w-56 px-3 py-3">Item</th>
                      <th className="px-3 py-3">Supplier code</th>
                      <th className="px-3 py-3">Qty</th>
                      <th className="px-3 py-3">Unit</th>
                      <th className="px-3 py-3">Unit price</th>
                      <th className="px-3 py-3">Line total</th>
                      <th className="min-w-48 px-3 py-3">Evidence</th>
                      <th className="px-3 py-3">Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {lines.map((line, index) => (
                      <tr
                        key={line.id}
                        className={`align-top ${line.selected ? "bg-sky-50/40" : "bg-slate-50 opacity-70"}`}
                      >
                        <td className="px-3 py-3">
                          <div className="grid justify-items-start gap-2">
                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                              <input
                                type="checkbox"
                                aria-label={`Select ${line.description || `line ${index + 1}`} for catalog import`}
                                checked={line.selected}
                                onChange={(event) =>
                                  updateLine(index, {
                                    selected: event.target.checked,
                                  })
                                }
                                className="h-4 w-4 accent-[#0071e3]"
                              />
                              Select
                            </label>
                            {line.catalog_import_status === "imported" &&
                            line.matched_catalog_item_id ? (
                              <Link
                                href="/admin/catalog"
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 font-bold text-emerald-800"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                In Catalog
                              </Link>
                            ) : (
                              <div className="grid w-40 gap-1.5">
                                <label
                                  className="text-[10px] font-bold uppercase tracking-wide text-slate-500"
                                  htmlFor={`catalog-category-${line.id}`}
                                >
                                  Category
                                </label>
                                <select
                                  data-workflow-control
                                  id={`catalog-category-${line.id}`}
                                  value={rowDepartments[line.id] || ""}
                                  onChange={(event) =>
                                    setRowDepartments((current) => ({
                                      ...current,
                                      [line.id]: event.target.value,
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-900"
                                >
                                  <option value="">Choose category</option>
                                  {departments
                                    .filter(
                                      (department) => department !== "Test",
                                    )
                                    .map((department) => (
                                      <option key={department}>
                                        {department}
                                      </option>
                                    ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => askDeliveryThenImport(line.id)}
                                  disabled={!canApprove || pending}
                                  aria-label={`Add ${line.description || `line ${index + 1}`} to Catalog`}
                                  className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md bg-[#0071e3] px-2.5 font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {pending && importingLineId === line.id ? (
                                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <BookOpenCheck className="h-3.5 w-3.5" />
                                  )}
                                  {pending && importingLineId === line.id
                                    ? "Adding…"
                                    : "Add to Catalog"}
                                </button>
                              </div>
                            )}
                            {rowImportNotice?.lineId === line.id ? (
                              <span
                                role="alert"
                                className="max-w-40 text-[10px] font-semibold leading-4 text-rose-700"
                              >
                                {rowImportNotice.message}
                              </span>
                            ) : null}
                            {supplierDocument ? (
                              <button
                                type="button"
                                onClick={() =>
                                  routeQuote("comparison", line.id)
                                }
                                disabled={
                                  !canApprove ||
                                  pending ||
                                  !approved ||
                                  !comparisonRequestId ||
                                  !line.selected ||
                                  selectionChanged
                                }
                                aria-label={`Add ${line.description || `line ${index + 1}`} to Quote Compare`}
                                className="inline-flex min-h-10 w-40 items-center justify-center gap-1.5 rounded-md border border-violet-300 bg-white px-2.5 font-bold text-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Columns3 className="h-3.5 w-3.5" />
                                Add to Compare
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            value={line.description}
                            aria-label={`Product name for line ${index + 1}`}
                            onChange={(event) =>
                              updateLine(index, {
                                description: event.target.value,
                              })
                            }
                            className="min-h-10 w-full rounded border border-slate-300 px-2 font-semibold"
                          />
                          <input
                            value={line.specification}
                            onChange={(event) =>
                              updateLine(index, {
                                specification: event.target.value,
                              })
                            }
                            placeholder="Specification"
                            aria-label={`Specification for ${line.description || `line ${index + 1}`}`}
                            className="mt-1 min-h-10 w-full rounded border border-slate-200 px-2 text-slate-600"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            value={line.item_code}
                            onChange={(event) =>
                              updateLine(index, {
                                item_code: event.target.value,
                              })
                            }
                            placeholder="If shown"
                            aria-label={`Supplier code for ${line.description || `line ${index + 1}`}`}
                            className="h-10 w-28 rounded border border-slate-300 px-2 font-semibold"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={line.quantity ?? ""}
                            aria-label={`Quantity for ${line.description || `line ${index + 1}`}`}
                            onChange={(event) =>
                              updateLine(index, {
                                quantity: numberOrNull(event.target.value),
                              })
                            }
                            className="h-10 w-20 rounded border border-slate-300 px-2"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            value={line.unit}
                            aria-label={`Unit for ${line.description || `line ${index + 1}`}`}
                            onChange={(event) =>
                              updateLine(index, { unit: event.target.value })
                            }
                            className="h-10 w-20 rounded border border-slate-300 px-2"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_price ?? ""}
                            aria-label={`Unit price for ${line.description || `line ${index + 1}`}`}
                            onChange={(event) =>
                              updateLine(index, {
                                unit_price: numberOrNull(event.target.value),
                              })
                            }
                            className="h-10 w-24 rounded border border-slate-300 px-2"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.line_total ?? ""}
                            aria-label={`Line total for ${line.description || `line ${index + 1}`}`}
                            onChange={(event) =>
                              updateLine(index, {
                                line_total: numberOrNull(event.target.value),
                              })
                            }
                            className="h-10 w-24 rounded border border-slate-300 px-2"
                          />
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          <p>
                            Page {line.source_page ?? "?"} ·{" "}
                            {confidenceLabel(line.confidence)}
                          </p>
                          <p className="mt-1 line-clamp-3 leading-5">
                            {line.source_text || "No source snippet"}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${line.validation_status === "valid" ? "bg-emerald-50 text-emerald-800" : line.validation_status === "mismatch" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-800"}`}
                          >
                            {line.validation_status === "valid"
                              ? "Ready"
                              : line.validation_status === "mismatch"
                                ? "Math mismatch"
                                : "Review"}
                          </span>
                          {line.catalog_import_status === "imported" &&
                          line.matched_catalog_item_id ? (
                            <Link
                              href="/admin/catalog"
                              title={`Catalog item ${line.matched_catalog_item_id}`}
                              className="mt-1 block text-[10px] font-bold text-sky-700"
                            >
                              In catalog
                            </Link>
                          ) : line.catalog_import_status ===
                            "pending_review" ? (
                            <span className="mt-1 block text-[10px] font-bold text-amber-700">
                              Import pending
                            </span>
                          ) : line.catalog_import_status === "failed" ? (
                            <span className="mt-1 block text-[10px] font-bold text-rose-700">
                              Import failed
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="px-5 py-10 text-center">
              <FileSearch className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-bold">No dependable lines yet</p>
              <button
                type="button"
                onClick={retry}
                disabled={pending}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white"
              >
                <RotateCw className="h-4 w-4" />
                Re-read with AI
              </button>
            </div>
          )}
        </section>

        <details className="order-4 border border-slate-200 bg-white shadow-sm">
          <summary
            id="document-totals-heading"
            className="cursor-pointer px-4 py-3 text-sm font-bold"
          >
            Totals
          </summary>
          <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-3">
            {[
              ["Subtotal", "subtotal"],
              ["Discount", "discount"],
              ["Delivery / freight", "delivery_charge"],
              ["Tax amount", "tax_amount"],
              ["Tax %", "tax_percent"],
              ["Total", "total"],
            ].map(([label, key]) => (
              <label
                key={key}
                className="grid gap-1 text-xs font-bold text-slate-600"
              >
                {label}
                <input
                  type="number"
                  min="0"
                  step={key === "tax_percent" ? "0.0001" : "0.01"}
                  value={inputMoney(
                    draft[key as keyof ManagerDocumentRecord] as number | null,
                  )}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      [key]:
                        numberOrNull(event.target.value) ??
                        (key === "discount" || key === "delivery_charge"
                          ? 0
                          : null),
                    })
                  }
                  className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-950"
                />
              </label>
            ))}
          </div>
        </details>

        {draft.evidence.length ? (
          <details className="order-5 border border-slate-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-4 py-4 font-bold sm:px-5">
              Sources and field evidence ({draft.evidence.length})
            </summary>
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700 sm:px-5">
              Source: {document.source_label} · {document.file_name}
              {document.source_reference
                ? ` · ${document.source_reference}`
                : ""}
            </div>
            <div className="divide-y divide-slate-200">
              {draft.evidence.map((evidence, index) => (
                <div
                  key={`${evidence.field}-${index}`}
                  className={`grid gap-2 px-4 py-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:px-5 ${evidence.selected !== false ? "" : "bg-slate-50 opacity-60"}`}
                >
                  <span className="font-bold">{evidence.field}</span>
                  <span>
                    <span className="font-semibold">{evidence.value}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {evidence.sourceText}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span>
                      Page {evidence.page ?? "?"} ·{" "}
                      {confidenceLabel(evidence.confidence)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          evidence: draft.evidence.map(
                            (entry, evidenceIndex) =>
                              evidenceIndex === index
                                ? {
                                    ...entry,
                                    selected: entry.selected === false,
                                  }
                                : entry,
                          ),
                        })
                      }
                      className="min-h-8 rounded-md border border-slate-300 bg-white px-2 font-bold text-slate-700"
                    >
                      {evidence.selected !== false
                        ? "Ignore source"
                        : "Use source"}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>

      <aside className="space-y-4 2xl:sticky 2xl:top-4 2xl:self-start">
        {catalogPricingSaved ? (
          <div
            className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold leading-5 text-emerald-900"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Catalog pricing is saved. Vendor, date, source document, and the
              lowest reviewed price remain attached.
            </span>
          </div>
        ) : null}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-950 px-4 py-4 text-white">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-sky-300" />
              <h2 className="font-bold">Finish review</h2>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Confirm the filing department, then approve once.
            </p>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${departmentChosen ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                >
                  {departmentChosen ? "✓" : "1"}
                </span>
                <p className="text-sm font-bold">Choose department</p>
              </div>
              <select
                value={draft.department}
                onChange={(event) => {
                  setDraft({ ...draft, department: event.target.value });
                  setSelectionChanged(true);
                }}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold"
              >
                {departments.map((department) => (
                  <option key={department}>{department}</option>
                ))}
              </select>
              {draft.department === "Test" ? (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs font-semibold text-amber-900">
                  <p>Held safely in Test.</p>
                  {suggestedDepartment ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDraft({ ...draft, department: suggestedDepartment });
                        setSelectionChanged(true);
                      }}
                      className="mt-2 min-h-8 rounded-md border border-amber-300 bg-white px-2.5 font-bold"
                    >
                      Use suggested: {suggestedDepartment}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex items-start gap-2">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${allSelectedValid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
              >
                {allSelectedValid ? "✓" : "2"}
              </span>
              <div>
                <p className="text-sm font-bold">Check items and totals</p>
                <p className="mt-0.5 text-xs leading-4 text-slate-500">
                  Correct only highlighted fields. The original file stays
                  unchanged.
                </p>
              </div>
            </div>
            {!canApprove ? (
              <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs font-semibold text-sky-900">
                Approved manager access is required before routing financial
                information.
              </p>
            ) : null}
            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"
              >
                {error}
              </p>
            ) : null}
            {feedback ? (
              <p
                role="status"
                className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"
              >
                {feedback}
              </p>
            ) : null}
            <button
              type="button"
              onClick={saveAndApprove}
              disabled={
                !canApprove ||
                !departmentChosen ||
                !allSelectedValid ||
                pending ||
                (approved && !selectionChanged) ||
                (actionableWarnings.length > 0 && !acknowledgeWarnings)
              }
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCircle2 className="h-4 w-4" />
              {approved && !selectionChanged
                ? "Approved"
                : selectionChanged
                  ? "Save selection & approve"
                  : "Save & approve"}
            </button>
            {!departmentChosen ? (
              <p className="text-center text-[11px] font-semibold text-amber-700">
                Choose a real department to continue.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={save}
                disabled={
                  pending ||
                  (actionableWarnings.length > 0 && !acknowledgeWarnings)
                }
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5" />
                Save draft
              </button>
              <button
                type="button"
                onClick={retry}
                disabled={pending}
                title="Use only when the current reading is wrong"
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 text-xs font-bold"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Re-read
              </button>
            </div>
            {pending ? (
              <p className="flex items-center justify-center gap-2 text-xs font-semibold text-[#0071e3]">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Working…
              </p>
            ) : null}
          </div>
        </section>
        <section
          className={`rounded-xl border p-4 shadow-sm ${approved ? "border-sky-200 bg-white" : "border-slate-200 bg-slate-50"}`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${approved ? "bg-sky-100 text-sky-800" : "bg-slate-200 text-slate-500"}`}
            >
              3
            </span>
            <h2 className="font-bold">
              Choose destination · route selected products
            </h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {approved
              ? `${selectedLines.length} reviewed line${selectedLines.length === 1 ? " is" : "s are"} selected. The original stays in Documents.`
              : "These destinations open after approval."}
          </p>
          {approved && supplierDocument ? (
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => routeQuote("client")}
                disabled={!canApprove || pending || !selectedLines.length}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 text-left text-sm font-bold text-sky-950 disabled:opacity-40"
              >
                <Send className="h-5 w-5 shrink-0 text-[#0071e3]" />
                <span>
                  Prepare client quote
                  <span className="mt-0.5 block text-[11px] font-medium text-sky-700">
                    Open the existing client and markup workflow
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => routeQuote("comparison")}
                disabled={!canApprove || pending || !selectedLines.length}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-left text-sm font-bold disabled:opacity-40"
              >
                <Columns3 className="h-5 w-5 shrink-0 text-[#0071e3]" />
                <span>
                  Compare supplier quotes
                  <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                    Create or open the side-by-side room
                  </span>
                </span>
              </button>
              {selectedLines.length > selectedProductCount ? (
                <p className="text-center text-[11px] leading-4 text-slate-500">
                  {selectedLines.length} quote lines contain{" "}
                  {selectedProductCount} products. The lowest reviewed price is
                  kept for catalog duplicates.
                </p>
              ) : null}
              <button
                type="button"
                onClick={routeSupplier}
                disabled={!canApprove || pending}
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600"
              >
                Open supplier quote workspace
              </button>
            </div>
          ) : approved ? (
            <div className="mt-4 grid gap-2">
              <Link
                href="/owner/materials/requests"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-3 text-xs font-bold"
              >
                Link to a material request
              </Link>
              <Link
                href="/admin/ai-tools/estimate-converter"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-3 text-xs font-bold"
              >
                Use existing estimate converter
              </Link>
            </div>
          ) : null}
          <p className="mt-3 text-[11px] leading-4 text-slate-500">
            No destination runs before approval. Client quotes and comparisons
            reuse Avantia&apos;s existing supplier-pricing workflow.
          </p>
        </section>
        {documentUrl ? (
          <details className="overflow-hidden border border-slate-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-4 py-4 font-bold">
              Original document
            </summary>
            <div className="border-t border-slate-200">
              <a
                href={documentUrl}
                target="_blank"
                rel="noreferrer"
                className="m-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-bold"
              >
                Open full size <ExternalLink className="h-4 w-4" />
              </a>
              {document.mime_type.startsWith("image/") ? (
                <Image
                  src={documentUrl}
                  alt={`Original ${document.file_name}`}
                  width={1000}
                  height={1400}
                  unoptimized
                  className="max-h-[34rem] w-full object-contain p-3 pt-0"
                />
              ) : (
                <iframe
                  src={documentUrl}
                  title={`Original ${document.file_name}`}
                  className="h-[30rem] w-full border-0"
                />
              )}
            </div>
          </details>
        ) : (
          <div className="border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900">
            The original is stored, but a temporary preview link could not be
            created. Reload to try again.
          </div>
        )}
      </aside>
      {deliveryPromptTarget && typeof globalThis.document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[180] grid place-items-end overscroll-contain bg-slate-950/55 p-0 sm:place-items-center sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delivery-question-title"
              onMouseDown={(event) => {
                if (event.currentTarget === event.target && !pending)
                  setDeliveryPromptTarget(null);
              }}
            >
              <section className="max-h-[calc(100dvh-1rem)] w-full overflow-y-auto overscroll-contain rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl sm:max-w-md sm:rounded-2xl">
                <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0071e3]">
                      Delivery
                    </p>
                    <h2
                      id="delivery-question-title"
                      className="mt-1 text-xl font-bold text-slate-950"
                    >
                      How is delivery priced?
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {catalogVendor} ·{" "}
                      {deliveryPromptTarget === "selected"
                        ? selectedImportLines.length
                        : 1}{" "}
                      product
                      {deliveryPromptTarget === "selected" &&
                      selectedImportLines.length !== 1
                        ? "s"
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeliveryPromptTarget(null)}
                    disabled={pending}
                    aria-label="Close delivery question"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-600 disabled:opacity-40"
                  >
                    ×
                  </button>
                </header>
                <div className="grid gap-3 p-5">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Product
                    </p>
                    {(deliveryPromptTarget === "selected"
                      ? selectedImportLines
                      : lines.filter((line) => line.id === deliveryPromptTarget)
                    ).map((line) => (
                      <div
                        key={line.id}
                        className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-end"
                      >
                        <p className="text-sm font-bold leading-5 text-slate-950">
                          {line.description || "Selected product"}
                        </p>
                        <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Category
                          <select
                            value={rowDepartments[line.id] || ""}
                            onChange={(event) =>
                              setRowDepartments((current) => ({
                                ...current,
                                [line.id]: event.target.value,
                              }))
                            }
                            className="h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold normal-case tracking-normal text-slate-950"
                          >
                            <option value="">Choose category</option>
                            {departments
                              .filter((department) => department !== "Test")
                              .map((department) => (
                                <option key={department}>{department}</option>
                              ))}
                          </select>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-xs font-bold text-slate-700">
                      Vendor
                      <input
                        name="catalogVendor"
                        autoComplete="off"
                        value={catalogVendor}
                        onChange={(event) =>
                          setCatalogVendor(event.target.value)
                        }
                        placeholder="Confirm vendor…"
                        className="h-11 min-w-0 rounded-xl border border-slate-300 px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[#0071e3]"
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-bold text-slate-700">
                      Contact person
                      <input
                        name="catalogContact"
                        autoComplete="off"
                        value={catalogContact}
                        onChange={(event) =>
                          setCatalogContact(event.target.value)
                        }
                        placeholder="Optional…"
                        className="h-11 min-w-0 rounded-xl border border-slate-300 px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[#0071e3]"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryChoice("free");
                        setDeliveryAmount("");
                      }}
                      className={`min-h-14 rounded-xl border px-3 text-sm font-bold ${deliveryChoice === "free" ? "border-[#0071e3] bg-sky-50 text-[#005ebd] ring-1 ring-[#0071e3]" : "border-slate-300 bg-white text-slate-800"}`}
                    >
                      Free delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryChoice("amount")}
                      className={`min-h-14 rounded-xl border px-3 text-sm font-bold ${deliveryChoice === "amount" ? "border-[#0071e3] bg-sky-50 text-[#005ebd] ring-1 ring-[#0071e3]" : "border-slate-300 bg-white text-slate-800"}`}
                    >
                      Delivery fee
                    </button>
                  </div>
                  {deliveryChoice === "amount" ? (
                    <label className="grid gap-1 text-xs font-bold text-slate-700">
                      Delivery amount
                      <span className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                          $
                        </span>
                        <input
                          inputMode="decimal"
                          name="deliveryAmount"
                          autoComplete="off"
                          value={deliveryAmount}
                          onChange={(event) =>
                            setDeliveryAmount(
                              event.target.value.replace(/[^0-9.]/g, ""),
                            )
                          }
                          placeholder="0.00…"
                          aria-label="Delivery amount"
                          className="h-12 w-full rounded-xl border border-slate-300 pl-7 pr-3 text-base font-semibold tabular-nums"
                        />
                      </span>
                    </label>
                  ) : null}
                </div>
                <footer className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:rounded-b-2xl">
                  <button
                    type="button"
                    disabled={
                      pending ||
                      !catalogVendor.trim() ||
                      (deliveryPromptTarget === "selected"
                        ? selectedImportLines
                        : lines.filter(
                            (line) => line.id === deliveryPromptTarget,
                          )
                      ).some(
                        (line) =>
                          !rowDepartments[line.id] ||
                          rowDepartments[line.id] === "Test",
                      ) ||
                      !deliveryChoice ||
                      (deliveryChoice === "amount" &&
                        (!deliveryAmount.trim() ||
                          !Number.isFinite(Number(deliveryAmount)) ||
                          Number(deliveryAmount) <= 0))
                    }
                    onClick={() =>
                      saveApproveAndImport(
                        deliveryPromptTarget === "selected"
                          ? undefined
                          : deliveryPromptTarget,
                        deliveryChoice === "free" ? 0 : Number(deliveryAmount),
                      )
                    }
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0071e3] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {pending ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Truck className="h-4 w-4" />
                    )}
                    {pending ? "Adding…" : "Confirm & add to Catalog"}
                  </button>
                </footer>
              </section>
            </div>,
            globalThis.document.body,
          )
        : null}
    </div>
  );
}
