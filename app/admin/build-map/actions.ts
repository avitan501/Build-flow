"use server"

import { revalidatePath } from "next/cache"

import { requireManagerPortalProfile } from "@/lib/auth"
import {
  DASHBOARD_AI_HISTORY_PREFIX,
  parseDashboardAiHistory,
  serializeDashboardAiHistory,
  type DashboardAiHistoryItem,
} from "@/lib/manager-command-center"

type SearchResult =
  | { ok: true; answer: string; history: DashboardAiHistoryItem[] }
  | { ok: false; error: string }

function clean(value: unknown, limit: number) {
  return String(value ?? "").trim().slice(0, limit)
}

function outputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text.trim()
  const output = Array.isArray(payload.output) ? payload.output : []
  return output.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const content = Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : []
    return content.flatMap((entry) => entry && typeof entry === "object" && typeof (entry as { text?: unknown }).text === "string" ? [(entry as { text: string }).text] : [])
  }).join("\n").trim()
}

export async function searchManagerDashboardAction(queryInput: string): Promise<SearchResult> {
  const { supabase, user, access } = await requireManagerPortalProfile()
  const query = clean(queryInput, 500)
  if (query.length < 2) return { ok: false, error: "Type a question about clients, requests, quotes, suppliers, or goals." }
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { ok: false, error: "Dashboard AI is waiting for OPENAI_API_KEY in Vercel." }

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
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_DASHBOARD_MODEL || "gpt-5-mini",
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 550,
        instructions: "You are Avantia Build's internal operations assistant. Answer only from the supplied authorized business snapshot. Be concise, state when data is missing, and suggest the exact Avantia page to open when useful. Never invent prices, client details, or completion status.",
        input: `Authorized business snapshot:\n${context}\n\nEmployee question: ${query}`,
      }),
      cache: "no-store",
    })
    const payload = await response.json() as Record<string, unknown>
    if (!response.ok) {
      const errorMessage = payload.error && typeof payload.error === "object" ? clean((payload.error as { message?: unknown }).message, 300) : ""
      return { ok: false, error: errorMessage || "The AI search could not run. Check the OpenAI project credit and key." }
    }
    const answer = outputText(payload)
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
