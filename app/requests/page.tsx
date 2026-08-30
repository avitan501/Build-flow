import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Download,
  FileText,
  MapPin,
  MessageCircle,
  PackageCheck,
  Plus,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { CustomerRequestLiveRefresh } from "@/components/buildflow/customer-request-live-refresh";
import { getCustomerPortalRequests } from "@/lib/customer-request-portal";

export const metadata: Metadata = {
  title: "My Account | Avantia Build",
  description:
    "Securely review the status and material details for your Avantia Build requests.",
};

type CustomerRequestsPageProps = {
  searchParams: Promise<{ access?: string; account?: string; request?: string }>;
};

const requestStages = ["Received", "Pricing", "Approval", "Delivery"] as const;

function requestStageIndex(status: string) {
  if (status === "closed") return 3;
  if (status === "quoted") return 2;
  if (status === "in_review") return 1;
  return 0;
}

export default async function CustomerRequestsPage({ searchParams }: CustomerRequestsPageProps) {
  const query = await searchParams;
  const portal = await getCustomerPortalRequests();
  if (!portal.signedIn)
    return (
      <main className="min-h-screen bg-[#f5f5f7] px-4 py-8 text-slate-950 sm:py-14">
        <section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.09)] sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0071e3]">
            Secure customer access
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Open from your text</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Tap the secure Avantia link sent to your phone. It signs you in and opens the correct request automatically—no phone number or code to enter.</p>
          {query.access ? <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{query.access === "expired" ? "That secure link expired or was already used. Ask Avantia to send a fresh link." : "That link is not valid. Open the latest Avantia text."}</p> : null}
          <Link href="/login?next=/requests" className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1473e6] focus-visible:ring-offset-2">Use an existing account instead</Link>
        </section>
      </main>
    );

  const selectedRequest = query.request?.trim() || "";
  const requests = selectedRequest
    ? [...portal.requests].sort((left, right) => Number(String(right.publicNumber) === selectedRequest) - Number(String(left.publicNumber) === selectedRequest))
    : portal.requests;
  const openedRequest = selectedRequest
    ? requests.find((request) => String(request.publicNumber) === selectedRequest) ?? null
    : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e8f4ff_0,_#f4f7fa_32rem,_#f5f5f7_70rem)] px-4 py-7 text-slate-950 sm:px-6 sm:py-10">
      <a href="#material-requests" className="sr-only rounded-md bg-white px-4 py-2 font-bold text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]">Skip to material requests</a>
      <div className="mx-auto max-w-5xl">
        {query.account === "switched" ? <p role="status" className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900">You were signed into a different account. We securely switched to the account linked to this request.</p> : null}
        <header className={`overflow-hidden bg-[#081b33] text-white shadow-[0_24px_70px_rgba(8,27,51,0.18)] ${openedRequest ? "rounded-[1.35rem]" : "rounded-[1.75rem]"}`}>
          <div className={`relative ${openedRequest ? "px-4 py-4 sm:px-6 sm:py-5" : "px-5 py-6 sm:px-8 sm:py-8"}`}>
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#087f8c]/35 blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-2xl">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />{openedRequest ? "Opened securely from your text" : "Avantia customer portal"}</p>
                <h1 className={`${openedRequest ? "mt-1.5 text-2xl sm:text-3xl" : "mt-2 text-3xl sm:text-5xl"} font-black tracking-[-0.035em]`}>
                  {openedRequest ? <>Request <span className="font-mono text-cyan-200">#{openedRequest.publicNumber}</span></> : "Your materials. One clear view."}
                </h1>
                <p className={`${openedRequest ? "mt-1.5" : "mt-3"} max-w-xl text-sm leading-6 text-slate-300`}>{openedRequest ? `You’re signed in. ${openedRequest.statusLabel} · ${openedRequest.items.length} material line${openedRequest.items.length === 1 ? "" : "s"}.` : "Track requests, review every item, download the request PDF, or text us a change without starting over."}</p>
              </div>
              <Link href="/account" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15">
                <Settings className="h-4 w-4" aria-hidden="true" /> Account &amp; security
              </Link>
            </div>
            {!openedRequest ? <div className="relative mt-6 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3"><strong className="block text-xl">{requests.length}</strong><span className="text-[11px] text-slate-300">Requests</span></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3"><strong className="block text-xl">{requests.reduce((total, request) => total + request.items.length, 0)}</strong><span className="text-[11px] text-slate-300">Material lines</span></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3"><strong className="block text-xl">Live</strong><span className="text-[11px] text-slate-300">Status updates</span></div>
            </div> : null}
          </div>
        </header>

        {!openedRequest ? <section className="relative -mt-3 mx-3 grid gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_14px_40px_rgba(15,23,42,0.10)] sm:mx-6 sm:grid-cols-3" aria-label="Account quick actions">
          <Link href="/shop" className="flex min-h-14 items-center gap-3 rounded-xl bg-[#1473e6] px-4 text-sm font-bold text-white transition hover:bg-[#0d65d1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1473e6] focus-visible:ring-offset-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/15"><Plus className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0 flex-1">Start another request</span><ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          <a href="sms:+15169088319" className="flex min-h-14 items-center gap-3 rounded-xl px-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1473e6] focus-visible:ring-offset-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-teal-50 text-teal-700"><MessageCircle className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0 flex-1">Text Avantia</span><ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" /></a>
          <Link href="/account" className="flex min-h-14 items-center gap-3 rounded-xl px-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1473e6] focus-visible:ring-offset-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700"><ShieldCheck className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0 flex-1">Manage account</span><ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" /></Link>
        </section> : null}

        <div id="material-requests" className={`${openedRequest ? "mt-3" : "mt-5"} flex scroll-mt-24 flex-wrap items-center justify-between gap-2 px-1`}>
          <div><h2 className="text-xl font-black tracking-tight">{openedRequest ? "Your request" : "Material requests"}</h2><p className="mt-0.5 text-xs text-slate-500">{openedRequest ? "The request from your text is open below." : "Newest first. Updates appear automatically."}</p></div>
          <CustomerRequestLiveRefresh />
        </div>
        {requests.length ? (
          <div className="mt-5 grid gap-4">
            {requests.map((request, requestIndex) => {
              const openedFromText = String(request.publicNumber) === selectedRequest;
              const currentStage = requestStageIndex(request.status);
              const expanded = openedFromText || requestIndex === 0;
              return (
              <article
                key={request.id}
                id={`request-${request.publicNumber}`}
                aria-current={openedFromText ? "true" : undefined}
                className={`overflow-hidden rounded-[1.35rem] border bg-white shadow-[0_12px_38px_rgba(15,23,42,0.07)] ${openedFromText ? "border-sky-400 ring-4 ring-sky-100" : "border-slate-200/90"}`}
              >
                <header className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1473e6]">
                        Request #{request.publicNumber}
                      </p>
                      {openedFromText ? <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Opened from your secure text</p> : null}
                      <h3 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                        {request.title}
                      </h3>
                    </div>
                    <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-800 ring-1 ring-inset ring-sky-100">
                      {request.statusLabel}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-1" aria-label={`Request ${request.publicNumber} progress`}>
                    {requestStages.map((stage, stageIndex) => <div key={stage} className="min-w-0"><div className={`h-1.5 rounded-full ${stageIndex <= currentStage ? "bg-[#1473e6]" : "bg-slate-200"}`} /><p className={`mt-1 truncate text-[9px] font-bold ${stageIndex <= currentStage ? "text-slate-700" : "text-slate-400"}`}>{stage}</p></div>)}
                    <span className="sr-only">Current stage: {requestStages[currentStage]}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><PackageCheck className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />{request.items.length} material line{request.items.length === 1 ? "" : "s"}</span>
                    {request.deliveryAddress ? <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" /><span className="truncate">{request.deliveryAddress}</span></span> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/requests/${request.publicNumber}/pdf`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"><Download className="h-3.5 w-3.5" aria-hidden="true" />Download PDF</Link>
                    <a href={`sms:+15169088319?body=${encodeURIComponent(`Request #${request.publicNumber}: I need to change `)}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-xs font-bold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1473e6] focus-visible:ring-offset-2"><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />Request a change</a>
                  </div>
                </header>
                <details open={expanded} className="group border-t border-slate-100">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-xs font-bold text-slate-600 marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1473e6] sm:px-5"><span>Request details</span><ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden="true" /></summary>
                <div className="grid gap-4 border-t border-slate-100 bg-slate-50/55 p-4 sm:grid-cols-[minmax(0,1.45fr)_minmax(15rem,.75fr)] sm:p-5">
                  <section>
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500"><FileText className="h-4 w-4" aria-hidden="true" />Material list</h4>
                    <ul className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {request.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex justify-between gap-3 border-b border-slate-100 px-3 py-3 text-sm last:border-b-0"
                        >
                          <span>{item.name}</span>
                          <strong className="shrink-0 text-right">
                            {item.quantity} {item.unit}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  </section>
                  <div className="grid content-start gap-3">
                    <section className={`rounded-xl border p-4 ${request.missingQuestions.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                      <h4 className="text-xs font-black uppercase tracking-wide text-slate-600">
                        Missing details
                      </h4>
                      {request.missingQuestions.length ? (
                        <ul className="mt-2 space-y-1 text-sm text-amber-800">
                          {request.missingQuestions.map((question) => (
                            <li key={question}>• {question}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-emerald-700">
                          Everything needed is confirmed.
                        </p>
                      )}
                    </section>
                    <section className="rounded-xl border border-slate-200 bg-white p-4">
                      <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Approval
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {request.approvalLabel}
                      </p>
                    </section>
                  </div>
                </div>
                </details>
              </article>
              );
            })}
          </div>
        ) : (
          <section className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sky-50 text-sky-700"><PackageCheck className="h-5 w-5" aria-hidden="true" /></span>
            <h2 className="mt-3 font-black">No requests are linked yet</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              If you just received an invitation, confirm that you signed in
              with the same phone number. Otherwise, contact Avantia at (516)
              908-8319.
            </p>
            <Link href="/shop" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1473e6] px-5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1473e6] focus-visible:ring-offset-2"><Plus className="h-4 w-4" aria-hidden="true" />Start a material request</Link>
          </section>
        )}
      </div>
    </main>
  );
}
