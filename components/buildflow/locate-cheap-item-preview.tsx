"use client";

import { ArrowUpRight, Check, Copy, Globe2, Mail, Phone, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { firstListedPrice } from "@/lib/catalog-price";

type PriceResult = {
  title: string;
  url: string;
  domain: string;
  priceText: string | null;
  snippet: string;
  matchScore: number;
  matchConfidence: "exact" | "likely";
};

type CallForPriceResult = {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  phone: string;
  matchConfidence: "exact" | "likely";
};

type SalesContact = {
  company: string;
  contactName: string | null;
  role: string;
  phone: string | null;
  email: string | null;
  url: string;
  domain: string;
};

type ItemReview = {
  item: string;
  quantity: number;
  results: PriceResult[];
  callForPrice: CallForPriceResult[];
  salesContacts: SalesContact[];
  checkedAt: string;
  error?: string;
};

const steps = ["Website & items", "Prices & sources", "Review"];

function parseItems(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 5).map((line) => {
    const match = line.match(/^\s*(\d+)\s*(?:x|×)\s+(.+)$/i);
    return match ? { quantity: Math.max(1, Number(match[1])), item: match[2].trim() } : { quantity: 1, item: line };
  });
}

function Progress({ current }: { current: number }) {
  return <ol className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white" aria-label="Locate Cheap Item progress">
    {steps.map((label, index) => {
      const number = index + 1;
      const complete = number < current;
      const active = number === current;
      return <li key={label} className={`flex min-h-12 items-center gap-2 border-r border-slate-200 px-3 last:border-r-0 ${active ? "bg-slate-950 text-white" : "text-slate-600"}`}>
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${complete ? "bg-emerald-600 text-white" : active ? "bg-white text-slate-950" : "bg-slate-100 text-slate-500"}`}>{complete ? <Check className="h-3.5 w-3.5" /> : number}</span>
        <span className="truncate text-xs font-semibold sm:text-sm">{label}</span>
      </li>;
    })}
  </ol>;
}

export function LocateCheapItemPreview() {
  const [step, setStep] = useState(1);
  const [website, setWebsite] = useState("");
  const [zipCode, setZipCode] = useState("11516");
  const [itemsText, setItemsText] = useState("");
  const [projectType, setProjectType] = useState("New house construction");
  const [notes, setNotes] = useState("");
  const [reviews, setReviews] = useState<ItemReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const supplierDomain = useMemo(() => {
    try { return new URL(website).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
  }, [website]);
  const contacts = useMemo(() => {
    const unique = new Map<string, SalesContact>();
    for (const contact of reviews.flatMap((review) => review.salesContacts)) {
      const key = `${contact.email || ""}:${contact.phone || ""}:${contact.url}`;
      if (!unique.has(key)) unique.set(key, contact);
    }
    return [...unique.values()].slice(0, 8);
  }, [reviews]);
  const callOptions = useMemo(() => {
    const unique = new Map<string, CallForPriceResult>();
    for (const option of reviews.flatMap((review) => review.callForPrice)) {
      const key = `${option.phone}:${option.url}`;
      if (!unique.has(key)) unique.set(key, option);
    }
    return [...unique.values()].slice(0, 8);
  }, [reviews]);
  const pricingRequest = useMemo(() => [
    "Avantia Build is requesting current pricing and availability for:",
    "",
    ...reviews.map((review) => `- ${review.quantity} × ${review.item}`),
    "",
    `Delivery ZIP: ${zipCode}`,
    `Project: ${projectType}`,
    notes.trim() ? `Notes: ${notes.trim()}` : "",
    "Please include unit price, package quantity, availability, lead time, delivery cost, and quote expiration.",
  ].filter(Boolean).join("\n"), [notes, projectType, reviews, zipCode]);

  async function analyze() {
    setMessage("");
    const items = parseItems(itemsText);
    if (!supplierDomain) return setMessage("Enter a complete public website address, including https://.");
    if (!/^\d{5}$/.test(zipCode)) return setMessage("Enter a valid 5-digit ZIP code.");
    if (!items.length) return setMessage("Enter at least one product. Put each product on a separate line.");
    setLoading(true);
    try {
      const next = await Promise.all(items.map(async ({ item, quantity }): Promise<ItemReview> => {
        const response = await fetch("/api/admin/catalog/exa-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: notes.trim() ? `${item} · ${notes.trim()}` : item, department: `Construction materials · ${projectType}`, zipCode }),
        });
        const payload = await response.json().catch(() => null) as { buyNow?: PriceResult[]; callForPrice?: CallForPriceResult[]; salesContacts?: SalesContact[]; checkedAt?: string; error?: string } | null;
        if (!response.ok) return { item, quantity, results: [], callForPrice: [], salesContacts: [], checkedAt: new Date().toISOString(), error: payload?.error || "Live price search failed." };
        const unique = new Map<string, PriceResult>();
        for (const result of payload?.buyNow || []) if (result.url && !unique.has(result.url)) unique.set(result.url, result);
        const results = [...unique.values()].filter((result) => result.priceText).sort((a, b) => firstListedPrice(a.priceText) - firstListedPrice(b.priceText)).slice(0, 5);
        return { item, quantity, results, callForPrice: payload?.callForPrice || [], salesContacts: payload?.salesContacts || [], checkedAt: payload?.checkedAt || new Date().toISOString(), error: results.length ? undefined : "No dependable live price was found. Try a model number or more exact description." };
      }));
      setReviews(next);
      setStep(2);
    } catch {
      setMessage("The live search could not be completed. Try again with a more exact product description.");
    } finally {
      setLoading(false);
    }
  }

  function copyList() {
    const text = reviews.map((review) => `${review.quantity} × ${review.item}${review.results[0] ? ` — ${review.results[0].priceText} at ${review.results[0].domain}` : " — needs review"}`).join("\n");
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return <main className="min-h-screen bg-[#f3f6f9] px-3 py-4 text-slate-950 sm:px-5 lg:px-7">
    <div className="mx-auto max-w-[1280px]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-300 pb-4">
        <div><div className="flex items-center gap-2"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#0066cc]">Manager · AI Tools</p><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800">LIVE BETA</span></div><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Locate Cheap Item</h1><p className="mt-1 max-w-3xl text-sm leading-5 text-slate-600">Search current public product pages, compare prices, and keep every result tied to its source.</p></div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><ShieldCheck className="h-4 w-4 text-emerald-700" /><span><strong className="text-slate-900">Review required</strong><br />No email or order is sent</span></div>
      </header>

      <div className="mt-4"><Progress current={step} /></div>
      <section className="mt-4 grid gap-4 lg:grid-cols-[330px_1fr]">
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-[#0066cc]" /><h2 className="text-sm font-bold">Supplier and items</h2></div>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-xs font-bold text-slate-700">Supplier website<input type="url" value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://supplier.com" className="h-11 rounded-md border border-slate-300 px-3 text-sm" /></label>
            <label className="grid gap-1 text-xs font-bold text-slate-700">Delivery ZIP<input value={zipCode} onChange={(event) => setZipCode(event.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" className="h-11 rounded-md border border-slate-300 px-3 text-sm" /></label>
            <label className="grid gap-1 text-xs font-bold text-slate-700">Project type<select value={projectType} onChange={(event) => setProjectType(event.target.value)} className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal"><option>New house construction</option><option>Renovation</option><option>Addition</option><option>Commercial construction</option><option>Custom</option></select></label>
            <label className="grid gap-1 text-xs font-bold text-slate-700">Products — one per line<textarea value={itemsText} onChange={(event) => setItemsText(event.target.value)} placeholder={"40 x 20A tamper-resistant duplex receptacle\n6 x 12/2 NM-B copper wire 250 ft"} className="min-h-36 resize-y rounded-md border border-slate-300 p-3 text-sm" /><span className="font-normal text-slate-500">Use “quantity x product.” Maximum 5 products per search.</span></label>
            <label className="grid gap-1 text-xs font-bold text-slate-700">Notes <span className="font-normal text-slate-400">Optional</span><textarea value={notes} onChange={(event) => setNotes(event.target.value.slice(0, 500))} placeholder="Brand, size, delivery, or package requirements" className="min-h-20 resize-y rounded-md border border-slate-300 p-3 text-sm font-normal" /></label>
            <button type="button" disabled={loading} onClick={analyze} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-bold text-white disabled:opacity-50"><Search className="h-4 w-4" />{loading ? "Checking live sources…" : "Find prices"}</button>
            {message ? <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">{message}</p> : null}
          </div>
          <p className="mt-4 border-t border-slate-200 pt-3 text-[11px] leading-5 text-slate-500">Public product pages only. Prices can change; verify stock, package size, tax, and delivery before buying.</p>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0066cc]">Live price review</p><h2 className="text-sm font-bold">{reviews.length ? `${reviews.length} product${reviews.length === 1 ? "" : "s"} checked` : "Enter products to begin"}</h2>{supplierDomain ? <p className="mt-1 text-xs text-slate-500">Supplier reference: {supplierDomain}</p> : null}</div>{reviews.length ? <button type="button" onClick={copyList} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-xs font-bold"><Copy className="h-3.5 w-3.5" />{copied ? "Copied" : "Copy results"}</button> : null}</div>
          {!reviews.length ? <div className="grid min-h-64 place-items-center p-8 text-center"><div><Search className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No sample prices are shown.</p><p className="mt-1 text-xs text-slate-500">Results appear only after a live sourced search.</p></div></div> : step < 3 ? <div className="divide-y divide-slate-200">{reviews.map((review) => <article key={review.item} className="p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold">{review.item}</h3><p className="mt-1 text-xs text-slate-500">Quantity {review.quantity} · Checked {new Date(review.checkedAt).toLocaleString("en-US")}</p></div>{review.results[0] ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">Lowest found {review.results[0].priceText}</span> : null}</div>{review.error ? <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs text-amber-950">{review.error}</p> : <div className="mt-3 grid gap-2">{review.results.map((result, index) => <div key={result.url} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_auto] sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-slate-500">#{index + 1}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold">{result.matchScore}% match</span>{result.domain === supplierDomain ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800">Entered supplier</span> : null}</div><p className="mt-1 truncate text-sm font-semibold">{result.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{result.snippet}</p></div><div className="flex items-center justify-between gap-3 sm:justify-end"><strong className="text-base">{result.priceText}</strong><a href={result.url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-md border border-slate-300 px-3 text-xs font-bold text-[#0066cc]">Source <ArrowUpRight className="h-3.5 w-3.5" /></a></div></div>)}</div>}</article>)}</div> : <div className="grid gap-4 p-4"><section><h3 className="text-sm font-bold">Verified public contacts</h3><p className="mt-1 text-xs text-slate-500">Only contacts tied to a public source are shown. Nothing has been sent.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{contacts.map((contact) => <article key={`${contact.url}:${contact.email || contact.phone}`} className="rounded-lg border border-slate-200 p-3"><p className="text-sm font-bold">{contact.company}</p><p className="mt-0.5 text-xs text-slate-500">{contact.contactName || contact.role}</p><div className="mt-2 flex flex-wrap gap-2">{contact.phone ? <a href={`tel:${contact.phone}`} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs font-bold"><Phone className="h-3 w-3" />{contact.phone}</a> : null}{contact.email ? <a href={`mailto:${contact.email}`} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs font-bold"><Mail className="h-3 w-3" />{contact.email}</a> : null}<a href={contact.url} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs font-bold text-[#0066cc]">Source <ArrowUpRight className="h-3 w-3" /></a></div></article>)}{!contacts.length ? <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 sm:col-span-2">No dependable public sales contact was found. Use the official supplier website instead of guessing an address.</p> : null}</div>{callOptions.length ? <div className="mt-3 flex flex-wrap gap-2">{callOptions.map((option) => <a key={`${option.phone}:${option.url}`} href={`tel:${option.phone}`} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-sky-900"><Phone className="h-3.5 w-3.5" />{option.domain} · {option.phone}</a>)}</div> : null}</section><section className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold">Pricing request draft</h3><button type="button" onClick={() => { void navigator.clipboard?.writeText(pricingRequest); setCopied(true); window.setTimeout(() => setCopied(false), 1500) }} className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold"><Copy className="h-3.5 w-3.5" />{copied ? "Copied" : "Copy draft"}</button></div><pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-5 text-slate-700">{pricingRequest}</pre></section></div>}
        </section>
      </section>
      <div className="mt-4 flex justify-between gap-2"><button type="button" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="h-10 rounded-md border border-slate-300 bg-white px-4 text-xs font-bold disabled:opacity-40">Back</button><button type="button" onClick={() => setStep(Math.min(3, step + 1))} disabled={!reviews.length || step === 3} className="h-10 rounded-md bg-slate-950 px-4 text-xs font-bold text-white disabled:opacity-40">Continue review</button></div>
    </div>
  </main>;
}
