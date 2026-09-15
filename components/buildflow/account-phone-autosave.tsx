"use client"

import { useEffect, useRef, useState } from "react"
import { saveAccountPhone, type AccountPhoneResult } from "@/app/account/phone-action"

export function AccountPhoneAutosave({ actorId, initialPhone, inputClass }: { actorId: string; initialPhone: string | null; inputClass: string }) {
  const [value, setValue] = useState(initialPhone || "")
  const [status, setStatus] = useState("Saves automatically")
  const [failed, setFailed] = useState(false)
  const [conflict, setConflict] = useState<{ phone: string | null } | null>(null)
  const [storageWarning, setStorageWarning] = useState(false)
  const state = useRef({ draft: initialPhone || "", saved: initialPhone, busy: false, blocked: false, alive: true, recovered: false })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const storageKey = `avantia:account-phone-draft:${actorId}`

  function persist() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ draft: state.current.draft, expectedPhone: state.current.saved }))
    } catch { setStorageWarning(true) }
  }

  function clearDraft() {
    try { sessionStorage.removeItem(storageKey) } catch { setStorageWarning(true) }
  }

  // Browser-only storage is intentionally hydrated after SSR; reading it during
  // render would mismatch server markup. This is one mount-time reconciliation.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    state.current.alive = true
    const current = state.current
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (raw) {
        const draft = JSON.parse(raw)
        if (!draft || typeof draft.draft !== "string" || draft.draft.length > 40 || !(draft.expectedPhone === null || typeof draft.expectedPhone === "string")) throw new Error("Invalid draft")
        if (!draft.draft && !draft.expectedPhone && !current.saved) {
          sessionStorage.removeItem(storageKey)
        } else {
          current.draft = draft.draft; current.saved = draft.expectedPhone; current.blocked = true; current.recovered = true
          setValue(draft.draft); setFailed(true); setStatus("Unsaved phone restored. Retry to save, or review any change made elsewhere.")
        }
      }
    } catch { setStorageWarning(true) }
    const warn = (event: BeforeUnloadEvent) => {
      if (current.busy || current.draft.trim() !== (current.saved || "")) { event.preventDefault(); event.returnValue = "" }
    }
    window.addEventListener("beforeunload", warn)
    return () => { current.alive = false; if (timer.current) clearTimeout(timer.current); window.removeEventListener("beforeunload", warn) }
  }, [storageKey])
  /* eslint-enable react-hooks/set-state-in-effect */

  async function flush() {
    if (timer.current) clearTimeout(timer.current)
    const current = state.current
    if (!current.alive || current.busy || current.blocked) return
    const submitted = current.draft.trim()
    if (!current.recovered && submitted === (current.saved || "")) { clearDraft(); setStatus("Saved"); setFailed(false); return }
    if (!/^\+?[\d\s().-]+$/.test(submitted) || submitted.replace(/\D/g, "").length < 7 || submitted.replace(/\D/g, "").length > 15) { setStatus("Enter a valid phone number with 7–15 digits."); setFailed(true); return }
    current.busy = true
    setStatus("Saving…"); setFailed(false)
    let result: AccountPhoneResult
    try { result = await saveAccountPhone({ actorId, phone: submitted, expectedPhone: current.saved }) }
    catch { result = { ok: false, error: "Phone was not saved. Check your connection and try again." } }
    current.busy = false
    if (!current.alive) return
    if (!result.ok) {
      current.blocked = true
      setStatus(result.error); setFailed(true); setConflict(result.conflict || null)
      return
    }
    current.saved = result.phone
    current.recovered = false
    if (current.draft.trim() === submitted) {
      clearDraft()
      current.draft = result.phone; setValue(result.phone); setStatus("Saved")
    } else {
      persist()
      // A late acknowledgement must never replace newer typing. Serialize the
      // next save against this acknowledgement, not the original page value.
      void flush()
    }
  }

  function edit(next: string) {
    state.current.draft = next; setValue(next)
    persist()
    if (conflict) return
    state.current.blocked = false; setFailed(false)
    setStatus(state.current.busy ? "Saving…" : "Not saved yet")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flush() }, 650)
  }

  return <div className="grid gap-1.5">
    <label htmlFor="phone" className="grid gap-1.5 text-sm font-semibold">Primary phone<input id="phone" name="phone" type="tel" value={value} onChange={event => edit(event.target.value)} onBlur={() => { void flush() }} placeholder="+1 555 123 4567" autoComplete="tel" maxLength={40} aria-describedby="account-phone-status" aria-invalid={failed || undefined} className={inputClass} /></label>
    <p id="account-phone-status" role="status" className={`text-xs ${failed ? "text-amber-800" : "text-slate-500"}`}>{status}</p>
    {storageWarning ? <p role="alert" className="text-xs text-amber-800">Draft recovery is unavailable in this browser. Stay on this page until Saved appears.</p> : null}
    {conflict ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs"><p>Saved phone: <strong>{conflict.phone || "No phone"}</strong></p><button type="button" className="min-h-11 font-semibold text-[#0066cc]" onClick={() => { clearDraft(); state.current.recovered = false; state.current.saved = conflict.phone; state.current.draft = conflict.phone || ""; state.current.blocked = false; setValue(conflict.phone || ""); setConflict(null); setFailed(false); setStatus("Saved phone loaded. You can edit it now.") }}>Use saved phone</button></div> : failed ? <button type="button" className="min-h-11 justify-self-start text-xs font-semibold text-[#0066cc]" onClick={() => { state.current.blocked = false; void flush() }}>Retry</button> : null}
  </div>
}
