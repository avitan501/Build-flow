import { NextResponse } from "next/server";

import { getSessionWithProfile } from "@/lib/auth";
import { captureOperationalError } from "@/lib/monitoring/capture-operational-error";
import { managerCapabilities } from "@/lib/owner-identity";
import type { ClientQuoteAttachmentRecord } from "@/lib/quote-comparison";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "project-uploads";
const MAX_FILES = 10;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/csv",
]);

type UploadInput = {
  action?: unknown;
  comparisonId?: unknown;
  filePath?: unknown;
  fileName?: unknown;
  fileType?: unknown;
  fileSize?: unknown;
};

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function displayName(value: string) {
  return value.normalize("NFC").replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim().slice(0, 180) || "attachment";
}

function storageName(value: string) {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9._ -]/g, "_").replace(/\s+/g, " ").trim().slice(-180) || "attachment";
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function fileInput(body: UploadInput) {
  const fileName = text(body.fileName, 220);
  const fileType = text(body.fileType, 160).toLowerCase();
  const fileSize = Number(body.fileSize);
  if (!fileName || !Number.isSafeInteger(fileSize) || fileSize <= 0) return { error: "Choose a photo or file." } as const;
  if (fileSize > MAX_FILE_SIZE) return { error: "Each attachment must be 25 MB or smaller." } as const;
  if (!ALLOWED_TYPES.has(fileType)) return { error: "Use a photo, PDF, Word, Excel, or CSV file." } as const;
  return { fileName, fileType, fileSize } as const;
}

async function staffSession() {
  const session = await getSessionWithProfile();
  if (!session.user || !session.supabase) return null;
  const access = managerCapabilities({
    email: session.user.email || session.profile?.email,
    role: session.profile?.role,
    approvalStatus: session.profile?.approval_status,
    isActive: session.profile?.is_active,
  });
  return access.suppliers ? session : null;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 403 });
  try {
    const session = await staffSession();
    if (!session?.user || !session.supabase) return NextResponse.json({ ok: false, error: "Manager sign-in is required." }, { status: 401 });
    const body = await request.json() as UploadInput;
    const comparisonId = text(body.comparisonId, 100);
    const file = fileInput(body);
    if ("error" in file) return NextResponse.json({ ok: false, error: file.error }, { status: 400 });
    if (!comparisonId) return NextResponse.json({ ok: false, error: "The quote could not be found." }, { status: 400 });

    const { data: comparison } = await session.supabase.from("quote_comparisons").select("id").eq("id", comparisonId).maybeSingle<{ id: string }>();
    if (!comparison) return NextResponse.json({ ok: false, error: "The quote could not be found." }, { status: 404 });
    const storage = session.supabase.storage.from(BUCKET);

    if (body.action === "prepare") {
      const filePath = `client-quotes/${comparisonId}/${session.user.id}/${crypto.randomUUID()}-${storageName(file.fileName)}`;
      const { data, error } = await storage.createSignedUploadUrl(filePath);
      if (error || !data?.token) return NextResponse.json({ ok: false, error: "The private upload could not be prepared. Try again." }, { status: 503 });
      return NextResponse.json({ ok: true, data: { filePath, token: data.token } });
    }

    if (body.action !== "complete") return NextResponse.json({ ok: false, error: "Invalid upload action." }, { status: 400 });
    const filePath = text(body.filePath, 1200);
    const expectedPrefix = `client-quotes/${comparisonId}/${session.user.id}/`;
    if (!filePath.startsWith(expectedPrefix) || filePath.includes("..")) return NextResponse.json({ ok: false, error: "The uploaded file could not be verified." }, { status: 400 });
    const discard = () => storage.remove([filePath]);
    const { data: existing, error: existingError } = await session.supabase
      .from("quote_comparison_client_attachments")
      .select("file_size")
      .eq("comparison_id", comparisonId)
      .returns<Array<{ file_size: number }>>();
    if (existingError) {
      await discard();
      return NextResponse.json({ ok: false, error: "The quote attachments could not be loaded." }, { status: 503 });
    }
    if ((existing ?? []).length >= MAX_FILES) {
      await discard();
      return NextResponse.json({ ok: false, error: `Add up to ${MAX_FILES} attachments.` }, { status: 400 });
    }
    const totalSize = (existing ?? []).reduce((sum, item) => sum + Number(item.file_size || 0), 0) + file.fileSize;
    if (totalSize > MAX_TOTAL_SIZE) {
      await discard();
      return NextResponse.json({ ok: false, error: "Keep all attachments together under 25 MB." }, { status: 400 });
    }

    const { data: info, error: infoError } = await storage.info(filePath);
    if (infoError || !info || Number(info.size) !== file.fileSize || String(info.contentType || "").toLowerCase() !== file.fileType) {
      await discard();
      return NextResponse.json({ ok: false, error: "The uploaded file could not be verified. Try again." }, { status: 400 });
    }
    const { data, error } = await session.supabase.from("quote_comparison_client_attachments").insert({
      comparison_id: comparisonId,
      file_name: displayName(file.fileName),
      file_path: filePath,
      file_type: file.fileType,
      file_size: file.fileSize,
      created_by: session.user.id,
    }).select("id,comparison_id,file_name,file_path,file_type,file_size,created_at").single<ClientQuoteAttachmentRecord>();
    if (error || !data) {
      await discard();
      return NextResponse.json({ ok: false, error: "The file uploaded but could not be attached to the quote." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("Client quote attachment API failed", error);
    await captureOperationalError(error, {
      feature: "client-quote-attachments",
      operation: "upload",
      provider: "supabase-storage",
      safeCode: "client-quote-attachment-upload-failed",
    });
    return NextResponse.json({ ok: false, error: "The attachment could not be added. Try again." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 403 });
  try {
    const session = await staffSession();
    if (!session?.user || !session.supabase) return NextResponse.json({ ok: false, error: "Manager sign-in is required." }, { status: 401 });
    const body = await request.json() as { comparisonId?: unknown; attachmentId?: unknown };
    const comparisonId = text(body.comparisonId, 100);
    const attachmentId = text(body.attachmentId, 100);
    const { data } = await session.supabase.from("quote_comparison_client_attachments")
      .select("id,file_path").eq("id", attachmentId).eq("comparison_id", comparisonId)
      .maybeSingle<{ id: string; file_path: string }>();
    if (!data) return NextResponse.json({ ok: false, error: "The attachment could not be found." }, { status: 404 });
    const { error } = await session.supabase.from("quote_comparison_client_attachments").delete().eq("id", data.id).eq("comparison_id", comparisonId);
    if (error) return NextResponse.json({ ok: false, error: "The attachment could not be removed." }, { status: 503 });
    const { error: storageError } = await session.supabase.storage.from(BUCKET).remove([data.file_path]);
    if (storageError) console.error("Client quote attachment storage cleanup failed", storageError);
    return NextResponse.json({ ok: true, data: null });
  } catch (error) {
    console.error("Client quote attachment delete API failed", error);
    await captureOperationalError(error, {
      feature: "client-quote-attachments",
      operation: "delete",
      provider: "supabase-storage",
      safeCode: "client-quote-attachment-delete-failed",
    });
    return NextResponse.json({ ok: false, error: "The attachment could not be removed. Try again." }, { status: 500 });
  }
}
