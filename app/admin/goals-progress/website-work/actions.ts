"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { requireManagerPortalProfile } from "@/lib/auth";
import {
  createWebsiteWorkToken,
  WEBSITE_WORK_COOKIE,
  WEBSITE_WORK_COOKIE_SECONDS,
  websiteWorkPinMatches,
} from "@/lib/website-work-access";

export type WebsiteWorkUnlockState = { error: string | null };

export async function unlockWebsiteWorkAction(
  _state: WebsiteWorkUnlockState,
  formData: FormData,
): Promise<WebsiteWorkUnlockState> {
  const { user, access } = await requireManagerPortalProfile();
  if (!access.tasks) return { error: "This account cannot open the website work board." };
  const pin = String(formData.get("pin") ?? "").replace(/\D/g, "").slice(0, 8);
  if (!websiteWorkPinMatches(pin)) return { error: "The PIN is not correct." };

  const cookieStore = await cookies();
  cookieStore.set(WEBSITE_WORK_COOKIE, createWebsiteWorkToken(user.id), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: WEBSITE_WORK_COOKIE_SECONDS,
    path: "/admin/goals-progress/website-work",
  });
  revalidatePath("/admin/goals-progress/website-work");
  return { error: null };
}

export async function lockWebsiteWorkAction() {
  await requireManagerPortalProfile();
  const cookieStore = await cookies();
  cookieStore.delete(WEBSITE_WORK_COOKIE);
  revalidatePath("/admin/goals-progress/website-work");
}
