"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { requireManagerPortalProfile } from "@/lib/auth";
import {
  createWebsiteWorkToken,
  WEBSITE_WORK_COOKIE,
  WEBSITE_WORK_COOKIE_SECONDS,
  verifyWebsiteWorkToken,
  websiteWorkPinMatches,
} from "@/lib/website-work-access";

export type WebsiteWorkUnlockState = { error: string | null };
export type DavidDashboardResult = { ok: true } | { ok: false; error: string };

function refreshDashboards() {
  revalidatePath("/admin/goals-progress");
  revalidatePath("/admin/build-map");
  revalidatePath("/admin/goals-progress/website-work");
}

async function unlockedDavidDashboard() {
  const context = await requireManagerPortalProfile();
  if (!context.access.owner) return null;
  const cookieStore = await cookies();
  const unlocked = verifyWebsiteWorkToken(
    cookieStore.get(WEBSITE_WORK_COOKIE)?.value,
    context.user.id,
  );
  return unlocked ? context : null;
}

export async function createDavidDashboardItemAction(input: {
  title: string;
  nextStep?: string;
  kind: "task" | "pain" | "idea";
  publishedToCarlos?: boolean;
}): Promise<DavidDashboardResult> {
  const context = await unlockedDavidDashboard();
  if (!context) return { ok: false, error: "Unlock David Dashboard first." };
  const { supabase } = context;
  const title = input.title.trim().replace(/\s+/g, " ");
  const nextStep = String(input.nextStep ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (title.length < 2 || title.length > 160)
    return { ok: false, error: "Enter 2 to 160 characters." };
  if (nextStep.length > 500)
    return { ok: false, error: "Keep the next step under 500 characters." };
  if (!["task", "pain", "idea"].includes(input.kind)) {
    return { ok: false, error: "Choose a valid list." };
  }

  const { error } = await supabase.from("website_work_items").insert({
    task_key: `david-${input.kind}-${crypto.randomUUID()}`,
    title,
    category: "website_ux",
    status: "open",
    assigned_agent: "David",
    progress_percent: 0,
    summary:
      input.kind === "pain"
        ? "Pain David is resolving."
        : input.kind === "idea"
          ? "David's private idea."
          : "",
    next_step: nextStep,
    source_chat_title: "David Dashboard",
    priority: input.kind === "task" ? 1 : 2,
    sort_order: 0,
    item_kind: input.kind,
    published_to_carlos:
      input.kind === "task" && input.publishedToCarlos === true,
  });
  if (error) return { ok: false, error: "The item could not be added." };
  refreshDashboards();
  return { ok: true };
}

export async function setDavidTaskPublishedAction(input: {
  id: string;
  published: boolean;
}): Promise<DavidDashboardResult> {
  const context = await unlockedDavidDashboard();
  if (!context) return { ok: false, error: "Unlock David Dashboard first." };
  const { supabase } = context;
  if (!/^[0-9a-f-]{36}$/i.test(input.id))
    return { ok: false, error: "Choose a valid task." };
  const { data, error } = await supabase
    .from("website_work_items")
    .update({ published_to_carlos: input.published })
    .eq("id", input.id)
    .eq("item_kind", "task")
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !data)
    return { ok: false, error: "Publishing could not be updated." };
  refreshDashboards();
  return { ok: true };
}

export async function updateDavidDashboardItemAction(input: {
  id: string;
  title: string;
  kind: "pain" | "idea";
}): Promise<DavidDashboardResult> {
  const context = await unlockedDavidDashboard();
  if (!context) return { ok: false, error: "Unlock David Dashboard first." };
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) {
    return { ok: false, error: "Choose a valid item." };
  }
  if (!["pain", "idea"].includes(input.kind)) {
    return { ok: false, error: "Choose a valid list." };
  }
  const title = input.title.trim().replace(/\s+/g, " ");
  if (title.length < 2 || title.length > 160) {
    return { ok: false, error: "Enter 2 to 160 characters." };
  }
  const { data, error } = await context.supabase
    .from("website_work_items")
    .update({ title })
    .eq("id", input.id)
    .eq("item_kind", input.kind)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !data) {
    return { ok: false, error: "The item could not be updated." };
  }
  refreshDashboards();
  return { ok: true };
}

export async function deleteDavidDashboardItemAction(input: {
  id: string;
  kind: "pain" | "idea";
}): Promise<DavidDashboardResult> {
  const context = await unlockedDavidDashboard();
  if (!context) return { ok: false, error: "Unlock David Dashboard first." };
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) {
    return { ok: false, error: "Choose a valid item." };
  }
  if (!["pain", "idea"].includes(input.kind)) {
    return { ok: false, error: "Choose a valid list." };
  }
  const { data, error } = await context.supabase
    .from("website_work_items")
    .delete()
    .eq("id", input.id)
    .eq("item_kind", input.kind)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !data) {
    return { ok: false, error: "The item could not be deleted." };
  }
  refreshDashboards();
  return { ok: true };
}

export async function rewriteDavidDashboardItemAction(input: {
  id: string;
  kind: "pain" | "idea";
}): Promise<DavidDashboardResult> {
  const context = await unlockedDavidDashboard();
  if (!context) return { ok: false, error: "Unlock David Dashboard first." };
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) {
    return { ok: false, error: "Choose a valid item." };
  }
  if (!["pain", "idea"].includes(input.kind)) {
    return { ok: false, error: "Choose a valid list." };
  }
  try {
    const { data, error } = await context.supabase.functions.invoke<{
      ok?: boolean;
      title?: string;
      error?: string;
    }>("aura-messaging-broker", {
      body: {
        action: "rewrite_dashboard_item",
        itemId: input.id,
        kind: input.kind,
      },
    });
    if (error || !data?.ok || !data.title) {
      return {
        ok: false,
        error: data?.error || "AI could not rewrite this now. Try again.",
      };
    }
  } catch {
    return { ok: false, error: "AI could not rewrite this now. Try again." };
  }
  refreshDashboards();
  return { ok: true };
}

export async function unlockWebsiteWorkAction(
  _state: WebsiteWorkUnlockState,
  formData: FormData,
): Promise<WebsiteWorkUnlockState> {
  const { user, access } = await requireManagerPortalProfile();
  if (!access.owner) return { error: "Only David can open this dashboard." };
  const pin = String(formData.get("pin") ?? "")
    .replace(/\D/g, "")
    .slice(0, 8);
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
