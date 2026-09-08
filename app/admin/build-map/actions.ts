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
import { SYSTEM_GOAL_STATUS_PREFIX } from "@/lib/manager-goal-status"
import {
  managerNextPipelineStage,
  managerPipelineStage,
  managerPipelineStageWithOverride,
  type ManagerPipelineStage,
} from "@/lib/manager-dashboard"

type SearchResult =
  | { ok: true; answer: string; history: DashboardAiHistoryItem[] }
  | { ok: false; error: string }

type TaskResult = { ok: true } | { ok: false; error: string }
export type ManagerRequestQuickAction = "normal" | "queue" | "rush" | "next" | "archive"
type RequestQuickActionResult =
  | { ok: true; changed: number; archived: number }
  | { ok: false; error: string }

const DASHBOARD_AI_MODELS = new Set(["luna", "terra", "sol"])
const DASHBOARD_AI_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const REQUEST_QUICK_ACTIONS = new Set<ManagerRequestQuickAction>(["normal", "queue", "rush", "next", "archive"])
const REQUEST_QUICK_ACTION_FEATURE = "manager_request_quick_actions"

function clean(value: unknown, limit: number) {
  return String(value ?? "").trim().slice(0, limit)
}

function validRequestIds(value: unknown) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((id) => String(id || "").trim()))]
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    .slice(0, 25)
}

