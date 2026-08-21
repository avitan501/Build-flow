"use server"

import { revalidatePath } from "next/cache"

import { requireManagerPortalProfile } from "@/lib/auth"
import {
  DASHBOARD_AI_HISTORY_PREFIX,
  TODAY_TASK_PREFIX,
  parseDashboardAiHistory,
  serializeDashboardAiHistory,
  type DashboardAiHistoryItem,
} from "@/lib/manager-command-center"

type SearchResult =
  | { ok: true; answer: string; history: DashboardAiHistoryItem[] }
  | { ok: false; error: string }

type TaskResult = { ok: true } | { ok: false; error: string }

function clean(value: unknown, limit: number) {
  return String(value ?? "").trim().slice(0, limit)
}

export async function createTodayTaskAction(titleInput: string): Promise<TaskResult> {
  const { supabase, user } = await requireManagerPortalProfile()
  const title = clean(titleInput, 120).replace(/\s+/g, " ")
  if (title.length < 2) return { ok: false, error: "Enter a task." }

  const { error } = await supabase.from("manager_goals").insert({
    assignee: "carlos",
    title,
    details: TODAY_TASK_PREFIX,
    status: "open",
    created_by: user.id,
  })
  if (error) return { ok: false, error: "The task could not be added. Try again." }

  revalidatePath("/admin/build-map")
  return { ok: true }
}

export async function setTodayTaskCompletedAction(input: { id: string; completed: boolean }): Promise<TaskResult> {
  const { supabase } = await requireManagerPortalProfile()
  const { data, error } = await supabase
    .from("manager_goals")
    .update({ status: input.completed ? "completed" : "open" })
    .eq("id", input.id)
    .like("details", `${TODAY_TASK_PREFIX}%`)
    .select("id")
    .maybeSingle<{ id: string }>()

  if (error || !data) return { ok: false, error: "The task status could not be updated." }
  revalidatePath("/admin/build-map")
  return { ok: true }
}

export async function searchManagerDashboardAction(queryInput: string): Promise<SearchResult> {
  const { supabase, user, access } = await requireManagerPortalProfile()
  const query = clean(queryInput, 500)
  if (query.length < 2) return { ok: false, error: "Type a question about clients, requests, quotes, suppliers, or goals." }
  const [requestsResult, goalsResult, clientsResult, quotesResult] = await Promise.all([
    supabase.from("quote_requests").select("id,title,status,updated_at").order("updated_at", { ascending: false }).limit(80),
    supabase.from("manager_goals").select("title,details,status,updated_at").order("updated_at", { ascending: false }).limit(80),
    access.customers ? supabase.from("profiles").select("id,full_name,company_name,approval_status").eq("role", "client").eq("is_active", true).limit(100) : Promise.resolve({ data: [] }),
    access.suppliers ? supabase.from("supplier_quotes").select("id,supplier_name,client_name_snapshot,department,status,quote_number,updated_at").order("updated_at", { ascending: false }).limit(80) : Promise.resolve({ data: [] }),
  ])
  const goals = (goalsResult.data ?? []).filter((goal) => !String(goal.details || "").startsWith(DASHBOARD_AI_HISTORY_PREFIX))
  const context = JSON.stringify({
    requests: requestsResult.data ?? [],
    clients: clientsResult.data ?? [],
    supplierQuotes: quotesResult.data ?? [],
    goals: goals.map(({ title, status, updated_at }) => ({ title, status, updated_at })),
  })

  try {
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; answer?: string; error?: string }>("aura-messaging-broker", {
      body: { action: "dashboard_ai", query, context },
    })
    if (error || !data?.ok) return { ok: false, error: data?.error || "Avantia AI could not answer right now." }
    const answer = clean(data.answer, 3000)
    if (!answer) return { ok: false, error: "The AI search returned no answer. Try a more specific question." }

    const title = "Dashboard AI search"
    const existing = await supabase.from("manager_goals").select("id,details").eq("created_by", user.id).eq("title", title).limit(1).maybeSingle<{ id: string; details: string | null }>()
    const history: DashboardAiHistoryItem[] = [{ id: crypto.randomUUID(), query, answer: answer.slice(0, 3000), createdAt: new Date().toISOString() }, ...parseDashboardAiHistory(existing.data?.details)].slice(0, 20)
    const details = serializeDashboardAiHistory(history)
    const assignee = access.owner ? "david" : "carlos"
    if (existing.data) await supabase.from("manager_goals").update({ details, status: "completed" }).eq("id", existing.data.id)
    else await supabase.from("manager_goals").insert({ assignee, title, details, status: "completed", created_by: user.id })

    revalidatePath("/admin/build-map")
    return { ok: true, answer, history }
  } catch {
    return { ok: false, error: "The AI search is temporarily unavailable. Try again in a moment." }
  }
}
