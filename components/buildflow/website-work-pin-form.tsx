"use client";

import { LockKeyhole } from "lucide-react";
import { useActionState } from "react";

import {
  unlockWebsiteWorkAction,
  type WebsiteWorkUnlockState,
} from "@/app/admin/goals-progress/website-work/actions";

const initialState: WebsiteWorkUnlockState = { error: null };

export function WebsiteWorkPinForm() {
  const [state, action, pending] = useActionState(unlockWebsiteWorkAction, initialState);
  return (
    <form action={action} className="mx-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
        <LockKeyhole className="h-5 w-5" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">David Dashboard</h1>
      <p className="mt-1 text-sm leading-6 text-slate-600">Enter the manager PIN to open David&apos;s private tasks.</p>
      <label className="mt-5 grid gap-1.5 text-sm font-semibold text-slate-800">
        PIN
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          required
          maxLength={8}
          className="min-h-12 rounded-xl border border-slate-300 px-4 text-lg tracking-[.35em] outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-sky-100"
        />
      </label>
      {state.error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{state.error}</p> : null}
      <button disabled={pending} className="mt-4 min-h-12 w-full rounded-xl bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Opening…" : "Open board"}
      </button>
    </form>
  );
}
