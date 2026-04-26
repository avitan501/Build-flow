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
    let body: CreateProfileBody;

    try {
      body = (await request.json()) as CreateProfileBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const userId = body.userId?.trim();
    const fullName = body.fullName?.trim();
    const companyName = body.companyName?.trim();
    const phone = body.phone?.trim();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user id for profile creation." },
        { status: 400 },
      );
    }

    if (!fullName || !companyName || !phone) {
      return NextResponse.json(
        { error: "Missing required profile fields." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);

    if (userError) {
      return NextResponse.json(
        { error: userError.message || "Missing user for profile creation." },
        { status: 400 },
      );
    }

    if (!userData.user?.id || !userData.user.email) {
      return NextResponse.json(
        { error: "Missing user for profile creation." },
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
        { error: profileError.message || "Profile insert failed." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while creating profile.",
      },
      { status: 500 },
    );
  }
}
