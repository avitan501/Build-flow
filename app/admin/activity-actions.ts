"use server"

import { requireManagerPortalProfile } from "@/lib/auth"
import { parseEmployeeActivity, serializeEmployeeActivity } from "@/lib/manager-command-center"

export async function recordEmployeeActivityAction(pathInput: string, labelInput: string) {
  const { supabase, user, access } = await requireManagerPortalProfile()
  if (access.owner) return { ok: true as const }
  const path = String(pathInput || "").trim().slice(0, 240)
  const pageLabel = String(labelInput || "Manager portal").trim().slice(0, 80)
  if (!path.startsWith("/admin/")) return { ok: false as const }
  const title = "Employee activity"
  const details = serializeEmployeeActivity({ path, pageLabel, lastSeenAt: new Date().toISOString() })
  const existing = await supabase.from("manager_goals").select("id,details").eq("created_by", user.id).eq("title", title).limit(1).maybeSingle<{ id: string; details: string | null }>()
  const previous = parseEmployeeActivity(existing.data?.details)
  if (existing.data) await supabase.from("manager_goals").update({ details, status: "open" }).eq("id", existing.data.id)
  else await supabase.from("manager_goals").insert({ assignee: "carlos", title, details, status: "open", created_by: user.id })
  if (!previous || previous.path !== path) {
    await supabase.from("manager_staff_activity_events").insert({
      user_id: user.id,
      event_type: "page_view",
      page_path: path,
      page_label: pageLabel,
    })
  }
  return { ok: true as const }
}

export type CommunicationActivityInput = {
  channel: "call" | "sms" | "whatsapp" | "email" | "message"
  recipient?: string
  label?: string
  requestId?: string
  requestLabel?: string
  outcome?: "sent" | "completed" | "failed" | "no_answer" | "opened_on_device" | "provider_unconfirmed"
  durationSeconds?: number
}

export async function recordCommunicationActivityAction(input: string | CommunicationActivityInput) {
  const { supabase, user, access } = await requireManagerPortalProfile()
  if (!access.customers) return { ok: false as const }
  const source: Omit<Partial<CommunicationActivityInput>, "channel"> & { channel: string } = typeof input === "string" ? { channel: input } : input
  const channel = ["call", "sms", "whatsapp", "email"].includes(source.channel) ? source.channel : "message"
  const recipient = String(source.recipient || "").trim().slice(0, 320)
  const label = String(source.label || recipient || "Contact").trim().slice(0, 160)
  const requestId = String(source.requestId || "").trim().slice(0, 80)
  const request = String(source.requestLabel || "").trim().slice(0, 160)
  const outcome = String(source.outcome || (channel === "call" ? "completed" : "sent")).trim().slice(0, 40)
  const durationSeconds = Number(source.durationSeconds)
  const { error } = await supabase.from("manager_staff_activity_events").insert({
    user_id: user.id,
    event_type: "communication_sent",
    page_path: "/admin/communications",
    page_label: "Communications",
    metadata: {
      channel,
      ...(recipient ? { recipient } : {}),
      ...(label ? { label } : {}),
      ...(requestId ? { request_id: requestId } : {}),
      ...(request ? { request } : {}),
      outcome,
      duration_seconds: Number.isFinite(durationSeconds) && durationSeconds >= 0 ? Math.round(durationSeconds) : 0,
    },
  })
  return { ok: !error as boolean }
}
