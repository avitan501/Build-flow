"use client";

import { ArrowUpRight, Phone, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { getDashboardOutreachLeadsAction } from "@/app/admin/goals-progress/website-work/actions";
import { matchesOutreachSearch, outreachContactHref, outreachPhone, type DashboardOutreachResult } from "@/lib/dashboard-outreach";
import styles from "./dashboard-lead-roster.module.css";

const statusLabels: Record<string, string> = { new: "New", contacted: "Contacted", qualified: "Qualified", not_interested: "Not interested" };

export function DashboardLeadRoster() {
  const [result, setResult] = useState<DashboardOutreachResult | null>(null);
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    startTransition(async () => {
      try {
        const response = await getDashboardOutreachLeadsAction();
        if (active) setResult(response);
      } catch {
        if (active) setResult({ ok: false, error: "Your leads could not load. Please try again." });
      }
    });
    return () => { active = false; };
  }, [attempt]);

  const leads = result?.ok ? result.leads : [];
  const visible = leads.filter((lead) => matchesOutreachSearch(lead, query));
  const phoneCount = leads.filter((lead) => outreachPhone(lead)).length;

  return <section className={styles.roster} aria-labelledby="outreach-leads-title">
    <div className={styles.heading}>
      <div>
        <h3 id="outreach-leads-title">Your people. Your next conversation.</h3>
        <p>Pick one person. One hello is progress.</p>
      </div>
      {result?.ok && <span className={styles.total}>{leads.length} leads · {phoneCount} with phones</span>}
    </div>
    <details className={styles.starter}>
      <summary>A friendly way to start</summary>
      <p>“Hi [Name], David from Avantia here. What material sourcing or ordering is taking up your time? Open to a free 15-minute strategy meeting to see how we can help?”</p>
      <p>For someone you already know, start with their last project or conversation.</p>
      <Link href="/consultation" target="_blank" rel="noopener noreferrer">Open the strategy meeting page <ArrowUpRight size={14} aria-hidden="true" /></Link>
    </details>
    {!result && <p role="status" className={styles.feedback}>Loading your contacts…</p>}
    {result && !result.ok && <div className={styles.feedback}>
      <p role="alert">{result.error}</p>
      <button type="button" disabled={pending} onClick={() => { setResult(null); setAttempt((value) => value + 1); }}>Try again</button>
    </div>}
    {result?.ok && <>
      <label className={styles.search}>
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Find a lead by name, company or phone</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a name, company or phone" />
      </label>
      <p className={styles.count} role="status">{query.trim() ? `${visible.length} of ${leads.length} leads` : "All your leads, in one place"}</p>
      <ul className={styles.list} aria-label="Lead contacts">
        {visible.map((lead) => {
          const phone = outreachPhone(lead);
          return <li key={lead.id} className={styles.contact} data-lead-id={lead.id}>
            <div className={styles.contactTop}>
              <div className={styles.identity}>
                <h4>{lead.full_name || lead.company_name || "Unnamed lead"}</h4>
                {lead.company_name && lead.company_name !== lead.full_name && <p>{lead.company_name}</p>}
                <p className={styles.phone}>{phone?.label || (lead.phone ? "Check saved phone number" : "No phone saved")}</p>
                {!phone && lead.email && <p className={styles.email}>{lead.email}</p>}
              </div>
              {phone && <a className={styles.call} href={phone.href} aria-label={`Call ${lead.full_name} at ${phone.label}`}><Phone size={17} aria-hidden="true" /> Call</a>}
            </div>
            <div className={styles.meta}>
              <span>{statusLabels[lead.status] || lead.status}</span>
              {lead.preferred_language === "es" && <span className={styles.language}>Spanish</span>}
              <Link href={outreachContactHref(lead)} target="_blank" rel="noopener noreferrer">Open contact <ArrowUpRight size={13} aria-hidden="true" /></Link>
            </div>
            {(lead.notes || lead.email || (lead.phone && !phone)) && <details className={styles.notes}>
              <summary>Notes &amp; contact details</summary>
              {lead.email && <p>{lead.email}</p>}
              {lead.phone && !phone && <p>Saved phone: {lead.phone}</p>}
              {lead.notes && <p className={styles.savedNote}>{lead.notes}</p>}
            </details>}
          </li>;
        })}
      </ul>
      {!visible.length && <p className={styles.feedback}>{leads.length ? "No matches. Try another name or phone number." : "No leads saved yet. Add your first contact in the lead directory."}</p>}
      <p className={styles.footnote}>Loads your saved leads each time you open this task.{result.excludedCount > 0 ? ` ${result.excludedCount} internal test contact${result.excludedCount === 1 ? "" : "s"} excluded.` : ""}</p>
    </>}
  </section>;
}
