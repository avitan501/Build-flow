import { NextResponse } from "next/server";

import { getSessionWithProfile } from "@/lib/auth";
import {
  createInstantGoogleMeet,
  googleCalendarCredentialsFromEnv,
  GoogleMeetError,
} from "@/lib/google-meet";
import { managerCapabilities } from "@/lib/owner-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return response({ ok: false, error: "Invalid meeting request." }, 403);
  }

  const { user, profile } = await getSessionWithProfile();
  if (!user) return response({ ok: false, error: "Sign in required." }, 401);
  const access = managerCapabilities({
    email: user.email || profile?.email || null,
    role: profile?.role,
    approvalStatus: profile?.approval_status,
    isActive: profile?.is_active,
  });
  if (!access.aiTools) {
    return response({ ok: false, error: "Manager access required." }, 403);
  }

  try {
    const meeting = await createInstantGoogleMeet({
      credentials: googleCalendarCredentialsFromEnv(),
    });
    return response({ ok: true, ...meeting }, 201);
  } catch (error) {
    if (error instanceof GoogleMeetError) {
      const status = error.code === "not_configured" ? 503 : 502;
      return response({ ok: false, error: error.message, code: error.code }, status);
    }
    return response(
      { ok: false, error: "Google Meet is temporarily unavailable." },
      502,
    );
  }
}
