import Link from "next/link";

import { AuraCommunicationWorkspace } from "@/components/buildflow/aura-communication-workspace";
import { AuraConnectionSetup } from "@/components/buildflow/aura-connection-setup";
import { loadAuraDashboard } from "@/lib/aura/dashboard";
import { requireOwnerAccess } from "@/lib/owner-access";

import { cancelAuraIntakeAction, confirmAuraIntakeAction } from "./actions";

function formatDate(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: process.env.AURA_TIME_ZONE || "America/New_York",
  }).format(date);
}

function emptyState(label: string) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No {label} yet.</div>;
}

export default async function AuraOwnerPage() {
  const { supabase } = await requireOwnerAccess("/owner/aura");
  const { intakes, contacts, leads, tasks, communications, connections } = await loadAuraDashboard(supabase);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-8 sm:py-10">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-lg bg-[#0f2747] p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-200">Owner-only workspace</p>
              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Aura Communications</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                See customer calls and messages, reply by SMS or WhatsApp, and review Aura follow-up work in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/" className="rounded-md border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
                Back to website
              </Link>
              <div className="rounded-md bg-[#f3b43f] px-4 py-3 text-sm font-bold text-slate-950">
                {intakes.length} awaiting review
              </div>
            </div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-5">
            {[
              ["Pending", intakes.length],
              ["Contacts", contacts.length],
              ["Leads", leads.length],
              ["Open tasks", tasks.length],
              ["Communications", communications.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-white/10 bg-white/[0.08] p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-300">{label}</div>
                <div className="mt-2 text-2xl font-bold">{value}</div>
              </div>
            ))}
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          {([
            ["Q U O", connections.quo, "Calls, recordings, and SMS"],
            ["WhatsApp", connections.whatsapp, "Customer messages and replies"],
            ["Email", connections.email, "Customer email and replies"],
          ] as const).map(([label, connection, description]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold">{label}</h2>
                <div className="flex gap-1.5 text-[10px] font-bold uppercase">
                  <span className={`rounded-full px-2 py-1 ${connection.receive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{connection.receive ? "Receiving" : "Receive setup"}</span>
                  <span className={`rounded-full px-2 py-1 ${connection.send ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{connection.send ? "Sending" : "Send setup"}</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-500">{description}</p>
            </div>
          ))}
        </section>

        <AuraConnectionSetup whatsappReady={connections.whatsapp.send} smsReady={connections.quo.send} />

        <AuraCommunicationWorkspace communications={communications} contacts={contacts} connections={connections} />

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1269aa]">Confirmation queue</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">Waiting for your approval</h2>
            </div>
            <p className="text-sm text-slate-500">You can confirm here or reply with the WhatsApp confirmation code.</p>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {intakes.length === 0
              ? emptyState("pending Aura proposals")
              : intakes.map((intake) => (
                  <article key={intake.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-sky-700">
                        {intake.status.replaceAll("_", " ")}
                      </span>
                      <span className="text-xs text-slate-500">{formatDate(intake.created_at)}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-bold">{intake.proposal.summary || "Aura proposal"}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{intake.message_text || "Image intake"}</p>
                    {intake.proposal.missingInformation?.length ? (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        Missing: {intake.proposal.missingInformation.join("; ")}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="font-mono text-sm font-bold text-slate-700">Code {intake.confirmation_code}</span>
                      <div className="flex gap-2">
                        <form action={cancelAuraIntakeAction}>
                          <input type="hidden" name="intakeId" value={intake.id} />
                          <button type="submit" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                            Cancel
                          </button>
                        </form>
                        <form action={confirmAuraIntakeAction}>
                          <input type="hidden" name="intakeId" value={intake.id} />
                          <button type="submit" className="rounded-xl bg-[#1269aa] px-4 py-2 text-sm font-bold text-white hover:bg-[#0f5b94]">
                            Confirm and save
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                ))}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold">Contacts</h2>
            <div className="mt-4 space-y-3">
              {contacts.length === 0
                ? emptyState("contacts")
                : contacts.map((contact) => (
                    <article key={contact.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="font-bold">{contact.full_name || contact.company || "Unnamed contact"}</h3>
                      <p className="mt-1 text-sm text-slate-600">{[contact.company, contact.normalized_phone, contact.email].filter(Boolean).join(" · ")}</p>
                    </article>
                  ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold">Leads</h2>
            <div className="mt-4 space-y-3">
              {leads.length === 0
                ? emptyState("leads")
                : leads.map((lead) => (
                    <article key={lead.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold">{lead.title}</h3>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase text-slate-600">{lead.status}</span>
                      </div>
                      <p className="mt-2 text-sm leading-5 text-slate-600">{[lead.location, lead.description].filter(Boolean).join(" · ")}</p>
                    </article>
                  ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold">Open tasks</h2>
            <div className="mt-4 space-y-3">
              {tasks.length === 0
                ? emptyState("open tasks")
                : tasks.map((task) => (
                    <article key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold">{task.title}</h3>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase text-slate-600">{task.priority}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{formatDate(task.due_at)}</p>
                    </article>
                  ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
