"use server";

import { revalidatePath } from "next/cache";

import { requireManagerPortalProfile } from "@/lib/auth";

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
}): Promise<GoalResult> {
  const { supabase, user } = await requireManagerPortalProfile();
  const assignee = input.assignee.trim().toLowerCase();
  const title = input.title.trim();
  const details = input.details.trim();

  if (!validAssignee(assignee)) return { ok: false, error: "Choose David or Carlos." };
  if (title.length < 2 || title.length > 120) return { ok: false, error: "Enter a goal between 2 and 120 characters." };
  if (details.length > 500) return { ok: false, error: "Keep the notes under 500 characters." };

  const { error } = await supabase.from("manager_goals").insert({
    assignee,
    title,
    details: details || null,
    created_by: user.id,
  });
  if (error) return { ok: false, error: "The goal could not be added. Please try again." };

  refreshGoals();
  return { ok: true };
}

export async function createWebsiteFixNoteAction(input: { kind: string; note: string }): Promise<GoalResult> {
  const { supabase, user } = await requireManagerPortalProfile();
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
  const { supabase } = await requireManagerPortalProfile();
  const { error } = await supabase
    .from("manager_goals")
    .update({ status: input.completed ? "completed" : "open" })
    .eq("id", input.id);
  if (error) return { ok: false, error: "The goal status could not be updated." };

  refreshGoals();
  return { ok: true };
}

export async function deleteManagerGoalAction(id: string): Promise<GoalResult> {
  const { supabase } = await requireManagerPortalProfile();
  const { error } = await supabase.from("manager_goals").delete().eq("id", id);
  if (error) return { ok: false, error: "The goal could not be deleted." };

  refreshGoals();
  return { ok: true };
}
