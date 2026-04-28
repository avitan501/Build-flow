import { NextResponse } from "next/server";

import { getSessionWithProfile } from "@/lib/auth";
import { readWhatsAppSettings, saveWhatsAppSettings } from "@/lib/whatsapp-settings";

function unauthorized(message: string, status = 403) {
  return NextResponse.json({ error: message }, { status });
}

async function requireAdminApi() {
  const { user, profile } = await getSessionWithProfile();

  if (!user) {
    return { error: unauthorized("Authentication required.", 401) };
  }

  if (!profile || profile.role !== "admin") {
    return { error: unauthorized("Admin access required.") };
  }

  return { user, profile };
}

export async function GET() {
  try {
    const auth = await requireAdminApi();
    if ("error" in auth) return auth.error;

    const settings = await readWhatsAppSettings();
    return NextResponse.json({ ok: true, settings, temporary: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while loading WhatsApp settings.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi();
    if ("error" in auth) return auth.error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { settings, backupPath } = await saveWhatsAppSettings(body);
    return NextResponse.json({ ok: true, settings, backupPath, temporary: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while saving WhatsApp settings.",
      },
      { status: 400 },
    );
  }
}
