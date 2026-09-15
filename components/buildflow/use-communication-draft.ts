"use client"

import { useCallback, useState, useSyncExternalStore } from "react"

const memory = new Map<string, string>()
const eventName = "avantia-reply-draft"
const subscribe = (listener: () => void) => {
  window.addEventListener(eventName, listener)
  return () => window.removeEventListener(eventName, listener)
}

// Scoped to the signed-in account and this browser tab; files are never persisted.
export function useCommunicationDraft(scope: string, thread: string, fallback: string, field: "body" | "subject" = "body") {
  // Keep existing body keys compatible; subject has its own namespace.
  const prefix = field === "body" ? "avantia:reply:v1" : "avantia:reply-subject:v1"
  const key = `${prefix}:${scope}:${thread}`
  const [storageFailed, setStorageFailed] = useState(false)
  const read = useCallback(() => {
    if (memory.has(key)) return memory.get(key)!
    try { return sessionStorage.getItem(key) ?? fallback } catch { return fallback }
  }, [key, fallback])
  const draft = useSyncExternalStore(subscribe, read, () => fallback)
  const setDraft = useCallback((value: string, targetThread?: string) => {
    const targetKey = targetThread === undefined ? key : `${prefix}:${scope}:${targetThread}`
    memory.set(targetKey, value)
    try { sessionStorage.setItem(targetKey, value); setStorageFailed(false) }
    catch { setStorageFailed(true) }
    window.dispatchEvent(new Event(eventName))
  }, [key, scope, prefix])
  // A completed send must not erase text typed while the request was in flight.
  const clearSentDraft = useCallback((sentValue: string) => {
    if (read() === sentValue) setDraft("")
  }, [read, setDraft])
  return [draft, setDraft, storageFailed, clearSentDraft] as const
}
