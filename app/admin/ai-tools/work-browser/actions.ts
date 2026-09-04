"use server"

import { revalidatePath } from "next/cache"

import { requireManagerPortalProfile } from "@/lib/auth"
import {
  CARLOS_WORK_BROWSER_ACK_PREFIX,
  CARLOS_WORK_BROWSER_ACK_TITLE,
  CARLOS_WORK_BROWSER_EMAIL,
  CARLOS_WORK_BROWSER_POLICY_VERSION,
  CARLOS_WORK_BROWSER_STATEMENT,
  serializeCarlosWorkBrowserAcknowledgement,
} from "@/lib/carlos-work-browser"

export async function acknowledgeCarlosWorkBrowserAction() {
  const { supabase, user, profile, access } = await requireManagerPortalProfile()
  const email = String(user.email || profile?.email || "").trim().toLowerCase()
  if (access.owner || email !== CARLOS_WORK_BROWSER_EMAIL) return { ok: false as const, error: "Only Carlos can acknowledge this work-browser notice." }

  const existing = await supabase
    .from("manager_goals")
    .select("id,details")
    .eq("created_by", user.id)
    .eq("title", CARLOS_WORK_BROWSER_ACK_TITLE)
    .like("details", `${CARLOS_WORK_BROWSER_ACK_PREFIX}%`)
    .limit(1)
    .maybeSingle<{ id: string; details: string | null }>()
  if (existing.error) return { ok: false as const, error: "The acknowledgement could not be checked." }
  if (existing.data) return { ok: true as const }

  const details = serializeCarlosWorkBrowserAcknowledgement({
    acknowledgedAt: new Date().toISOString(),
    policyVersion: CARLOS_WORK_BROWSER_POLICY_VERSION,
    statement: CARLOS_WORK_BROWSER_STATEMENT,
  })
  const saved = await supabase.from("manager_goals").insert({
    assignee: "carlos",
    title: CARLOS_WORK_BROWSER_ACK_TITLE,
    details,
    status: "completed",
    created_by: user.id,
  })
  if (saved.error) return { ok: false as const, error: "The acknowledgement could not be saved." }
  revalidatePath("/admin/ai-tools/work-browser")
  return { ok: true as const }
}
