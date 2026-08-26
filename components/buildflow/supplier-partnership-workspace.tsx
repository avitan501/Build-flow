"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { sendSupplierPartnerEmailAction, updateSupplierPartnerAction } from "@/app/owner/partnerships/actions";
import {
  SUPPLIER_PARTNER_STATUSES,
  type SupplierPartner,
  type SupplierPartnerProgress,
  type SupplierPartnerStatus,
} from "@/lib/supplier-partners/catalog";

type Props = {
  partners: SupplierPartner[];
  initialProgress: Record<string, SupplierPartnerProgress>;
  emailSendingReady: boolean;
};

const STATUS_COLORS: Record<SupplierPartnerStatus, string> = {
  "Research ready": "bg-sky-50 text-sky-700 ring-sky-200",
  "Call needed": "bg-amber-50 text-amber-800 ring-amber-200",
  "Email drafted": "bg-violet-50 text-violet-700 ring-violet-200",
  Applied: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  "In progress": "bg-blue-50 text-blue-700 ring-blue-200",
  "Follow-up": "bg-orange-50 text-orange-700 ring-orange-200",
  Approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Set up": "bg-teal-50 text-teal-700 ring-teal-200",
  "Not a fit": "bg-slate-100 text-slate-600 ring-slate-200",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function cleanPhone(phone: string) {
  return phone.replace(/[^0-9+]/g, "");
}

export function SupplierPartnershipWorkspace({ partners, initialProgress, emailSendingReady }: Props) {
  const [progress, setProgress] = useState(initialProgress);
  const [selectedSlug, setSelectedSlug] = useState(partners[0]?.slug || "");
  const [query, setQuery] = useState("");
  const [showFilter, setShowFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();

  const selected = partners.find((partner) => partner.slug === selectedSlug) || partners[0];
  const selectedProgress = selected ? progress[selected.slug] : null;
  const shows = useMemo(() => ["All", ...Array.from(new Set(partners.map((partner) => partner.show)))], [partners]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return partners.filter((partner) => {
      const itemProgress = progress[partner.slug];
      const matchesQuery = !normalized || [partner.company, partner.products, partner.department, partner.programFinding].join(" ").toLowerCase().includes(normalized);
      const matchesShow = showFilter === "All" || partner.show === showFilter;
      const matchesStatus = statusFilter === "All" || itemProgress?.status === statusFilter;
      return matchesQuery && matchesShow && matchesStatus;
    });
  }, [partners, progress, query, showFilter, statusFilter]);

  const counts = useMemo(() => ({
    total: partners.length,
    action: partners.filter((partner) => ["Call needed", "Research ready", "Email drafted"].includes(progress[partner.slug]?.status)).length,
    active: partners.filter((partner) => ["Applied", "In progress", "Follow-up"].includes(progress[partner.slug]?.status)).length,
    won: partners.filter((partner) => ["Approved", "Set up"].includes(progress[partner.slug]?.status)).length,
  }), [partners, progress]);

  function save(input: Parameters<typeof updateSupplierPartnerAction>[0], successMessage: string) {
    setNotice("");
    startTransition(async () => {
      const result = await updateSupplierPartnerAction(input);
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      setProgress((current) => ({ ...current, [input.slug]: result.progress }));
      setNotice(successMessage);
    });
  }

  async function copyText(text: string, message: string) {
    await navigator.clipboard.writeText(text);
    setNotice(message);
  }

  function handleEmail(partner: SupplierPartner, itemProgress: SupplierPartnerProgress) {
    const destination = itemProgress.contactEmail.trim();
    if (!destination) {
      setNotice("Add the correct supplier email first.");
      return;
    }
    if (emailSendingReady) {
      setNotice("");
      startTransition(async () => {
        const result = await sendSupplierPartnerEmailAction({ slug: partner.slug, recipient: destination });
        if (!result.ok) {
          setNotice(result.error);
          return;
        }
        setProgress((current) => ({ ...current, [partner.slug]: result.progress }));
        setNotice(`Email sent to ${destination}. Replies return to office@build.avantiap.com.`);
      });
      return;
    }
    const href = `mailto:${encodeURIComponent(destination)}?subject=${encodeURIComponent(partner.emailSubject)}&body=${encodeURIComponent(partner.emailBody)}`;
    window.location.href = href;
    save({
      slug: partner.slug,
      status: itemProgress.status === "Research ready" || itemProgress.status === "Call needed" ? "Email drafted" : itemProgress.status,
      activityType: "email",
      activityDetail: destination ? `Email draft opened for ${destination}` : "Email draft opened; recipient still needs to be selected",
    }, "Email draft opened. Mark it sent only after you send it from your email account.");
  }

  return (
    <main className="min-h-screen bg-[#f3f6f9] px-3 py-4 text-slate-950 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-[94rem] space-y-5">
        <header className="overflow-hidden rounded-[28px] bg-[#10233f] px-5 py-6 text-white shadow-[0_22px_55px_rgba(15,35,63,0.2)] sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e1b85b]">Carlos supplier desk</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Supplier partnerships</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Every researched company, the right call, the right ask, and the next follow-up in one place.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/owner/delivery-requests" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/15">Delivery requests</Link>
              <Link href="/owner/aura" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/15">Aura tasks</Link>
              <Link href="/" className="rounded-xl bg-[#e2b85a] px-4 py-2.5 text-sm font-bold text-[#10233f]">Website</Link>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[["Companies", counts.total], ["Ready for Carlos", counts.action], ["Applied / follow-up", counts.active], ["Approved / set up", counts.won]].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4"><div className="text-2xl font-semibold">{value}</div><div className="mt-1 text-xs text-slate-300">{label}</div></div>
            ))}
          </div>
        </header>

        <section className={`rounded-2xl border px-4 py-3 text-sm ${emailSendingReady ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
          {emailSendingReady ? <><strong>AvantiaBuild email is connected.</strong> Messages send from the website and replies return to office@build.avantiap.com.</> : <><strong>Email provider needs attention.</strong> The button will open a prepared draft in the computer’s email app until website sending is restored.</>}
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(26rem,0.85fr)]">
          <div className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, material, or department" className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:bg-white" />
              <select value={showFilter} onChange={(event) => setShowFilter(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium">{shows.map((show) => <option key={show}>{show}</option>)}</select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"><option>All</option>{SUPPLIER_PARTNER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
            </div>
            <p className="mt-3 text-xs text-slate-500">Showing {filtered.length} of {partners.length}</p>
            <div className="mt-3 divide-y divide-slate-100">
              {filtered.map((partner) => {
                const itemProgress = progress[partner.slug];
                return (
                  <button key={partner.slug} type="button" onClick={() => setSelectedSlug(partner.slug)} className={`flex w-full items-center gap-3 px-2 py-3 text-left transition hover:bg-slate-50 ${selected?.slug === partner.slug ? "bg-sky-50/70" : ""}`}>
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white"><Image src={partner.logoPath} alt="" fill sizes="44px" className="object-contain p-2" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{partner.company}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{partner.show} · {partner.products}</span></span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${STATUS_COLORS[itemProgress.status]}`}>{itemProgress.status}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selected && selectedProgress ? (
            <aside className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto">
              <div className="flex items-start gap-4">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white"><Image src={selected.logoPath} alt="" fill sizes="56px" className="object-contain p-2.5" /></span>
                <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">{selected.show}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">{selected.company}</h2><p className="mt-1 text-sm text-slate-500">{selected.products}</p></div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <a href={`tel:${cleanPhone(selected.phone)}`} onClick={() => save({ slug: selected.slug, activityType: "call", activityDetail: `Call started to ${selected.phone}` }, "Call opened and recorded.")} className="rounded-xl bg-[#10233f] px-3 py-3 text-center text-sm font-bold text-white">Call {selected.phone}</a>
                <a href={selected.programUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-3 py-3 text-center text-sm font-semibold">Open program</a>
                <button type="button" onClick={() => copyText(selected.callScript, "Call script copied.")} className="rounded-xl border border-slate-300 px-3 py-3 text-sm font-semibold">Copy call script</button>
                <a href={selected.website} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-3 py-3 text-center text-sm font-semibold">Company website</a>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Ask for</p><p className="mt-2 text-sm leading-6 text-slate-700">{selected.bestAsk}</p>
                <p className="mt-3 text-xs text-slate-500"><strong className="text-slate-700">Department:</strong> {selected.department}</p>
                <p className="mt-1 text-xs text-slate-500"><strong className="text-slate-700">Contact:</strong> {selected.contactRole}</p>
                <p className="mt-1 text-xs text-slate-500"><strong className="text-slate-700">Published benefit:</strong> {selected.publishedBenefit}</p>
              </div>

              <div className="mt-5 grid gap-3">
                <label className="grid gap-1.5 text-xs font-bold text-slate-600">Status<select value={selectedProgress.status} disabled={isPending} onChange={(event) => save({ slug: selected.slug, status: event.target.value as SupplierPartnerStatus }, "Status saved.")} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950">{SUPPLIER_PARTNER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label className="grid gap-1.5 text-xs font-bold text-slate-600">Contact email<input type="email" value={selectedProgress.contactEmail} onChange={(event) => setProgress((current) => ({ ...current, [selected.slug]: { ...selectedProgress, contactEmail: event.target.value } }))} onBlur={() => save({ slug: selected.slug, contactEmail: selectedProgress.contactEmail }, "Contact email saved.")} placeholder="Add the correct department email" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-normal text-slate-950" /></label>
                <button type="button" disabled={isPending} onClick={() => handleEmail(selected, selectedProgress)} className="min-h-12 rounded-xl bg-[#e2b85a] px-4 text-sm font-bold text-[#10233f] disabled:opacity-50">{isPending ? "Working…" : emailSendingReady ? "Send individualized email" : "Open individualized email draft"}</button>
                <button type="button" onClick={() => copyText(`${selected.emailSubject}\n\n${selected.emailBody}`, "Email copied.")} className="text-sm font-semibold text-sky-700">Copy email instead</button>
                <label className="grid gap-1.5 text-xs font-bold text-slate-600">Follow-up date<input type="date" value={selectedProgress.followUpDate} onChange={(event) => setProgress((current) => ({ ...current, [selected.slug]: { ...selectedProgress, followUpDate: event.target.value } }))} onBlur={() => save({ slug: selected.slug, followUpDate: selectedProgress.followUpDate }, "Follow-up saved.")} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-normal text-slate-950" /></label>
                <label className="grid gap-1.5 text-xs font-bold text-slate-600">Carlos notes<textarea value={selectedProgress.notes} onChange={(event) => setProgress((current) => ({ ...current, [selected.slug]: { ...selectedProgress, notes: event.target.value } }))} rows={3} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-950" /></label>
                <button type="button" disabled={isPending} onClick={() => save({ slug: selected.slug, contactEmail: selectedProgress.contactEmail, followUpDate: selectedProgress.followUpDate, notes: selectedProgress.notes, activityType: "note", activityDetail: selectedProgress.notes ? "Carlos notes updated" : "Supplier details updated" }, "Supplier record saved.")} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold disabled:opacity-50">{isPending ? "Saving…" : "Save record"}</button>
              </div>

              <details className="mt-5 rounded-2xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold">Research details</summary><p className="mt-3 text-sm leading-6 text-slate-600">{selected.programFinding}</p><a href={selected.researchSource} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-sky-700">Open research source</a></details>

              <div className="mt-5"><h3 className="text-sm font-semibold">Activity</h3><div className="mt-2 space-y-2">{selectedProgress.activities.length ? selectedProgress.activities.slice(0, 8).map((activity) => <div key={activity.id} className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-xs font-medium text-slate-700">{activity.detail}</p><p className="mt-1 text-[10px] text-slate-400">{formatDate(activity.at)}</p></div>) : <p className="text-sm text-slate-400">No activity yet.</p>}</div></div>
            </aside>
          ) : null}
        </section>
        {notice ? <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div> : null}
      </div>
    </main>
  );
}
