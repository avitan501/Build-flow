"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

/** Sharing a saved document never records approval or sends a message. */
export function RequestApprovalLink({ href, className }: { href: string; className: string }) {
  const [copied, setCopied] = useState(false)
  const [manual, setManual] = useState(false)
  async function copy() {
    setCopied(false)
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable")
      await navigator.clipboard.writeText(href)
      setManual(false)
      setCopied(true)
    } catch { setManual(true) }
  }
  return <div>
    <button type="button" onClick={copy} className={className}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Link copied" : "Copy approval link"}</button>
    <span role="status" className="sr-only">{copied ? "Approval link copied. Client approval is unchanged." : ""}</span>
    {manual ? <label className="mt-2 grid gap-1 text-xs text-slate-600">Select and copy this link<input aria-label="Approval link" value={href} readOnly onFocus={event => event.currentTarget.select()} className="min-h-11 min-w-0 w-full rounded-lg border border-slate-300 px-2" /></label> : null}
  </div>
}
