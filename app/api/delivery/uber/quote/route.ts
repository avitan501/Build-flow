import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionWithProfile } from "@/lib/auth";
import { createUberDirectQuote, UberDirectError } from "@/lib/uber-direct";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

const quoteSchema = z.object({
  pickupAddress: z.string().trim().min(8).max(300),
  dropoffAddress: z.string().trim().min(8).max(300),
  weightPounds: z.number().positive().max(50),
  vehicle: z.enum(["small", "car"]),
});

export async function POST(request: Request) {
  try {
    const { user } = await getSessionWithProfile();
    if (!user) {
      return NextResponse.json({ ok: false, code: "sign_in_required", error: "Sign in to request a live Uber price." }, { status: 401 });
    }

    const parsed = quoteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, code: "invalid_quote", error: "Enter both complete addresses and a package weight up to 50 lb." }, { status: 400 });
    }

    const quote = await createUberDirectQuote({
      pickupAddress: parsed.data.pickupAddress,
      dropoffAddress: parsed.data.dropoffAddress,
    });
    return NextResponse.json({ ok: true, provider: "Uber Direct", quote }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof UberDirectError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    return NextResponse.json({ ok: false, code: "quote_failed", error: "Uber could not return a live quote right now." }, { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
