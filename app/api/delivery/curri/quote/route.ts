import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionWithProfile } from "@/lib/auth";
import { CurriError, quoteCurri } from "@/lib/curri";
import { captureOperationalError } from "@/lib/monitoring/capture-operational-error";
import { managerCapabilities } from "@/lib/owner-identity";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

const locationSchema = z.object({
  label: z.string().trim().min(8).max(300),
  name: z.string().trim().max(160),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().min(2).max(40),
  postalCode: z.string().trim().min(5).max(12),
});

const quoteSchema = z.object({
  pickupAddress: z.string().trim().min(8).max(300),
  pickupLocation: locationSchema,
  dropoffAddress: z.string().trim().min(8).max(300),
  dropoffLocation: locationSchema,
  itemDescription: z.string().trim().min(2).max(300),
  packageQuantity: z.number().int().positive().max(100),
  weightPerPackage: z.number().positive().max(5000),
  lengthInches: z.number().positive().max(600).nullable().optional(),
  widthInches: z.number().positive().max(600).nullable().optional(),
  heightInches: z.number().positive().max(600).nullable().optional(),
  vehicle: z.enum(["small", "car", "pickup", "van"]),
  speed: z.enum(["flexible", "same-day", "rush"]),
  scheduledPickupAt: z.string().datetime().nullable().optional(),
  loadUnloadRequired: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const { user, profile } = await getSessionWithProfile();
    if (!user) return NextResponse.json({ ok: false, code: "sign_in_required", error: "Manager sign-in is required." }, { status: 401 });
    const access = managerCapabilities({ email: user.email || profile?.email || null, role: profile?.role, approvalStatus: profile?.approval_status, isActive: profile?.is_active });
    if (!access.aiTools) return NextResponse.json({ ok: false, code: "manager_access_required", error: "Manager AI Tools access is required." }, { status: 403 });

    const parsed = quoteSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, code: "invalid_quote", error: "Choose both addresses and enter the material description, quantity, and weight." }, { status: 400 });
    const quote = await quoteCurri(parsed.data);
    return NextResponse.json({ ok: true, provider: "Curri", quote }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    await captureOperationalError(error, { feature: "delivery", operation: "request-quote", provider: "curri", safeCode: error instanceof CurriError ? error.code : "curri-quote-failed" });
    if (error instanceof CurriError) return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.code === "structured_address_required" ? 400 : 502 });
    return NextResponse.json({ ok: false, code: "quote_failed", error: "Curri could not return a live quote right now." }, { status: 502 });
  }
}
