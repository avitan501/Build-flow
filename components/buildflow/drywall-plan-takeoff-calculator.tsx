"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  completeDrywallPlanTakeoffAction,
  extractDrywallPlanTakeoffAction,
  prepareDrywallPlanUploadAction,
  saveReviewedDrywallTakeoffAction,
  type DrywallReviewedOpeningInput,
  type DrywallPlanTakeoffActionState,
} from "@/app/shop/sheet-rock/drywall-calculator/actions";
import type { DrywallPlanOpening } from "@/lib/drywall-plan-takeoff-extraction";
import { PROJECT_UPLOAD_STORAGE_BUCKET } from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";

type DrywallProjectOption = {
  id: string;
  name: string;
};

type OpeningInputRow = {
  id: string;
  kind: "door" | "window" | "opening";
  mark: string;
  quantity: string;
  width: string;
  height: string;
  area: string;
};

type MaterialRow = {
  label: string;
  quantity: string;
  detail: string;
};

type WallCountingMethod = "perimeter-room" | "interior-one-side" | "interior-both-sides" | "manual-face-lf";
type UploadStage = "idle" | "preparing" | "uploading" | "reading" | "review" | "saving-pdf" | "done" | "error";

const wallCountingMethodLabels: Record<WallCountingMethod, string> = {
  "perimeter-room": "Perimeter room walls",
  "interior-one-side": "Interior partitions, one side",
  "interior-both-sides": "Interior partitions, both sides",
  "manual-face-lf": "Manual drywall face LF",
};

const initialPlanTakeoffState: DrywallPlanTakeoffActionState = {
  status: "idle",
  message: "",
  result: null,
};

