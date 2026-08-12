import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { STAFF_EMAILS } from "@/lib/owner-identity";

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
    const requestedEmail = body.email?.trim();
    const fullName = body.fullName?.trim();
    const companyName = body.companyName?.trim();
    const phone = body.phone?.trim() || null;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user id for profile creation." },
        { status: 400 },
      );
    }

    if (!fullName || !companyName) {
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

    if (!userData.user?.id) {
      return NextResponse.json(
        { error: "Missing user for profile creation." },
        { status: 400 },
      );
    }

    const email = userData.user.email || requestedEmail || "";
    const normalizedEmail = email.trim().toLowerCase();
    const isPreapprovedStaff = STAFF_EMAILS.some((staffEmail) => staffEmail === normalizedEmail);

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userData.user.id,
        email,
        full_name: fullName,
        phone,
        company_name: companyName,
        role: isPreapprovedStaff ? "staff" : "client",
        approval_status: isPreapprovedStaff ? "approved" : "pending",
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
