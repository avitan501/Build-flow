"use client";

import { ArrowDownLeft, ArrowUpRight, CheckCheck, CircleAlert, Clock3, ImagePlus, Mail, MessageCircle, Phone, Search, Send, Smartphone, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { prepareQuoPhotoMessageAction, sendAuraMessageAction } from "@/app/owner/aura/actions";
import type { AuraCommunicationRow, AuraContactRow } from "@/lib/aura/dashboard";
import { customersForIdentity, normalizeAuraPhone, type AuraCustomerIdentity } from "@/lib/aura/identity";
import type { SupplierRoutingOption } from "@/lib/shop-qualification";

export type AuraLeadRecipient = {
  id: string;
  full_name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
};

type Connections = {
  quo: { receive: boolean; send: boolean };
  whatsapp: { receive: boolean; send: boolean };
  email: { receive: boolean; send: boolean };
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function durationLabel(seconds: number | null) {
  if (seconds == null) return null;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function contactName(contact: AuraContactRow | undefined, communication: AuraCommunicationRow) {
  return (
    contact?.full_name ||
    contact?.company ||
    communication.counterparty_phone ||
    communication.counterparty_email ||
    "Unknown customer"
  );
}

function customerLabel(customer: AuraCustomerIdentity) {
  return customer.full_name || customer.company_name || customer.email || customer.phone || "Unnamed customer";
}

function leadLabel(lead: AuraLeadRecipient) {
  return lead.full_name || lead.company_name || lead.email || lead.phone || "Unnamed lead";
}

function supplierLabel(supplier: SupplierRoutingOption) {
  return supplier.name || supplier.contactName || supplier.email || supplier.phone || "Unnamed supplier";
}

type RecipientType = "customer" | "lead" | "supplier";
type DirectoryRecipient = {
  id: string;
  label: string;
  company: string;
  phone: string;
  whatsapp: string;
  email: string;
};

function recipientDestination(recipient: DirectoryRecipient | undefined, channel: "call" | "sms" | "whatsapp" | "email") {
  if (!recipient) return "";
  if (channel === "email") return recipient.email;
  if (channel === "whatsapp") return recipient.whatsapp || recipient.phone;
  return recipient.phone || recipient.whatsapp;
}

function communicationNumber(communication: AuraCommunicationRow) {
  return normalizeAuraPhone(communication.counterparty_phone) || communication.counterparty_email?.trim().toLowerCase() || "unknown";
}

function quoCallHref(phone: string) {
  if (typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    return `openphone://dial?number=${encodeURIComponent(phone)}&from=${encodeURIComponent("+15169088319")}&action=call`;
  }
  return `tel:${phone}`;
}

function channelTone(channel: AuraCommunicationRow["channel"]) {
  if (channel === "whatsapp") return "bg-emerald-100 text-emerald-700";
  if (channel === "email") return "bg-violet-100 text-violet-700";
  if (channel === "call") return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
}

function statusAppearance(status: string | null) {
  if (["failed", "undelivered"].includes(status || "")) return { Icon: CircleAlert, label: status || "Failed", tone: "bg-rose-100 text-rose-700" };
  if (["delivered", "read"].includes(status || "")) return { Icon: CheckCheck, label: status || "Delivered", tone: "bg-emerald-100 text-emerald-700" };
  return { Icon: Clock3, label: status || "Pending", tone: "bg-amber-100 text-amber-800" };
}

export function AuraCommunicationWorkspace({
  communications,
  contacts,
  customers,
  leads = [],
  suppliers = [],
  connections,
  initialChannelFilter = "all",
  initialQuery = "",
}: {
  communications: AuraCommunicationRow[];
  contacts: AuraContactRow[];
  customers: AuraCustomerIdentity[];
  leads?: AuraLeadRecipient[];
  suppliers?: SupplierRoutingOption[];
  connections: Connections;
  initialChannelFilter?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [channelFilter, setChannelFilter] = useState(initialChannelFilter);
  const [channel, setChannel] = useState<"call" | "sms" | "whatsapp" | "email">("call");
  const [recipient, setRecipient] = useState("");
  const [recipientType, setRecipientType] = useState<RecipientType>("customer");
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [manualDestination, setManualDestination] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [historyView, setHistoryView] = useState<"timeline" | "number">("timeline");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refresh, 10_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  const contactById = useMemo(() => new Map(contacts.map((contact) => [contact.id, contact])), [contacts]);
  const directoryRecipients = useMemo<Record<RecipientType, DirectoryRecipient[]>>(() => ({
    customer: customers.map((customer) => ({ id: customer.id, label: customerLabel(customer), company: customer.company_name || "", phone: customer.phone || "", whatsapp: customer.phone || "", email: customer.email || "" })),
    lead: leads.map((lead) => ({ id: lead.id, label: leadLabel(lead), company: lead.company_name || "", phone: lead.phone || "", whatsapp: lead.phone || "", email: lead.email || "" })),
    supplier: suppliers.map((supplier) => ({ id: supplier.id, label: supplierLabel(supplier), company: supplier.contactName || supplier.contactLabel || "", phone: supplier.phone || "", whatsapp: supplier.whatsapp || "", email: supplier.email || "" })),
  }), [customers, leads, suppliers]);
  const activeRecipients = directoryRecipients[recipientType];
  const filteredCommunications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return communications.filter((communication) => {
      if (channelFilter !== "all" && communication.channel !== channelFilter) return false;
      if (!normalizedQuery) return true;
      const contact = communication.contact_id ? contactById.get(communication.contact_id) : undefined;
      return [
        contact?.full_name,
        contact?.company,
        communication.counterparty_phone,
        communication.counterparty_email,
        communication.subject,
        communication.body,
        communication.summary,
        communication.transcript,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery));
    });
  }, [channelFilter, communications, contactById, query]);
  const communicationsByNumber = useMemo(() => {
    const groups = new Map<string, AuraCommunicationRow[]>();
    for (const communication of filteredCommunications) {
      const key = communicationNumber(communication);
      groups.set(key, [...(groups.get(key) || []), communication]);
    }
    return [...groups.entries()].map(([number, items]) => ({ number, items }));
  }, [filteredCommunications]);

  function chooseContact(contact: AuraContactRow) {
    if (!contact.normalized_phone) return;
    setRecipient(contact.normalized_phone);
    document.getElementById("aura-compose")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function chooseRecipient(id: string) {
    setSelectedRecipientId(id);
    setManualDestination(false);
    setRecipient(recipientDestination(activeRecipients.find((item) => item.id === id), channel));
  }

  function chooseRecipientType(value: RecipientType) {
    setRecipientType(value);
    setSelectedRecipientId("");
    setManualDestination(false);
    setRecipient("");
  }

  function sendMessage() {
    if (channel === "call") return;
    const messageChannel = channel;
    setFeedback(null);
    startTransition(async () => {
      if (messageChannel === "sms" && photo) {
        const formData = new FormData();
        formData.set("phone", recipient);
        formData.set("message", message);
        formData.set("photo", photo);
        const prepared = await prepareQuoPhotoMessageAction(formData);
        if (!prepared.ok) { setFeedback({ tone: "error", text: prepared.error }); return; }
        const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (mobile) {
          window.location.href = prepared.deepLink;
        } else {
          await navigator.clipboard?.writeText(message).catch(() => undefined);
          window.open(prepared.quoWebUrl, "_blank", "noopener,noreferrer");
          window.open(prepared.attachmentUrl, "_blank", "noopener,noreferrer");
          setFeedback({ tone: "success", text: "Q U O opened in a new tab. The message was copied; attach the prepared image from the second tab." });
        }
        setPhoto(null);
        if (photoInputRef.current) photoInputRef.current.value = "";
        return;
      }
      const result = await sendAuraMessageAction({ channel: messageChannel, recipient, subject, message });
      if (!result.ok) {
        setFeedback({ tone: "error", text: result.error });
        return;
      }
      setMessage("");
      const channelName = messageChannel === "sms" ? "SMS" : messageChannel === "whatsapp" ? "WhatsApp" : "Email";
      setFeedback({ tone: "success", text: messageChannel === "whatsapp" ? "WhatsApp was submitted. Confirm Delivered or Read in the history below; Queued does not guarantee delivery." : `${channelName} sent and saved to the timeline.` });
      router.refresh();
    });
  }

  const selectedChannelReady = channel === "call" || (channel === "sms" ? connections.quo.send : channel === "whatsapp" ? connections.whatsapp.send : connections.email.send);
  const normalizedPhone = normalizeAuraPhone(recipient);

  function communicationEntry(communication: AuraCommunicationRow) {
    const contact = communication.contact_id ? contactById.get(communication.contact_id) : undefined;
    const matches = customersForIdentity(customers, communication.counterparty_phone, communication.counterparty_email);
    const matchedCustomer = matches.length === 1 ? matches[0] : undefined;
    const detail = communication.summary || communication.body || communication.transcript;
    const duration = durationLabel(communication.duration_seconds);
    const Icon = communication.channel === "call" ? Phone : communication.channel === "whatsapp" ? MessageCircle : communication.channel === "email" ? Mail : Smartphone;
    const incoming = communication.direction === "incoming";
    const DirectionIcon = incoming ? ArrowDownLeft : ArrowUpRight;
    const status = statusAppearance(communication.status);
    const StatusIcon = status.Icon;
    return <article key={communication.id} className={`flex gap-3 p-4 sm:p-5 ${incoming ? "bg-emerald-50/40" : "bg-sky-50/30"}`}><span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${channelTone(communication.channel)}`}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{matchedCustomer ? customerLabel(matchedCustomer) : contactName(contact, communication)}</h3><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${incoming ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}><DirectionIcon className="h-3 w-3" />{incoming ? "Received" : "Sent"}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${channelTone(communication.channel)}`}>{communication.channel}</span>{communication.status ? <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${status.tone}`}><StatusIcon className="h-3 w-3" />{status.label}</span> : null}{matches.length === 0 ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">Unmatched</span> : matches.length > 1 ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">Match conflict</span> : null}</div><p className="mt-1 text-xs text-slate-500">{communication.counterparty_phone || communication.counterparty_email}</p></div><time className="text-xs text-slate-500">{formatDate(communication.occurred_at)}</time></div>{detail ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{detail}</p> : null}{duration ? <p className="mt-2 text-xs font-semibold text-slate-500">Duration {duration}</p> : null}{communication.next_steps.length ? <p className="mt-2 text-xs font-semibold text-[#0066cc]">Next: {communication.next_steps.join(" · ")}</p> : null}</div></article>;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid min-w-0 gap-5">
        <section id="aura-compose" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="aura-compose-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0066cc]">New message</p>
              <h2 id="aura-compose-heading" className="mt-1 text-xl font-semibold">Contact someone</h2>
            </div>
            {channel !== "email" && recipient ? <a href={`tel:${recipient}`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold"><Phone className="h-4 w-4" />Call</a> : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Communication method">
            {([
              ["call", "Call", Phone],
              ["sms", "Text", Smartphone],
              ["whatsapp", "WhatsApp", MessageCircle],
              ["email", "Email", Mail],
            ] as const).map(([value, label, Icon]) => (
              <button key={value} type="button" onClick={() => { setChannel(value); setFeedback(null); if (!manualDestination) setRecipient(recipientDestination(activeRecipients.find((item) => item.id === selectedRecipientId), value)); }} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold ${channel === value ? "border-[#0071e3] bg-[#0071e3] text-white" : "border-slate-300 bg-white text-slate-800"}`}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)_auto]">
            <label className="grid gap-1.5 text-xs font-semibold">Contact type
              <select value={recipientType} onChange={(event) => chooseRecipientType(event.target.value as RecipientType)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal">
                <option value="customer">Customers</option>
                <option value="lead">Leads</option>
                <option value="supplier">Suppliers</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">{recipientType === "customer" ? "Customer" : recipientType === "lead" ? "Lead" : "Supplier"}
              <select value={selectedRecipientId} onChange={(event) => chooseRecipient(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal">
                <option value="">Choose {recipientType === "customer" ? "a customer" : recipientType === "lead" ? "a lead" : "a supplier"}</option>
                {activeRecipients.map((item) => <option key={item.id} value={item.id}>{item.label}{item.company && item.company !== item.label ? ` · ${item.company}` : ""}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => { setManualDestination((value) => !value); setSelectedRecipientId(""); setRecipient(""); }} className="min-h-11 self-end rounded-md border border-slate-300 px-3 text-sm font-semibold">{manualDestination ? "Use saved contacts" : "Enter manually"}</button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <label className="grid gap-1.5 text-xs font-semibold">{channel === "email" ? "Email" : "Phone"}<input value={recipient} onChange={(event) => setRecipient(event.target.value)} readOnly={!manualDestination && Boolean(selectedRecipientId)} inputMode={channel === "email" ? "email" : "tel"} autoComplete={channel === "email" ? "email" : "tel"} placeholder={channel === "email" ? "name@example.com" : "(516) 555-0123"} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal read-only:bg-slate-50" /></label>
            {channel === "call" ? <a href={normalizedPhone ? quoCallHref(normalizedPhone) : undefined} aria-disabled={!normalizedPhone} className={`inline-flex min-h-11 self-end items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold ${normalizedPhone ? "bg-emerald-600 text-white" : "pointer-events-none bg-slate-200 text-slate-400"}`}><Phone className="h-4 w-4" />Call with Q U O</a> : null}
            {channel === "email" ? <label className="grid gap-1.5 text-xs font-semibold md:col-span-2">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} placeholder="Message from Avantia Build" className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal" /></label> : null}
            {channel !== "call" ? <label className="grid gap-1.5 text-xs font-semibold md:col-span-2">Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1600} rows={4} placeholder="Write the message here" className="rounded-md border border-slate-300 p-3 text-sm font-normal leading-6" /></label> : null}
            {channel === "sms" ? <div className="flex min-w-0 gap-2 md:col-span-2"><label className="inline-flex min-h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold"><ImagePlus className="h-4 w-4 shrink-0" /><span className="truncate">{photo ? photo.name : "Add photo"}</span><input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setPhoto(event.target.files?.[0] || null)} /></label>{photo ? <button type="button" onClick={() => { setPhoto(null); if (photoInputRef.current) photoInputRef.current.value = ""; }} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700" aria-label="Remove attached photo"><X className="h-4 w-4" /></button> : null}</div> : null}
            {channel === "sms" && photo ? <p className="text-xs text-slate-500 md:col-span-2">On mobile, Q U O opens with the image. On a computer, Q U O and the prepared image open in separate tabs so you can attach it.</p> : null}
            {channel === "whatsapp" ? <p className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs leading-5 text-amber-900 md:col-span-2">Current test connection: the recipient must have joined the Twilio Sandbox. Free-form messages work only within 24 hours after they message Avantia; otherwise an approved WhatsApp template is required.</p> : null}
            {channel !== "email" && recipient ? <p className={`text-xs font-semibold md:col-span-2 ${normalizedPhone ? "text-emerald-700" : "text-rose-700"}`}>{normalizedPhone ? `Sending to ${normalizedPhone}` : "Enter a complete US number or an explicit international number."}</p> : null}
          </div>
          {!selectedChannelReady ? <p className="mt-3 text-sm font-semibold text-amber-700">This channel needs its API credentials. Open Phone connections above and press Connect WhatsApp & Text.</p> : null}
          {feedback ? <p className={`mt-3 text-sm font-semibold ${feedback.tone === "success" ? "text-emerald-700" : "text-rose-700"}`} role="status">{feedback.text}</p> : null}
          {channel !== "call" ? <div className="mt-4 flex justify-end"><button type="button" onClick={sendMessage} disabled={pending || !selectedChannelReady || !recipient.trim() || !message.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" />{pending ? "Sending..." : channel === "sms" && photo ? "Open Q U O with photo" : channel === "sms" ? "Send text" : channel === "whatsapp" ? "Send WhatsApp" : "Send email"}</button></div> : null}
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="aura-history-heading">
          <header className="border-b border-slate-200 p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0066cc]">Communication history</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2"><h2 id="aura-history-heading" className="text-xl font-semibold">Calls and messages</h2><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Live · updates every 10 sec</span></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <label className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><span className="sr-only">Search communications</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contact, phone, or message" className="min-h-11 w-full rounded-md border border-slate-300 pl-10 pr-3 text-sm" /></label>
              <label><span className="sr-only">Filter by channel</span><select value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)} className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="all">All channels</option><option value="call">Calls</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></label>
            </div>
            <div className="mt-2 inline-grid grid-cols-2 rounded-md border border-slate-300 bg-slate-50 p-0.5" aria-label="History view">
              <button type="button" onClick={() => setHistoryView("timeline")} className={`min-h-9 rounded px-3 text-xs font-semibold ${historyView === "timeline" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Timeline</button>
              <button type="button" onClick={() => setHistoryView("number")} className={`min-h-9 rounded px-3 text-xs font-semibold ${historyView === "number" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>By phone number</button>
            </div>
          </header>
          {filteredCommunications.length ? historyView === "timeline" ? <div className="divide-y divide-slate-100">{filteredCommunications.map(communicationEntry)}</div> : <div className="divide-y divide-slate-200">{communicationsByNumber.map((group) => <details key={group.number} className="group"><summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-4"><span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-[#0066cc]"><Phone className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{group.number === "unknown" ? "Unknown number" : group.number}</strong><span className="text-xs text-slate-500">{group.items.length} communication{group.items.length === 1 ? "" : "s"} · latest {formatDate(group.items[0].occurred_at)}</span></span><span className="text-xs font-semibold text-[#0066cc] group-open:hidden">Open</span></summary><div className="divide-y divide-slate-100 border-t border-slate-100">{group.items.map(communicationEntry)}</div></details>)}</div> : <p className="p-8 text-center text-sm text-slate-500">No communications match this filter.</p>}
        </section>
      </div>

      <aside className="h-fit overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 p-4"><h2 className="font-semibold">Recent contacts</h2><p className="mt-1 text-xs text-slate-500">Call or start a message</p></header>
        {contacts.length ? <div className="divide-y divide-slate-100">{contacts.map((contact) => <article key={contact.id} className="p-4"><h3 className="text-sm font-semibold">{contact.full_name || contact.company || "Unnamed contact"}</h3><p className="mt-1 truncate text-xs text-slate-500">{contact.normalized_phone || contact.email || "No contact method"}</p>{contact.normalized_phone ? <div className="mt-3 grid grid-cols-2 gap-2"><a href={quoCallHref(contact.normalized_phone)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 text-xs font-semibold"><Phone className="h-3.5 w-3.5" />Q U O call</a><button type="button" onClick={() => chooseContact(contact)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-slate-950 text-xs font-semibold text-white"><MessageCircle className="h-3.5 w-3.5" />Message</button></div> : contact.email ? <button type="button" onClick={() => { setChannel("email"); setRecipient(contact.email || ""); document.getElementById("aura-compose")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-md bg-slate-950 text-xs font-semibold text-white"><Mail className="h-3.5 w-3.5" />Email</button> : null}</article>)}</div> : <p className="p-5 text-sm text-slate-500">Contacts appear after an Aura intake is confirmed.</p>}
      </aside>
    </div>
  );
}
