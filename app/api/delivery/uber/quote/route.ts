import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionWithProfile } from "@/lib/auth";

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
    const { supabase, user } = await getSessionWithProfile();
    if (!user || !supabase) {
      return NextResponse.json({ ok: false, code: "sign_in_required", error: "Sign in to request a live Uber price." }, { status: 401 });
    }

    const parsed = quoteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, code: "invalid_quote", error: "Enter both complete addresses and a package weight up to 50 lb." }, { status: 400 });
    }

    const { data, error } = await supabase.functions.invoke("uber-direct-quote", {
      body: parsed.data,
    });
    if (error || !data?.ok || !data.quote) {
      return NextResponse.json(
        { ok: false, code: data?.code || "provider_error", error: data?.error || "Uber could not return a live quote right now." },
        { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ ok: false, code: "quote_failed", error: "Uber could not return a live quote right now." }, { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
