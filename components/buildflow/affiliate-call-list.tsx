"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Mail,
  MessageSquareText,
  Phone,
  Search,
} from "lucide-react";

import {
  TOP_AFFILIATE_CALL_TARGETS,
  type AffiliateCallTarget,
} from "@/lib/affiliate-call-list";
import {
  STATUS_STYLES,
  type AffiliateActivity,
  type AffiliateProgram,
  type AffiliateStatus,
} from "@/lib/affiliate-tracker";
import { formatSiteDate } from "@/lib/site-date-time";

function shortDate(value: string | null) {
  if (!value) return "—";
  return formatSiteDate(value, { month: "short", day: "numeric" }, value);
}

function statusStyle(status: AffiliateStatus | undefined) {
  return status
    ? STATUS_STYLES[status]
    : "border-slate-200 bg-slate-100 text-slate-600";
}

function contactMethods(
  target: AffiliateCallTarget,
): NonNullable<AffiliateCallTarget["contactMethods"]> {
  if (target.contactMethods?.length) return target.contactMethods;
  return [
    {
      label: target.contactLabel ?? target.phone,
      detail: target.askFor,
      href: target.contactHref ?? target.phoneHref,
      type: target.contactType ?? "phone",
    },
  ];
}

function ContactLinks({ target }: { target: AffiliateCallTarget }) {
  return (
    <div className="space-y-1.5">
      {contactMethods(target).map((contact) => {
        const Icon =
          contact.type === "email"
            ? Mail
            : contact.type === "form"
              ? MessageSquareText
              : Phone;
        const opensNewTab = contact.type === "form";
        return (
          <a
            key={`${contact.label}-${contact.href}`}
            href={contact.href}
            target={opensNewTab ? "_blank" : undefined}
            rel={opensNewTab ? "noopener noreferrer" : undefined}
            className="group flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-left transition hover:border-[#0071e3] hover:bg-blue-50"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-[#0071e3]" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-slate-900">
                {contact.label}
              </span>
              <span className="block truncate text-[10px] text-slate-500 group-hover:text-slate-700">
                {contact.detail}
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}

function UpdateHistory({
  program,
  activities,
}: {
  program: AffiliateProgram | undefined;
  activities: AffiliateActivity[];
}) {
  if (!program || (!program.notes && !activities.length)) return null;
  return (
    <details className="mt-2 border-t border-slate-200 pt-2">
      <summary className="cursor-pointer text-[11px] font-semibold text-[#0066cc]">
        Full history ({activities.length})
      </summary>
      {program.notes ? (
        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">
          {program.notes}
        </p>
      ) : null}
      {activities.length ? (
        <div className="mt-2 divide-y divide-slate-200">
          {activities.map((activity) => (
            <div key={activity.id} className="py-2">
              <p className="text-xs font-semibold text-slate-800">
                {activity.title}
              </p>
              {activity.details ? (
                <p className="mt-0.5 text-xs leading-5 text-slate-600">
                  {activity.details}
                </p>
              ) : null}
              <p className="mt-0.5 text-[10px] text-slate-400">
                {shortDate(activity.activity_date)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </details>
  );
}

export function AffiliateCallList({
  programs = [],
  activities = [],
}: {
  programs?: AffiliateProgram[];
  activities?: AffiliateActivity[];
}) {
  const [query, setQuery] = useState("");
  const [copiedRank, setCopiedRank] = useState<number | null>(null);
  const [priority, setPriority] = useState<"All" | "A" | "B" | "C">("All");
  const [contactLevel, setContactLevel] = useState<
    | "All"
    | "Dedicated team"
    | "Direct business"
    | "Pro or sales team"
    | "Network managed"
  >("All");
  const programsByName = useMemo(
    () =>
      new Map(
        programs.map((program) => [
          program.supplier_name.toLowerCase(),
          program,
        ]),
      ),
    [programs],
  );
  const activitiesByProgram = useMemo(() => {
    const grouped = new Map<string, AffiliateActivity[]>();
    for (const activity of activities) {
      grouped.set(activity.program_id, [
        ...(grouped.get(activity.program_id) ?? []),
        activity,
      ]);
    }
    return grouped;
  }, [activities]);
  const filtered = TOP_AFFILIATE_CALL_TARGETS.filter((target) => {
    const search = query.trim().toLowerCase();
    const searchableContacts = contactMethods(target)
      .map((contact) => `${contact.label} ${contact.detail}`)
      .join(" ");
    return (
      (priority === "All" || target.priority === priority) &&
      (contactLevel === "All" || target.contactLevel === contactLevel) &&
      (!search ||
        `${target.company} ${target.category} ${target.phone} ${target.askFor} ${target.callRoute} ${target.currentSituation ?? ""} ${searchableContacts}`
          .toLowerCase()
          .includes(search))
    );
  });

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-[#f8fafc] shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-200 bg-white px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-slate-950">Top 10 supplier programs</h3>
          <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-bold text-white">{filtered.length}/10</span>
          <details className="group relative">
            <summary className="flex h-8 cursor-pointer list-none items-center rounded-md border border-slate-200 px-2.5 text-[11px] font-bold text-slate-700">Filters</summary>
            <div className="absolute right-0 z-20 mt-1 grid w-[min(22rem,calc(100vw-2rem))] gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-xl">
              <label className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="h-8 w-full rounded-md border border-slate-300 pl-8 pr-2 text-xs" /></label>
              <div className="grid grid-cols-2 gap-2">
                <select aria-label="Filter by priority" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"><option>All</option><option>A</option><option>B</option><option>C</option></select>
                <select aria-label="Filter by contact route" value={contactLevel} onChange={(event) => setContactLevel(event.target.value as typeof contactLevel)} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"><option>All</option><option>Dedicated team</option><option>Direct business</option><option>Pro or sales team</option><option>Network managed</option></select>
              </div>
            </div>
          </details>
        </div>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-[1180px] table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-100/90 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
              <th className="w-[18%] px-4 py-3">1 · Supplier</th>
              <th className="w-[11%] px-3 py-3">2 · Status</th>
              <th className="w-[22%] px-3 py-3">3 · Contact</th>
              <th className="w-[27%] px-3 py-3">4 · Current situation</th>
              <th className="w-[22%] px-3 py-3">5 · Next step</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filtered.map((target) => {
              const program = programsByName.get(
                (target.trackerName ?? target.company).toLowerCase(),
              );
              const savedStatus = program?.affiliate_status;
              const programActivities = program
                ? activitiesByProgram.get(program.id) ?? []
                : [];
              return (
                <tr key={target.rank} className="align-top hover:bg-slate-50/70">
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-950 text-[11px] font-bold text-white">
                        {target.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold leading-5 text-slate-950">
                          {target.company}
                        </p>
                        <p className="mt-1 text-[11px] leading-4 text-slate-500">
                          {target.category}
                        </p>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Priority {target.priority} · {target.contactLevel}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle(savedStatus)}`}
                    >
                      {target.statusLabel ?? savedStatus ?? "Not saved"}
                    </span>
                    <p className="mt-2 text-[10px] leading-4 text-slate-500">
                      Verified {shortDate(program?.last_verified_date ?? null)}
                    </p>
                  </td>
                  <td className="px-3 py-4">
                    <ContactLinks target={target} />
                  </td>
                  <td className="px-3 py-4">
                    <p className="text-xs leading-5 text-slate-700">
                      {target.currentSituation ??
                        program?.api_status ??
                        "No current situation recorded."}
                    </p>
                    {program ? (
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                        <span>Last contact {shortDate(program.last_contact_date)}</span>
                        <span>Follow-up {shortDate(program.next_follow_up_date)}</span>
                      </div>
                    ) : null}
                    <UpdateHistory
                      program={program}
                      activities={programActivities}
                    />
                  </td>
                  <td className="px-3 py-4">
                    <p className="text-xs font-medium leading-5 text-slate-800">
                      {program?.next_action || target.callRoute}
                    </p>
                    <p className="mt-2 text-[11px] leading-4 text-slate-500">
                      <strong className="text-slate-700">Ask for:</strong>{" "}
                      {target.askFor}
                    </p>
                    {target.recommendedScript ? (
                      <details className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                        <summary className="cursor-pointer text-[11px] font-bold text-[#0066cc]">Call script</summary>
                        <p className="mt-2 text-[11px] leading-4 text-slate-700">{target.recommendedScript}</p>
                        {target.termsFit ? <p className="mt-2 text-[10px] leading-4 text-amber-800"><strong>Program fit:</strong> {target.termsFit}</p> : null}
                        <button type="button" onClick={async () => { await navigator.clipboard.writeText(target.recommendedScript ?? ""); setCopiedRank(target.rank); window.setTimeout(() => setCopiedRank(null), 1500); }} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700">{copiedRank === target.rank ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}{copiedRank === target.rank ? "Copied" : "Copy script"}</button>
                      </details>
                    ) : null}
                    <a
                      href={target.programUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-md bg-[#0071e3] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#005bb8]"
                    >
                      Open program <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-200 bg-white lg:hidden">
        {filtered.map((target) => {
          const program = programsByName.get(
            (target.trackerName ?? target.company).toLowerCase(),
          );
          const savedStatus = program?.affiliate_status;
          const programActivities = program
            ? activitiesByProgram.get(program.id) ?? []
            : [];
          return (
            <article key={target.rank} className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-950 text-xs font-bold text-white">
                  {target.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    1 · Supplier
                  </p>
                  <h4 className="mt-0.5 font-semibold text-slate-950">
                    {target.company}
                  </h4>
                  <p className="mt-1 text-xs leading-4 text-slate-500">
                    {target.category}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    2 · Status
                  </p>
                  <span
                    className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${statusStyle(savedStatus)}`}
                  >
                    {target.statusLabel ?? savedStatus ?? "Not saved"}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    3 · Contact information
                  </p>
                  <ContactLinks target={target} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    4 · Current situation
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-700">
                    {target.currentSituation ??
                      program?.api_status ??
                      "No current situation recorded."}
                  </p>
                  {program ? (
                    <p className="mt-2 text-[10px] text-slate-500">
                      Last contact {shortDate(program.last_contact_date)} · Next
                      follow-up {shortDate(program.next_follow_up_date)} ·
                      Verified {shortDate(program.last_verified_date)}
                    </p>
                  ) : null}
                  <UpdateHistory
                    program={program}
                    activities={programActivities}
                  />
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0066cc]">
                    5 · Next step
                  </p>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-800">
                    {program?.next_action || target.callRoute}
                  </p>
                  <p className="mt-2 text-[11px] leading-4 text-slate-600">
                    <strong>Ask for:</strong> {target.askFor}
                  </p>
                  {target.recommendedScript ? (
                    <details className="mt-2 rounded-md border border-blue-100 bg-white p-2.5">
                      <summary className="cursor-pointer text-xs font-bold text-[#0066cc]">Call script</summary>
                      <p className="mt-2 text-xs leading-5 text-slate-700">{target.recommendedScript}</p>
                      {target.termsFit ? <p className="mt-2 text-[10px] leading-4 text-amber-800"><strong>Program fit:</strong> {target.termsFit}</p> : null}
                      <button type="button" onClick={async () => { await navigator.clipboard.writeText(target.recommendedScript ?? ""); setCopiedRank(target.rank); window.setTimeout(() => setCopiedRank(null), 1500); }} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-[11px] font-bold text-slate-700">{copiedRank === target.rank ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}{copiedRank === target.rank ? "Copied" : "Copy script"}</button>
                    </details>
                  ) : null}
                  <a
                    href={target.programUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-[#0071e3] px-3 py-2 text-sm font-semibold text-white"
                  >
                    Open program <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
        Contact routes are public business contacts or verified addresses from
        supplier replies. “Network managed” means the retailer makes the
        decision inside its affiliate platform, not at a local store.
      </p>
    </section>
  );
}
