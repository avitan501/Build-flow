import { NextResponse } from "next/server";

import { normalizePhoneNumber, phoneLoginEmailForPhone } from "@/lib/auth-phone";
import { createAdminClient } from "@/lib/supabase/admin";

type PhonePasswordSignupBody = {
  fullName?: string;
  phone?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    let body: PhonePasswordSignupBody;

    try {
      body = (await request.json()) as PhonePasswordSignupBody;
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const fullName = body.fullName?.trim();
    const phone = normalizePhoneNumber(body.phone || "");
    const password = body.password || "";
    const email = phoneLoginEmailForPhone(phone);

    if (!fullName) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!phone || !email || phone.length < 8) {
      return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      phone,
      phone_confirm: true,
      user_metadata: {
        full_name: fullName,
        company_name: fullName,
        phone,
        login_type: "phone",
      },
    });

    if (createError) {
      const message = createError.message.toLowerCase().includes("already")
        ? "A phone login already exists for this number. Go back to login."
        : createError.message;

      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!createdUser.user?.id) {
      return NextResponse.json({ error: "Phone account creation failed." }, { status: 500 });
    }

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: createdUser.user.id,
        email,
        full_name: fullName,
        phone,
        company_name: fullName,
        role: "client",
        approval_status: "pending",
        is_active: true,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      return NextResponse.json({ error: profileError.message || "Profile insert failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, email, phone });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error while creating phone login.",
      },
      { status: 500 },
    );
  }
}
