"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerAccess } from "@/lib/owner-access";
import capabilities from "@/data/business-blueprint.json";

export async function saveBlueprintNote(input: { id: string; progress: number; note: string }) {
  const { supabase } = await requireOwnerAccess("/admin/build-map?view=blueprint");
  const capability = capabilities.find((entry) => entry.id === input.id);
  if (!capability || ![0, 50, 100].includes(input.progress) || typeof input.note !== "string" || input.note.length > 500) {
    return { ok: false, error: "Choose a capability, status, and a note of up to 500 characters." };
  }
  const { error } = await supabase.from("website_work_items").upsert({
    task_key: `blueprint-${capability.id}`,
    title: capability.title,
    category: "website_ux",
    status: input.progress === 100 ? "completed" : input.progress === 50 ? "in_progress" : "open",
    progress_percent: input.progress,
    summary: input.note,
    next_step: "",
    source_chat_title: "Business Blueprint",
    assigned_agent: "David",
    item_kind: "idea",
    published_to_carlos: false,
  }, { onConflict: "task_key" });
  if (error) return { ok: false, error: "Could not save. Your note is still here; please retry." };
  revalidatePath("/admin/build-map");
  return { ok: true };
}
