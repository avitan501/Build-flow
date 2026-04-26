import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

type CreateProfileBody = {
  userId?: string;
  email?: string;
  fullName?: string;
  companyName?: string;
  phone?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateProfileBody;
    const userId = body.userId?.trim();
    const fullName = body.fullName?.trim();
    const companyName = body.companyName?.trim();
    const phone = body.phone?.trim();

    if (!userId || !fullName || !companyName || !phone) {
      return NextResponse.json(
        { error: "Missing required profile fields." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);

    if (userError || !userData.user?.id || !userData.user.email) {
      return NextResponse.json(
        { error: "Unable to verify auth user for profile creation." },
        { status: 400 },
      );
    }

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userData.user.id,
        email: userData.user.email,
        full_name: fullName,
        phone,
        company_name: companyName,
        role: "client",
        approval_status: "pending",
        is_active: true,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to create profile row." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unexpected error while creating profile." },
      { status: 500 },
    );
  }
}
