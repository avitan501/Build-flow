import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminProfile } from "@/lib/auth";
import { formatWhatsAppDateTime, getInboxThread, whatsappPermissionOptions, whatsappSafetyRules } from "@/lib/whatsapp-draft-inbox";

function toneForDirection(direction: string) {
  if (direction === "draft") return "border-amber-400/20 bg-amber-400/10 text-amber-50";
  if (direction === "system") return "border-sky-400/20 bg-sky-400/10 text-sky-50";
  return "border-white/10 bg-slate-950/50 text-slate-100";
}

function prettyJson(value: unknown) {
  if (!value) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default async function AdminWhatsAppThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  await requireAdminProfile();
  const { threadId } = await params;
  const detail = await getInboxThread(threadId);

  if (!detail) {
    notFound();
  }

  const { thread, messages, drafts, auditLog, contactNotes } = detail;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin/whatsapp" className="text-sm text-slate-400 underline underline-offset-4">
              Back to inbox
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">WhatsApp review thread</h1>
            <p className="mt-2 text-sm text-slate-400">
              Read-only DB view for thread, contact, messages, drafts, and audit log. Real sending is still disabled.
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
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Thread key</div>
                <div className="mt-1 break-all">{thread.threadKey}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Contact type</div>
                <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white">{thread.contactType}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Linked client</div>
                <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white">{thread.linkedClient ?? "Unassigned"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Linked project</div>
                <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white">{thread.linkedProject ?? "Unassigned"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Contact notes</div>
                <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white whitespace-pre-wrap">
                  {contactNotes?.trim() || "No notes yet"}
                </div>
              </div>
            </div>
          </aside>

          <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-semibold">Thread view</h2>
                <p className="mt-1 text-sm text-slate-400">Real DB-backed timeline of inbound, draft, and system messages.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300">
                {thread.status.replaceAll("_", " ")}
              </span>
            </div>

            <div className="mt-5 grid gap-4">
              {messages.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/15 bg-slate-950/35 p-8 text-center text-sm text-slate-300">
                  No messages yet for this thread.
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`rounded-[24px] border p-4 ${toneForDirection(message.direction)}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{message.direction}</div>
                        <div className="text-xs text-slate-400">{formatWhatsAppDateTime(message.created_at)}</div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300">
                        {message.needs_review ? <span className="rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1">needs review</span> : null}
                        {message.media_type ? <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1">{message.media_type}</span> : null}
                      </div>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-100">{message.message_text?.trim() || "No text body"}</p>
                    {(message.media_path || message.media_url) ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        <div>media_path: {message.media_path || "—"}</div>
                        <div className="mt-1 break-all">media_url: {message.media_url || "—"}</div>
                      </div>
                    ) : null}
                  </div>
                ))
              )}

              <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">Draft history</h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    {drafts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4">No drafts yet.</div>
                    ) : (
                      drafts.map((draft) => (
                        <div key={draft.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{draft.draft_source} · {draft.status}</span>
                            <span className="text-xs text-slate-400">{formatWhatsAppDateTime(draft.updated_at)}</span>
                          </div>
                          <div className="mt-3 whitespace-pre-wrap leading-6 text-slate-100">{draft.draft_text}</div>
                          {draft.rejection_reason ? <div className="mt-3 text-xs text-rose-200">Rejected: {draft.rejection_reason}</div> : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">Read-only draft preview</h3>
                    <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-amber-100">
                      Draft only
                    </span>
                  </div>
                  <textarea
                    readOnly
                    value={drafts[0]?.draft_text || "No draft yet. When drafts exist in the DB, the newest one appears here for copy/review only."}
                    className="mt-4 min-h-48 w-full rounded-[24px] border border-white/10 bg-slate-950/70 px-4 py-4 text-sm leading-6 text-white outline-none"
                  />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" disabled className="rounded-full bg-white/15 px-5 py-3 text-sm font-semibold text-white opacity-70">
                      Edit Draft · Coming Soon
                    </button>
                    <button type="button" disabled className="rounded-full bg-rose-400/40 px-5 py-3 text-sm font-semibold text-white opacity-70">
                      Reject Draft · Coming Soon
                    </button>
                    <button type="button" disabled className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white opacity-70">
                      Assign to Project · Coming Soon
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
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white">
                  {whatsappPermissionOptions.find((option) => option.value === thread.permissionMode)?.label || thread.permissionMode}
                </div>
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
                {auditLog.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-4">No audit rows yet.</div>
                ) : (
                  auditLog.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium text-white">{item.action}</div>
                        <div className="text-xs text-slate-400">{formatWhatsAppDateTime(item.created_at)}</div>
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                        {item.target_type}{item.target_id ? ` · ${item.target_id}` : ""}
                      </div>
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/20 p-3 text-xs text-slate-300">{prettyJson(item.after_json ?? item.before_json)}</pre>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
