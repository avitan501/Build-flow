import Link from "next/link";
import { ClipboardList, MessageCircle } from "lucide-react";

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";
import { requireAdminProfile } from "@/lib/auth";

export default async function AdminSettingsPage() {
  await requireAdminProfile();
  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-28 pt-6 text-slate-950 sm:px-8 sm:pb-12">
      <div className="mx-auto max-w-5xl">
        <AvantiaBuildLockup />
        <div className="mt-8 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Owner settings</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Configure the client experience</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Manage the questions and communication settings used by Avantia Build.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/admin/settings/material-order-questions" className="group rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,.06)] transition hover:-translate-y-0.5 hover:border-sky-300">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white"><ClipboardList className="h-5 w-5" /></span>
            <h2 className="mt-5 text-lg font-bold">Material Order Questions</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Categories, questions, answer cards, conditional rules, requirements, and client preview.</p>
          </Link>
          <Link href="/admin/whatsapp/settings" className="group rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,.06)] transition hover:-translate-y-0.5 hover:border-sky-300">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white"><MessageCircle className="h-5 w-5" /></span>
            <h2 className="mt-5 text-lg font-bold">WhatsApp Settings</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Message behavior and delivery settings for existing WhatsApp workflows.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
