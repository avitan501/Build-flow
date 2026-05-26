"use server";

import {
  extractDrywallPlanTakeoffFromBytes,
  extractDrywallPlanTakeoffFromFile,
  type DrywallPlanOpening,
  type DrywallPlanTakeoffResult,
} from "@/lib/drywall-plan-takeoff-extraction";
import { getSessionWithProfile } from "@/lib/auth";
import { calculateDrywallMaterials } from "@/lib/drywall-takeoff-materials";
import { generateDrywallTakeoffPdf } from "@/lib/drywall-takeoff-pdf";
import {
  buildProjectUploadStoragePath,
  createProjectEvent,
  PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES,
  PROJECT_UPLOAD_STORAGE_BUCKET,
  type ProjectRecord,
} from "@/lib/projects";
import { createAdminClient } from "@/lib/supabase/admin";

export type DrywallPlanTakeoffActionState = {
  status: "idle" | "success" | "error";
  message: string;
  result: DrywallPlanTakeoffResult | null;
  saved?: {
    projectId: string;
    projectName: string;
    blueprintUploadId: string;
    sourceFileName?: string;
    takeoffUploadId?: string | null;
    takeoffFileName?: string | null;
  } | null;
};

export type DrywallReviewedOpeningInput = {
  kind: DrywallPlanOpening["kind"];
  mark?: string | null;
  quantity?: number | null;
  widthFeet?: number | null;
  heightFeet?: number | null;
  areaSqft?: number | null;
  source?: string | null;
};

export type DrywallReviewedTakeoffInput = {
  projectId: string;
  blueprintUploadId: string;
  proposedLinearFeet?: number | null;
  wallHeightFeet?: number | null;
  ceilingAreaSqft?: number | null;
  outsideCorners?: number | null;
  openings?: DrywallReviewedOpeningInput[];
  wastePercent?: number | null;
  sheetLengthFeet?: number | null;
  wallSideMultiplier?: number | null;
  notes?: string | null;
  scaleNote?: string | null;
  sectionNote?: string | null;
};

const DRYWALL_PLAN_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

function validatePlanFileInfo(fileInfo: {
  fileName: string;
  fileType: string;
  fileSize: number;
}) {
  if (!fileInfo.fileName.trim()) return "Missing file name.";
  if (!DRYWALL_PLAN_ALLOWED_MIME_TYPES.includes(fileInfo.fileType as (typeof DRYWALL_PLAN_ALLOWED_MIME_TYPES)[number])) {
    return "Allowed files: PDF, PNG, JPG, or WEBP.";
  }
  if (!Number.isFinite(fileInfo.fileSize) || fileInfo.fileSize <= 0) {
    return "Choose a proposed floor plan, section sheet, or full plan PDF first.";
  }
  if (fileInfo.fileSize > PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES) {
    return "File is too large. Keep it at 25 MB or below.";
  }
  return null;
}

function hasUsableDrywallMeasurement(result: DrywallPlanTakeoffResult) {
  return Boolean(result.proposedLinearFeet && result.wallHeightFeet);
}

function getWallSideMultiplier(result: DrywallPlanTakeoffResult) {
  const scaleNote = result.scaleNote?.toLowerCase() || "";
  const usedExteriorFootprint = scaleNote.includes("building area diagram") || scaleNote.includes("total proposed building area");
  return usedExteriorFootprint ? 1 : 2;
}

function positiveNumber(value: number | null | undefined) {
  if (!Number.isFinite(value) || Number(value) <= 0) return null;
  return Number(Number(value).toFixed(2));
}

function normalizeReviewedOpenings(openings: DrywallReviewedOpeningInput[] | null | undefined): DrywallPlanOpening[] {
  return (openings || [])
    .slice(0, 200)
    .map((opening, index) => {
      const kind: DrywallPlanOpening["kind"] = opening.kind === "door" || opening.kind === "window" ? opening.kind : "opening";
      const quantity = positiveNumber(opening.quantity) ?? 1;
      const widthFeet = positiveNumber(opening.widthFeet);
      const heightFeet = positiveNumber(opening.heightFeet);
      const areaSqft = positiveNumber(opening.areaSqft);

      return {
        kind,
        mark: String(opening.mark || `${kind} ${index + 1}`).trim(),
        location: null,
        quantity,
        widthLabel: widthFeet ? `${widthFeet} ft` : null,
        heightLabel: heightFeet ? `${heightFeet} ft` : null,
        widthFeet,
        heightFeet,
        areaSqft,
        source: String(opening.source || "Reviewed takeoff").trim(),
        confidence: null,
      };
    })
    .filter((opening) => opening.areaSqft || (opening.widthFeet && opening.heightFeet));
}

