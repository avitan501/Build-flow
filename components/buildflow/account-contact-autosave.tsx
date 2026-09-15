"use client"

import { useEffect, useRef, useState } from "react"
import { saveAccountContacts, type ContactSnapshot, type ContactSaveResult } from "@/app/account/contact-settings-action"

type Draft = { email: string; phone: string }
const same = (a: Draft, b: Draft) => a.email === b.email && a.phone === b.phone
const draftOf = (s: ContactSnapshot): Draft => ({ email: s.email ?? "", phone: s.phone ?? "" })

export function AccountContactAutosave({ actorId, initial, inputClass, unavailable = false }: { actorId: string; initial: ContactSnapshot; inputClass: string; unavailable?: boolean }) {
  const [draft, setDraft] = useState(draftOf(initial))
  const [hydrated, setHydrated] = useState(false)
  const [status, setStatus] = useState("Saves automatically")
  const [failed, setFailed] = useState(false)
  const [conflict, setConflict] = useState<ContactSnapshot | null>(null)
  const [storageWarning, setStorageWarning] = useState(false)
  const state = useRef({ draft: draftOf(initial), saved: initial, busy: false, blocked: false, alive: true, recovered: false })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const key = `avantia:alternate-contacts:v1:${actorId}`
  function persist() {
    try { sessionStorage.setItem(key, JSON.stringify({ draft: state.current.draft, revision: state.current.saved.revision })) }
    catch { setStorageWarning(true) }
  }
  function clear() { try { sessionStorage.removeItem(key) } catch { setStorageWarning(true) } }
  // Browser storage is reconciled only after SSR; the fields remain disabled
  // until this finishes so hydration cannot replace a user's early keystrokes.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const current = state.current; current.alive = true
    try {
      const raw = sessionStorage.getItem(key)
      if (raw) {
        const pending = JSON.parse(raw)
        if (typeof pending?.draft?.email !== "string" || pending.draft.email.length > 254 || typeof pending.draft.phone !== "string" || pending.draft.phone.length > 40 || !Number.isSafeInteger(pending.revision) || pending.revision < 0) throw new Error("Invalid draft")
        current.draft = pending.draft; current.saved = { ...current.saved, revision: pending.revision }; current.blocked = true; current.recovered = true
        setDraft(pending.draft); setFailed(true); setStatus("Unsaved contacts restored. Retry to save or review changes made elsewhere.")
      }
    } catch { setStorageWarning(true) }
    setHydrated(true)
    const warn = (e: BeforeUnloadEvent) => { if (current.busy || !same(current.draft, draftOf(current.saved))) { e.preventDefault(); e.returnValue = "" } }
    window.addEventListener("beforeunload", warn)
    return () => { current.alive = false; if (timer.current) clearTimeout(timer.current); window.removeEventListener("beforeunload", warn) }
  }, [key])
  /* eslint-enable react-hooks/set-state-in-effect */

  async function flush() {
    if (timer.current) clearTimeout(timer.current)
    const current = state.current
    if (unavailable || !current.alive || current.busy || current.blocked) return
    const submitted = { ...current.draft }
    if (!current.recovered && same(submitted, draftOf(current.saved))) { clear(); setStatus("Saved"); setFailed(false); return }
    current.busy = true; setStatus("Saving…"); setFailed(false)
    let result: ContactSaveResult
    try { result = await saveAccountContacts({ actorId, ...submitted, expectedRevision: current.saved.revision }) }
    catch { result = { ok: false, error: "Contacts were not saved. Check your connection and retry." } }
    current.busy = false
    if (!current.alive) return
    if (!result.ok) { current.blocked = true; setFailed(true); setStatus(result.error); setConflict(result.conflict ?? null); return }
    current.saved = result.snapshot; current.recovered = false
    if (same(current.draft, submitted)) { clear(); current.draft = draftOf(result.snapshot); setDraft(current.draft); setStatus("Saved") }
    else { persist(); void flush() }
  }
  function edit(field: keyof Draft, value: string) {
    state.current.draft = { ...state.current.draft, [field]: value }; setDraft(state.current.draft); persist()
    if (conflict) return
    state.current.blocked = false; setFailed(false); setStatus(state.current.busy ? "Saving…" : "Not saved yet")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), 650)
  }
  function useSaved() {
    if (!conflict) return
    clear(); state.current.saved = conflict; state.current.draft = draftOf(conflict); state.current.recovered = false; state.current.blocked = false
    setDraft(state.current.draft); setConflict(null); setFailed(false); setStatus("Saved contacts loaded. You can edit them now.")
  }
  return <div className="mt-3 grid gap-3" aria-busy={!hydrated}>
    <label className="grid gap-1.5 text-sm font-semibold">Alternate email<input type="email" value={draft.email} disabled={!hydrated || unavailable} onChange={e => edit("email", e.target.value)} onBlur={() => void flush()} maxLength={254} autoComplete="email" placeholder="alternate@example.com" aria-describedby="alternate-contact-status" aria-invalid={failed || undefined} className={inputClass} /></label>
    <label className="grid gap-1.5 text-sm font-semibold">Alternate phone<input type="tel" value={draft.phone} disabled={!hydrated || unavailable} onChange={e => edit("phone", e.target.value)} onBlur={() => void flush()} maxLength={40} autoComplete="tel" placeholder="+1 555 123 4567" aria-describedby="alternate-contact-status" aria-invalid={failed || undefined} className={inputClass} /></label>
    <p id="alternate-contact-status" role="status" className={`text-xs ${failed || unavailable ? "text-amber-800" : "text-slate-500"}`}>{unavailable ? "Contacts could not be loaded. Reload before editing." : hydrated ? status : "Loading contacts…"}</p>
    {storageWarning ? <p role="alert" className="text-xs text-amber-800">Draft recovery is unavailable. Stay on this page until Saved appears.</p> : null}
    {conflict ? <div className="rounded-lg border border-amber-200 p-3 text-xs"><p className="break-words">Saved email: {conflict.email || "None"}<br />Saved phone: {conflict.phone || "None"}</p><button type="button" onClick={useSaved} className="min-h-11 font-semibold text-[#0066cc]">Use saved contacts</button></div> : failed && !unavailable ? <button type="button" onClick={() => { state.current.blocked = false; void flush() }} className="min-h-11 justify-self-start text-xs font-semibold text-[#0066cc]">Retry</button> : null}
  </div>
}