const uploadStageLabels: Record<UploadStage, string> = {
  idle: "Ready",
  preparing: "Preparing upload",
  uploading: "Uploading blueprint",
  reading: "Reading plan",
  review: "Review numbers",
  "saving-pdf": "Saving PDF",
  done: "PDF saved",
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

function roundUp(value: number) {
  return Math.max(0, Math.ceil(value));
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

function openingArea(row: OpeningInputRow) {
  const directArea = numberValue(row.area);
  if (directArea > 0) return numberValue(row.quantity) * directArea;
  return numberValue(row.quantity) * numberValue(row.width) * numberValue(row.height);
}

function openingToRow(opening: DrywallPlanOpening, index: number): OpeningInputRow {
  return {
    id: `${opening.kind}-${opening.mark || index}-${index}`,
    kind: opening.kind,
    mark: opening.mark || opening.location || `${opening.kind} ${index + 1}`,
    quantity: formatInputNumber(opening.quantity, 2) || "1",
    width: formatInputNumber(opening.widthFeet, 2),
    height: formatInputNumber(opening.heightFeet, 2),
    area: formatInputNumber(opening.areaSqft, 2),
  };
}

function RulerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m4 19 15-15 1 1L5 20z" />
      <path d="m7 16 2 2" />
      <path d="m10 13 2 2" />
      <path d="m13 10 2 2" />
      <path d="m16 7 2 2" />
    </svg>
  );
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

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
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

export function DrywallPlanTakeoffCalculator({
  projects = [],
  isSignedIn = false,
  defaultProjectId = "",
}: {
  projects?: DrywallProjectOption[];
  isSignedIn?: boolean;
  defaultProjectId?: string;
}) {
  const [planState, planFormAction, planPending] = useActionState(extractDrywallPlanTakeoffAction, initialPlanTakeoffState);
  const planFileRef = useRef<HTMLInputElement | null>(null);
  const [savedPlanState, setSavedPlanState] = useState<DrywallPlanTakeoffActionState | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [reviewSavePending, setReviewSavePending] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [selectedFileLabel, setSelectedFileLabel] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId);
  const [measuredOnPlan, setMeasuredOnPlan] = useState("");
  const [scalePlanInches, setScalePlanInches] = useState("1");
  const [scaleRealFeet, setScaleRealFeet] = useState("4");
  const [typedLinearFeet, setTypedLinearFeet] = useState("68");
  const [wallCountingMethod, setWallCountingMethod] = useState<WallCountingMethod>("interior-both-sides");
  const [height, setHeight] = useState("8");
  const [manualOpeningArea, setManualOpeningArea] = useState("0");
  const [ceilingArea, setCeilingArea] = useState("0");
  const [outsideCorners, setOutsideCorners] = useState("0");
  const [wastePercent, setWastePercent] = useState("10");
  const [sheetLength, setSheetLength] = useState("8");
  const [includeCeiling, setIncludeCeiling] = useState(false);
  const [openings, setOpenings] = useState<OpeningInputRow[]>([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [appliedResultKey, setAppliedResultKey] = useState("");
  const activePlanState = savedPlanState || planState;
  const projectChoiceRequired = isSignedIn && projects.length > 0 && !selectedProjectId;
  const savedBlueprint = activePlanState.saved?.blueprintUploadId ? activePlanState.saved : null;

  const calculation = useMemo(() => {
    const planMeasure = numberValue(measuredOnPlan);
    const scaleMeasure = numberValue(scalePlanInches);
    const scaleFeet = numberValue(scaleRealFeet);
    const rulerLinearFeet = planMeasure > 0 && scaleMeasure > 0 && scaleFeet > 0 ? (planMeasure / scaleMeasure) * scaleFeet : 0;
    const linearFeet = rulerLinearFeet > 0 ? rulerLinearFeet : numberValue(typedLinearFeet);
    const wallHeight = numberValue(height);
    const wallSideMultiplier = wallCountingMethod === "interior-both-sides" ? 2 : 1;
    const wallArea = linearFeet * wallHeight * wallSideMultiplier;
    const scheduleOpeningArea = openings.reduce((total, row) => total + openingArea(row), 0);
    const openingsArea = scheduleOpeningArea + numberValue(manualOpeningArea);
    const ceiling = includeCeiling ? numberValue(ceilingArea) : 0;
    const proposedArea = wallArea + ceiling;
    const netArea = Math.max(0, proposedArea - openingsArea);
    const waste = Math.min(numberValue(wastePercent), 35);
    const orderArea = netArea * (1 + waste / 100);
    const boardLength = numberValue(sheetLength) || 8;
    const sheetSqft = 4 * boardLength;
    const sheets = roundUp(orderArea / sheetSqft);
    const screwCount = roundUp(sheets * 32);
    const screwBoxes = roundUp(screwCount / 1000);
    const tapeFeet = roundUp(orderArea * 0.35);
    const tapeRolls = roundUp(tapeFeet / 250);
    const compoundBuckets = roundUp(orderArea / 400);
    const cornerBeads = roundUp((numberValue(outsideCorners) * wallHeight) / 8);

    const rows: MaterialRow[] = [
      {
        label: "Drywall board",
        quantity: `${sheets} sheets`,
        detail: `5/8 in board, 4x${boardLength} sheets, ${formatNumber(sheetSqft)} sq ft each`,
      },
      {
        label: "Drywall screws",
        quantity: `${screwBoxes} boxes`,
        detail: `About ${formatNumber(screwCount)} screws, estimated at 1,000 per 5 lb box`,
      },
      {
        label: "Joint tape",
        quantity: `${tapeRolls} rolls`,
        detail: `About ${formatNumber(tapeFeet)} linear ft, estimated with 250 ft rolls`,
      },
      {
        label: "Joint compound",
        quantity: `${compoundBuckets} buckets`,
        detail: "Estimated with 4.5 gal buckets at about 400 sq ft each",
      },
      {
        label: "Corner bead",
        quantity: `${cornerBeads} pieces`,
        detail: `8 ft pieces for ${formatNumber(numberValue(outsideCorners))} outside corners`,
      },
    ];

    return {
      linearFeet,
      rulerLinearFeet,
      wallSideMultiplier,
      wallArea,
      proposedArea,
      scheduleOpeningArea,
      openingsArea,
      netArea,
      orderArea,
      sheetSqft,
      rows,
    };
  }, [ceilingArea, height, includeCeiling, manualOpeningArea, measuredOnPlan, openings, outsideCorners, scalePlanInches, scaleRealFeet, sheetLength, typedLinearFeet, wallCountingMethod, wastePercent]);

  const canSaveReviewedPdf = Boolean(isSignedIn && savedBlueprint?.blueprintUploadId) && calculation.linearFeet > 0 && numberValue(height) > 0;

  const applyExtractedTakeoff = useCallback((result = activePlanState.result) => {
    if (!result) return;

    if (result.proposedLinearFeet) {
      setTypedLinearFeet(formatInputNumber(result.proposedLinearFeet, 2));
      setMeasuredOnPlan("");
    }

    const scaleNote = result.scaleNote?.toLowerCase() || "";
    if (scaleNote.includes("building area diagram") || scaleNote.includes("total proposed building area")) {
      setWallCountingMethod("perimeter-room");
    }

    if (result.wallHeightFeet) {
      setHeight(formatInputNumber(result.wallHeightFeet, 2));
    }

    if (result.ceilingAreaSqft) {
      setCeilingArea(formatInputNumber(result.ceilingAreaSqft, 2));
      setIncludeCeiling(true);
    }

    if (result.outsideCorners) {
      setOutsideCorners(formatInputNumber(result.outsideCorners, 0));
    }

    if (result.openings.length > 0) {
      setOpenings(result.openings.map(openingToRow));
    }

    setCopyStatus("Extracted plan values applied");
  }, [activePlanState.result]);

  useEffect(() => {
    const result = activePlanState.result;
    if (!result || activePlanState.status !== "success") return;

    const resultKey = JSON.stringify({
      proposedLinearFeet: result.proposedLinearFeet,
      wallHeightFeet: result.wallHeightFeet,
      ceilingAreaSqft: result.ceilingAreaSqft,
      outsideCorners: result.outsideCorners,
      openings: result.openings,
    });

    if (resultKey === appliedResultKey) return;
    const timeout = window.setTimeout(() => {
      applyExtractedTakeoff(result);
      setAppliedResultKey(resultKey);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [activePlanState.result, activePlanState.status, appliedResultKey, applyExtractedTakeoff]);

  function addOpening(kind: OpeningInputRow["kind"]) {
    setOpenings((current) => [
      ...current,
      {
        id: `${kind}-${Date.now()}`,
        kind,
        mark: kind === "door" ? "D" : kind === "window" ? "W" : "OP",
        quantity: "1",
        width: kind === "door" ? "3" : "",
        height: kind === "door" ? "6.67" : "",
        area: "",
      },
    ]);
  }

  function updateOpening(id: string, field: keyof Omit<OpeningInputRow, "id">, value: string) {
    setOpenings((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        if (field === "kind") {
          const kind = value === "door" || value === "window" || value === "opening" ? value : "opening";
          return { ...row, kind };
        }
        return { ...row, [field]: value };
      }),
    );
  }

  function removeOpening(id: string) {
    setOpenings((current) => current.filter((row) => row.id !== id));
  }

  function handlePlanFileChange() {
    const file = planFileRef.current?.files?.[0];
    setSavedPlanState(null);
    setUploadStage("idle");
    setSelectedFileLabel(file ? `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB` : "");
  }

  function reviewedOpeningRows(): DrywallReviewedOpeningInput[] {
    return openings
      .map((row) => ({
        kind: row.kind,
        mark: row.mark,
        quantity: numberValue(row.quantity) || 1,
        widthFeet: numberValue(row.width) || null,
        heightFeet: numberValue(row.height) || null,
        areaSqft: numberValue(row.area) || null,
        source: "Reviewed door/window schedule",
      }))
      .filter((row) => row.areaSqft || (row.widthFeet && row.heightFeet));
  }

  async function saveBlueprintAndRunTakeoff() {
    const file = planFileRef.current?.files?.[0];
    if (!file) {
      setUploadStage("error");
      setSavedPlanState({
        status: "error",
        message: "Choose a proposed floor plan, section sheet, or full plan PDF first.",
        result: null,
        saved: null,
      });
      return;
    }

    if (!isSignedIn || !selectedProjectId) {
      setUploadStage("error");
      setSavedPlanState({
        status: "error",
        message: "Sign in and choose a project before saving the blueprint for review.",
        result: null,
        saved: null,
      });
      return;
    }

    setSavePending(true);
    setUploadStage("preparing");
    setSavedPlanState({
      status: "idle",
      message: "Preparing blueprint upload...",
      result: null,
      saved: null,
    });

    try {
      const prepared = await prepareDrywallPlanUploadAction({
        projectId: selectedProjectId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      if (!prepared.ok) {
        setSavedPlanState({ status: "error", message: prepared.message, result: null, saved: null });
        return;
      }

      setUploadStage("uploading");
      setSavedPlanState({
        status: "idle",
        message: "Uploading blueprint to project storage...",
        result: null,
        saved: null,
      });

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(PROJECT_UPLOAD_STORAGE_BUCKET)
        .uploadToSignedUrl(prepared.filePath, prepared.token, file, {
          contentType: file.type,
        });

      if (uploadError) {
        setUploadStage("error");
        setSavedPlanState({
          status: "error",
          message: "Blueprint upload failed before takeoff could run. Please try again.",
          result: null,
          saved: null,
        });
        return;
      }

      setUploadStage("reading");
      setSavedPlanState({
        status: "idle",
        message: "Reading plan and preparing review values...",
        result: null,
        saved: null,
      });

      const completed = await completeDrywallPlanTakeoffAction({
        projectId: selectedProjectId,
        uploadId: prepared.uploadId,
        filePath: prepared.filePath,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });
      setSavedPlanState(completed);
      setUploadStage(completed.status === "success" || completed.saved?.blueprintUploadId ? "review" : "error");
    } catch {
      setUploadStage("error");
      setSavedPlanState({
        status: "error",
        message: "Saved takeoff failed. Please try again.",
        result: null,
        saved: null,
      });
    } finally {
      setSavePending(false);
    }
  }

  async function saveReviewedTakeoffPdf() {
    if (!savedBlueprint?.blueprintUploadId || !selectedProjectId) {
      setUploadStage("error");
      setSavedPlanState({
        status: "error",
        message: "Upload and read the blueprint before saving the reviewed takeoff PDF.",
        result: activePlanState.result,
        saved: activePlanState.saved ?? null,
      });
      return;
    }

    setReviewSavePending(true);
    setUploadStage("saving-pdf");
    setSavedPlanState({
      status: "idle",
      message: "Saving reviewed takeoff PDF...",
      result: activePlanState.result,
      saved: savedBlueprint,
    });

    try {
      const saved = await saveReviewedDrywallTakeoffAction({
        projectId: selectedProjectId,
        blueprintUploadId: savedBlueprint.blueprintUploadId,
        proposedLinearFeet: calculation.linearFeet,
        wallHeightFeet: numberValue(height),
        ceilingAreaSqft: includeCeiling ? numberValue(ceilingArea) : null,
        outsideCorners: numberValue(outsideCorners),
        openings: reviewedOpeningRows(),
        wastePercent: numberValue(wastePercent),
        sheetLengthFeet: numberValue(sheetLength) || 8,
        wallSideMultiplier: calculation.wallSideMultiplier,
        scaleNote: activePlanState.result?.scaleNote || `Reviewed with ${wallCountingMethodLabels[wallCountingMethod]}.`,
        sectionNote: activePlanState.result?.sectionNote || null,
        notes: [activePlanState.result?.notes, `Reviewed in Avantia Build with ${wallCountingMethodLabels[wallCountingMethod]}, 4x${sheetLength} boards, and ${wastePercent}% waste.`]
          .filter(Boolean)
          .join(" "),
      });

      setSavedPlanState(saved);
      setUploadStage(saved.status === "success" ? "done" : "error");
    } catch {
      setUploadStage("error");
      setSavedPlanState({
        status: "error",
        message: "Reviewed takeoff PDF save failed. Please try again.",
        result: activePlanState.result,
        saved: savedBlueprint,
      });
    } finally {
      setReviewSavePending(false);
    }
  }

  async function copyMaterialList() {
    const openingLines = openings
      .map((row) => `${row.kind} ${row.mark || ""}: qty ${row.quantity}, ${row.area ? `${row.area} sq ft` : `${row.width} ft x ${row.height} ft`}`)
      .join("\n");
    const text = [
      `Proposed drywall wall LF: ${formatNumber(calculation.linearFeet, 2)}`,
      `Wall counting method: ${wallCountingMethodLabels[wallCountingMethod]}`,
      `Proposed area before openings: ${formatNumber(calculation.proposedArea)} sq ft`,
      `Openings deducted: ${formatNumber(calculation.openingsArea)} sq ft`,
      `Net order area with waste: ${formatNumber(calculation.orderArea)} sq ft`,
      ...calculation.rows.map((row) => `${row.label}: ${row.quantity} - ${row.detail}`),
      openingLines ? `Openings:\n${openingLines}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Plan takeoff copied");
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
      <div className="grid gap-4">
        <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <UploadIcon />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-normal text-slate-950">Plan extraction</h2>
              <p className="text-sm leading-5 text-slate-500">Upload a proposed floor plan, section sheet, or full plan PDF.</p>
            </div>
          </div>

          <form action={planFormAction} className="mt-5 grid gap-3">
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
                <span className="text-xs font-semibold leading-5 text-slate-500">
                  The blueprint and takeoff PDF will be saved under this project.
                </span>
              </label>
            ) : null}

            <input
              ref={planFileRef}
              name="planFile"
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={handlePlanFileChange}
              className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:min-h-10 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            {selectedFileLabel ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-600">
                Selected file: {selectedFileLabel}
              </div>
            ) : null}

            {isSignedIn && projects.length > 0 ? (
              <button type="button" onClick={saveBlueprintAndRunTakeoff} disabled={savePending || reviewSavePending || planPending || projectChoiceRequired} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55">
                {projectChoiceRequired ? "Choose project first" : savePending ? uploadStageLabels[uploadStage] : "Upload blueprint + read takeoff"}
              </button>
            ) : (
              <a href="/login" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-bold text-sky-700">
                Sign in to save blueprint
              </a>
            )}

            <button type="submit" disabled={planPending || savePending || reviewSavePending} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55">
              {planPending ? "Extracting plan..." : "Extract only"}
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
              <div>{activePlanState.saved.takeoffFileName ? `PDF saved: ${activePlanState.saved.takeoffFileName}` : "Blueprint saved. Review the takeoff values before creating the PDF."}</div>
              <div className="text-emerald-800">Project: {activePlanState.saved.projectName}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {activePlanState.saved.takeoffFileName ? (
                  <Link href={`/projects/${activePlanState.saved.projectId}#documents`} className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-emerald-700 px-4 text-sm font-bold text-white">
                    Open PDF in project documents
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
              {activePlanState.result.scaleNote ? <div className="rounded-2xl bg-slate-50 px-4 py-3">{activePlanState.result.scaleNote}</div> : null}
              {activePlanState.result.sectionNote ? <div className="rounded-2xl bg-slate-50 px-4 py-3">{activePlanState.result.sectionNote}</div> : null}
              <div className="rounded-2xl bg-slate-50 px-4 py-3">{activePlanState.result.notes}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => applyExtractedTakeoff()} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-bold text-sky-700">
                  Apply extracted values
                </button>
                <button type="button" onClick={saveReviewedTakeoffPdf} disabled={!canSaveReviewedPdf || savePending || reviewSavePending} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-55">
                  {reviewSavePending ? "Saving reviewed PDF..." : "Save reviewed takeoff PDF"}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <RulerIcon />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-normal text-slate-950">Ruler takeoff</h2>
              <p className="text-sm leading-5 text-slate-500">Measure proposed wall runs on the plan or type known linear feet.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Ruler length in
              <input value={measuredOnPlan} onChange={(event) => setMeasuredOnPlan(event.target.value)} inputMode="decimal" placeholder="Example 17" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Scale in
              <input value={scalePlanInches} onChange={(event) => setScalePlanInches(event.target.value)} inputMode="decimal" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Scale real ft
              <input value={scaleRealFeet} onChange={(event) => setScaleRealFeet(event.target.value)} inputMode="decimal" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
            </label>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Proposed wall linear ft
              <input value={typedLinearFeet} onChange={(event) => setTypedLinearFeet(event.target.value)} inputMode="decimal" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Wall counting method
              <select value={wallCountingMethod} onChange={(event) => setWallCountingMethod(event.target.value as WallCountingMethod)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100">
                <option value="perimeter-room">Perimeter room walls</option>
                <option value="interior-one-side">Interior partitions, one side</option>
                <option value="interior-both-sides">Interior partitions, both sides</option>
                <option value="manual-face-lf">Manual drywall face LF</option>
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Section wall height ft
              <input value={height} onChange={(event) => setHeight(event.target.value)} inputMode="decimal" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
            </label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-600">
              {wallCountingMethod === "interior-both-sides"
                ? "Interior partitions are counted on both drywall faces."
                : "This method uses the linear feet as one drywall face."}
            </div>
          </div>

          <div className="mt-4 rounded-[18px] border border-sky-100 bg-sky-50 px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700">Calculated proposed LF</div>
            <div className="mt-1 text-2xl font-bold text-slate-950">{formatNumber(calculation.linearFeet, 2)} ft</div>
            <div className="mt-1 text-xs font-semibold leading-5 text-slate-600">
              {calculation.rulerLinearFeet > 0 ? "Using ruler length and scale." : "Using typed linear feet."} Area uses {calculation.wallSideMultiplier === 2 ? "both drywall faces" : "one drywall face"}.
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4">
        <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-normal text-slate-950">Door and window schedule</h2>
              <p className="text-sm leading-5 text-slate-500">Rows subtract openings from the proposed drywall area.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => addOpening("door")} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700">
                <PlusIcon />
                Door
              </button>
              <button type="button" onClick={() => addOpening("window")} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700">
                <PlusIcon />
                Window
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {openings.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                No schedule rows yet. Add rows manually, or upload a plan above to extract door and window sizes.
              </div>
            ) : (
              openings.map((row) => (
                <div key={row.id} className="grid gap-2 rounded-[18px] border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[0.9fr_0.8fr_0.65fr_0.8fr_0.8fr_0.8fr_auto] sm:items-end">
                  <label className="grid gap-1 text-xs font-bold text-slate-600">
                    Type
                    <select value={row.kind} onChange={(event) => updateOpening(row.id, "kind", event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950">
                      <option value="door">Door</option>
                      <option value="window">Window</option>
                      <option value="opening">Opening</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-slate-600">
                    Mark
                    <input value={row.mark} onChange={(event) => updateOpening(row.id, "mark", event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950" />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-slate-600">
                    Qty
                    <input value={row.quantity} onChange={(event) => updateOpening(row.id, "quantity", event.target.value)} inputMode="decimal" className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950" />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-slate-600">
                    Width ft
                    <input value={row.width} onChange={(event) => updateOpening(row.id, "width", event.target.value)} inputMode="decimal" className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950" />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-slate-600">
                    Height ft
                    <input value={row.height} onChange={(event) => updateOpening(row.id, "height", event.target.value)} inputMode="decimal" className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950" />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-slate-600">
                    Area sq ft
                    <input value={row.area} onChange={(event) => updateOpening(row.id, "area", event.target.value)} inputMode="decimal" className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950" />
                  </label>
                  <button type="button" onClick={() => removeOpening(row.id)} className="h-11 rounded-2xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700">
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Extra opening area sq ft
              <input value={manualOpeningArea} onChange={(event) => setManualOpeningArea(event.target.value)} inputMode="decimal" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Outside corners
              <input value={outsideCorners} onChange={(event) => setOutsideCorners(event.target.value)} inputMode="decimal" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
            </label>
          </div>
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-normal text-slate-950">Proposed area and sheets</h2>
              <p className="text-sm leading-5 text-slate-500">Calculated from linear feet x section height, minus openings.</p>
            </div>
            <button type="button" onClick={copyMaterialList} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800">
              <CopyIcon />
              Copy list
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Board size
              <select value={sheetLength} onChange={(event) => setSheetLength(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100">
                <option value="8">4x8 standard</option>
                <option value="10">4x10</option>
                <option value="12">4x12</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Waste percent
              <input value={wastePercent} onChange={(event) => setWastePercent(event.target.value)} inputMode="decimal" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
            </label>
            <label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800">
              Include ceiling
              <input type="checkbox" checked={includeCeiling} onChange={(event) => setIncludeCeiling(event.target.checked)} className="h-5 w-5 accent-sky-600" />
            </label>
          </div>

          {includeCeiling ? (
            <label className="mt-3 grid gap-1.5 text-sm font-semibold text-slate-700">
              Proposed ceiling area sq ft
              <input value={ceilingArea} onChange={(event) => setCeilingArea(event.target.value)} inputMode="decimal" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
            </label>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Proposed area</div>
              <div className="mt-1 text-lg font-bold text-slate-950">{formatNumber(calculation.proposedArea)} sq ft</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Openings</div>
              <div className="mt-1 text-lg font-bold text-slate-950">{formatNumber(calculation.openingsArea)} sq ft</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Net area</div>
              <div className="mt-1 text-lg font-bold text-slate-950">{formatNumber(calculation.netArea)} sq ft</div>
            </div>
            <div className="rounded-2xl bg-sky-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700">Order area</div>
              <div className="mt-1 text-lg font-bold text-slate-950">{formatNumber(calculation.orderArea)} sq ft</div>
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

          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">
            Review plan scale and field conditions before ordering. Bathrooms should use moisture-resistant board, shower areas should use cement board, and garages usually need 5/8 Type X fire-rated board.
          </div>
          {copyStatus ? <div className="mt-3 text-sm font-semibold text-sky-700">{copyStatus}</div> : null}
        </section>
      </div>
    </section>
  );
}