function buildReviewedTakeoffResult(input: DrywallReviewedTakeoffInput): DrywallPlanTakeoffResult {
  return {
    proposedLinearFeet: positiveNumber(input.proposedLinearFeet),
    wallHeightFeet: positiveNumber(input.wallHeightFeet),
    ceilingAreaSqft: positiveNumber(input.ceilingAreaSqft),
    outsideCorners: positiveNumber(input.outsideCorners),
    scaleNote: input.scaleNote?.trim() || "Reviewed takeoff values were confirmed in BuildFlow before the PDF was saved.",
    sectionNote: input.sectionNote?.trim() || null,
    openings: normalizeReviewedOpenings(input.openings),
    notes: input.notes?.trim() || "Reviewed drywall takeoff saved after manual review.",
  };
}

async function getOwnedProject(projectId: string) {
  const { supabase, user } = await getSessionWithProfile();
  if (!user) {
    throw new Error("Sign in before saving a blueprint and takeoff PDF.");
  }
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, owner_id, name, address, status, created_at, updated_at")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle<ProjectRecord>();

  if (error || !project) {
    throw new Error("Project was not found for this account.");
  }

  return { supabase, user, project };
}

export async function prepareDrywallPlanUploadAction(input: {
  projectId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}) {
  const fileError = validatePlanFileInfo(input);
  if (fileError) return { ok: false as const, message: fileError };

  const { user } = await getOwnedProject(input.projectId);
  const uploadId = crypto.randomUUID();
  const filePath = buildProjectUploadStoragePath({
    ownerId: user.id,
    projectId: input.projectId,
    uploadId,
    fileName: input.fileName,
  });
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).createSignedUploadUrl(filePath);

  if (error || !data?.token) {
    console.error("Drywall plan signed upload URL error", {
      message: error?.message,
      name: error?.name,
    });
    return { ok: false as const, message: "Could not prepare the blueprint upload. Please try again." };
  }

  return {
    ok: true as const,
    uploadId,
    filePath,
    token: data.token,
  };
}

export async function extractDrywallPlanTakeoffAction(
  _prevState: DrywallPlanTakeoffActionState,
  formData: FormData,
): Promise<DrywallPlanTakeoffActionState> {
  const fileEntry = formData.get("planFile");

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return {
      status: "error",
      message: "Choose a proposed floor plan, section sheet, or full plan PDF first.",
      result: null,
      saved: null,
    };
  }

  const fileError = validatePlanFileInfo({
    fileName: fileEntry.name,
    fileType: fileEntry.type,
    fileSize: fileEntry.size,
  });
  if (fileError) {
    return {
      status: "error",
      message: fileError,
      result: null,
      saved: null,
    };
  }

  try {
    const result = await extractDrywallPlanTakeoffFromFile(fileEntry);
    const hasTakeoff =
      Boolean(result.proposedLinearFeet) ||
      Boolean(result.wallHeightFeet) ||
      Boolean(result.ceilingAreaSqft) ||
      result.openings.length > 0;
    const hasMaterialTakeoff = hasUsableDrywallMeasurement(result);

    return {
      status: hasMaterialTakeoff ? "success" : "error",
      message: hasMaterialTakeoff
        ? "Plan values extracted and applied. Review and adjust before ordering."
        : hasTakeoff
          ? "Some plan values were found, but wall linear feet and wall height are both required for a material takeoff."
          : result.notes,
      result,
      saved: null,
    };
  } catch (error) {
    console.error("Drywall plan takeoff extraction failed", error);
    return {
      status: "error",
      message: "Automatic plan extraction failed. Use the ruler inputs below or try a clearer plan sheet.",
      result: null,
      saved: null,
    };
  }
}

