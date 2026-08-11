"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

const SESSION_KEY = "avantia-traffic-session"

export function TrafficTracker() {
  const pathname = usePathname()
  const previousPath = useRef("")

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api") || previousPath.current === pathname) return
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
  }, [pathname])

  return null
}
