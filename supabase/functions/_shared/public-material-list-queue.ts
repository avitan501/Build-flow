import { materialListProcessingAllowed } from "./material-list-maintenance.ts"

/** Intake stays successful when extraction cannot queue; never bypass the durable job. */
export async function queuePublicMaterialList(supabaseUrl: string, serviceRoleKey: string, requestId: string) {
  const headers = { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" }
  try {
    const queued = await fetch(`${supabaseUrl}/rest/v1/rpc/enqueue_client_material_list_job`, {
      method: "POST", headers, body: JSON.stringify({ p_request_id: requestId, p_force: false }),
    })
    if (!queued.ok) return { queued: false, status: "failed", message: "Your original is saved. Splitting could not start. Please try again." }
  } catch {
    return { queued: false, status: "failed", message: "Your original is saved. Splitting could not start. Please try again." }
  }
  if (!materialListProcessingAllowed()) return { queued: true, status: "queued", processingPaused: true }
  // The cron worker can recover a failed nudge. Do not turn it into another AI job.
  try {
    EdgeRuntime.waitUntil(fetch(`${supabaseUrl}/functions/v1/client-material-list-worker`, {
      method: "POST", headers, body: JSON.stringify({ action: "drain" }),
    }).then(response => {
      if (!response.ok) console.error("client_material_list_worker_nudge_failed", { requestId, status: response.status })
    }).catch(() => console.error("client_material_list_worker_nudge_failed", { requestId, status: 0 })))
  } catch { /* Durable job already exists; cron retries the nudge. */ }
  return { queued: true, status: "queued" }
}
