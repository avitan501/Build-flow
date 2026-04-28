import Link from "next/link";

import { PageStatusHeader, statusButtonClass } from "@/components/buildflow/wireframe";
import { requireAdminProfile } from "@/lib/auth";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";
import { whatsappInboxMock } from "@/lib/whatsapp-draft-inbox";

function badgeClass(status: string) {
  if (status === "awaiting_review") return "border-orange-200 bg-orange-50 text-orange-700";
  if (status === "blocked") return "border-red-200 bg-red-50 text-red-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default async function AdminWhatsAppInboxPage() {
  await requireAdminProfile();
  const { specMap } = getBuildflowWireframeData();
  const spec = specMap.get("admin-whatsapp");

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
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Draft thread preview</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Safe UI preview only. Incoming WhatsApp review, permission labels, and draft reply flow are visible here without changing runtime behavior.
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

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Inbox status</div>
              <div className="mt-2 text-lg font-semibold">{spec.status}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Page progress</div>
              <div className="mt-2 text-lg font-semibold">{spec.progress}% complete</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Next safe step</div>
              <div className="mt-2 text-lg font-semibold">{spec.nextStep}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-semibold">Incoming messages</h2>
                <p className="mt-1 text-sm text-slate-500">Preview layout for incoming threads and the manual review queue.</p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-600">
                {whatsappInboxMock.length} threads
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              {whatsappInboxMock.map((thread) => (
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
                        <span>Client: {thread.linkedClient ?? "Unknown"}</span>
                        <span>Permission: {thread.permissionMode.replaceAll("_", " ")}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${badgeClass(thread.status)}`}>
                        {thread.status.replaceAll("_", " ")}
                      </span>
                      <span className="text-xs text-slate-500">{thread.lastMessageAt}</span>
                      {thread.unreadCount > 0 ? (
                        <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white">
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
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Contact permissions</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Labels for review only. No live bot changes happen from this page.
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
                  <div key={item} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-700">{item}</span>
                    <span className="text-xs uppercase tracking-[0.16em] text-orange-700">Preview</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Safety status</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>• No outbound WhatsApp sending</li>
                <li>• Approve Send stays disabled / Coming Soon</li>
                <li>• Auto-replies remain disabled</li>
                <li>• Inbox UI can grow before DB apply</li>
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
