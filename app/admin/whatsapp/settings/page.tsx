import Link from "next/link";

import { requireAdminProfile } from "@/lib/auth";
import { readWhatsAppSettings } from "@/lib/whatsapp-settings";

import { SettingsForm } from "./SettingsForm";

export default async function AdminWhatsAppSettingsPage() {
  await requireAdminProfile();
  const settings = await readWhatsAppSettings();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                BuildFlow Supply
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                WhatsApp Settings (Temporary JSON)
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
                Admin-only behavior controls for the future WhatsApp workflow. This page stores temporary
                server-side JSON settings only until the approved Supabase migration is ready.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/whatsapp"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Back to Draft Inbox
              </Link>
              <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                No live sending • no runtime changes
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Storage</div>
              <div className="mt-2 text-lg font-semibold">Temporary JSON only</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Assistant mode</div>
              <div className="mt-2 text-lg font-semibold">{settings.assistant_mode.replaceAll("_", " ")}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Last updated</div>
              <div className="mt-2 text-lg font-semibold">{new Date(settings.updated_at).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <SettingsForm initialSettings={settings} />
      </section>
    </main>
  );
}
