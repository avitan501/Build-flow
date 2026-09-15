/** Fail closed while upgrading the document processor. Intake may still enqueue. */
export function materialListProcessingAllowed(mode = Deno.env.get("MATERIAL_LIST_PROCESSING_MODE")) {
  return mode === "active"
}

export function materialListMaintenanceResponse() {
  return new Response(JSON.stringify({ ok: false, status: "maintenance", failureCode: "maintenance", error: "Your original is saved. Document processing is temporarily paused." }), {
    status: 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Retry-After": "60", "X-Material-List-Gate": "maintenance-v1" },
  })
}
