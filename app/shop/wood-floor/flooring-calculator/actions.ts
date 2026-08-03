"use server";

import { getSessionWithProfile } from "@/lib/auth";
import { calculateWoodFloorMaterials } from "@/lib/wood-floor-takeoff-materials";
import {
  extractWoodFloorTakeoffFromBytes,
  extractWoodFloorTakeoffFromFile,
  type WoodFloorRoom,
  type WoodFloorTakeoffResult,
} from "@/lib/wood-floor-takeoff-extraction";
import { generateMarkedWoodFloorPlanAttachment, generateWoodFloorTakeoffPdf } from "@/lib/wood-floor-takeoff-pdf";
import {
  buildProjectUploadStoragePath,
  createProjectEvent,
  PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES,
  PROJECT_UPLOAD_STORAGE_BUCKET,
  type ProjectRecord,
} from "@/lib/projects";
import { createAdminClient } from "@/lib/supabase/admin";

export type WoodFloorTakeoffActionState = {
  status: "idle" | "success" | "error";
  message: string;
  result: WoodFloorTakeoffResult | null;
  saved?: {
    projectId: string;
    projectName: string;
    blueprintUploadId: string;
    sourceFileName?: string;
    takeoffUploadId?: string | null;
    takeoffFileName?: string | null;
    markedPlanUploadId?: string | null;
    markedPlanFileName?: string | null;
  } | null;
};

export type ReviewedWoodFloorRoomInput = Pick<WoodFloorRoom, "id" | "name" | "level" | "areaSqft" | "includeInTakeoff" | "roomType" | "reason" | "bboxPercent" | "confidence">;

export type ReviewedWoodFloorTakeoffInput = {
  projectId: string;
  blueprintUploadId: string;
  rooms: ReviewedWoodFloorRoomInput[];
  wastePercent?: number | null;
  sqftPerBox?: number | null;
  notes?: string | null;
  sourceNote?: string | null;
  productSelection?: {
    supplierName: string;
    productName: string;
    productUrl: string;
    thickness: string;
    species: string;
    grade: string;
    width: string;
    length: string;
    installationType: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    sqftPerBox?: number;
    pricePerSqft?: number;
    deliveryFee?: number;
    invoiceTotal?: number;
  };
};

const WOOD_FLOOR_ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;

function validatePlanFileInfo(fileInfo: {
  fileName: string;
  fileType: string;
  fileSize: number;
}) {
  if (!fileInfo.fileName.trim()) return "Missing file name.";
  if (!WOOD_FLOOR_ALLOWED_MIME_TYPES.includes(fileInfo.fileType as (typeof WOOD_FLOOR_ALLOWED_MIME_TYPES)[number])) {
    return "Allowed files: PDF, PNG, JPG, or WEBP.";
  }
  if (!Number.isFinite(fileInfo.fileSize) || fileInfo.fileSize <= 0) {
    return "Choose a wood floor plan, finish plan, or room schedule first.";
  }
  if (fileInfo.fileSize > PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES) {
    return "File is too large. Keep it at 25 MB or below.";
  }
  return null;
}

function positiveNumber(value: number | null | undefined) {
  if (!Number.isFinite(value) || Number(value) <= 0) return null;
  return Number(Number(value).toFixed(2));
}

function normalizeReviewedRooms(rooms: ReviewedWoodFloorRoomInput[]): WoodFloorRoom[] {
  return rooms
    .slice(0, 200)
    .map((room, index) => {
      const roomType: WoodFloorRoom["roomType"] =
        room.roomType === "bathroom" ||
        room.roomType === "basement" ||
        room.roomType === "kitchen" ||
        room.roomType === "hallway" ||
        room.roomType === "bedroom" ||
        room.roomType === "living" ||
        room.roomType === "closet"
          ? room.roomType
          : "other";
      const includeInTakeoff = roomType === "basement" ? false : Boolean(room.includeInTakeoff);

      return {
        id: String(room.id || `room-${index}`).trim(),
        name: String(room.name || `Room ${index + 1}`).trim(),
        level: room.level?.trim() || null,
        areaSqft: positiveNumber(room.areaSqft) || 0,
        includeInTakeoff,
        roomType,
        reason: room.reason?.trim() || (includeInTakeoff ? "Selected for wood floor." : "Excluded from wood floor."),
        bboxPercent: room.bboxPercent,
        confidence: room.confidence,
      };
    })
    .filter((room) => room.areaSqft > 0);
}

