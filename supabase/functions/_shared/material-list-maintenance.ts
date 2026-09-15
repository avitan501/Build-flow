/** Versioned deployment switch: change only in an explicit reviewed activation. */
export const MATERIAL_LIST_DEPLOYMENT_MODE: string = "active"

/** An environment override may only tighten the build-time gate, never enable it. */
export function materialListProcessingAllowed() {
  const override = Deno.env.get("MATERIAL_LIST_PROCESSING_MODE")
  return MATERIAL_LIST_DEPLOYMENT_MODE === "active" && (override === undefined || override === "active")
}

export function materialListMaintenanceResponse() {
  return new Response(JSON.stringify({ ok: false, status: "maintenance", failureCode: "maintenance", error: "Your original is saved. Document processing is temporarily paused." }), {
    status: 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Retry-After": "60", "X-Material-List-Gate": "maintenance-v1" },
  })
}
