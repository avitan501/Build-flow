import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionWithProfile } from "@/lib/auth";
import { captureOperationalError } from "@/lib/monitoring/capture-operational-error";
import { managerCapabilities } from "@/lib/owner-identity";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

const quoteSchema = z.object({
  pickupAddress: z.string().trim().min(8).max(300),
  dropoffAddress: z.string().trim().min(8).max(300),
  packageQuantity: z.number().int().positive().max(20),
  weightPerPackage: z.number().positive().max(50),
  vehicle: z.enum(["small", "car", "pickup", "van"]),
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
      return NextResponse.json({ ok: false, code: "invalid_quote", error: "Enter both complete addresses, 1–20 boxes, and a weight up to 50 lb per box." }, { status: 400 });
    }

    if (parsed.data.scheduledPickupAt) {
      const scheduledTime = new Date(parsed.data.scheduledPickupAt).getTime();
      if (scheduledTime < Date.now() + 60 * 60 * 1000 || scheduledTime > Date.now() + 30 * 24 * 60 * 60 * 1000) {
        return NextResponse.json({ ok: false, code: "invalid_schedule", error: "Choose a scheduled pickup between 1 hour and 30 days from now." }, { status: 400 });
      }
    }

    const { data, error } = await supabase.functions.invoke<{
      ok?: boolean;
      code?: string;
      providerCode?: string;
      error?: string;
      quote?: unknown;
    }>("uber-direct-quote", { body: parsed.data });
    if (error || !data?.ok || !data.quote) {
      let payload = data;
      const context = (error as { context?: Response } | null)?.context;
      if (!payload && context) payload = await context.clone().json().catch(() => null);
      return NextResponse.json(
        payload || { ok: false, code: "quote_failed", error: "Uber could not return a live quote right now." },
        { status: context?.status || 502, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }
    return NextResponse.json(
      data,
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    await captureOperationalError(error, {
      feature: "delivery",
      operation: "request-quote",
      provider: "uber-direct",
      safeCode: "uber-quote-failed",
    });
    return NextResponse.json({ ok: false, code: "quote_failed", error: "Uber could not return a live quote right now." }, { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
