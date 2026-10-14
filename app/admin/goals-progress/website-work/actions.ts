"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { requireManagerPortalProfile } from "@/lib/auth";
import { isTrustedOwnerSmsPhone } from "@/lib/aura/trusted-owner-phones";
import { createAdminClient } from "@/lib/supabase/admin";
import { setFixedManagerGoalStatusAction } from "@/app/admin/goals-progress/goal-actions";
import { CARLOS_FIXED_GOALS, type CarlosFixedGoalKey } from "@/lib/manager-goal-status";
import { isInternalOutreachLead, type DashboardOutreachLead, type DashboardOutreachResult } from "@/lib/dashboard-outreach";
import {
  createWebsiteWorkToken,
  WEBSITE_WORK_COOKIE,
  WEBSITE_WORK_COOKIE_SECONDS,
  verifyWebsiteWorkToken,
  websiteWorkPinMatches,
} from "@/lib/website-work-access";

export type WebsiteWorkUnlockState = { error: string | null };
export type DavidDashboardResult = { ok: true } | { ok: false; error: string };

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function intakeTaskText(proposal: Record<string, unknown>, message: string) {
  const tasks = Array.isArray(proposal.tasks) ? proposal.tasks : [];
  const firstTask = tasks[0] && typeof tasks[0] === "object"
    ? tasks[0] as { title?: unknown; notes?: unknown }
    : null;
  const summary = typeof proposal.summary === "string" ? proposal.summary.trim() : "";
  const title = typeof firstTask?.title === "string" && firstTask.title.trim()
    ? firstTask.title.trim()
    : summary || message.trim() || "Review phone instruction";
  const notes = typeof firstTask?.notes === "string" ? firstTask.notes.trim() : "";
  return {
    title: title.replace(/\s+/g, " ").slice(0, 160),
    nextStep: (notes || message).trim().slice(0, 500),
  };
}

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

export async function getDashboardOutreachLeadsAction(): Promise<DashboardOutreachResult> {
  const context = await unlockedDavidDashboard();
  if (!context) return { ok: false, error: "Unlock David Dashboard to see your leads." };
  const leads: DashboardOutreachLead[] = [];
  const pageSize = 500;
  // Fetch every page so the task never silently omits contacts at the API row limit.
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await context.supabase.from("manager_outreach_leads")
      .select("id,full_name,company_name,phone,email,notes,status,preferred_language,relationship_level")
      .order("full_name").order("id")
      .range(offset, offset + pageSize - 1)
      .returns<DashboardOutreachLead[]>();
    if (error) return { ok: false, error: "Your leads could not load. Please try again." };
    leads.push(...(data ?? []));
    if ((data?.length ?? 0) < pageSize) break;
  }
  const contacts = leads.filter((lead) => !isInternalOutreachLead(lead))
    .sort((left, right) => left.full_name.localeCompare(right.full_name, "en", { sensitivity: "base" }));
  return { ok: true, leads: contacts, excludedCount: leads.length - contacts.length };
}