async function getOwnedProject(projectId: string) {
  const { supabase, user } = await getSessionWithProfile();
  if (!user) {
    throw new Error("Sign in before saving a wood floor takeoff.");
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

export async function prepareWoodFloorPlanUploadAction(input: {
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
    console.error("Wood floor plan signed upload URL error", {
      message: error?.message,
      name: error?.name,
    });
    return { ok: false as const, message: "Could not prepare the flooring plan upload. Please try again." };
  }

  return { ok: true as const, uploadId, filePath, token: data.token };
}

export async function extractWoodFloorTakeoffAction(
  _prevState: WoodFloorTakeoffActionState,
  formData: FormData,
): Promise<WoodFloorTakeoffActionState> {
  const fileEntry = formData.get("planFile");

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return { status: "error", message: "Choose a wood floor plan, finish plan, or room schedule first.", result: null, saved: null };
  }

  const fileError = validatePlanFileInfo({
    fileName: fileEntry.name,
    fileType: fileEntry.type,
    fileSize: fileEntry.size,
  });
  if (fileError) return { status: "error", message: fileError, result: null, saved: null };

  try {
    const result = await extractWoodFloorTakeoffFromFile(fileEntry);
    return {
      status: result.rooms.length > 0 ? "success" : "error",
      message: result.rooms.length > 0 ? "Rooms extracted. Review selected rooms before ordering." : result.notes,
      result,
      saved: null,
    };
  } catch (error) {
    console.error("Wood floor takeoff extraction failed", error);
    return { status: "error", message: "Automatic wood floor extraction failed. Try a clearer plan or enter rooms manually.", result: null, saved: null };
  }
}

export async function completeWoodFloorPlanTakeoffAction(input: {
  projectId: string;
  uploadId: string;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}): Promise<WoodFloorTakeoffActionState> {
  const fileError = validatePlanFileInfo(input);
  if (fileError) return { status: "error", message: fileError, result: null, saved: null };

  try {
    const { supabase, user, project } = await getOwnedProject(input.projectId);
    const expectedPrefix = `${user.id}/${project.id}/${input.uploadId}-`;
    if (!input.filePath.startsWith(expectedPrefix)) {
      return { status: "error", message: "Uploaded plan path does not match this project.", result: null, saved: null };
    }

    const admin = createAdminClient();
    const { data: downloaded, error: downloadError } = await admin.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).download(input.filePath);
    if (downloadError || !downloaded) {
      return { status: "error", message: "Plan uploaded, but the saved file could not be read for takeoff.", result: null, saved: null };
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

    const result = await extractWoodFloorTakeoffFromBytes({
      bytes: Buffer.from(await downloaded.arrayBuffer()),
      mimeType: input.fileType,
      fileName: input.fileName,
    });

    await supabase.from("project_uploads").update({ status: "ready" }).eq("id", input.uploadId).eq("owner_id", user.id);
    await createProjectEvent({
      supabase,
      projectId: project.id,
      ownerId: user.id,
      eventType: "file_uploaded",
      source: "upload",
      title: "Wood floor plan extracted",
      description: `${input.fileName} was saved and read for wood floor takeoff review.`,
      metadata: {
        upload_id: input.uploadId,
        blueprint_upload_id: input.uploadId,
        wood_floor_takeoff: { result },
      },
    });

    return {
      status: result.rooms.length > 0 ? "success" : "error",
      message:
        result.rooms.length > 0
          ? "Plan saved and rooms extracted. Review which rooms get wood floor, then save the reviewed PDF."
          : "Plan was saved, but room square footage was not readable. Add rooms manually, then save the reviewed PDF.",
      result,
      saved: {
        projectId: project.id,
        projectName: project.name,
        blueprintUploadId: input.uploadId,
        sourceFileName: input.fileName,
        takeoffUploadId: null,
        takeoffFileName: null,
        markedPlanUploadId: null,
        markedPlanFileName: null,
      },
    };
  } catch (error) {
    console.error("Wood floor saved takeoff failed", error);
    const session = await getSessionWithProfile();
    return {
      status: "error",
      message: session.user ? "Saved wood floor takeoff failed. Please try again." : "Sign in before saving a wood floor takeoff.",
      result: null,
      saved: null,
    };
  }
}

export async function saveReviewedWoodFloorTakeoffAction(input: ReviewedWoodFloorTakeoffInput): Promise<WoodFloorTakeoffActionState> {
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
        file_path: string;
        file_type: string | null;
      }>();

    if (blueprintError || !blueprint) {
      return { status: "error", message: "Save the plan to this project before creating the reviewed wood floor PDF.", result: null, saved: null };
    }

    const rooms = normalizeReviewedRooms(input.rooms);
    const takeoff: WoodFloorTakeoffResult = {
      rooms,
      sourceNote: input.sourceNote?.trim() || "Reviewed wood floor takeoff values were confirmed in BuildFlow before PDF save.",
      notes: input.notes?.trim() || "Reviewed wood floor takeoff saved after room selection.",
    };
    const calculation = calculateWoodFloorMaterials({
      rooms,
      wastePercent: input.wastePercent ?? 10,
      sqftPerBox: input.sqftPerBox ?? 20,
      pricePerSqft: input.productSelection?.pricePerSqft ?? null,
      deliveryFee: input.productSelection?.deliveryFee ?? null,
    });

    if (calculation.selectedAreaSqft <= 0) {
      return {
        status: "error",
        message: "Select at least one room with square footage before saving the wood floor takeoff.",
        result: takeoff,
        saved: {
          projectId: project.id,
          projectName: project.name,
          blueprintUploadId: blueprint.id,
          sourceFileName: blueprint.file_name,
        },
      };
    }

    const admin = createAdminClient();
    const { data: downloaded, error: downloadError } = await admin.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).download(blueprint.file_path);
    if (downloadError || !downloaded) {
      return { status: "error", message: "The saved plan could not be downloaded for marker attachment.", result: takeoff, saved: null };
    }

    const sourceBytes = Buffer.from(await downloaded.arrayBuffer());
    const takeoffUploadId = crypto.randomUUID();
    const markedPlanUploadId = crypto.randomUUID();
    const takeoffFileName = `wood-floor-takeoff-reviewed-${blueprint.id.slice(0, 8)}.pdf`;
    const markedPlanFileName = `wood-floor-marked-plan-${blueprint.id.slice(0, 8)}.pdf`;
    const takeoffPath = buildProjectUploadStoragePath({ ownerId: user.id, projectId: project.id, uploadId: takeoffUploadId, fileName: takeoffFileName });
    const markedPlanPath = buildProjectUploadStoragePath({ ownerId: user.id, projectId: project.id, uploadId: markedPlanUploadId, fileName: markedPlanFileName });
    const pdfBytes = await generateWoodFloorTakeoffPdf({
      project,
      sourceFileName: blueprint.file_name,
      takeoff,
      calculation,
      createdAt: new Date(),
      productSelection: input.productSelection,
    });
    const markedPlanBytes = await generateMarkedWoodFloorPlanAttachment({
      sourceBytes,
      mimeType: blueprint.file_type || "application/pdf",
      sourceFileName: blueprint.file_name,
      rooms,
      calculation,
    });

    const [{ error: pdfStorageError }, { error: markedStorageError }] = await Promise.all([
      admin.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).upload(takeoffPath, pdfBytes, { contentType: "application/pdf", upsert: false }),
      admin.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).upload(markedPlanPath, markedPlanBytes, { contentType: "application/pdf", upsert: false }),
    ]);

    if (pdfStorageError || markedStorageError) {
      console.error("Wood floor PDF storage error", {
        pdf: pdfStorageError?.message,
        marked: markedStorageError?.message,
      });
      return { status: "error", message: "The reviewed values are ready, but the PDF attachments could not be saved.", result: takeoff, saved: null };
    }

    await supabase.from("project_uploads").upsert([
      {
        id: takeoffUploadId,
        project_id: project.id,
        owner_id: user.id,
        file_name: takeoffFileName,
        file_path: takeoffPath,
        file_type: "application/pdf",
        file_size: pdfBytes.byteLength,
        status: "ready",
      },
      {
        id: markedPlanUploadId,
        project_id: project.id,
        owner_id: user.id,
        file_name: markedPlanFileName,
        file_path: markedPlanPath,
        file_type: "application/pdf",
        file_size: markedPlanBytes.byteLength,
        status: "ready",
      },
    ]);

    await createProjectEvent({
      supabase,
      projectId: project.id,
      ownerId: user.id,
      eventType: "file_uploaded",
      source: "upload",
      title: "Reviewed wood floor takeoff saved",
      description: `${takeoffFileName} and a marked plan attachment were saved to project documents.`,
      metadata: {
        blueprint_upload_id: blueprint.id,
        takeoff_upload_id: takeoffUploadId,
        marked_plan_upload_id: markedPlanUploadId,
        wood_floor_takeoff: { takeoff, calculation },
        product_selection: input.productSelection ?? null,
      },
    });

    return {
      status: "success",
      message: "Reviewed wood floor takeoff PDF and marked plan attachment saved to the project documents.",
      result: takeoff,
      saved: {
        projectId: project.id,
        projectName: project.name,
        blueprintUploadId: blueprint.id,
        sourceFileName: blueprint.file_name,
        takeoffUploadId,
        takeoffFileName,
        markedPlanUploadId,
        markedPlanFileName,
      },
    };
  } catch (error) {
    console.error("Reviewed wood floor takeoff save failed", error);
    const session = await getSessionWithProfile();
    return {
      status: "error",
      message: session.user ? "Reviewed wood floor PDF save failed. Please try again." : "Sign in before saving a reviewed wood floor PDF.",
      result: null,
      saved: null,
    };
  }
}
