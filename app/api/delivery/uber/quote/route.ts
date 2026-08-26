import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionWithProfile } from "@/lib/auth";
import { managerCapabilities } from "@/lib/owner-identity";
import { quoteUberDirect, UberDirectError } from "@/lib/uber-direct";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

const quoteSchema = z.object({
  pickupAddress: z.string().trim().min(8).max(300),
  dropoffAddress: z.string().trim().min(8).max(300),
  weightPounds: z.number().positive().max(50),
  vehicle: z.enum(["small", "car"]),
  scheduledPickupAt: z.string().datetime().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await getSessionWithProfile();
    if (!user || !supabase) {
      return NextResponse.json({ ok: false, code: "sign_in_required", error: "Sign in to request a live Uber price." }, { status: 401 });
    }
    const access = managerCapabilities({
      email: user.email || profile?.email || null,
      role: profile?.role,
      approvalStatus: profile?.approval_status,
      isActive: profile?.is_active,
    });
    if (!access.aiTools) {
      return NextResponse.json({ ok: false, code: "manager_access_required", error: "Manager AI Tools access is required." }, { status: 403 });
    }

    const parsed = quoteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, code: "invalid_quote", error: "Enter both complete addresses and a package weight up to 50 lb." }, { status: 400 });
    }

    if (parsed.data.scheduledPickupAt) {
      const scheduledTime = new Date(parsed.data.scheduledPickupAt).getTime();
      if (scheduledTime < Date.now() + 60 * 60 * 1000 || scheduledTime > Date.now() + 30 * 24 * 60 * 60 * 1000) {
        return NextResponse.json({ ok: false, code: "invalid_schedule", error: "Choose a scheduled pickup between 1 hour and 30 days from now." }, { status: 400 });
      }
    }

    const quote = await quoteUberDirect(parsed.data);
    return NextResponse.json(
      { ok: true, provider: "Uber Direct", quote },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    if (error instanceof UberDirectError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.code === "tax_form_required" ? 503 : 502, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }
    return NextResponse.json({ ok: false, code: "quote_failed", error: "Uber could not return a live quote right now." }, { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
