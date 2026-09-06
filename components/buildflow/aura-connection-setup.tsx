"use client";

import { KeyRound, MessageCircle, PhoneCall, Smartphone } from "lucide-react";
import { useState, useTransition } from "react";

import {
  activateAuraMetaWhatsAppAction,
  activateAuraTwoChatChannelAction,
  configureAuraProviderAction,
} from "@/app/owner/aura/actions";

type Props = {
  whatsappReady: boolean;
  whatsappProvider?: string | null;
  voiceReady?: boolean;
  voiceRecording?: boolean;
  smsReady: boolean;
  smsReceiveReady?: boolean;
  defaultOpen?: boolean;
};

export function AuraConnectionSetup({
  whatsappReady,
  whatsappProvider = null,
  voiceReady = false,
  voiceRecording = false,
  smsReady,
  smsReceiveReady = false,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [metaSetup, setMetaSetup] = useState<{
    callbackUrl: string;
    verifyToken: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setFeedback(null);
    setMetaSetup(null);
    startTransition(async () => {
      const result = await configureAuraProviderAction(formData);
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      if (result.callbackUrl && result.verifyToken) {
        setMetaSetup({
          callbackUrl: result.callbackUrl,
          verifyToken: result.verifyToken,
        });
        setFeedback("Meta credentials validated and stored securely. Finish the webhook fields below in Meta.");
        return;
      }
      setFeedback("Connection saved securely.");
      window.location.reload();
    });
  }

  function activateVoice() {
    setFeedback(null);
    startTransition(async () => {
      const result = await activateAuraTwoChatChannelAction("voice");
      setFeedback(result.ok ? "Calls and recording activated for number ending 8665." : result.error);
      if (result.ok) window.location.reload();
    });
  }

  function activateMetaWhatsApp() {
    setFeedback(null);
    startTransition(async () => {
      const result = await activateAuraMetaWhatsAppAction();
      setFeedback(result.ok ? "Direct Meta WhatsApp activated for number ending 1990." : result.error);
      if (result.ok) window.location.reload();
    });
  }

  return (
    <section id="phone-connections" className="scroll-mt-6 rounded-lg border-2 border-[#0071e3] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <KeyRound className="h-5 w-5 text-[#0066cc]" />
          <div>
            <h2 className="font-semibold">Phone connections</h2>
            <p className="text-xs text-slate-500">Credentials are encrypted in Supabase Vault.</p>
          </div>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="min-h-10 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white">
          {open ? "Close setup" : "Connect WhatsApp & Text"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span className={`rounded-full px-2.5 py-1 ${whatsappReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
          <MessageCircle className="mr-1 inline h-3.5 w-3.5" />WhatsApp {whatsappReady ? `connected${whatsappProvider === "meta" ? " · Meta Direct" : ""}` : "needs setup"}
        </span>
        <span className={`rounded-full px-2.5 py-1 ${voiceReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
          <PhoneCall className="mr-1 inline h-3.5 w-3.5" />Calls {voiceReady ? voiceRecording ? "ready + recording" : "ready" : "needs setup"}
        </span>
        <span className={`rounded-full px-2.5 py-1 ${smsReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
          <Smartphone className="mr-1 inline h-3.5 w-3.5" />Text sending {smsReady ? "connected" : "needs setup"}
        </span>
        <span className={`rounded-full px-2.5 py-1 ${smsReceiveReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
          <Smartphone className="mr-1 inline h-3.5 w-3.5" />Calls & incoming texts {smsReceiveReady ? "connected" : "needs setup"}
        </span>
      </div>

      {open ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3 rounded-md border border-slate-200 p-4 lg:col-span-2">
            <div>
              <h3 className="font-semibold">Business calls · number ending 8665</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">2Chat remains only for the existing call and recording service. WhatsApp uses Meta directly.</p>
            </div>
            <button type="button" onClick={activateVoice} disabled={pending} className="min-h-10 w-fit rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">
              Activate calls & recording
            </button>
          </div>

          <form action={submit} className="grid gap-3 rounded-md border border-emerald-200 bg-emerald-50/40 p-4 lg:col-span-2">
            <input type="hidden" name="provider" value="meta-whatsapp" />
            <div>
              <h3 className="font-semibold">Direct Meta WhatsApp · number ending 1990</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">Uses the existing Avantia Build Communications app and WhatsApp account. It does not store credentials in 2Chat fields.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold">Permanent access token<input required type="password" name="accessToken" autoComplete="new-password" className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal" /></label>
              <label className="grid gap-1 text-xs font-semibold">Meta app secret<input required type="password" name="appSecret" autoComplete="new-password" className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal" /></label>
              <label className="grid gap-1 text-xs font-semibold">Graph API version<input required name="graphVersion" inputMode="decimal" placeholder="v00.0" pattern="v[0-9]+\.[0-9]+" autoComplete="off" className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal" /></label>
              <div className="rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">App 2874339416276903<br />WhatsApp account 1609047970612779<br />Phone ID 1266268263238386</div>
            </div>
            <button disabled={pending} className="min-h-11 w-fit rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50">Validate and connect Meta</button>
          </form>

          {metaSetup ? (
            <div className="grid gap-2 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm lg:col-span-2">
              <strong>Complete these two webhook fields in Meta now. The verification token is shown only for this setup step.</strong>
              <label className="grid gap-1 text-xs font-semibold">Callback URL<input readOnly value={metaSetup.callbackUrl} className="min-h-10 rounded-md border border-amber-300 bg-white px-3 font-mono text-xs font-normal" /></label>
              <label className="grid gap-1 text-xs font-semibold">Verify token<input readOnly value={metaSetup.verifyToken} className="min-h-10 rounded-md border border-amber-300 bg-white px-3 font-mono text-xs font-normal" /></label>
              <span className="text-xs text-slate-600">Subscribe the WhatsApp <code>messages</code> field, then reload this page.</span>
              <button type="button" onClick={activateMetaWhatsApp} disabled={pending} className="min-h-10 w-fit rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50">I verified and subscribed messages · Activate</button>
            </div>
          ) : null}

          <form action={submit} className="grid gap-3 rounded-md border border-slate-200 p-4">
            <input type="hidden" name="provider" value="quo" />
            <h3 className="font-semibold">Q U O text messages</h3>
            <label className="grid gap-1 text-xs font-semibold">API key<input required type="password" name="apiKey" autoComplete="new-password" className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-semibold">Business phone<input required name="from" inputMode="tel" placeholder="(516) 908-8319" className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal" /></label>
            <button disabled={pending} className="min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">Connect text messages</button>
          </form>
          <form action={submit} className="grid gap-3 rounded-md border border-slate-200 p-4">
            <input type="hidden" name="provider" value="quo-webhook" />
            <div><h3 className="font-semibold">Q U O incoming calls & texts</h3><p className="mt-1 text-xs leading-5 text-slate-500">Save the signing values shown once when the Q U O webhook is created.</p></div>
            <label className="grid gap-1 text-xs font-semibold">Webhook signing secret<input required type="password" name="signingSecret" autoComplete="new-password" className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-semibold">Business-line ID<input required name="phoneNumberId" autoComplete="off" className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal" /></label>
            <button disabled={pending} className="min-h-11 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50">Connect incoming calls & texts</button>
          </form>
        </div>
      ) : null}
      {feedback ? <p role="status" className="mt-3 text-sm font-semibold text-slate-700">{feedback}</p> : null}
    </section>
  );
}
