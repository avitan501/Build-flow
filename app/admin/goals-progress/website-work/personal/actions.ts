"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireManagerPortalProfile } from "@/lib/auth";
import { verifyWebsiteWorkToken, WEBSITE_WORK_COOKIE } from "@/lib/website-work-access";
import { PERSONAL_DASHBOARD_PATH } from "@/lib/personal-dashboard";
import type { DavidDashboardResult } from "../actions";

async function unlockedPersonalDashboard() {
  const context = await requireManagerPortalProfile();
  if (!context.access.owner) return null;
  const cookieStore = await cookies();
  return verifyWebsiteWorkToken(cookieStore.get(WEBSITE_WORK_COOKIE)?.value, context.user.id) ? context : null;
}

function validVersion(id: string, updatedAt: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    && typeof updatedAt === "string" && Number.isFinite(Date.parse(updatedAt));
}

export async function createPersonalTaskAction(input: { title: string; nextStep?: string }): Promise<DavidDashboardResult> {
  const context = await unlockedPersonalDashboard();
  if (!context) return { ok: false, error: "Unlock your private dashboard first." };
  const title = String(input.title ?? "").trim().replace(/\s+/g, " ");
  const nextStep = String(input.nextStep ?? "").trim();
  if (title.length < 2 || title.length > 160 || nextStep.length > 500) {
    return { ok: false, error: "Use 2–160 characters for the title and up to 500 for the next step." };
  }
  const { error } = await context.supabase.from("personal_dashboard_tasks")
    .insert({ owner_id: context.user.id, title, next_step: nextStep });
  if (error) return { ok: false, error: "The personal task could not be added. Please try again." };
  revalidatePath(PERSONAL_DASHBOARD_PATH);
  return { ok: true };
}

export async function savePersonalTaskAction(input: {
  id: string; title: string; summary: string; nextStep: string; updatedAt: string;
}): Promise<DavidDashboardResult> {
  const context = await unlockedPersonalDashboard();
  if (!context) return { ok: false, error: "Unlock your private dashboard first." };
  const title = String(input.title ?? "").trim().replace(/\s+/g, " ");
  const summary = String(input.summary ?? "").trim();
  const nextStep = String(input.nextStep ?? "").trim();
  if (!validVersion(input.id, input.updatedAt) || title.length < 2 || title.length > 160 || summary.length > 500 || nextStep.length > 500) {
    return { ok: false, error: "Check the task details. Use 2–160 characters for the title and up to 500 for each note." };
  }
  const { data, error } = await context.supabase.from("personal_dashboard_tasks")
    .update({ title, summary, next_step: nextStep })
    .eq("id", input.id).eq("owner_id", context.user.id).eq("updated_at", input.updatedAt)
    .select("id").maybeSingle<{ id: string }>();
  if (error || !data) return { ok: false, error: "The task could not be saved. Refresh to check for newer changes." };
  revalidatePath(PERSONAL_DASHBOARD_PATH);
  return { ok: true };
}

export async function setPersonalTaskStatusAction(input: {
  id: string; status: "open" | "completed" | "archived"; updatedAt: string;
}): Promise<DavidDashboardResult> {
  const context = await unlockedPersonalDashboard();
  if (!context) return { ok: false, error: "Unlock your private dashboard first." };
  if (!validVersion(input.id, input.updatedAt) || !["open", "completed", "archived"].includes(input.status)) {
    return { ok: false, error: "Choose a valid task and status." };
  }
  const { data, error } = await context.supabase.from("personal_dashboard_tasks")
    .update({ status: input.status })
    .eq("id", input.id).eq("owner_id", context.user.id).eq("updated_at", input.updatedAt)
    .select("id").maybeSingle<{ id: string }>();
  if (error || !data) return { ok: false, error: "The task changed or could not be updated. Refresh and try again." };
  revalidatePath(PERSONAL_DASHBOARD_PATH);
  return { ok: true };
}