export async function createDavidDashboardItemAction(input: {
  title: string;
  nextStep?: string;
  issue?: string;
  resolution?: string;
  cost?: string;
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
  const issue = String(input.issue ?? "").trim().replace(/\s+/g, " ");
  const resolution = String(input.resolution ?? "").trim().replace(/\s+/g, " ");
  const costText = String(input.cost ?? "").trim();
  const cost = costText ? Number(costText) : null;
  if (title.length < 2 || title.length > 160)
    return { ok: false, error: "Enter 2 to 160 characters." };
  if (nextStep.length > 500)
    return { ok: false, error: "Keep the next step under 500 characters." };
  if (issue.length > 500 || resolution.length > 500)
    return { ok: false, error: "Keep each pain detail under 500 characters." };
  if (cost !== null && (!Number.isFinite(cost) || cost < 0 || cost > 999999999.99))
    return { ok: false, error: "Enter a valid cost." };
  if (!["task", "pain", "idea"].includes(input.kind)) {
    return { ok: false, error: "Choose a valid list." };
  }

  const { error } = await supabase.from("website_work_items").insert({
    task_key: `david-${input.kind}-${crypto.randomUUID()}`,
    title,
    category: input.kind === "task" ? "carlos_focus" : "website_ux",
    status: "open",
    assigned_agent: "David",
    progress_percent: 0,
    summary:
      input.kind === "pain"
        ? issue
        : input.kind === "idea"
          ? "David's private idea."
          : "",
    next_step: input.kind === "pain" ? resolution : nextStep,
    resolution_cost: input.kind === "pain" ? cost : null,
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

export async function saveDashboardTaskAction(input: {
  id: string;
  title: string;
  summary: string;
  nextStep: string;
  updatedAt: string;
}): Promise<DavidDashboardResult> {
  const context = await unlockedDavidDashboard();
  if (!context) return { ok: false, error: "Unlock David Dashboard first." };
  if (!validUuid(input.id)) return { ok: false, error: "Choose a valid task." };
  const title = String(input.title).trim().replace(/\s+/g, " ");
  const summary = String(input.summary).trim();
  const nextStep = String(input.nextStep).trim();
  if (title.length < 2 || title.length > 160 || summary.length > 500 || nextStep.length > 500) {
    return { ok: false, error: "Use 2–160 characters for the title and up to 500 for each note." };
  }
  const { data, error } = await context.supabase.from("website_work_items")
    .update({ title, summary, next_step: nextStep })
    .eq("id", input.id).eq("item_kind", "task").eq("updated_at", input.updatedAt)
    .not("task_key", "like", "blueprint-%")
    .select("id").maybeSingle<{ id: string }>();
  if (error || !data) return { ok: false, error: "The task could not be saved. Refresh to check for newer changes." };
  refreshDashboards();
  return { ok: true };
}

export async function setDashboardTaskStatusAction(input: {
  id: string;
  status: "open" | "completed" | "archived";
  updatedAt: string;
}): Promise<DavidDashboardResult> {
  const context = await unlockedDavidDashboard();
  if (!context) return { ok: false, error: "Unlock David Dashboard first." };
  if (!validUuid(input.id) || !["open", "completed", "archived"].includes(input.status)) {
    return { ok: false, error: "Choose a valid task and status." };
  }
  const { data: task, error: readError } = await context.supabase.from("website_work_items")
    .select("id,task_key,status").eq("id", input.id).eq("item_kind", "task")
    .eq("updated_at", input.updatedAt).not("task_key", "like", "blueprint-%")
    .maybeSingle<{ id: string; task_key: string; status: string }>();
  if (readError || !task) return { ok: false, error: "The task changed or is no longer available. Refresh and try again." };

  // Fixed team goals already have a status workflow. Keep that as their source
  // of truth; archiving/restoring a circle only changes its board visibility.
  const fixedKey = task.task_key.replace(/^carlos-fixed-/, "") as CarlosFixedGoalKey;
  if (task.task_key.startsWith("carlos-fixed-") && fixedKey in CARLOS_FIXED_GOALS && input.status !== "archived" && task.status !== "archived") {
    const result = await setFixedManagerGoalStatusAction({ key: fixedKey, status: input.status });
    if (!result.ok) return result;
    refreshDashboards();
    return { ok: true };
  }
  const changes = input.status === "archived" || task.status === "archived"
    ? { status: input.status }
    : { status: input.status, progress_percent: input.status === "completed" ? 100 : 0 };
  const { data, error } = await context.supabase.from("website_work_items")
    .update(changes).eq("id", input.id).eq("item_kind", "task").eq("updated_at", input.updatedAt)
    .select("id").maybeSingle<{ id: string }>();
  if (error || !data) return { ok: false, error: "The task could not be updated. Refresh and try again." };
  refreshDashboards();
  return { ok: true };
}

export async function routePhoneIntakeTaskAction(formData: FormData) {
  const context = await unlockedDavidDashboard();
  if (!context) return;
  const intakeId = String(formData.get("intakeId") ?? "").trim();
  const destination = String(formData.get("destination") ?? "david");
  if (!validUuid(intakeId) || !["david", "carlos"].includes(destination)) {
    throw new Error("Choose a valid phone task.");
  }
  const admin = createAdminClient();
  const { data: intake, error: readError } = await admin
    .from("aura_intakes")
    .select("message_text,proposal,status,sender_phone")
    .eq("id", intakeId)
    .eq("source", "sms")
    .maybeSingle<{ message_text: string | null; proposal: Record<string, unknown> | null; status: string; sender_phone: string }>();
  if (readError || !intake || !isTrustedOwnerSmsPhone(intake.sender_phone) || !["pending", "needs_follow_up", "failed"].includes(intake.status)) {
    throw new Error("This phone task is no longer waiting for approval.");
  }
  const task = intakeTaskText(intake.proposal ?? {}, intake.message_text ?? "");
  const recordType = typeof intake.proposal?.recordType === "string"
    ? intake.proposal.recordType
    : "task";
  const itemKind = destination === "david" && recordType === "idea" ? "idea" : "task";
  const taskKey = `phone-intake-${intakeId}`;
  const { data: workItem, error: upsertError } = await context.supabase
    .from("website_work_items")
    .upsert(
      {
        task_key: taskKey,
        title: task.title,
        category: "phone_intake",
        status: "open",
        assigned_agent: destination === "carlos" ? "Carlos" : "David",
        progress_percent: 0,
        summary:
          itemKind === "idea"
            ? "David's private idea."
            : "Approved phone intake task.",
        next_step: task.nextStep,
        source_chat_title: "David Dashboard",
        priority: 1,
        sort_order: 0,
        item_kind: itemKind,
        published_to_carlos: destination === "carlos",
      },
      { onConflict: "task_key" },
    )
    .select("id")
    .maybeSingle<{ id: string }>();
  if (upsertError || !workItem) {
    throw new Error("The phone task could not be added.");
  }
  await admin.from("aura_intakes").update({ status: "confirmed" }).eq("id", intakeId);
  await admin.from("aura_audit_log").insert({
    intake_id: intakeId,
    actor_user_id: context.user.id,
    action: "intake_routed_to_dashboard",
    details: { destination },
  });
  refreshDashboards();
}

export async function deletePhoneIntakeAction(formData: FormData) {
  const context = await unlockedDavidDashboard();
  if (!context) return;
  const intakeId = String(formData.get("intakeId") ?? "").trim();
  if (!validUuid(intakeId)) throw new Error("Choose a valid phone task.");
  const admin = createAdminClient();
  const { error } = await admin
    .from("aura_intakes")
    .update({ status: "cancelled" })
    .eq("id", intakeId)
    .eq("source", "sms")
    .in("status", ["pending", "needs_follow_up", "failed"]);
  if (error) throw new Error("The phone task could not be deleted.");
  await admin.from("aura_audit_log").insert({
    intake_id: intakeId,
    actor_user_id: context.user.id,
    action: "intake_cancelled",
    details: { source: "david_dashboard" },
  });
  refreshDashboards();
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
  issue?: string;
  resolution?: string;
  cost?: string;
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
  const issue = String(input.issue ?? "").trim().replace(/\s+/g, " ");
  const resolution = String(input.resolution ?? "").trim().replace(/\s+/g, " ");
  const costText = String(input.cost ?? "").trim();
  const cost = costText ? Number(costText) : null;
  if (issue.length > 500 || resolution.length > 500) {
    return { ok: false, error: "Keep each pain detail under 500 characters." };
  }
  if (cost !== null && (!Number.isFinite(cost) || cost < 0 || cost > 999999999.99)) {
    return { ok: false, error: "Enter a valid cost." };
  }
  const changes = input.kind === "pain"
    ? { title, summary: issue, next_step: resolution, resolution_cost: cost }
    : { title };
  const { data, error } = await context.supabase
    .from("website_work_items")
    .update(changes)
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
