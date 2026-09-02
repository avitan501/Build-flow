import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from "npm:@supabase/supabase-js@2.57.4"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

type MaterialListJob = {
  job_id: number
  request_id: string
  generation: number
  force_requested: boolean
  attempt: number
}

type OrganizerResult = {
  ok?: boolean
  status?: string
  itemCount?: number
  reviewCount?: number
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

function safeEqual(left: string, right: string) {
  if (!left || left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}

async function authorized(request: Request) {
  const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")
  if (bearer && safeEqual(bearer, serviceKey)) return true

  const provided = request.headers.get("x-client-material-dispatch") || ""
  if (!provided) return false
  const { data: expected, error } = await admin.rpc("get_client_material_list_dispatch_secret")
  return !error && typeof expected === "string" && safeEqual(provided, expected)
}

async function finishJob(job: MaterialListJob, result: {
  succeeded: boolean
  status?: string
  itemCount?: number
  reviewCount?: number
  error?: string
}) {
  const { data, error } = await admin.rpc("finish_client_material_list_job", {
    p_job_id: job.job_id,
    p_generation: job.generation,
    p_succeeded: result.succeeded,
    p_result_status: result.status || null,
    p_item_count: Number.isFinite(result.itemCount) ? result.itemCount : null,
    p_review_count: Number.isFinite(result.reviewCount) ? result.reviewCount : null,
    p_error: result.error?.slice(0, 240) || null,
  })
  if (error) throw new Error(`job_finish_failed:${error.code || "unknown"}`)
  return typeof data === "string" ? data : "unknown"
}

async function runJob(job: MaterialListJob) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)
  let result: {
    succeeded: boolean
    status?: string
    itemCount?: number
    reviewCount?: number
    error?: string
  }
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/client-material-list-ai`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${serviceKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ requestId: job.request_id, force: job.force_requested }),
    })
    const payload = await response.json().catch(() => null) as OrganizerResult | null
    if (!response.ok || !payload?.ok || payload.status === "processing") {
      result = {
        succeeded: false,
        error: payload?.status === "processing" ? "organizer_busy" : `organizer_http_${response.status}`,
      }
    } else {
      result = {
        succeeded: true,
        status: payload.status,
        itemCount: payload.itemCount,
        reviewCount: payload.reviewCount,
      }
    }
  } catch (cause) {
    const code = cause instanceof DOMException && cause.name === "AbortError"
      ? "organizer_timeout"
      : "organizer_unavailable"
    result = { succeeded: false, error: code }
  } finally {
    clearTimeout(timeout)
  }
  return finishJob(job, result)
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)
  if (!await authorized(request)) return json({ error: "Unauthorized" }, 401)

  let body: { action?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: "Invalid JSON" }, 400)
  }
  if (body.action !== "drain") return json({ error: "Unsupported action" }, 400)

  const { data, error } = await admin.rpc("claim_client_material_list_jobs", { p_limit: 1 })
  if (error) return json({ error: "The document queue is unavailable." }, 503)
  const jobs = (data ?? []) as MaterialListJob[]
  if (!jobs.length) return json({ ok: true, claimed: 0, completed: 0 })

  try {
    const status = await runJob(jobs[0])
    return json({ ok: true, claimed: 1, completed: status === "completed" ? 1 : 0, status })
  } catch (cause) {
    console.error("client_material_list_worker_failed", {
      jobId: jobs[0].job_id,
      reason: cause instanceof Error ? cause.message : "unknown",
    })
    return json({ error: "The document job could not be finalized." }, 503)
  }
})
