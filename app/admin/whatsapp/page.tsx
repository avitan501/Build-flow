import Link from "next/link";

import { PageStatusHeader, statusButtonClass } from "@/components/buildflow/wireframe";
import { requireAdminProfile } from "@/lib/auth";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";
import { formatWhatsAppDateTime, listInboxThreads } from "@/lib/whatsapp-draft-inbox";

function badgeClass(status: string) {
  if (status === "awaiting_review") return "border-orange-200 bg-orange-50 text-orange-700";
  if (status === "blocked" || status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  if (status === "closed") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default async function AdminWhatsAppInboxPage() {
  await requireAdminProfile();
  const { specMap } = getBuildflowWireframeData();
  const spec = specMap.get("admin-whatsapp");
  const threads = await listInboxThreads();

  if (!spec) {
    throw new Error("Missing admin WhatsApp wireframe spec.");
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageStatusHeader
          title={spec.title}
          purpose={spec.purpose}
          status={spec.status}
          progress={spec.progress}
          missing={spec.missing}
          nextStep={spec.nextStep}
        />

        <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">BuildFlow Supply</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Live draft inbox</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Read-only Supabase data for incoming WhatsApp review. This page shows real inbox threads when present, but it still does not send messages or change runtime behavior.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/whatsapp/settings" className={statusButtonClass(spec.status)}>
                Open Settings
              </Link>
              <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                Approve Send: <strong>Coming Soon</strong>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Inbox status</div>
              <div className="mt-2 text-lg font-semibold">{spec.status}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">DB threads</div>
              <div className="mt-2 text-lg font-semibold">{threads.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Read mode</div>
              <div className="mt-2 text-lg font-semibold">Admin read-only</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Next safe step</div>
              <div className="mt-2 text-lg font-semibold">Importer later, no writes now</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-semibold">Incoming messages</h2>
                <p className="mt-1 text-sm text-slate-500">Real read-only data from whatsapp_threads, whatsapp_contacts, and latest whatsapp_messages.</p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-600">
                {threads.length} threads
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              {threads.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <div className="text-base font-semibold text-slate-900">No WhatsApp threads yet</div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    The DB-backed inbox is live, but there are no rows yet in the Draft Inbox tables. When inbound data exists, it will appear here automatically.
                  </p>
                </div>
              ) : (
                threads.map((thread) => (
                  <Link
                    key={thread.id}
                    href={`/admin/whatsapp/${thread.id}`}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-300 hover:bg-white"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">{thread.contactName}</h3>
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-600">
                            {thread.contactType}
                          </span>
                          {thread.hasMedia ? (
                            <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-orange-700">
                              media
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{thread.phone}</p>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700">{thread.lastMessage}</p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>Project: {thread.linkedProject ?? "Unassigned"}</span>
                          <span>Client: {thread.linkedClient ?? "Unassigned"}</span>
                          <span>Permission: {thread.permissionMode.replaceAll("_", " ")}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${badgeClass(thread.status)}`}>
                          {thread.status.replaceAll("_", " ")}
                        </span>
                        <span className="text-xs text-slate-500">{formatWhatsAppDateTime(thread.lastMessageAt)}</span>
                        {thread.unreadCount > 0 ? (
                          <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white">
                            {thread.unreadCount} new
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <aside className="grid gap-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">What is live now</h2>
              <div className="mt-4 grid gap-3">
                {[
                  "Supabase threads + contacts + latest message preview",
                  "Admin-only page access",
                  "Empty state when no DB rows exist",
                  "Read-only thread detail navigation",
                ].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-700">{item}</span>
                    <span className="text-xs uppercase tracking-[0.16em] text-emerald-700">Live</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Safety status</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>• No outbound WhatsApp sending</li>
                <li>• Approve Send stays disabled / Coming Soon</li>
                <li>• No inserts or importer in this V1 step</li>
                <li>• Inbox data is read-only from Supabase</li>
              </ul>
              <Link href="/admin/build-map" className="mt-5 inline-flex text-sm font-semibold text-slate-700 underline underline-offset-4">
                Back to Build Map
              </Link>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
