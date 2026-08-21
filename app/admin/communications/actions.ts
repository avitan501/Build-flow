"use server"

import { revalidatePath } from "next/cache"

import { requireManagerPortalProfile } from "@/lib/auth"
import { serializeCommunicationLog, type CommunicationLog } from "@/lib/manager-command-center"

type Result = { ok: true } | { ok: false; error: string }

export async function saveCommunicationLogAction(input: {
  clientId: string
  channel: "call" | "whatsapp"
  direction: "outbound" | "inbound"
  summary: string
  outcome: string
}): Promise<Result> {
  const { supabase, user, access } = await requireManagerPortalProfile()
  const clientId = input.clientId.trim()
  const summary = input.summary.trim().slice(0, 1500)
  const outcome = input.outcome.trim().slice(0, 500)
  if (!access.customers) return { ok: false, error: "Customer access is required to add a communication log." }
  if (!clientId || !summary) return { ok: false, error: "Choose a client and add a short summary." }
  const client = await supabase.from("profiles").select("id,full_name,email").eq("id", clientId).eq("role", "client").maybeSingle<{ id: string; full_name: string | null; email: string | null }>()
  if (!client.data) return { ok: false, error: "The selected client could not be found." }
  const clientName = String(client.data.full_name || client.data.email || "Client").slice(0, 120)
  const log: CommunicationLog = {
    id: crypto.randomUUID(),
    clientId,
    clientName,
    channel: input.channel,
    direction: input.direction,
    summary,
    outcome,
    createdAt: new Date().toISOString(),
  }
  const result = await supabase.from("manager_goals").insert({
    assignee: access.owner ? "david" : "carlos",
    title: `${input.channel === "call" ? "Call" : "WhatsApp"} · ${clientName}`.slice(0, 120),
    details: serializeCommunicationLog(log),
    status: "completed",
    created_by: user.id,
  })
  if (result.error) return { ok: false, error: "The communication could not be added to the client log." }
  revalidatePath("/admin/communications")
  return { ok: true }
}
