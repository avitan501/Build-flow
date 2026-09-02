import "server-only"

import { after } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function scheduleClientMaterialListOrganization(input: { requestId: string; force?: boolean }) {
  const requestId = String(input.requestId || "").trim()
  if (!UUID_PATTERN.test(requestId)) return false

  after(async () => {
    try {
      const { data, error } = await createAdminClient().functions.invoke<{
        ok?: boolean
        status?: string
        error?: string
      }>("client-material-list-ai", {
        body: { requestId, force: input.force === true },
      })
      if (error || !data?.ok) {
        console.error("client_material_list_ai_background_failed", {
          requestId,
          reason: error?.message || data?.error || "organizer_rejected",
        })
      }
    } catch (cause) {
      console.error("client_material_list_ai_background_failed", {
        requestId,
        reason: cause instanceof Error ? cause.message : "unknown",
      })
    }
  })

  return true
}
