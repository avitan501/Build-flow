import { CreditCard, ShieldCheck } from "lucide-react";

import { requireAdminProfile } from "@/lib/auth";

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/5kQaEWb6q64N6FybJl97G00";

const paymentMessages: Record<string, { tone: "success" | "error" | "neutral"; text: string }> = {
  saved: { tone: "success", text: "Payment method saved securely with Stripe." },
  canceled: { tone: "neutral", text: "Payment setup was canceled. Nothing was saved." },
  "setup-unavailable": { tone: "error", text: "Secure payment setup is not connected. The payment link remains available." },
  "no-payment-profile": { tone: "neutral", text: "Save a payment method before opening the payment portal." },
  "portal-error": { tone: "error", text: "Stripe could not open payment settings. Try again." },
  "setup-error": { tone: "error", text: "Stripe could not save that payment method. Try again." },
};

export default async function ManagerPaymentsPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const { user } = await requireAdminProfile();
  const { payment } = await searchParams;
  const feedback = payment ? paymentMessages[payment] : null;
  const hasSavedPaymentProfile = typeof user.app_metadata.stripe_customer_id === "string";

  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-8 lg:px-10 lg:py-9">
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-slate-200 pb-6"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager</p><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Payments</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Owner payment links and secure Stripe payment methods.</p></header>
      {feedback ? <div role="status" className={`mt-5 rounded-lg border px-4 py-3 text-sm font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : feedback.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-700"}`}>{feedback.text}</div> : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#0071e3] text-white"><CreditCard className="h-5 w-5" /></span><h2 className="mt-4 text-lg font-semibold">Collect a payment</h2><p className="mt-1 text-sm leading-6 text-slate-500">Open the Avantia Build Stripe payment page.</p><a href={STRIPE_PAYMENT_LINK} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white">Open payment page</a></section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white"><ShieldCheck className="h-5 w-5" /></span><h2 className="mt-4 text-lg font-semibold">Saved payment methods</h2><p className="mt-1 text-sm leading-6 text-slate-500">Cards and bank details remain stored securely by Stripe.</p><div className="mt-5 grid gap-2"><form action="/api/stripe/setup" method="post"><button type="submit" className="min-h-11 w-full rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">Save card or bank account</button></form>{hasSavedPaymentProfile ? <form action="/api/stripe/portal" method="post"><button type="submit" className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold">Manage saved methods</button></form> : null}</div></section>
      </div>
    </div>
  </main>;
}
