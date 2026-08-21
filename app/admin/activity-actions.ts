"use server"

import { requireManagerPortalProfile } from "@/lib/auth"
import { serializeEmployeeActivity } from "@/lib/manager-command-center"

export async function recordEmployeeActivityAction(pathInput: string, labelInput: string) {
  const { supabase, user, access } = await requireManagerPortalProfile()
  if (access.owner) return { ok: true as const }
  const path = String(pathInput || "").trim().slice(0, 240)
  const pageLabel = String(labelInput || "Manager portal").trim().slice(0, 80)
  if (!path.startsWith("/admin/")) return { ok: false as const }
  const title = "Employee activity"
  const details = serializeEmployeeActivity({ path, pageLabel, lastSeenAt: new Date().toISOString() })
  const existing = await supabase.from("manager_goals").select("id").eq("created_by", user.id).eq("title", title).limit(1).maybeSingle<{ id: string }>()
  if (existing.data) await supabase.from("manager_goals").update({ details, status: "open" }).eq("id", existing.data.id)
  else await supabase.from("manager_goals").insert({ assignee: "carlos", title, details, status: "open", created_by: user.id })
  return { ok: true as const }
}
