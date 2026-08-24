import Link from "next/link";

import { AuraConnectionSetup } from "@/components/buildflow/aura-connection-setup";
import { requireOwnerAccess } from "@/lib/owner-access";

export const dynamic = "force-dynamic";

export default async function AuraConnectionPage() {
  const { supabase } = await requireOwnerAccess("/owner/aura/connect");
  const { data } = await supabase.functions.invoke<{ ok?: boolean; whatsapp?: boolean; sms?: boolean; smsReceive?: boolean }>(
    "aura-messaging-broker",
    { body: { action: "status" } },
  );

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
            Connect 2Chat WhatsApp and Q U O text messaging securely without Vercel access.
          </p>
        </header>
        <AuraConnectionSetup whatsappReady={Boolean(data?.ok && data.whatsapp)} smsReady={Boolean(data?.ok && data.sms)} smsReceiveReady={Boolean(data?.ok && data.smsReceive)} defaultOpen />
      </section>
    </main>
  );
}
