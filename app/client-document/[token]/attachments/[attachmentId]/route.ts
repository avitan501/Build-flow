import { NextResponse } from "next/server"

import { getSupabasePublicEnv } from "@/lib/supabase/env"

export async function GET(request: Request, { params }: { params: Promise<{ token: string; attachmentId: string }> }) {
  const { token, attachmentId } = await params
  const expectedVersion = Number(new URL(request.url).searchParams.get("v"))
  if (!/^[0-9a-f-]{36}$/i.test(token) || !/^[0-9a-f-]{36}$/i.test(attachmentId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) return new NextResponse("Not found", { status: 404 })
  const endpoint = new URL("/functions/v1/client-document-attachment", getSupabasePublicEnv().url)
  endpoint.searchParams.set("token", token)
  endpoint.searchParams.set("attachmentId", attachmentId)
  endpoint.searchParams.set("version", String(expectedVersion))
  return NextResponse.redirect(endpoint, { status: 307, headers: { "Cache-Control": "private, no-store, max-age=0" } })
}
