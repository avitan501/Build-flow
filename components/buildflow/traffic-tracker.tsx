"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

import { TRAFFIC_EXCLUSION_KEY } from "@/lib/site-traffic"

const SESSION_KEY = "avantia-traffic-session"

export function TrafficTracker({ disabled = false }: { disabled?: boolean }) {
  const pathname = usePathname()
  const previousPath = useRef("")

  useEffect(() => {
    if (disabled || navigator.webdriver || !pathname || pathname.startsWith("/admin") || pathname.startsWith("/api") || previousPath.current === pathname) return
    try {
      if (window.localStorage.getItem(TRAFFIC_EXCLUSION_KEY) === "1") return
    } catch {
      return
    }
    previousPath.current = pathname
    let sessionId = window.sessionStorage.getItem(SESSION_KEY)
    if (!sessionId) {
      sessionId = window.crypto.randomUUID()
      window.sessionStorage.setItem(SESSION_KEY, sessionId)
    }
    void fetch("/api/site-traffic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: pathname, sessionId, referrer: document.referrer }),
      keepalive: true,
    }).catch(() => undefined)
  }, [disabled, pathname])

  return null
}
