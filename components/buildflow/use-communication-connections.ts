"use client"

import { useEffect, useState } from "react"

export type CommunicationConnections = {
  voice?: { receive: boolean; send: boolean; recording: boolean; phone: string | null }
  quo: { receive: boolean; send: boolean }
  whatsapp: { receive: boolean; send: boolean }
  email: { receive: boolean; send: boolean }
}
type CheckState = "checking" | "verified" | "unavailable"

function validConnections(value: unknown): value is CommunicationConnections {
  if (!value || typeof value !== "object") return false
  return ["quo", "whatsapp", "email"].every(key => {
    const channel = (value as Record<string, unknown>)[key]
    return !!channel && typeof channel === "object" && typeof (channel as { send?: unknown }).send === "boolean" && typeof (channel as { receive?: unknown }).receive === "boolean"
  })
}

export function useCommunicationConnections(initial: CommunicationConnections, scope = "") {
  const [snapshot, setConnections] = useState({ scope, value: initial })
  const [verification, setVerification] = useState<{ scope: string; state: CheckState }>({ scope, state: "checking" })
  const state = verification.scope === scope ? verification.state : "checking"
  const [version, setVersion] = useState(0)
  const refresh = () => { setVerification({ scope, state: "checking" }); setVersion(value => value + 1) }

  useEffect(() => {
    let stopped = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    async function check(attempt: number) {
      controller = new AbortController()
      timeout = setTimeout(() => controller?.abort(), 20_000)
      try {
        const response = await fetch("/api/admin/communications/status", { cache: "no-store", signal: controller.signal })
        const result = response.ok ? await response.json() : null
        if (!result?.verified || !validConnections(result.connections)) throw new Error("Unavailable")
        if (stopped) return
        setConnections({ scope, value: result.connections }); setVerification({ scope, state: "verified" })
      } catch {
        if (stopped) return
        // Retain prior flags for display, but sending must remain disabled until
        // another check verifies them. Never persist these flags across users.
        setVerification({ scope, state: "unavailable" })
        if (attempt < 2) retryTimer = setTimeout(() => { void check(attempt + 1) }, attempt === 0 ? 1500 : 4000)
      } finally { if (timeout) clearTimeout(timeout) }
    }
    void check(0)
    return () => { stopped = true; controller?.abort(); if (timeout) clearTimeout(timeout); if (retryTimer) clearTimeout(retryTimer) }
  }, [version, scope])
  return { connections: snapshot.scope === scope ? snapshot.value : initial, state, refresh }
}
