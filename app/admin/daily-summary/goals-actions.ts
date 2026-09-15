"use server";
import { requireManagerPortalProfile } from "@/lib/auth";
import { validCarlosGoals, type CarlosGoalBoard } from "@/lib/carlos-five-goals";

export async function saveCarlosGoals(revision: number, goals: unknown): Promise<{ ok: true; board: CarlosGoalBoard } | { ok: false; conflict?: boolean; error: string }> {
  if (!Number.isSafeInteger(revision) || revision < 0 || !validCarlosGoals(goals)) return { ok: false, error: "Check the goal details. Done needs a result and a related link; Blocked needs an explanation." };
  const { supabase } = await requireManagerPortalProfile();
  const { data, error } = await supabase.rpc("save_carlos_five_goals", { p_revision: revision, p_goals: goals });
  if (error) return { ok: false, conflict: error.message.includes("goals_conflict"), error: error.message.includes("goals_conflict") ? "This board changed in another tab. Your edits have not overwritten it." : "Not saved. Check your connection and retry." };
  return { ok: true, board: data as CarlosGoalBoard };
}
