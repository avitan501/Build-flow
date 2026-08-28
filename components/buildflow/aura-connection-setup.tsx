"use client";

import { KeyRound, MessageCircle, PhoneCall, Smartphone } from "lucide-react";
import { useState, useTransition } from "react";

import { activateAuraTwoChatChannelAction, configureAuraProviderAction } from "@/app/owner/aura/actions";

export function AuraConnectionSetup({ whatsappReady, voiceReady = false, voiceRecording = false, smsReady, smsReceiveReady = false, defaultOpen = false }: { whatsappReady: boolean; voiceReady?: boolean; voiceRecording?: boolean; smsReady: boolean; smsReceiveReady?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      const result = await configureAuraProviderAction(formData);
      setFeedback(result.ok ? "Connection saved securely." : result.error);
      if (result.ok) window.location.reload();
    });
  }

  function activate(channel: "voice" | "whatsapp") {
    setFeedback(null);
    startTransition(async () => {
      const result = await activateAuraTwoChatChannelAction(channel);
      setFeedback(result.ok ? `${channel === "voice" ? "Calls and recording" : "WhatsApp"} activated for number ending 8665.` : result.error);
      if (result.ok) window.location.reload();
    });
  }

  return (
    <section id="phone-connections" className="scroll-mt-6 rounded-lg border-2 border-[#0071e3] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-[#0066cc]" /><div><h2 className="font-semibold">Phone connections</h2><p className="text-xs text-slate-500">Credentials are encrypted in Supabase Vault.</p></div></div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="min-h-10 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white">{open ? "Close setup" : "Connect WhatsApp & Text"}</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span className={`rounded-full px-2.5 py-1 ${whatsappReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}><MessageCircle className="mr-1 inline h-3.5 w-3.5" />WhatsApp {whatsappReady ? "connected" : "needs setup"}</span>
        <span className={`rounded-full px-2.5 py-1 ${voiceReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}><PhoneCall className="mr-1 inline h-3.5 w-3.5" />Calls {voiceReady ? voiceRecording ? "ready + recording" : "ready" : "needs setup"}</span>
        <span className={`rounded-full px-2.5 py-1 ${smsReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}><Smartphone className="mr-1 inline h-3.5 w-3.5" />Text sending {smsReady ? "connected" : "needs setup"}</span>
        <span className={`rounded-full px-2.5 py-1 ${smsReceiveReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}><Smartphone className="mr-1 inline h-3.5 w-3.5" />Calls & incoming texts {smsReceiveReady ? "connected" : "needs setup"}</span>
      </div>
      {open ? <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="grid gap-3 rounded-md border border-slate-200 p-4 lg:col-span-2">
          <div><h3 className="font-semibold">2Chat number (347) 937-8665</h3><p className="mt-1 text-xs leading-5 text-slate-500">Calls are already assigned to this number. For WhatsApp, complete Meta Coexistence privately on the phone, then activate website messaging here. Do not use WhatsApp Web QR.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => activate("voice")} disabled={pending} className="min-h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">Activate calls &amp; recordings</button><button type="button" onClick={() => activate("whatsapp")} disabled={pending} className="min-h-10 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50">Activate WhatsApp after Coexistence</button></div>
        </div>
        <form action={submit} className="grid gap-3 rounded-md border border-slate-200 p-4">
          <input type="hidden" name="provider" value="2chat" />
          <div><h3 className="font-semibold">2Chat WhatsApp Coexistence</h3><p className="mt-1 text-xs leading-5 text-slate-500">On the phone choose “I use WhatsApp or WhatsApp Business on my phone,” then “Coexistence,” and continue privately to Meta. Save the API key here only after 2Chat confirms the official connection.</p></div>
          <label className="grid gap-1 text-xs font-semibold">API key<input required type="password" name="apiKey" autoComplete="new-password" className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal" /></label>
          <label className="grid gap-1 text-xs font-semibold">Connected WhatsApp number<input required name="from" inputMode="tel" placeholder="(347) 937-8665" className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal" /></label>
          <button disabled={pending} className="min-h-11 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50">Connect WhatsApp</button>
        </form>
        <form action={submit} className="grid gap-3 rounded-md border border-slate-200 p-4">
          <input type="hidden" name="provider" value="quo" />
          <h3 className="font-semibold">Q U O text messages</h3>
          <label className="grid gap-1 text-xs font-semibold">API key<input required type="password" name="apiKey" autoComplete="new-password" className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal" /></label>
          <label className="grid gap-1 text-xs font-semibold">Business phone<input required name="from" inputMode="tel" placeholder="(516) 908-8319" className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal" /></label>
          <button disabled={pending} className="min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">Connect text messages</button>
        </form>
        <form action={submit} className="grid gap-3 rounded-md border border-slate-200 p-4 lg:col-span-2">
          <input type="hidden" name="provider" value="quo-webhook" />
          <div><h3 className="font-semibold">Q U O incoming calls & texts</h3><p className="mt-1 text-xs leading-5 text-slate-500">Save the signing values shown once when the Q U O webhook is created. The API key remains unchanged.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold">Webhook signing secret<input required type="password" name="signingSecret" autoComplete="new-password" className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-semibold">Business-line ID<input required name="phoneNumberId" autoComplete="off" className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal" /></label>
          </div>
          <button disabled={pending} className="min-h-11 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50">Connect incoming calls & texts</button>
        </form>
      </div> : null}
      {feedback ? <p role="status" className="mt-3 text-sm font-semibold text-slate-700">{feedback}</p> : null}
    </section>
  );
}
