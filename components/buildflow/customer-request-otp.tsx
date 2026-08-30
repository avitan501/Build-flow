"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

import { normalizePhoneNumber } from "@/lib/auth-phone"

export function CustomerRequestOtp() {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<"phone" | "code">("phone")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    const normalizedPhone = normalizePhoneNumber(phone)
    if (!normalizedPhone) return setError("Enter the phone number that received the invitation.")
    setPending(true)
    try {
      const response = await fetch(step === "phone" ? "/api/auth/phone/send" : "/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(step === "phone" ? { phone: normalizedPhone } : { phone: normalizedPhone, token: code.trim() }),
      })
      const result = await response.json().catch(() => null) as { error?: string } | null
      if (!response.ok) return setError(result?.error || "The secure code could not be verified.")
      if (step === "phone") {
        setStep("code")
        return
      }
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return <form onSubmit={submit} className="mt-6 grid gap-3">
    <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Phone number
      <input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={step === "code"} placeholder="(516) 555-1234" className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100" />
    </label>
    {step === "code" ? <label className="grid gap-1.5 text-sm font-semibold text-slate-800">One-time code
      <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={8} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="6-digit code" className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-lg tracking-[0.25em] outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-sky-100" />
    </label> : null}
    {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    <button type="submit" disabled={pending || (step === "code" && code.length < 6)} className="min-h-12 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white disabled:bg-slate-300">{pending ? "Please wait…" : step === "phone" ? "Send secure code" : "Open my requests"}</button>
    {step === "code" ? <button type="button" onClick={() => { setStep("phone"); setCode(""); setError("") }} className="min-h-10 text-sm font-semibold text-[#0066cc]">Use a different phone</button> : null}
    <p className="text-xs leading-5 text-slate-500">Your phone number identifies the invitation. The one-time code verifies access. A request number alone never grants access.</p>
  </form>
}
