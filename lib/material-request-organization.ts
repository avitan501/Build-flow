import "server-only"

import { after } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function invokeDirectFallback(requestId: string, force: boolean) {
  const { data, error } = await createAdminClient().functions.invoke<{
    ok?: boolean
    error?: string
  }>("client-material-list-ai", {
    body: { requestId, force },
  })
  if (error || !data?.ok) {
    console.error("client_material_list_ai_background_failed", {
      requestId,
      reason: error?.message || data?.error || "organizer_rejected",
    })
  }
}

export async function scheduleClientMaterialListOrganization(input: { requestId: string; force?: boolean }) {
  const requestId = String(input.requestId || "").trim()
  if (!UUID_PATTERN.test(requestId)) return { queued: false as const, status: "invalid" as const }
  const force = input.force === true
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("enqueue_client_material_list_job", {
    p_request_id: requestId,
    p_force: force,
  })

  if (error) {
    console.error("client_material_list_queue_failed", {
      requestId,
      reason: error.message,
    })
    after(async () => {
      try {
        await invokeDirectFallback(requestId, force)
      } catch (cause) {
        console.error("client_material_list_ai_background_failed", {
          requestId,
          reason: cause instanceof Error ? cause.message : "unknown",
        })
      }
    })
    return { queued: false as const, status: "fallback" as const }
  }

  after(async () => {
    try {
      const { data: worker, error: workerError } = await admin.functions.invoke<{
        ok?: boolean
        error?: string
      }>("client-material-list-worker", {
        body: { action: "drain" },
      })
      if (workerError || !worker?.ok) {
        console.error("client_material_list_worker_nudge_failed", {
          requestId,
          reason: workerError?.message || worker?.error || "worker_rejected",
        })
      }
    } catch (cause) {
      console.error("client_material_list_worker_nudge_failed", {
        requestId,
        reason: cause instanceof Error ? cause.message : "unknown",
      })
    }
  })

  const row = Array.isArray(data) ? data[0] as { job_status?: string } | undefined : undefined
  return { queued: true as const, status: row?.job_status || "queued" }
}
