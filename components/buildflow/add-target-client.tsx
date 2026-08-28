"use client";

import { Plus, UserPlus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { createTargetClientAction, type ManagerNewClientInput } from "@/app/admin/users/actions";

const EMPTY_CLIENT: ManagerNewClientInput = { fullName: "", email: "", phone: "", companyName: "", preferredLanguage: "en" };

export function AddTargetClient({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState<ManagerNewClientInput>(EMPTY_CLIENT);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    if (isPending) return;
    setOpen(false);
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createTargetClientAction(client);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setClient(EMPTY_CLIENT);
      setOpen(false);
      window.location.reload();
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Add client" title="Add client" className={compact ? "inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#0071e3] text-white hover:bg-[#0066cc]" : "inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#0071e3] px-3 text-sm font-semibold text-white hover:bg-[#0066cc]"}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {compact ? null : "Add client"}
      </button>
      {open && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[150] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-target-client-title" onMouseDown={(event) => { if (event.currentTarget === event.target) close(); }}>
          <section className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-[#0066cc]"><UserPlus className="h-4 w-4" /></span>
                <h2 id="add-target-client-title" className="mt-3 text-xl font-semibold">Add a customer</h2>
                <p className="mt-1 text-sm text-slate-500">The customer is saved as unverified until a manager approves the account.</p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500"><X className="h-5 w-5" /></button>
            </header>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Name<input value={client.fullName} onChange={(event) => setClient((current) => ({ ...current, fullName: event.target.value }))} autoComplete="name" className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
              <p className="text-xs font-medium text-slate-500 sm:col-span-2">Email or phone — enter at least one.</p>
              <label className="grid gap-1.5 text-sm font-semibold">Email<input type="email" value={client.email} onChange={(event) => setClient((current) => ({ ...current, email: event.target.value }))} autoComplete="email" className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
              <label className="grid gap-1.5 text-sm font-semibold">Phone<input type="tel" value={client.phone} onChange={(event) => setClient((current) => ({ ...current, phone: event.target.value }))} autoComplete="tel" className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
              <label className="grid gap-1.5 text-sm font-semibold">Company <span className="font-normal text-slate-400">optional</span><input value={client.companyName} onChange={(event) => setClient((current) => ({ ...current, companyName: event.target.value }))} autoComplete="organization" className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
              <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Preferred language<select value={client.preferredLanguage} onChange={(event) => setClient((current) => ({ ...current, preferredLanguage: event.target.value as "en" | "es" }))} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 font-normal"><option value="en">EN</option><option value="es">ES</option></select></label>
              {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 sm:col-span-2">{error}</p> : null}
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4">
              <button type="button" onClick={close} disabled={isPending} className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</button>
              <button type="button" onClick={submit} disabled={isPending || client.fullName.trim().length < 2 || (!client.email.trim() && !client.phone?.trim())} className="min-h-11 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white disabled:opacity-40">{isPending ? "Adding..." : "Add client"}</button>
            </footer>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
