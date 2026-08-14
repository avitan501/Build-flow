"use client"

import { Save } from "lucide-react"
import { useActionState } from "react"

import { updateCustomerContact, type CustomerContactUpdateState } from "@/app/admin/users/actions"

const initialState: CustomerContactUpdateState = { status: "idle", message: "" }

export function CustomerContactForm({
  customer,
}: {
  customer: { id: string; fullName: string; companyName: string; phone: string }
}) {
  const [state, action, pending] = useActionState(updateCustomerContact, initialState)

  return (
    <form action={action} className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">
      <input type="hidden" name="userId" value={customer.id} />
      <label className="text-xs font-semibold text-slate-600">Name<input name="fullName" defaultValue={customer.fullName} required minLength={2} maxLength={160} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Company<input name="companyName" defaultValue={customer.companyName} maxLength={180} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Phone<input name="phone" defaultValue={customer.phone} maxLength={80} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{pending ? "Saving..." : "Save contact"}</button>
        {state.message ? <p role="status" className={`text-sm font-semibold ${state.status === "success" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
      </div>
    </form>
  )
}
