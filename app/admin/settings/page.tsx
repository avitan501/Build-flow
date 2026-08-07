import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";

import { sendOrderNotificationTestAction } from "@/app/admin/settings/actions";
import { requireAdminProfile } from "@/lib/auth";

type DeliveryStatus = "sent" | "failed" | "not_configured" | "skipped";

function deliveryLabel(status?: string) {
  if (status === "sent") return "Sent";
  if (status === "failed") return "Failed";
  if (status === "not_configured") return "Email provider not configured";
  if (status === "skipped") return "Skipped";
  return null;
}

function deliveryClass(status?: string) {
  return status === "sent"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-rose-200 bg-rose-50 text-rose-800";
}

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ owner?: DeliveryStatus; client?: DeliveryStatus }> }) {
  await requireAdminProfile();
  const params = await searchParams;
  const ownerResult = deliveryLabel(params.owner);
  const clientResult = deliveryLabel(params.client);

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-28 pt-6 text-slate-950 sm:px-8 sm:pb-12">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl border-b border-slate-200 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Integrations</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Check the services used to deliver order notifications and messages.</p>
        </div>
        {ownerResult || clientResult ? (
          <div className="mt-6 grid gap-2 sm:grid-cols-2" role="status" aria-live="polite">
            <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${deliveryClass(params.owner)}`}>Owner notification: {ownerResult}</div>
            <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${deliveryClass(params.client)}`}>Client confirmation: {clientResult}</div>
          </div>
        ) : null}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#0066cc] text-white"><Mail className="h-5 w-5" /></span>
            <h2 className="mt-4 text-lg font-bold">Order email notifications</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <div><p className="font-semibold text-slate-950">Owner receives new requests</p><p className="text-slate-500">avitanneto@gmail.com</p></div>
              <div><p className="font-semibold text-slate-950">Client receives confirmation</p><p className="text-slate-500">The email on the client account</p></div>
            </div>
            <form action={sendOrderNotificationTestAction} className="mt-5">
              <button type="submit" className="min-h-11 w-full rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">Send test to both emails</button>
              <p className="mt-2 text-xs leading-5 text-slate-500">Test client: info@fivetownsbuilders.com</p>
            </form>
          </section>
          <Link href="/admin/whatsapp/settings" className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white"><MessageCircle className="h-5 w-5" /></span>
            <h2 className="mt-4 text-lg font-bold">WhatsApp</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Open the existing WhatsApp delivery configuration.</p>
            <span className="mt-5 inline-flex text-sm font-semibold text-[#0066cc]">Open settings</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
