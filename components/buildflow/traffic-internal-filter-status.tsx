"use client"

import { useEffect, useState } from "react"

import { TRAFFIC_EXCLUSION_KEY } from "@/lib/site-traffic"

export function TrafficInternalFilterStatus() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.setItem(TRAFFIC_EXCLUSION_KEY, "1")
    } finally {
      setReady(true)
    }
  }, [])

  return (
    <p className="mt-4 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">
      {ready ? "Internal traffic excluded on this device" : "Applying internal traffic filter..."}
    </p>
  )
}
