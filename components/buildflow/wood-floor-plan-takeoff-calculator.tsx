"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  completeWoodFloorPlanTakeoffAction,
  extractWoodFloorTakeoffAction,
  prepareWoodFloorPlanUploadAction,
  saveReviewedWoodFloorTakeoffAction,
  type WoodFloorTakeoffActionState,
} from "@/app/shop/wood-floor/flooring-calculator/actions";
import type { WoodFloorRoom } from "@/lib/wood-floor-takeoff-extraction";
import { ShopTranslationBoundary } from "@/components/buildflow/shop-language-provider";
import { calculateWoodFloorMaterials } from "@/lib/wood-floor-takeoff-materials";
import { PROJECT_UPLOAD_STORAGE_BUCKET } from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";

type WoodFloorProjectOption = {
  id: string;
  name: string;
};

type UploadStage = "idle" | "preparing" | "uploading" | "reading" | "review" | "saving-pdf" | "done" | "error";
type ReviewStep = "upload" | "rooms" | "material" | "documents";

const SOURCE_FLOORING_RED_OAK = {
  supplierName: "Source Wood Distribution",
  productName: 'Unfinished Engineered White Oak Square-Edged',
  productUrl: "Invoice 46127",
  invoiceNumber: "46127",
  invoiceDate: "1/16/2026",
  thickness: '5/8"',
  species: "White Oak",
  wearLayer: "4mm wear layer",
  pricePerSqft: 4.99,
  deliveryFee: 100,
  invoiceTotal: 217.86,
  defaultSqftPerBox: 23.62,
  installationType: "Nail, staple, or glue",
  widths: ['6-1/2"'],
  grades: ["Unfinished"],
  lengths: ["23.62 sf per box"],
};

const initialWoodFloorState: WoodFloorTakeoffActionState = {
  status: "idle",
  message: "",
  result: null,
};

const uploadStageLabels: Record<UploadStage, string> = {
  idle: "Ready",
  preparing: "Preparing upload",
  uploading: "Uploading plan",
  reading: "Reading rooms",
  review: "Review rooms",
  "saving-pdf": "Saving PDFs",
  done: "Saved",
  error: "Needs attention",
};

const uploadStageProgress: Record<UploadStage, number> = {
  idle: 0,
  preparing: 18,
  uploading: 42,
  reading: 70,
  review: 82,
  "saving-pdf": 92,
  done: 100,
  error: 100,
};

function numberValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatInputNumber(value: number | null | undefined, digits = 2) {
  if (!value || !Number.isFinite(value)) return "";
  return String(Number(value.toFixed(digits)));
}

function roomTypeLabel(type: WoodFloorRoom["roomType"]) {
  if (type === "bathroom") return "Bathroom";
  if (type === "basement") return "Basement";
  if (type === "kitchen") return "Kitchen";
  if (type === "hallway") return "Hallway";
  if (type === "bedroom") return "Bedroom";
  if (type === "living") return "Living";
  if (type === "closet") return "Closet";
  return "Other";
}

function sourceLabel(room: WoodFloorRoom) {
  const reason = room.reason.toLowerCase();
  if (room.bboxPercent) return "Plan marker";
  if (reason.includes("light and ventilation") || reason.includes("schedule")) return "Schedule";
  if (reason.includes("manual")) return "Manual";
  if (reason.includes("nearby") || reason.includes("label")) return "Plan label";
  return "Reviewed";
}

