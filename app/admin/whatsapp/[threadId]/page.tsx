import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminProfile } from "@/lib/auth";
import { getInboxThread, whatsappInboxMock, whatsappPermissionOptions, whatsappSafetyRules } from "@/lib/whatsapp-draft-inbox";

export default async function AdminWhatsAppThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  await requireAdminProfile();
  const { threadId } = await params;
  const thread = getInboxThread(threadId);

  if (!thread || !whatsappInboxMock.some((entry) => entry.id === threadId)) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin/whatsapp" className="text-sm text-slate-400 underline underline-offset-4">
              Back to inbox
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              WhatsApp review thread
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              UI-only draft workflow. Real sending is still disabled.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-3 text-sm font-semibold text-amber-100 opacity-80"
          >
            Approve Send · Coming Soon
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr_0.7fr]">
          <aside className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Contact card</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-300">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Name</div>
                <div className="mt-1 text-base font-semibold text-white">{thread.contactName}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Phone</div>
                <div className="mt-1">{thread.phone}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Contact type</div>
                <select defaultValue={thread.contactType} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white">
                  <option value="client">Client</option>
                  <option value="supplier">Supplier</option>
                  <option value="worker">Worker</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Linked client</div>
                <input defaultValue={thread.linkedClient ?? ""} placeholder="Link to client" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Linked project</div>
                <input defaultValue={thread.linkedProject ?? ""} placeholder="Assign project" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500" />
              </div>
            </div>
          </aside>

          <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-semibold">Thread view</h2>
                <p className="mt-1 text-sm text-slate-400">Incoming message, media references, and draft response area.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300">
                {thread.status.replaceAll("_", " ")}
              </span>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">Inbound WhatsApp</div>
                    <div className="text-xs text-slate-500">{thread.lastMessageAt}</div>
                  </div>
                  {thread.hasMedia ? (
                    <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-sky-100">
                      files attached
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-200">{thread.lastMessage}</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">Media / file references</h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      Quote-photo-01.jpg · inbound reference only
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      Floor-plan-markup.pdf · preview later after DB importer is active
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">Draft reply editor</h3>
                    <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-amber-100">
                      Draft only
                    </span>
                  </div>
                  <textarea
                    defaultValue={"Draft reply placeholder:\n\nThanks — we received your message. Admin review is required before anything is sent.\n\n(Real sending remains disabled in V1.)"}
                    className="mt-4 min-h-48 w-full rounded-[24px] border border-white/10 bg-slate-950/70 px-4 py-4 text-sm leading-6 text-white outline-none placeholder:text-slate-500"
                  />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">
                      Edit Draft
                    </button>
                    <button type="button" className="rounded-full bg-rose-400 px-5 py-3 text-sm font-semibold text-slate-950">
                      Reject Draft
                    </button>
                    <button type="button" className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white">
                      Assign to Project
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="grid gap-6">
            <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Permissions</h2>
              <div className="mt-4 space-y-3">
                <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Primary mode</label>
                <select defaultValue={thread.permissionMode} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white">
                  {whatsappPermissionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <span>Save files</span>
                  <span>{thread.permissionFlags.saveFiles ? "On" : "Off"}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <span>Create lead</span>
                  <span>{thread.permissionFlags.createLead ? "On" : "Off"}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <span>Create project draft</span>
                  <span>{thread.permissionFlags.createProjectDraft ? "On" : "Off"}</span>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Safety rules</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                {whatsappSafetyRules.map((rule) => (
                  <li key={rule}>• {rule}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Audit log</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                  02:22 · Draft edited by Admin
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                  02:18 · Contact marked as client
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                  02:11 · Project assignment prepared for review
                </div>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
