import Link from "next/link";

import { AuraConnectionSetup } from "@/components/buildflow/aura-connection-setup";
import { requireOwnerAccess } from "@/lib/owner-access";

export const dynamic = "force-dynamic";

export default async function AuraConnectionPage() {
  const { supabase } = await requireOwnerAccess("/owner/aura/connect");
  const { data } = await supabase.functions.invoke<{ ok?: boolean; whatsapp?: boolean; whatsappProvider?: string | null; voice?: boolean; voiceRecording?: boolean; sms?: boolean; smsReceive?: boolean; whatsappHealth?: {
    status?: string; checked_at?: string; last_success_at?: string | null; last_inbound_at?: string | null; last_error?: string | null;
    details?: { callbackActive?: boolean; businessAccountSubscribed?: boolean; phoneReady?: boolean; phoneQuality?: string | null; failedEvents?: number; pendingNotifications?: number } | null;
  } | null }>(
    "aura-messaging-broker",
    { body: { action: "status" } },
  );
  const rawHealth = data?.whatsappHealth;
  const whatsappHealth = rawHealth ? {
    status: rawHealth.status === "healthy" ? "healthy" as const
      : rawHealth.status === "degraded" ? "degraded" as const
      : rawHealth.status === "down" ? "down" as const
      : "unknown" as const,
    checkedAt: rawHealth.checked_at || null,
    lastSuccessAt: rawHealth.last_success_at || null,
    lastInboundAt: rawHealth.last_inbound_at || null,
    error: rawHealth.last_error || null,
    callbackActive: Boolean(rawHealth.details?.callbackActive),
    businessAccountSubscribed: Boolean(rawHealth.details?.businessAccountSubscribed),
    phoneReady: Boolean(rawHealth.details?.phoneReady),
    phoneQuality: rawHealth.details?.phoneQuality || null,
    failedEvents: Number(rawHealth.details?.failedEvents || 0),
    pendingNotifications: Number(rawHealth.details?.pendingNotifications || 0),
  } : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-8 sm:py-10">
      <section className="mx-auto max-w-3xl space-y-5">
        <Link href="/owner/aura" className="inline-flex min-h-10 items-center text-sm font-semibold text-[#0066cc]">
          Back to Aura Communications
        </Link>
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0066cc]">Owner setup</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Connect WhatsApp & Text</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Connect direct Meta WhatsApp and Q U O text messaging securely without Vercel access.
          </p>
        </header>
        <AuraConnectionSetup whatsappReady={Boolean(data?.ok && data.whatsapp)} whatsappProvider={data?.whatsappProvider || null} whatsappHealth={whatsappHealth} voiceReady={Boolean(data?.ok && data.voice)} voiceRecording={Boolean(data?.ok && data.voiceRecording)} smsReady={Boolean(data?.ok && data.sms)} smsReceiveReady={Boolean(data?.ok && data.smsReceive)} defaultOpen />
      </section>
    </main>
  );
}
