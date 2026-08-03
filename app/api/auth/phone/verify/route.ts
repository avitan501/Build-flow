import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type VerifyPhoneOtpBody = {
  phone?: string;
  token?: string;
};

export async function POST(request: Request) {
  let body: VerifyPhoneOtpBody;

  try {
    body = (await request.json()) as VerifyPhoneOtpBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const phone = body.phone?.trim();
  const token = body.token?.trim();

  if (!phone || !token) {
    return NextResponse.json({ error: "Phone number and code are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
