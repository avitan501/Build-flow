import Link from "next/link"
import { redirect } from "next/navigation"
import { Bot, CheckCircle2, ChevronLeft, MessageCircleMore, ShieldCheck, Sparkles } from "lucide-react"

import { requireManagerPortalProfile } from "@/lib/auth"
import { saveSmsAiPreferencesAction } from "./actions"

type SettingsRow = {
  enabled: boolean
  preferred_voice: "professional" | "friendly" | "brief"
  max_sentences: number
  match_customer_language: boolean
  auto_acknowledge_follow_ups: boolean
  auto_ask_delivery_details: boolean
  auto_acknowledge_pricing: boolean
  auto_create_request_drafts: boolean
  custom_instructions: string
  updated_at: string
}

const fallback: SettingsRow = {
  enabled: true,
  preferred_voice: "friendly",
  max_sentences: 2,
  match_customer_language: true,
  auto_acknowledge_follow_ups: true,
  auto_ask_delivery_details: true,
  auto_acknowledge_pricing: true,
  auto_create_request_drafts: true,
  custom_instructions: "",
  updated_at: new Date(0).toISOString(),
}

function SettingToggle({ name, title, description, defaultChecked }: { name: string; title: string; description: string; defaultChecked: boolean }) {
  return <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-sky-300"><input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-4 w-4 rounded border-slate-300 accent-sky-600" /><span><span className="block text-sm font-bold text-slate-950">{title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span></span></label>
}

export default async function SmsAiRepliesSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await searchParams
  const { supabase, access } = await requireManagerPortalProfile()
  if (!access.aiTools || !access.customers) redirect("/")
  const result = await supabase.from("aura_sms_ai_settings").select("enabled,preferred_voice,max_sentences,match_customer_language,auto_acknowledge_follow_ups,auto_ask_delivery_details,auto_acknowledge_pricing,auto_create_request_drafts,custom_instructions,updated_at").eq("id", 1).maybeSingle<SettingsRow>()
  const settings = result.data ?? fallback

  return <main className="min-h-screen bg-[#f5f6f8] px-3 py-5 sm:px-6 sm:py-8">
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/ai-tools" className="inline-flex items-center gap-1 text-xs font-bold text-sky-700"><ChevronLeft className="h-4 w-4" />Manager Tools</Link>
      <header className="mt-4 rounded-2xl bg-slate-950 px-5 py-6 text-white shadow-lg sm:px-7">
        <div className="flex items-start gap-4"><span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500"><Bot className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-sky-300">Communications</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">AI Reply Settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Set Avantia&apos;s reply behavior once. Individual contacts can still be turned off, changed to drafts, or given a different tone inside Communications.</p></div></div>
      </header>

      {params.saved ? <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />AI reply preferences saved.</p> : null}
      {params.error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">The settings could not be saved. Check the selected values and try again.</p> : null}

      <form action={saveSmsAiPreferencesAction} className="mt-4 space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 text-sky-600" /><div><h2 className="font-bold text-slate-950">Voice and length</h2><p className="mt-1 text-xs leading-5 text-slate-500">These defaults shape every AI reply. A contact-specific tone remains available in the conversation.</p></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-700">Avantia voice<select name="preferredVoice" defaultValue={settings.preferred_voice} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="friendly">Friendly and helpful</option><option value="professional">Professional</option><option value="brief">Very brief</option></select></label>
            <label className="text-xs font-bold text-slate-700">Maximum reply length<select name="maxSentences" defaultValue={String(settings.max_sentences)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="1">1 short sentence</option><option value="2">Up to 2 sentences</option><option value="3">Up to 3 sentences</option></select></label>
          </div>
          <label className="mt-4 block text-xs font-bold text-slate-700">Special wording preferences<textarea name="customInstructions" defaultValue={settings.custom_instructions} maxLength={1500} rows={4} placeholder="Example: Say ‘material request’ instead of ‘order.’ Keep replies warm and direct. Never use emojis." className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm leading-6" /><span className="mt-1 block font-normal text-slate-500">Wording preferences cannot override price, payment, order, or delivery safety rules.</span></label>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-6">
          <div className="flex items-start gap-3"><MessageCircleMore className="mt-0.5 h-5 w-5 text-sky-600" /><div><h2 className="font-bold text-slate-950">What AI may handle automatically</h2><p className="mt-1 text-xs leading-5 text-slate-500">It answers safely instead of staying silent, while leaving commitments for a manager.</p></div></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <SettingToggle name="enabled" title="Enable the AI reply engine" description="Contact-level Off still stops replies for that person." defaultChecked={settings.enabled} />
            <SettingToggle name="matchCustomerLanguage" title="Match the customer's language" description="English, Spanish, or Hebrew follows the newest customer message." defaultChecked={settings.match_customer_language} />
            <SettingToggle name="autoAcknowledgeFollowUps" title="Answer order and request follow-ups" description="Acknowledge immediately without inventing status or promising a time." defaultChecked={settings.auto_acknowledge_follow_ups} />
            <SettingToggle name="autoAskDeliveryDetails" title="Ask for delivery details" description="Request the address and preferred date or time window before manager confirmation." defaultChecked={settings.auto_ask_delivery_details} />
            <SettingToggle name="autoAcknowledgePricing" title="Acknowledge pricing questions" description="Confirm that pricing needs review; never invent a live price." defaultChecked={settings.auto_acknowledge_pricing} />
            <SettingToggle name="autoCreateRequestDrafts" title="Prepare material-request drafts" description="AI extracts customer lists for review; it never creates a final request without confirmation." defaultChecked={settings.auto_create_request_drafts} />
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700" /><div><h2 className="text-sm font-bold text-amber-950">Always requires human confirmation</h2><p className="mt-1 text-xs leading-5 text-amber-900">Exact prices, stock, payment, refunds, cancellations, complaints, confirmed delivery times, placing an order, and safety or legal issues. AI can acknowledge the message, but it cannot approve or promise these actions.</p></div></div></section>

        <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur"><Link href="/admin/communications?channel=sms" className="px-3 text-xs font-bold text-sky-700">Open Communications</Link><button type="submit" className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white">Save AI settings</button></div>
      </form>
    </div>
  </main>
}
