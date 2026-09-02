import { createRequestForClientAction, type CreateClientRequestResult } from "@/app/admin/users/actions"
import { captureOperationalError } from "@/lib/monitoring/capture-operational-error"

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return true

  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    const result: CreateClientRequestResult = { ok: false, error: "This request was blocked for security." }
    return Response.json(result, { status: 403 })
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    const result: CreateClientRequestResult = { ok: false, error: "The request format was not accepted." }
    return Response.json(result, { status: 415 })
  }

  try {
    const input = await request.json()
    const result = await createRequestForClientAction(input)
    return Response.json(result, { status: result.ok ? 201 : 400 })
  } catch (error) {
    await captureOperationalError(error, {
      feature: "client-requests",
      operation: "create-request",
      provider: "supabase",
      safeCode: "client-request-create-failed",
    })
    console.error("Manager client request creation failed", error)
    const result: CreateClientRequestResult = { ok: false, error: "The request could not be created. No order was submitted. Please try again." }
    return Response.json(result, { status: 500 })
  }
}
