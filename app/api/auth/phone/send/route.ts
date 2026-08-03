import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type SendPhoneOtpBody = {
  phone?: string;
};

export async function POST(request: Request) {
  let body: SendPhoneOtpBody;

  try {
    body = (await request.json()) as SendPhoneOtpBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const phone = body.phone?.trim();

  if (!phone) {
    return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      data: {
        phone,
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
