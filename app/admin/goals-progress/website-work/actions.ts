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
export type DavidDashboardResult = { ok: true } | { ok: false; error: string };

function refreshDashboards() {
  revalidatePath("/admin/goals-progress");
  revalidatePath("/admin/build-map");
  revalidatePath("/admin/goals-progress/website-work");
}

export async function createDavidDashboardItemAction(input: {
  title: string;
  nextStep?: string;
  kind: "task" | "pain";
  publishedToCarlos?: boolean;
}): Promise<DavidDashboardResult> {
  const { supabase, access } = await requireManagerPortalProfile();
  if (!access.owner) return { ok: false, error: "Only David can add private dashboard items." };
  const title = input.title.trim().replace(/\s+/g, " ");
  const nextStep = String(input.nextStep ?? "").trim().replace(/\s+/g, " ");
  if (title.length < 2 || title.length > 160) return { ok: false, error: "Enter 2 to 160 characters." };
  if (nextStep.length > 500) return { ok: false, error: "Keep the next step under 500 characters." };
  if (!['task', 'pain'].includes(input.kind)) return { ok: false, error: "Choose a valid list." };

  const { error } = await supabase.from("website_work_items").insert({
    task_key: `david-${input.kind}-${crypto.randomUUID()}`,
    title,
    category: "website_ux",
    status: "open",
    assigned_agent: "David",
    progress_percent: 0,
    summary: input.kind === "pain" ? "Pain David is resolving." : "",
    next_step: nextStep,
    source_chat_title: "David Dashboard",
    priority: input.kind === "pain" ? 2 : 1,
    sort_order: 0,
    item_kind: input.kind,
    published_to_carlos: input.kind === "task" && input.publishedToCarlos === true,
  });
  if (error) return { ok: false, error: "The item could not be added." };
  refreshDashboards();
  return { ok: true };
}

export async function setDavidTaskPublishedAction(input: {
  id: string;
  published: boolean;
}): Promise<DavidDashboardResult> {
  const { supabase, access } = await requireManagerPortalProfile();
  if (!access.owner) return { ok: false, error: "Only David can publish tasks." };
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) return { ok: false, error: "Choose a valid task." };
  const { data, error } = await supabase
    .from("website_work_items")
    .update({ published_to_carlos: input.published })
    .eq("id", input.id)
    .eq("item_kind", "task")
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !data) return { ok: false, error: "Publishing could not be updated." };
  refreshDashboards();
  return { ok: true };
}

export async function unlockWebsiteWorkAction(
  _state: WebsiteWorkUnlockState,
  formData: FormData,
): Promise<WebsiteWorkUnlockState> {
  const { user, access } = await requireManagerPortalProfile();
  if (!access.owner) return { error: "Only David can open this dashboard." };
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
