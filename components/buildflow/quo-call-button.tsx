"use client"

import { Phone } from "lucide-react"
import { normalizeAuraPhone } from "@/lib/aura/identity"

export function QuoCallButton({ phone, supplierName }: { phone: string | null; supplierName: string }) {
  const number = normalizeAuraPhone(phone) || ""
  const enabled = Boolean(number)

  function callSupplier() {
    if (!enabled) return
    const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    const href = isAppleMobile
      ? `openphone://dial?number=${encodeURIComponent(number)}&action=call`
      : `tel:${number}`
    window.location.href = href
  }

  return (
    <button
      type="button"
      onClick={callSupplier}
      disabled={!enabled}
      title={enabled ? `Call ${supplierName} with Quo` : "Add and save a supplier phone number first"}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
    >
      <Phone className="h-4 w-4" />
      Call supplier
    </button>
  )
}