export async function completeDrywallPlanTakeoffAction(input: {
  projectId: string;
  uploadId: string;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}): Promise<DrywallPlanTakeoffActionState> {
  const fileError = validatePlanFileInfo(input);
  if (fileError) {
    return { status: "error", message: fileError, result: null, saved: null };
  }

  try {
    const { supabase, user, project } = await getOwnedProject(input.projectId);
    const expectedPrefix = `${user.id}/${project.id}/${input.uploadId}-`;
    if (!input.filePath.startsWith(expectedPrefix)) {
      return {
        status: "error",
        message: "Uploaded blueprint path does not match this project.",
        result: null,
        saved: null,
      };
    }

    const admin = createAdminClient();
    const { data: downloaded, error: downloadError } = await admin.storage
      .from(PROJECT_UPLOAD_STORAGE_BUCKET)
      .download(input.filePath);

    if (downloadError || !downloaded) {
      console.error("Drywall plan download error", {
        message: downloadError?.message,
        name: downloadError?.name,
      });
      return {
        status: "error",
        message: "Blueprint uploaded, but the saved file could not be read for takeoff.",
        result: null,
        saved: null,
      };
    }

    await supabase.from("project_uploads").upsert({
      id: input.uploadId,
      project_id: project.id,
      owner_id: user.id,
      file_name: input.fileName,
      file_path: input.filePath,
      file_type: input.fileType,
      file_size: input.fileSize,
      status: "processing",
    });

    const result = await extractDrywallPlanTakeoffFromBytes({
      bytes: Buffer.from(await downloaded.arrayBuffer()),
      mimeType: input.fileType,
      fileName: input.fileName,
    });

    if (!hasUsableDrywallMeasurement(result)) {
      await supabase
        .from("project_uploads")
        .update({ status: "ready" })
        .eq("id", input.uploadId)
        .eq("owner_id", user.id);

      return {
        status: "error",
        message: "Blueprint was saved, but the takeoff could not read both wall linear feet and wall height. Add the measurements manually, then save the reviewed PDF.",
        result,
        saved: {
          projectId: project.id,
          projectName: project.name,
          blueprintUploadId: input.uploadId,
          sourceFileName: input.fileName,
          takeoffUploadId: null,
          takeoffFileName: null,
        },
      };
    }

    await supabase
      .from("project_uploads")
      .update({ status: "ready" })
      .eq("id", input.uploadId)
      .eq("owner_id", user.id);

    await createProjectEvent({
      supabase,
      projectId: project.id,
      ownerId: user.id,
      eventType: "file_uploaded",
      source: "upload",
      title: "Drywall blueprint extracted",
      description: `${input.fileName} was saved and read for drywall takeoff review.`,
      metadata: {
        upload_id: input.uploadId,
        blueprint_upload_id: input.uploadId,
        drywall_takeoff: {
          result,
          default_wall_side_multiplier: getWallSideMultiplier(result),
        },
      },
    });

    return {
      status: "success",
      message: "Blueprint saved and values extracted. Review the numbers below, then save the reviewed takeoff PDF.",
      result,
      saved: {
        projectId: project.id,
        projectName: project.name,
        blueprintUploadId: input.uploadId,
        sourceFileName: input.fileName,
        takeoffUploadId: null,
        takeoffFileName: null,
      },
    };
  } catch (error) {
    console.error("Drywall saved takeoff failed", error);
    const session = await getSessionWithProfile();
    return {
      status: "error",
      message: session.user ? "Saved takeoff failed. Please try again." : "Sign in before saving a blueprint and takeoff PDF.",
      result: null,
      saved: null,
    };
  }
}

