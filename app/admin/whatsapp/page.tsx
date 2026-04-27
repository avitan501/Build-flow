import Link from "next/link";

import { requireAdminProfile } from "@/lib/auth";
import { whatsappInboxMock } from "@/lib/whatsapp-draft-inbox";

function badgeClass(status: string) {
  if (status === "awaiting_review") return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  if (status === "blocked") return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
}

export default async function AdminWhatsAppInboxPage() {
  await requireAdminProfile();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                BuildFlow Supply
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                WhatsApp Draft Inbox
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
                Safe UI preview only. Incoming WhatsApp review, contact permissions, and draft reply
                workflow are prepared here. Real WhatsApp sending remains disabled.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Approve Send: <strong>Coming Soon</strong>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Inbox status</div>
              <div className="mt-2 text-lg font-semibold">Draft-only mode</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Current blocker</div>
              <div className="mt-2 text-lg font-semibold">DB schema not applied yet</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Next safe step</div>
              <div className="mt-2 text-lg font-semibold">Apply reviewed migration safely</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-semibold">Incoming messages</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Preview layout for incoming WhatsApp threads and manual review queue.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300">
                {whatsappInboxMock.length} threads
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              {whatsappInboxMock.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/admin/whatsapp/${thread.id}`}
                  className="rounded-[24px] border border-white/10 bg-slate-950/40 p-4 transition hover:border-emerald-400/30 hover:bg-slate-900/80"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-white">{thread.contactName}</h3>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">
                          {thread.contactType}
                        </span>
                        {thread.hasMedia ? (
                          <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-sky-100">
                            media
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{thread.phone}</p>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-200">{thread.lastMessage}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                        <span>Project: {thread.linkedProject ?? "Unassigned"}</span>
                        <span>Client: {thread.linkedClient ?? "Unknown"}</span>
                        <span>Permission: {thread.permissionMode.replaceAll("_", " ")}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${badgeClass(thread.status)}`}>
                        {thread.status.replaceAll("_", " ")}
                      </span>
                      <span className="text-xs text-slate-400">{thread.lastMessageAt}</span>
                      {thread.unreadCount > 0 ? (
                        <span className="rounded-full bg-emerald-400 px-2.5 py-1 text-xs font-semibold text-slate-950">
                          {thread.unreadCount} new
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <aside className="grid gap-6">
            <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Contact permissions</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Permissions are displayed here for review and future editing. No live bot changes happen from this page yet.
              </p>
              <div className="mt-4 grid gap-3">
                {[
                  "Draft only",
                  "Auto acknowledge only",
                  "Block bot",
                  "Ask follow-up questions",
                  "Save files",
                  "Create lead",
                  "Create project draft",
                ].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                    <span className="text-sm text-slate-200">{item}</span>
                    <span className="text-xs uppercase tracking-[0.16em] text-slate-500">UI ready</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Safety status</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <li>• No outbound WhatsApp sending</li>
                <li>• Approve Send stays disabled / Coming Soon</li>
                <li>• Auto-replies remain disabled</li>
                <li>• Inbox UI can be built safely before DB apply</li>
              </ul>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
