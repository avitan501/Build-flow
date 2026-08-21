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

function liveSearchFallback(query: string, collections: Array<{ label: string; rows: Array<Record<string, unknown>> }>) {
  const ignored = new Set(["about", "from", "have", "show", "that", "the", "what", "when", "where", "which", "with"])
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2 && !ignored.has(term))
  const matches = collections.flatMap(({ label, rows }) => rows.flatMap((row) => {
    const searchable = Object.values(row).filter((value) => typeof value === "string").join(" ").toLowerCase()
    if (terms.length && !terms.some((term) => searchable.includes(term))) return []
    const name = clean(row.full_name || row.company_name || row.title || row.supplier_name || row.quote_number || "Record", 100)
    const status = clean(row.status || row.approval_status || "", 40)
    return [`${label}: ${name}${status ? ` (${status})` : ""}`]
  })).slice(0, 12)
  const totals = collections.map(({ label, rows }) => `${label}: ${rows.length}`).join(" · ")
  if (!matches.length) return `Live search checked the current manager records and found no close match. ${totals}. Try a client name, request title, supplier, quote number, or goal.`
  return `Live search results:\n${matches.map((match) => `• ${match}`).join("\n")}\n\nCurrent records: ${totals}.`
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
  const collections = [
    { label: "Requests", rows: (requestsResult.data ?? []) as Array<Record<string, unknown>> },
    { label: "Clients", rows: (clientsResult.data ?? []) as Array<Record<string, unknown>> },
    { label: "Supplier quotes", rows: (quotesResult.data ?? []) as Array<Record<string, unknown>> },
    { label: "Goals", rows: goals.map(({ title, status, updated_at }) => ({ title, status, updated_at })) as Array<Record<string, unknown>> },
  ]
  const context = JSON.stringify({
    requests: requestsResult.data ?? [],
    clients: clientsResult.data ?? [],
    supplierQuotes: quotesResult.data ?? [],
    goals: goals.map(({ title, status, updated_at }) => ({ title, status, updated_at })),
  })

  let answer = ""
  try {
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; answer?: string; error?: string }>("aura-messaging-broker", {
      body: { action: "dashboard_ai", query, context },
    })
    answer = !error && data?.ok ? clean(data.answer, 3000) : ""
  } catch {
    answer = ""
  }
  if (!answer) answer = liveSearchFallback(query, collections)

  const title = "Dashboard AI search"
  const existing = await supabase.from("manager_goals").select("id,details").eq("created_by", user.id).eq("title", title).limit(1).maybeSingle<{ id: string; details: string | null }>()
  const history: DashboardAiHistoryItem[] = [{ id: crypto.randomUUID(), query, answer: answer.slice(0, 3000), createdAt: new Date().toISOString() }, ...parseDashboardAiHistory(existing.data?.details)].slice(0, 20)
  const details = serializeDashboardAiHistory(history)
  const assignee = access.owner ? "david" : "carlos"
  if (existing.data) await supabase.from("manager_goals").update({ details, status: "completed" }).eq("id", existing.data.id)
  else await supabase.from("manager_goals").insert({ assignee, title, details, status: "completed", created_by: user.id })

  revalidatePath("/admin/build-map")
  return { ok: true, answer, history }
}