function confidenceLabel(room: WoodFloorRoom) {
  if (room.confidence === null || room.confidence === undefined) return "Review";
  if (room.confidence >= 0.8) return "High";
  if (room.confidence >= 0.55) return "Medium";
  return "Low";
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 21h14" />
      <path d="M5 17h14" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function normalizeRoom(room: WoodFloorRoom, index: number): WoodFloorRoom {
  return {
    ...room,
    id: room.id || `room-${index}`,
    includeInTakeoff: room.roomType === "basement" ? false : room.includeInTakeoff,
  };
}

export function WoodFloorPlanTakeoffCalculator({
  projects = [],
  isSignedIn = false,
  defaultProjectId = "",
}: {
  projects?: WoodFloorProjectOption[];
  isSignedIn?: boolean;
  defaultProjectId?: string;
}) {
  const [planState, planFormAction, planPending] = useActionState(extractWoodFloorTakeoffAction, initialWoodFloorState);
  const planFileRef = useRef<HTMLInputElement | null>(null);
  const [savedPlanState, setSavedPlanState] = useState<WoodFloorTakeoffActionState | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [clientExtractPending, setClientExtractPending] = useState(false);
  const [reviewSavePending, setReviewSavePending] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [selectedFileLabel, setSelectedFileLabel] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId);
  const [rooms, setRooms] = useState<WoodFloorRoom[]>([]);
  const [showOnlyBathrooms, setShowOnlyBathrooms] = useState(false);
  const [showExcluded, setShowExcluded] = useState(true);
  const [wastePercent, setWastePercent] = useState("10");
  const [sqftPerBox, setSqftPerBox] = useState(String(SOURCE_FLOORING_RED_OAK.defaultSqftPerBox));
  const [selectedWidth, setSelectedWidth] = useState(SOURCE_FLOORING_RED_OAK.widths[0]);
  const [selectedGrade, setSelectedGrade] = useState(SOURCE_FLOORING_RED_OAK.grades[0]);
  const [selectedLength, setSelectedLength] = useState(SOURCE_FLOORING_RED_OAK.lengths[0]);
  const [copyStatus, setCopyStatus] = useState("");
  const [appliedResultKey, setAppliedResultKey] = useState("");
  const [activeStep, setActiveStep] = useState<ReviewStep>("upload");

  const activePlanState = savedPlanState || planState;
  const savedBlueprint = activePlanState.saved?.blueprintUploadId ? activePlanState.saved : null;
  const projectChoiceRequired = isSignedIn && projects.length > 0 && !selectedProjectId;
  const calculation = useMemo(
    () =>
      calculateWoodFloorMaterials({
        rooms,
        wastePercent: numberValue(wastePercent),
        sqftPerBox: numberValue(sqftPerBox) || 20,
        pricePerSqft: SOURCE_FLOORING_RED_OAK.pricePerSqft,
        deliveryFee: SOURCE_FLOORING_RED_OAK.deliveryFee,
      }),
    [rooms, sqftPerBox, wastePercent],
  );
  const canSaveReviewedPdf = Boolean(isSignedIn && savedBlueprint?.blueprintUploadId) && calculation.selectedAreaSqft > 0;
  const visibleRooms = rooms.filter((room) => {
    if (showOnlyBathrooms) return room.roomType === "bathroom";
    if (!showExcluded && !room.includeInTakeoff) return false;
    return true;
  });

  const applyExtractedTakeoff = useCallback((result: WoodFloorTakeoffActionState["result"]) => {
    if (!result) return;
    setRooms(result.rooms.map((room, index) => normalizeRoom(room, index)));
    setCopyStatus("Extracted rooms applied");
    setActiveStep("rooms");
  }, []);

  useEffect(() => {
    const result = activePlanState.result;
    if (!result || activePlanState.status !== "success") return;
    const resultKey = JSON.stringify(result.rooms.map((room) => [room.id, room.name, room.areaSqft, room.includeInTakeoff, room.roomType]));
    if (resultKey === appliedResultKey) return;
    const timeout = window.setTimeout(() => {
      setRooms(result.rooms.map((room, index) => normalizeRoom(room, index)));
      setCopyStatus("Extracted rooms applied");
      setAppliedResultKey(resultKey);
      setActiveStep("rooms");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activePlanState.result, activePlanState.status, appliedResultKey]);

  function handlePlanFileChange() {
    const file = planFileRef.current?.files?.[0];
    setSavedPlanState(null);
    setUploadStage("idle");
    setActiveStep("upload");
    setSelectedFileLabel(file ? `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB` : "");
  }

  async function readPdfTextInBrowser(file: File) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.mjs`;
    const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: Array<{ pageNumber: number; text: string }> = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push({
        pageNumber,
        text: content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" "),
      });
    }
    return pages;
  }

  async function extractPdfInBrowser() {
    const file = planFileRef.current?.files?.[0];
    if (!file) {
      setSavedPlanState({ status: "error", message: "Choose a wood floor plan, finish plan, or room schedule first.", result: null, saved: null });
      return;
    }

    setClientExtractPending(true);
    setSavedPlanState({ status: "idle", message: "Reading searchable PDF rooms on this device...", result: null, saved: null });

    try {
      const [{ extractFallbackRoomsFromText, selectPreferredWoodFloorTextPages }, pages] = await Promise.all([import("@/lib/wood-floor-takeoff-text"), readPdfTextInBrowser(file)]);
      const preferredPages = selectPreferredWoodFloorTextPages(pages);
      const rooms = extractFallbackRoomsFromText(preferredPages);
      const sourcePages = preferredPages.map((page) => page.pageNumber).join(", ");
      const result = {
        rooms,
        sourceNote:
          rooms.length > 0
            ? `Browser extraction used searchable PDF room area labels from preferred proposed/floor-plan page${preferredPages.length > 1 ? "s" : ""}${sourcePages ? ` ${sourcePages}` : ""}. Markers are unavailable unless exact plan positions are returned.`
            : null,
        notes:
          rooms.length > 0
            ? "Review the selected rooms before ordering. Proposed/floor/finish sheets are preferred over demolition, electrical, and other duplicate sheets. Kitchens, bathrooms, and basements are excluded by default."
            : "Could not read room square footage automatically. Enter rooms manually or upload a clearer searchable plan.",
      };
      setSavedPlanState({
        status: rooms.length > 0 ? "success" : "error",
        message: rooms.length > 0 ? "Rooms extracted. Review selected rooms before ordering." : result.notes,
        result,
        saved: null,
      });
    } catch (error) {
      console.error("Browser PDF wood floor extraction failed", error);
      setSavedPlanState({ status: "error", message: "This PDF could not be read in the browser. Sign in and use Upload plan + read rooms, or enter rooms manually.", result: null, saved: null });
    } finally {
      setClientExtractPending(false);
    }
  }

  function handleExtractOnlySubmit(event: FormEvent<HTMLFormElement>) {
    const file = planFileRef.current?.files?.[0];
    if (file?.type === "application/pdf") {
      event.preventDefault();
      void extractPdfInBrowser();
    }
  }

  function addRoom() {
    setRooms((current) => [
      ...current,
      {
        id: `manual-${Date.now()}`,
        name: "New room",
        level: null,
        areaSqft: 0,
        includeInTakeoff: true,
        roomType: "other",
        reason: "Manual room",
        bboxPercent: null,
        confidence: null,
      },
    ]);
  }

  function updateRoom(roomId: string, patch: Partial<WoodFloorRoom>) {
    setRooms((current) =>
      current.map((room) => {
        if (room.id !== roomId) return room;
        const next = { ...room, ...patch };
        if (next.roomType === "basement") next.includeInTakeoff = false;
        return next;
      }),
    );
  }

  function updateRoomsByType(roomType: WoodFloorRoom["roomType"], includeInTakeoff: boolean) {
    setRooms((current) =>
      current.map((room) => {
        if (room.roomType !== roomType) return room;
        if (room.roomType === "basement") return { ...room, includeInTakeoff: false };
        return { ...room, includeInTakeoff };
      }),
    );
  }

  function updateRoomsByLevel(level: string, includeInTakeoff: boolean) {
    setRooms((current) =>
      current.map((room) => {
        if ((room.level || "No floor shown") !== level) return room;
        if (room.roomType === "basement") return { ...room, includeInTakeoff: false };
        return { ...room, includeInTakeoff };
      }),
    );
  }

  function includeAllAllowedRooms() {
    setRooms((current) =>
      current.map((room) => ({
        ...room,
        includeInTakeoff: room.roomType === "basement" ? false : true,
      })),
    );
  }

  function excludeKitchenAndBathrooms() {
    setRooms((current) =>
      current.map((room) => ({
        ...room,
        includeInTakeoff: room.roomType === "basement" || room.roomType === "bathroom" || room.roomType === "kitchen" ? false : room.includeInTakeoff,
      })),
    );
  }

  async function savePlanAndReadRooms() {
    const file = planFileRef.current?.files?.[0];
    if (!file) {
      setUploadStage("error");
      setSavedPlanState({ status: "error", message: "Choose a wood floor plan, finish plan, or room schedule first.", result: null, saved: null });
      return;
    }

    if (!isSignedIn || !selectedProjectId) {
      setUploadStage("error");
      setSavedPlanState({ status: "error", message: "Sign in and choose a project before saving the flooring plan.", result: null, saved: null });
      return;
    }

    setSavePending(true);
    setUploadStage("preparing");
    setSavedPlanState({ status: "idle", message: "Preparing flooring plan upload...", result: null, saved: null });

    try {
      const prepared = await prepareWoodFloorPlanUploadAction({
        projectId: selectedProjectId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      if (!prepared.ok) {
        setUploadStage("error");
        setSavedPlanState({ status: "error", message: prepared.message, result: null, saved: null });
        return;
      }

      setUploadStage("uploading");
      setSavedPlanState({ status: "idle", message: "Uploading flooring plan to project storage...", result: null, saved: null });
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).uploadToSignedUrl(prepared.filePath, prepared.token, file, {
        contentType: file.type,
      });

      if (uploadError) {
        setUploadStage("error");
        setSavedPlanState({ status: "error", message: "Flooring plan upload failed before takeoff could run. Please try again.", result: null, saved: null });
        return;
      }

      setUploadStage("reading");
      setSavedPlanState({ status: "idle", message: "Reading rooms and floor areas...", result: null, saved: null });
      const completed = await completeWoodFloorPlanTakeoffAction({
        projectId: selectedProjectId,
        uploadId: prepared.uploadId,
        filePath: prepared.filePath,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });
      setSavedPlanState(completed);
      setUploadStage(completed.saved?.blueprintUploadId ? "review" : "error");
    } catch {
      setUploadStage("error");
      setSavedPlanState({ status: "error", message: "Saved wood floor takeoff failed. Please try again.", result: null, saved: null });
    } finally {
      setSavePending(false);
    }
  }

  async function saveReviewedTakeoffPdf() {
    if (!savedBlueprint?.blueprintUploadId || !selectedProjectId) {
      setUploadStage("error");
      setSavedPlanState({ status: "error", message: "Upload and read the plan before saving the reviewed wood floor PDFs.", result: activePlanState.result, saved: activePlanState.saved ?? null });
      return;
    }

    setReviewSavePending(true);
    setUploadStage("saving-pdf");
    setSavedPlanState({ status: "idle", message: "Saving reviewed wood floor PDFs...", result: activePlanState.result, saved: savedBlueprint });

    try {
      const saved = await saveReviewedWoodFloorTakeoffAction({
        projectId: selectedProjectId,
        blueprintUploadId: savedBlueprint.blueprintUploadId,
        rooms,
        wastePercent: numberValue(wastePercent),
        sqftPerBox: numberValue(sqftPerBox) || 20,
        productSelection: {
          supplierName: SOURCE_FLOORING_RED_OAK.supplierName,
          productName: SOURCE_FLOORING_RED_OAK.productName,
          productUrl: SOURCE_FLOORING_RED_OAK.productUrl,
          thickness: SOURCE_FLOORING_RED_OAK.thickness,
          species: SOURCE_FLOORING_RED_OAK.species,
          grade: selectedGrade,
          width: selectedWidth,
          length: selectedLength,
          installationType: SOURCE_FLOORING_RED_OAK.installationType,
          invoiceNumber: SOURCE_FLOORING_RED_OAK.invoiceNumber,
          invoiceDate: SOURCE_FLOORING_RED_OAK.invoiceDate,
          sqftPerBox: SOURCE_FLOORING_RED_OAK.defaultSqftPerBox,
          pricePerSqft: SOURCE_FLOORING_RED_OAK.pricePerSqft,
          deliveryFee: SOURCE_FLOORING_RED_OAK.deliveryFee,
          invoiceTotal: SOURCE_FLOORING_RED_OAK.invoiceTotal,
        },
        sourceNote: activePlanState.result?.sourceNote || null,
        notes: `Reviewed in Avantia Build step by step with ${wastePercent}% waste. Room exclude boxes were reviewed before saving. Material source: ${SOURCE_FLOORING_RED_OAK.supplierName}, ${SOURCE_FLOORING_RED_OAK.productName}, ${selectedWidth}, ${selectedGrade}, ${selectedLength}. Transitions and reducers are excluded for now.`,
      });
      setSavedPlanState(saved);
      setUploadStage(saved.status === "success" ? "done" : "error");
    } catch {
      setUploadStage("error");
      setSavedPlanState({ status: "error", message: "Reviewed wood floor PDF save failed. Please try again.", result: activePlanState.result, saved: savedBlueprint });
    } finally {
      setReviewSavePending(false);
    }
  }

  async function copyMaterialList() {
    const included = rooms.filter((room) => room.includeInTakeoff).map((room) => `${room.name}: ${formatNumber(room.areaSqft, 2)} sq ft`);
    const excluded = rooms.filter((room) => !room.includeInTakeoff).map((room) => `${room.name}: ${formatNumber(room.areaSqft, 2)} sq ft`);
    const text = [
      `Wood floor selected area: ${formatNumber(calculation.selectedAreaSqft, 2)} sq ft`,
      `Waste: ${formatNumber(calculation.wastePercent)}%`,
      `Order area: ${formatNumber(calculation.orderAreaSqft, 2)} sq ft`,
      `Boxes: ${calculation.boxCount} boxes at ${formatNumber(calculation.sqftPerBox, 2)} sq ft/box`,
      `Price: $${formatNumber(SOURCE_FLOORING_RED_OAK.pricePerSqft, 2)} per sq ft`,
      `Estimated material cost: $${formatNumber(calculation.materialCost, 2)}${calculation.deliveryFee > 0 ? ` + $${formatNumber(calculation.deliveryFee, 2)} delivery = $${formatNumber(calculation.totalCost, 2)}` : ""}`,
      `Material source: ${SOURCE_FLOORING_RED_OAK.supplierName} - ${SOURCE_FLOORING_RED_OAK.productName}`,
      `Selected size: ${SOURCE_FLOORING_RED_OAK.thickness} x ${selectedWidth}, ${SOURCE_FLOORING_RED_OAK.wearLayer}, ${selectedGrade}, ${selectedLength}`,
      `Source invoice: ${SOURCE_FLOORING_RED_OAK.invoiceNumber} dated ${SOURCE_FLOORING_RED_OAK.invoiceDate}`,
      included.length ? `Included rooms:\n${included.join("\n")}` : "",
      excluded.length ? `Excluded rooms:\n${excluded.join("\n")}` : "",
    ].filter(Boolean).join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Wood floor takeoff copied");
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  return (
    <ShopTranslationBoundary>
    <section className="grid gap-4">
      <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["upload", "1. Upload"],
            ["rooms", "2. Exclude rooms"],
            ["material", "3. Material"],
            ["documents", "4. Documents"],
          ].map(([step, label]) => (
            <button
              key={step}
              type="button"
              onClick={() => setActiveStep(step as ReviewStep)}
              className={`min-h-11 rounded-2xl px-3 text-xs font-bold transition ${activeStep === step ? "bg-slate-950 text-white" : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-4 ${activeStep === "rooms" ? "xl:grid-cols-[0.92fr_1.08fr]" : "xl:grid-cols-1"}`}>
      <div className="grid gap-4">
        <section className={`rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:p-5 ${activeStep === "upload" ? "" : "hidden"}`}>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <UploadIcon />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-normal text-slate-950">Flooring plan extraction</h2>
              <p className="text-sm leading-5 text-slate-500">Upload a floor plan, finish plan, room schedule, PDF, or image.</p>
            </div>
          </div>

          <form action={planFormAction} onSubmit={handleExtractOnlySubmit} className="mt-5 grid gap-3">
            {isSignedIn && projects.length > 0 ? (
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Save to project
                <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100">
                  <option value="">Choose project before upload</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <input ref={planFileRef} name="planFile" type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={handlePlanFileChange} className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:min-h-10 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
            {selectedFileLabel ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-600">Selected file: {selectedFileLabel}</div> : null}

            {isSignedIn && projects.length > 0 ? (
              <button type="button" onClick={savePlanAndReadRooms} disabled={savePending || reviewSavePending || planPending || projectChoiceRequired} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55">
                {projectChoiceRequired ? "Choose project first" : savePending ? uploadStageLabels[uploadStage] : "Upload plan + read rooms"}
              </button>
            ) : (
              <a href="/login" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-bold text-sky-700">
                Sign in to save flooring plan
              </a>
            )}

            <button type="submit" disabled={planPending || clientExtractPending || savePending || reviewSavePending} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55">
              {planPending || clientExtractPending ? "Extracting rooms..." : "Extract only"}
            </button>
          </form>

          {uploadStage !== "idle" ? (
            <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
                <span>{uploadStageLabels[uploadStage]}</span>
                <span>{uploadStageProgress[uploadStage]}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div className={`h-full rounded-full ${uploadStage === "error" ? "bg-amber-500" : "bg-sky-600"}`} style={{ width: `${uploadStageProgress[uploadStage]}%` }} />
              </div>
            </div>
          ) : null}

          {activePlanState.message ? (
            <div className={`mt-4 rounded-[18px] border px-4 py-3 text-sm font-semibold leading-6 ${activePlanState.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : activePlanState.status === "idle" ? "border-sky-200 bg-sky-50 text-sky-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
              {activePlanState.message}
            </div>
          ) : null}

          {activePlanState.saved ? (
            <div className="mt-3 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-900">
              <div>{activePlanState.saved.takeoffFileName ? `PDF saved: ${activePlanState.saved.takeoffFileName}` : "Plan saved. Review rooms before creating the wood floor PDF."}</div>
              {activePlanState.saved.markedPlanFileName ? <div>Marked plan: {activePlanState.saved.markedPlanFileName}</div> : null}
              <div className="text-emerald-800">Project: {activePlanState.saved.projectName}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {activePlanState.saved.takeoffFileName ? (
                  <Link href={`/projects/${activePlanState.saved.projectId}#documents`} className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-emerald-700 px-4 text-sm font-bold text-white">
                    Open project documents
                  </Link>
                ) : null}
                <Link href={`/projects/${activePlanState.saved.projectId}`} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-emerald-300 bg-white px-4 text-sm font-bold text-emerald-800">
                  Open project
                </Link>
              </div>
            </div>
          ) : null}

          {activePlanState.result ? (
            <div className="mt-4 grid gap-2 text-sm leading-6 text-slate-600">
              {activePlanState.result.sourceNote ? <div className="rounded-2xl bg-slate-50 px-4 py-3">{activePlanState.result.sourceNote}</div> : null}
              <div className="rounded-2xl bg-slate-50 px-4 py-3">{activePlanState.result.notes}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => applyExtractedTakeoff(activePlanState.result)} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-bold text-sky-700">
                  Apply extracted rooms
                </button>
                <button type="button" onClick={() => setActiveStep("rooms")} disabled={rooms.length === 0} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-55">
                  Review exclude boxes
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className={`rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:p-5 ${activeStep === "material" ? "" : "hidden"}`}>
          <div>
            <h2 className="text-xl font-bold tracking-normal text-slate-950">Client material source</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">The takeoff PDF will show where the selected wood floor came from.</p>
          </div>

          <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
            <div className="font-bold">{SOURCE_FLOORING_RED_OAK.productName}</div>
            <div>{SOURCE_FLOORING_RED_OAK.supplierName} · {SOURCE_FLOORING_RED_OAK.species} · {SOURCE_FLOORING_RED_OAK.thickness} · {SOURCE_FLOORING_RED_OAK.wearLayer}</div>
            <div className="mt-1 font-bold text-emerald-800">Invoice #{SOURCE_FLOORING_RED_OAK.invoiceNumber} · ${formatNumber(SOURCE_FLOORING_RED_OAK.pricePerSqft, 2)}/sq ft · {formatNumber(SOURCE_FLOORING_RED_OAK.defaultSqftPerBox, 2)} sq ft/box</div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Width
              <select value={selectedWidth} onChange={(event) => setSelectedWidth(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100">
                {SOURCE_FLOORING_RED_OAK.widths.map((width) => (
                  <option key={width} value={width}>{width}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Grade
              <select value={selectedGrade} onChange={(event) => setSelectedGrade(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100">
                {SOURCE_FLOORING_RED_OAK.grades.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Length
              <select value={selectedLength} onChange={(event) => setSelectedLength(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100">
                {SOURCE_FLOORING_RED_OAK.lengths.map((length) => (
                  <option key={length} value={length}>{length}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-600">
            Invoice delivery line: ${formatNumber(SOURCE_FLOORING_RED_OAK.deliveryFee, 2)}. Installation from source: {SOURCE_FLOORING_RED_OAK.installationType}. Transitions and reducers are still excluded from this takeoff.
          </div>
        </section>

        <section className={`rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:p-5 ${activeStep === "material" ? "" : "hidden"}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-normal text-slate-950">Wood floor material</h2>
              <p className="text-sm leading-5 text-slate-500">10% waste by default. Transitions and reducers are excluded for now.</p>
            </div>
            <button type="button" onClick={copyMaterialList} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800">
              <CopyIcon />
              Copy
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Waste percent
              <input value={wastePercent} onChange={(event) => setWastePercent(event.target.value)} inputMode="decimal" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Sq ft per box
              <input value={sqftPerBox} onChange={(event) => setSqftPerBox(event.target.value)} inputMode="decimal" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
            </label>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Selected area</div>
              <div className="mt-1 text-lg font-bold text-slate-950">{formatNumber(calculation.selectedAreaSqft, 2)} sq ft</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Order area</div>
              <div className="mt-1 text-lg font-bold text-slate-950">{formatNumber(calculation.orderAreaSqft, 2)} sq ft</div>
            </div>
            <div className="rounded-2xl bg-sky-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700">Boxes</div>
              <div className="mt-1 text-lg font-bold text-slate-950">{calculation.boxCount}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Cost</div>
              <div className="mt-1 text-lg font-bold text-slate-950">${formatNumber(calculation.totalCost, 2)}</div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[18px] border border-slate-200">
            {calculation.rows.map((row) => (
              <div key={row.label} className="grid gap-1 border-b border-slate-100 p-3 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="text-sm font-bold text-slate-950">{row.label}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{row.detail}</div>
                </div>
                <div className="text-base font-bold text-sky-700 sm:text-right">{row.quantity}</div>
              </div>
            ))}
          </div>
          {copyStatus ? <div className="mt-3 text-sm font-semibold text-sky-700">{copyStatus}</div> : null}
          <button type="button" onClick={() => setActiveStep("documents")} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800">
            Continue to documents
          </button>
        </section>

        <section className={`rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:p-5 ${activeStep === "documents" ? "" : "hidden"}`}>
          <div>
            <h2 className="text-xl font-bold tracking-normal text-slate-950">Documents</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">Save the reviewed takeoff PDF and the source-proof marked plan after the room boxes are correct.</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Selected</div>
              <div className="mt-1 text-lg font-bold text-slate-950">{formatNumber(calculation.selectedAreaSqft, 2)} sq ft</div>
            </div>
            <div className="rounded-2xl bg-sky-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700">Boxes</div>
              <div className="mt-1 text-lg font-bold text-slate-950">{calculation.boxCount}</div>
            </div>
          </div>

          <button type="button" onClick={saveReviewedTakeoffPdf} disabled={!canSaveReviewedPdf || savePending || reviewSavePending} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-55">
            {reviewSavePending ? "Saving reviewed PDFs..." : "Save reviewed takeoff + marked plan"}
          </button>

          {activePlanState.saved?.takeoffFileName ? (
            <div className="mt-3 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-900">
              <div>PDF saved: {activePlanState.saved.takeoffFileName}</div>
              {activePlanState.saved.markedPlanFileName ? <div>Marked plan: {activePlanState.saved.markedPlanFileName}</div> : null}
              <Link href={`/projects/${activePlanState.saved.projectId}#documents`} className="mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl bg-emerald-700 px-4 text-sm font-bold text-white">
                Open project documents
              </Link>
            </div>
          ) : null}
        </section>
      </div>

      <section className={`rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:p-5 ${activeStep === "rooms" ? "" : "hidden"}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-slate-950">Room selection</h2>
            <p className="text-sm leading-5 text-slate-500">Use the marked boxes to exclude any room you do not want in the order.</p>
          </div>
          <button type="button" onClick={addRoom} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700">
            <PlusIcon />
            Room
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800">
            Show all bathrooms
            <input type="checkbox" checked={showOnlyBathrooms} onChange={(event) => setShowOnlyBathrooms(event.target.checked)} className="h-5 w-5 accent-sky-600" />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800">
            Show excluded rooms
            <input type="checkbox" checked={showExcluded} onChange={(event) => setShowExcluded(event.target.checked)} className="h-5 w-5 accent-sky-600" />
          </label>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <button type="button" onClick={includeAllAllowedRooms} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800">
            Include allowed
          </button>
          <button type="button" onClick={excludeKitchenAndBathrooms} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-800">
            Remove kitchen/baths
          </button>
          <button type="button" onClick={() => updateRoomsByType("kitchen", false)} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700">
            Remove kitchens
          </button>
          <button type="button" onClick={() => updateRoomsByType("hallway", false)} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700">
            Remove halls
          </button>
        </div>

        {rooms.length > 0 ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[...new Set(rooms.map((room) => room.level || "No floor shown"))].map((level) => (
              <button key={level} type="button" onClick={() => updateRoomsByLevel(level, false)} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-800">
                Exclude {level}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          {visibleRooms.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              No rooms yet. Upload a plan above or add rooms manually.
            </div>
          ) : (
            visibleRooms.map((room) => (
              <article key={room.id} className={`rounded-[18px] border p-3 ${room.includeInTakeoff ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-950">{room.name}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{room.level || "No floor shown"} · {roomTypeLabel(room.roomType)} · {formatNumber(room.areaSqft, 2)} sq ft</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600">{sourceLabel(room)}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600">{confidenceLabel(room)}</span>
                      {room.bboxPercent ? <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700">Marked</span> : <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">Source proof</span>}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    Include
                    <input type="checkbox" checked={room.includeInTakeoff} disabled={room.roomType === "basement"} onChange={(event) => updateRoom(room.id, { includeInTakeoff: event.target.checked })} className="h-5 w-5 accent-emerald-600 disabled:opacity-50" />
                  </label>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-[1.2fr_0.75fr_0.9fr_0.9fr]">
                  <label className="grid gap-1 text-xs font-bold text-slate-600">
                    Room name
                    <input value={room.name} onChange={(event) => updateRoom(room.id, { name: event.target.value })} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950" />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-slate-600">
                    Area sq ft
                    <input value={formatInputNumber(room.areaSqft, 2)} onChange={(event) => updateRoom(room.id, { areaSqft: numberValue(event.target.value) })} inputMode="decimal" className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950" />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-slate-600">
                    Type
                    <select value={room.roomType} onChange={(event) => updateRoom(room.id, { roomType: event.target.value as WoodFloorRoom["roomType"] })} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950">
                      <option value="bathroom">Bathroom</option>
                      <option value="basement">Basement</option>
                      <option value="kitchen">Kitchen</option>
                      <option value="hallway">Hallway</option>
                      <option value="bedroom">Bedroom</option>
                      <option value="living">Living</option>
                      <option value="closet">Closet</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-slate-600">
                    Floor
                    <select value={room.level || ""} onChange={(event) => updateRoom(room.id, { level: event.target.value || null })} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950">
                      <option value="">No floor shown</option>
                      <option value="First floor">First floor</option>
                      <option value="Second floor">Second floor</option>
                      <option value="Basement">Basement</option>
                      <option value="Attic">Attic</option>
                    </select>
                  </label>
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-500">{room.reason}</div>
              </article>
            ))
          )}
        </div>
        <button type="button" onClick={() => setActiveStep("material")} disabled={rooms.length === 0} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
          Continue to material
        </button>
      </section>
      </div>
    </section>
    </ShopTranslationBoundary>
  );
}