export async function saveReviewedDrywallTakeoffAction(input: DrywallReviewedTakeoffInput): Promise<DrywallPlanTakeoffActionState> {
  try {
    const { supabase, user, project } = await getOwnedProject(input.projectId);
    const { data: blueprint, error: blueprintError } = await supabase
      .from("project_uploads")
      .select("id, project_id, owner_id, file_name, file_path, file_type, file_size, status, created_at")
      .eq("id", input.blueprintUploadId)
      .eq("project_id", project.id)
      .eq("owner_id", user.id)
      .maybeSingle<{
        id: string;
        file_name: string;
      }>();

    if (blueprintError || !blueprint) {
      return {
        status: "error",
        message: "Save the blueprint to this project before creating the reviewed takeoff PDF.",
        result: null,
        saved: null,
      };
    }

    const result = buildReviewedTakeoffResult(input);
    if (!hasUsableDrywallMeasurement(result)) {
      return {
        status: "error",
        message: "Wall linear feet and section wall height are required before saving the reviewed takeoff PDF.",
        result,
        saved: {
          projectId: project.id,
          projectName: project.name,
          blueprintUploadId: blueprint.id,
          sourceFileName: blueprint.file_name,
          takeoffUploadId: null,
          takeoffFileName: null,
        },
      };
    }

    const wastePercent = Number.isFinite(input.wastePercent) ? Math.min(Math.max(Number(input.wastePercent), 0), 35) : 10;
    const sheetLengthFeet = positiveNumber(input.sheetLengthFeet) ?? 8;
    const wallSideMultiplier = positiveNumber(input.wallSideMultiplier) ?? 1;
    const calculation = calculateDrywallMaterials({
      proposedLinearFeet: result.proposedLinearFeet,
      wallHeightFeet: result.wallHeightFeet,
      ceilingAreaSqft: result.ceilingAreaSqft,
      outsideCorners: result.outsideCorners,
      openings: result.openings,
      wastePercent,
      sheetLengthFeet,
      wallSideMultiplier,
    });

    const takeoffUploadId = crypto.randomUUID();
    const takeoffFileName = `drywall-takeoff-reviewed-${input.blueprintUploadId.slice(0, 8)}.pdf`;
    const takeoffPath = buildProjectUploadStoragePath({
      ownerId: user.id,
      projectId: project.id,
      uploadId: takeoffUploadId,
      fileName: takeoffFileName,
    });
    const pdfBytes = generateDrywallTakeoffPdf({
      project,
      sourceFileName: blueprint.file_name,
      takeoff: result,
      calculation,
      createdAt: new Date(),
    });

    const admin = createAdminClient();
    const { error: pdfStorageError } = await admin.storage
      .from(PROJECT_UPLOAD_STORAGE_BUCKET)
      .upload(takeoffPath, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (pdfStorageError) {
      console.error("Reviewed drywall takeoff PDF storage error", {
        message: pdfStorageError.message,
        name: pdfStorageError.name,
      });
      return {
        status: "error",
        message: "The reviewed values are ready, but the takeoff PDF could not be saved.",
        result,
        saved: {
          projectId: project.id,
          projectName: project.name,
          blueprintUploadId: blueprint.id,
          sourceFileName: blueprint.file_name,
          takeoffUploadId: null,
          takeoffFileName: null,
        },
      };
    }

    const { error: uploadRecordError } = await supabase.from("project_uploads").upsert({
      id: takeoffUploadId,
      project_id: project.id,
      owner_id: user.id,
      file_name: takeoffFileName,
      file_path: takeoffPath,
      file_type: "application/pdf",
      file_size: pdfBytes.byteLength,
      status: "ready",
    });

    if (uploadRecordError) {
      console.error("Reviewed drywall takeoff upload record error", {
        message: uploadRecordError.message,
        name: uploadRecordError.name,
      });
      return {
        status: "error",
        message: "The reviewed PDF was created, but it could not be added to project documents.",
        result,
        saved: {
          projectId: project.id,
          projectName: project.name,
          blueprintUploadId: blueprint.id,
          sourceFileName: blueprint.file_name,
          takeoffUploadId: null,
          takeoffFileName: null,
        },
      };
    }

    await createProjectEvent({
      supabase,
      projectId: project.id,
      ownerId: user.id,
      eventType: "file_uploaded",
      source: "upload",
      title: "Reviewed drywall takeoff saved",
      description: `${takeoffFileName} was created from reviewed drywall takeoff values.`,
      metadata: {
        blueprint_upload_id: blueprint.id,
        takeoff_upload_id: takeoffUploadId,
        takeoff_file_name: takeoffFileName,
        drywall_takeoff: {
          result,
          calculation,
        },
      },
    });

    return {
      status: "success",
      message: "Reviewed drywall takeoff PDF saved to the project documents.",
      result,
      saved: {
        projectId: project.id,
        projectName: project.name,
        blueprintUploadId: blueprint.id,
        sourceFileName: blueprint.file_name,
        takeoffUploadId,
        takeoffFileName,
      },
    };
  } catch (error) {
    console.error("Reviewed drywall takeoff save failed", error);
    const session = await getSessionWithProfile();
    return {
      status: "error",
      message: session.user ? "Reviewed takeoff PDF save failed. Please try again." : "Sign in before saving a reviewed takeoff PDF.",
      result: null,
      saved: null,
    };
  }
}