export async function applyManagerRequestQuickAction(input: {
  requestIds: string[]
  action: ManagerRequestQuickAction
}): Promise<RequestQuickActionResult> {
  const requestIds = validRequestIds(input?.requestIds)
  const action = String(input?.action || "") as ManagerRequestQuickAction
  if (!requestIds.length || !REQUEST_QUICK_ACTIONS.has(action)) {
    return { ok: false, error: "Choose at least one request and a valid action." }
  }

  const { supabase, access } = await requireManagerPortalProfile()
  if (!access.customers) return { ok: false, error: "Customer request access is required." }

  const { data: requestRows, error: requestError } = await supabase
    .from("quote_requests")
    .select("id,project_id,owner_id,title,status")
    .in("id", requestIds)
    .returns<Array<{ id: string; project_id: string; owner_id: string; title: string; status: string }>>()
  const requests = (requestRows ?? []).filter((request) => request.status !== "draft" && request.status !== "closed")
  if (requestError || !requests.length) return { ok: false, error: "The selected requests could not be updated." }

  const timestamp = new Date().toISOString()
  if (action === "normal" || action === "queue" || action === "rush") {
    const queueState = action === "queue" ? "queued" : action
    const title = action === "rush" ? "Request marked Rush" : action === "queue" ? "Request added to Queue" : "Request priority cleared"
    const { error } = await supabase.from("project_events").insert(requests.map((request) => ({
      project_id: request.project_id,
      owner_id: request.owner_id,
      event_type: "note_added",
      source: "admin",
      title,
      description: action === "rush" ? "Manager moved this request to the urgent work queue." : action === "queue" ? "Manager added this request to the standard work queue." : "Manager removed the request queue flag.",
      metadata: {
        quote_request_id: request.id,
        manager_feature: REQUEST_QUICK_ACTION_FEATURE,
        manager_action: "request_queue_state",
        queue_state: queueState,
        changed_at: timestamp,
      },
    })))
    if (error) return { ok: false, error: "The request priority could not be saved." }
    revalidatePath("/admin/build-map")
    return { ok: true, changed: requests.length, archived: 0 }
  }

  if (action === "archive") {
    const previousStatuses = new Map(requests.map((request) => [request.id, request.status]))
    const ids = requests.map((request) => request.id)
    const { error: updateError } = await supabase.from("quote_requests").update({ status: "closed" }).in("id", ids)
    if (updateError) return { ok: false, error: "The selected requests could not be archived." }
    const { error: eventError } = await supabase.from("project_events").insert(requests.map((request) => ({
      project_id: request.project_id,
      owner_id: request.owner_id,
      event_type: "status_changed",
      source: "admin",
      title: "Material request archived",
      description: `Manager archived ${request.title}. It can be restored from the request page.`,
      metadata: {
        quote_request_id: request.id,
        manager_feature: REQUEST_QUICK_ACTION_FEATURE,
        manager_action: "request_status",
        previous_status: request.status,
        request_status: "closed",
      },
    })))
    if (eventError) {
      for (const status of new Set(previousStatuses.values())) {
        const restoreIds = ids.filter((id) => previousStatuses.get(id) === status)
        await supabase.from("quote_requests").update({ status }).in("id", restoreIds)
      }
      return { ok: false, error: "Nothing was archived because its history could not be saved." }
    }
    revalidatePath("/admin/build-map")
    revalidatePath("/owner/materials/requests")
    return { ok: true, changed: requests.length, archived: requests.length }
  }

  const ids = requests.map((request) => request.id)
  const [comparisonsResult, packagesResult, eventsResult] = await Promise.all([
    supabase.from("quote_comparisons").select("request_id,status,client_quote_status").in("request_id", ids),
    supabase.from("supplier_packages").select("request_id,status").in("request_id", ids),
    supabase.from("project_events").select("metadata,created_at").contains("metadata", { manager_feature: REQUEST_QUICK_ACTION_FEATURE }).order("created_at", { ascending: false }).limit(1000),
  ])
  if (comparisonsResult.error || packagesResult.error || eventsResult.error) {
    return { ok: false, error: "The current request stages could not be verified." }
  }
  const latestOverride = new Map<string, ManagerPipelineStage>()
  for (const event of eventsResult.data ?? []) {
    const metadata = event.metadata as Record<string, unknown> | null
    const requestId = String(metadata?.quote_request_id || "")
    const stage = metadata?.pipeline_stage
    if (requestId && !latestOverride.has(requestId) && ["received", "pricing", "approval", "delivery"].includes(String(stage))) {
      latestOverride.set(requestId, stage as ManagerPipelineStage)
    }
  }

  const nextEvents: Array<Record<string, unknown>> = []
  const archiveRequests: typeof requests = []
  for (const request of requests) {
    const calculated = managerPipelineStage(
      request,
      comparisonsResult.data ?? [],
      packagesResult.data ?? [],
    )
    const currentStage = managerPipelineStageWithOverride(calculated, latestOverride.get(request.id))
    const nextStage = managerNextPipelineStage(currentStage)
    if (!nextStage) {
      archiveRequests.push(request)
      continue
    }
    nextEvents.push({
      project_id: request.project_id,
      owner_id: request.owner_id,
      event_type: "note_added",
      source: "admin",
      title: `Request moved to ${nextStage}`,
      description: `Manager moved this request from ${currentStage} to ${nextStage} on the internal work board.`,
      metadata: {
        quote_request_id: request.id,
        manager_feature: REQUEST_QUICK_ACTION_FEATURE,
        manager_action: "request_pipeline_stage",
        previous_pipeline_stage: currentStage,
        pipeline_stage: nextStage,
        changed_at: timestamp,
      },
    })
  }

  if (nextEvents.length) {
    const { error } = await supabase.from("project_events").insert(nextEvents)
    if (error) return { ok: false, error: "The requests could not move to the next step." }
  }
  if (archiveRequests.length) {
    const archiveResult = await applyManagerRequestQuickAction({ requestIds: archiveRequests.map((request) => request.id), action: "archive" })
    if (!archiveResult.ok) return archiveResult
  }
  revalidatePath("/admin/build-map")
  return { ok: true, changed: requests.length, archived: archiveRequests.length }
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
    is_focus: true,
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

export async function searchManagerDashboardAction(formData: FormData): Promise<SearchResult> {
  const { supabase, user, access } = await requireManagerPortalProfile()
  const queryInput = clean(formData.get("query"), 2000)
  const modelInput = clean(formData.get("model"), 20)
  const model = DASHBOARD_AI_MODELS.has(modelInput) ? modelInput : "terra"
  const imageValue = formData.get("image")
  const image = imageValue instanceof File && imageValue.size > 0 ? imageValue : null
  if (image && (!DASHBOARD_AI_IMAGE_TYPES.has(image.type) || image.size > 4 * 1024 * 1024)) return { ok: false, error: "Use a JPG, PNG, or WebP photo under 4 MB." }
  const query = queryInput || (image ? "Review this construction photo and explain what you see, what should be checked, and the next action." : "")
  if (query.length < 2) return { ok: false, error: "Type a question or add a construction photo." }
  const [requestsResult, goalsResult, clientsResult, quotesResult] = await Promise.all([
    supabase.from("quote_requests").select("id,title,status,updated_at").order("updated_at", { ascending: false }).limit(80),
    supabase.from("manager_goals").select("title,details,status,updated_at").order("updated_at", { ascending: false }).limit(80),
    access.customers ? supabase.from("profiles").select("id,full_name,company_name,approval_status").eq("role", "client").eq("is_active", true).limit(100) : Promise.resolve({ data: [] }),
    access.suppliers ? supabase.from("supplier_quotes").select("id,supplier_name,client_name_snapshot,department,status,quote_number,updated_at").order("updated_at", { ascending: false }).limit(80) : Promise.resolve({ data: [] }),
  ])
  const goals = (goalsResult.data ?? []).filter((goal) => ![DASHBOARD_AI_HISTORY_PREFIX, SYSTEM_GOAL_STATUS_PREFIX].some((prefix) => String(goal.details || "").startsWith(prefix)))
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
    websitePages: [
      { name: "Manager dashboard", path: "/admin/build-map" },
      { name: "Customer directory", path: "/admin/users" },
      { name: "Client material requests", path: "/owner/materials/requests" },
      { name: "Supplier directory", path: "/admin/vendors" },
      { name: "Supplier quote storage", path: "/admin/supplier-quotes" },
      { name: "Material catalog", path: "/admin/catalog" },
      { name: "Quote comparison", path: "/admin/quote-comparison" },
      { name: "Communications", path: "/admin/communications" },
      { name: "Daily summary", path: "/admin/daily-summary" },
      { name: "Goals and progress", path: "/admin/goals-progress" },
    ],
  })

  let answer = ""
  try {
    const imageDataUrl = image ? `data:${image.type};base64,${Buffer.from(await image.arrayBuffer()).toString("base64")}` : null
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; answer?: string; error?: string }>("aura-messaging-broker", {
      body: { action: "dashboard_ai", query, context, model, imageDataUrl },
    })
    answer = !error && data?.ok ? clean(data.answer, 3000) : ""
  } catch {
    answer = ""
  }
  if (!answer) answer = image ? "The photo could not be analyzed right now. Remove it and search the business records, or try the photo again." : liveSearchFallback(query, collections)

  const title = "Dashboard AI search"
  const existing = await supabase.from("manager_goals").select("id,details").eq("created_by", user.id).eq("title", title).limit(1).maybeSingle<{ id: string; details: string | null }>()
  const historyQuery = `${query}${image ? ` [Photo: ${clean(image.name, 80)}]` : ""}`
  const history: DashboardAiHistoryItem[] = [{ id: crypto.randomUUID(), query: historyQuery, answer: answer.slice(0, 3000), createdAt: new Date().toISOString() }, ...parseDashboardAiHistory(existing.data?.details)].slice(0, 20)
  const details = serializeDashboardAiHistory(history)
  const assignee = access.owner ? "david" : "carlos"
  if (existing.data) await supabase.from("manager_goals").update({ details, status: "completed" }).eq("id", existing.data.id)
  else await supabase.from("manager_goals").insert({ assignee, title, details, status: "completed", created_by: user.id })

  revalidatePath("/admin/build-map")
  return { ok: true, answer, history }
}
