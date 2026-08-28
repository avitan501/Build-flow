"use server";

import { revalidatePath } from "next/cache";

import { requireManagerPortalProfile } from "@/lib/auth";
import { CARLOS_FIXED_GOALS, SYSTEM_GOAL_STATUS_PREFIX, type CarlosFixedGoalKey, type ManagerGoalStatus } from "@/lib/manager-goal-status";

type GoalResult = { ok: true } | { ok: false; error: string };
const WEBSITE_FIX_NOTE_PREFIX = "website_fix_note:";

function validAssignee(value: string): value is "david" | "carlos" {
  return value === "david" || value === "carlos";
}

function refreshGoals() {
  revalidatePath("/admin/goals-progress");
  revalidatePath("/admin/build-map");
}

export async function createManagerGoalAction(input: {
  assignee: string;
  title: string;
  details: string;
  focus?: boolean;
}): Promise<GoalResult> {
  const { supabase, user, access } = await requireManagerPortalProfile();
  const assignee = input.assignee.trim().toLowerCase();
  const title = input.title.trim();
  const details = input.details.trim();

  if (!validAssignee(assignee)) return { ok: false, error: "Choose David or Carlos." };
  if (!access.owner && assignee !== "carlos") return { ok: false, error: "Only the owner can manage David's goals." };
  if (title.length < 2 || title.length > 120) return { ok: false, error: "Enter a goal between 2 and 120 characters." };
  if (details.length > 500) return { ok: false, error: "Keep the notes under 500 characters." };

  const { error } = await supabase.from("manager_goals").insert({
    assignee,
    title,
    details: details || null,
    is_focus: input.focus === true,
    created_by: user.id,
  });
  if (error) return { ok: false, error: "The goal could not be added. Please try again." };

  refreshGoals();
  return { ok: true };
}

export async function setManagerGoalFocusAction(input: { id: string; focus: boolean }): Promise<GoalResult> {
  const { supabase, access } = await requireManagerPortalProfile();
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) return { ok: false, error: "Choose a valid goal." };

  let update = supabase
    .from("manager_goals")
    .update({ is_focus: input.focus })
    .eq("id", input.id);
  if (!access.owner) update = update.eq("assignee", "carlos");
  const { data, error } = await update.select("id").maybeSingle<{ id: string }>();
  if (error || !data) return { ok: false, error: "Focus could not be updated." };

  refreshGoals();
  return { ok: true };
}

export async function createWebsiteFixNoteAction(input: { kind: string; note: string }): Promise<GoalResult> {
  const { supabase, user, access } = await requireManagerPortalProfile();
  if (!access.owner) return { ok: false, error: "Only the owner can manage website goals." };
  const kind = ["Fix", "Add", "Change", "Remove"].find((value) => value.toLowerCase() === input.kind.trim().toLowerCase());
  const note = input.note.trim().replace(/\s+/g, " ");

  if (!kind) return { ok: false, error: "Choose Fix, Add, Change, or Remove." };
  if (note.length < 2 || note.length > 120) return { ok: false, error: "Keep the website note between 2 and 120 characters." };

  const { error } = await supabase.from("manager_goals").insert({
    assignee: "david",
    title: note,
    details: `${WEBSITE_FIX_NOTE_PREFIX}${kind.toLowerCase()}`,
    created_by: user.id,
  });
  if (error) return { ok: false, error: "The website note could not be added." };

  refreshGoals();
  return { ok: true };
}

export async function setManagerGoalCompletedAction(input: { id: string; completed: boolean }): Promise<GoalResult> {
  return setManagerGoalStatusAction({ id: input.id, status: input.completed ? "completed" : "open" });
}

export async function setManagerGoalStatusAction(input: { id: string; status: ManagerGoalStatus }): Promise<GoalResult> {
  const { supabase, access } = await requireManagerPortalProfile();
  if (!/^[0-9a-f-]{36}$/i.test(input.id) || !["open", "completed", "archived"].includes(input.status)) return { ok: false, error: "Choose a valid goal status." };
  let update = supabase
    .from("manager_goals")
    .update({ status: input.status })
    .eq("id", input.id);
  if (!access.owner) update = update.eq("assignee", "carlos");
  const { error } = await update;
  if (error) return { ok: false, error: "The goal status could not be updated." };

  refreshGoals();
  return { ok: true };
}

export async function setFixedManagerGoalStatusAction(input: { key: CarlosFixedGoalKey; status: ManagerGoalStatus }): Promise<GoalResult> {
  const { supabase, user } = await requireManagerPortalProfile();
  if (!(input.key in CARLOS_FIXED_GOALS) || !["open", "completed", "archived"].includes(input.status)) return { ok: false, error: "Choose a valid goal status." };
  const details = `${SYSTEM_GOAL_STATUS_PREFIX}${input.key}`;
  const { data: existing, error: findError } = await supabase.from("manager_goals").select("id").eq("assignee", "carlos").eq("details", details).limit(1).maybeSingle<{ id: string }>();
  if (findError) return { ok: false, error: "The goal status could not be loaded." };

  const result = existing
    ? await supabase.from("manager_goals").update({ status: input.status }).eq("id", existing.id).eq("assignee", "carlos")
    : await supabase.from("manager_goals").insert({ assignee: "carlos", title: CARLOS_FIXED_GOALS[input.key], details, status: input.status, created_by: user.id });
  if (result.error) return { ok: false, error: "The goal status could not be updated." };

  refreshGoals();
  return { ok: true };
}

export async function deleteManagerGoalAction(id: string): Promise<GoalResult> {
  const { supabase, access } = await requireManagerPortalProfile();
  let deletion = supabase.from("manager_goals").delete().eq("id", id);
  if (!access.owner) deletion = deletion.eq("assignee", "carlos");
  const { error } = await deletion;
  if (error) return { ok: false, error: "The goal could not be deleted." };

  refreshGoals();
  return { ok: true };
}
