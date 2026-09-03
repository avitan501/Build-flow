import { NextResponse } from "next/server";

import { getSessionWithProfile } from "@/lib/auth";
import { AURA_EMAIL_ATTACHMENT_BUCKET, safeAuraEmailAttachmentName } from "@/lib/aura/resend-attachments";
import { managerCapabilities } from "@/lib/owner-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StoredAttachment = {
  type?: unknown;
  name?: unknown;
  storagePath?: unknown;
  providerAttachmentId?: unknown;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ communicationId: string; attachmentId: string }> },
) {
  const { communicationId, attachmentId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(communicationId) || !/^[a-zA-Z0-9_-]{1,160}$/.test(attachmentId)) {
    return errorResponse("Attachment not found.", 404);
  }
  const session = await getSessionWithProfile();
  if (!session.user || !session.supabase) return errorResponse("Manager sign-in is required.", 401);
  const access = managerCapabilities({
    email: session.user.email || session.profile?.email,
    role: session.profile?.role,
    approvalStatus: session.profile?.approval_status,
    isActive: session.profile?.is_active,
  });
  if (!access.suppliers) return errorResponse("Supplier access is required.", 403);

  const { data } = await session.supabase
    .from("aura_communications")
    .select("media")
    .eq("id", communicationId)
    .maybeSingle<{ media: StoredAttachment[] | string | null }>();
  let media: StoredAttachment[] = [];
  try {
    const value = typeof data?.media === "string" ? JSON.parse(data.media) : data?.media;
    media = Array.isArray(value) ? value : [];
  } catch {
    media = [];
  }
  const attachment = media.find((item) => item.providerAttachmentId === attachmentId);
  const storagePath = typeof attachment?.storagePath === "string" ? attachment.storagePath : "";
  const expectedPrefix = `inbound-email/${communicationId}/${attachmentId}-`;
  if (!storagePath.startsWith(expectedPrefix) || storagePath.includes("..")) return errorResponse("Attachment not found.", 404);

  const { data: file, error } = await session.supabase.storage.from(AURA_EMAIL_ATTACHMENT_BUCKET).download(storagePath);
  if (error || !file) return errorResponse("Attachment is temporarily unavailable.", 503);
  const name = safeAuraEmailAttachmentName(attachment?.name);
  const asciiName = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  const type = typeof attachment?.type === "string" ? attachment.type : "application/octet-stream";
  return new Response(file, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Content-Length": String(file.size),
      "Content-Type": type,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
