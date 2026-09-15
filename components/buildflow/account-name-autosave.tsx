"use client"

import { useEffect, useRef, useState } from "react"
import { saveAccountName, type AccountNameResult } from "@/app/account/name-action"

type NameProps = { actorId: string; initialName: string | null; inputClass: string }

export function AccountNameAutosave(props: NameProps) {
  return <AccountNameEditor key={props.actorId} {...props} />
}

function AccountNameEditor({ actorId, initialName, inputClass }: NameProps) {
  const [value, setValue] = useState(initialName || "")
  const [hydrated, setHydrated] = useState(false)
  const [status, setStatus] = useState("Saves automatically")
  const [failed, setFailed] = useState(false)
  const [conflict, setConflict] = useState<{ name: string | null } | null>(null)
  const [storageWarning, setStorageWarning] = useState(false)
  const state = useRef({ draft: initialName || "", saved: initialName, busy: false, blocked: false, alive: true, recovered: false })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const storageKey = `avantia:account-name-draft:v1:${actorId}`

  function persistDraft() {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ draft: state.current.draft, expectedName: state.current.saved })) }
    catch { setStorageWarning(true) }
  }

  function clearDraft() {
    try { sessionStorage.removeItem(storageKey) }
    catch { setStorageWarning(true) }
  }

  // Recovery is browser-only, after SSR. Never apply it automatically: a
  // previous save may have succeeded, or another editor may have changed it.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    state.current.alive = true
    const current = state.current
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (raw !== null) {
        const pending = JSON.parse(raw)
        if (typeof pending?.draft !== "string" || pending.draft.length > 200 || !(pending.expectedName === null || (typeof pending.expectedName === "string" && pending.expectedName.length <= 200))) throw new Error("Invalid name draft")
        current.draft = pending.draft; current.saved = pending.expectedName; current.blocked = true; current.recovered = true
        setValue(pending.draft); setFailed(true); setStatus("Unsaved name restored. Retry to save or review changes made elsewhere.")
      }
    } catch { setStorageWarning(true) }
    // Keep SSR input disabled until handlers and draft reconciliation are ready.
    setHydrated(true)
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
    if (submitted.length < 2 || submitted.length > 200) { setStatus("Enter a name with 2–200 characters."); setFailed(true); return }
    current.busy = true
    setStatus("Saving…"); setFailed(false)
    let result: AccountNameResult
    try { result = await saveAccountName({ actorId, name: submitted, expectedName: current.saved }) }
    catch { result = { ok: false, error: "Name was not saved. Check your connection and try again." } }
    current.busy = false
    if (!current.alive) return
    if (!result.ok) {
      current.blocked = true
      setStatus(result.error); setFailed(true); setConflict(result.conflict || null)
      return
    }
    current.saved = result.name
    current.recovered = false
    if (current.draft.trim() === submitted) {
      clearDraft()
      current.draft = result.name; setValue(result.name); setStatus("Saved")
    } else {
      persistDraft()
      // A late acknowledgement must never replace newer typing. Serialize the
      // next save against this acknowledgement, not the original page value.
      void flush()
    }
  }

  function edit(next: string) {
    state.current.draft = next; setValue(next)
    persistDraft()
    if (conflict || state.current.recovered) return
    state.current.blocked = false; setFailed(false)
    setStatus(state.current.busy ? "Saving…" : "Not saved yet")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flush() }, 650)
  }

  return <div className="grid gap-1.5" aria-busy={!hydrated}>
    <label htmlFor="fullName" className="grid gap-1.5 text-sm font-semibold">Name<input id="fullName" name="fullName" type="text" value={value} disabled={!hydrated} onChange={event => edit(event.target.value)} onBlur={() => { void flush() }} placeholder="Full name" autoComplete="name" maxLength={200} aria-describedby="account-name-status" aria-invalid={failed || undefined} className={inputClass} /></label>
    <p id="account-name-status" role="status" className={`text-xs ${failed ? "text-amber-800" : "text-slate-500"}`}>{hydrated ? status : "Loading name…"}</p>
    {storageWarning ? <p role="alert" className="text-xs text-amber-800">Draft recovery is unavailable. Stay on this page until Saved appears.</p> : null}
    {conflict ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs"><p>Saved name: <strong>{conflict.name || "No name"}</strong></p><button type="button" className="min-h-11 font-semibold text-[#0066cc]" onClick={() => { clearDraft(); state.current.recovered = false; state.current.saved = conflict.name; state.current.draft = conflict.name || ""; state.current.blocked = false; setValue(conflict.name || ""); setConflict(null); setFailed(false); setStatus("Saved name loaded. You can edit it now.") }}>Use saved name</button></div> : failed ? <button type="button" className="min-h-11 justify-self-start text-xs font-semibold text-[#0066cc]" onClick={() => { state.current.blocked = false; void flush() }}>Retry</button> : null}
  </div>
}
