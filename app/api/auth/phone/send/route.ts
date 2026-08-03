import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type SendPhoneOtpBody = {
  phone?: string;
};

function getPhoneAuthErrorMessage(message: string) {
  if (message.toLowerCase().includes("unsupported phone provider")) {
    return "Phone login is not enabled in Supabase yet. Enable Phone Auth and configure an SMS provider in Supabase.";
  }

  return message;
}

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
    return NextResponse.json({ error: getPhoneAuthErrorMessage(error.message) }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
