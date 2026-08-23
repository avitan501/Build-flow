"use client"

import { ChevronDown, ImagePlus, LoaderCircle, Mail, MessageCircle, Phone, Send, Smartphone, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { createPortal } from "react-dom"

import { prepareQuoPhotoMessageAction, sendAuraMessageAction } from "@/app/owner/aura/actions"
import { normalizeAuraPhone } from "@/lib/aura/identity"

type Channel = "sms" | "whatsapp" | "email"
type TemplateKey = "welcome" | "friendly_follow_up" | "request_material_list" | "quote_follow_up" | "order_follow_up" | "custom"

const templateLabels: Record<TemplateKey, string> = {
  welcome: "Welcome",
  friendly_follow_up: "Friendly follow-up",
  request_material_list: "Request material list",
  quote_follow_up: "Quote follow-up",
  order_follow_up: "Order follow-up",
  custom: "Custom message",
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there"
}

function templateMessage(template: TemplateKey, name: string, senderName: string) {
  const greeting = `Hi ${firstName(name)}`
  if (template === "welcome") return `${greeting}, this is ${senderName} from Avantia Build.\n\nThis is our direct number for construction material requests. Send us your material list, plans, photos, or supplier quote, and we will organize the request and check available pricing.\n\nHow can we help with your current project?\n\nAvantia Build\n(516) 908-8319\nhttps://build.avantiap.com\n\nReply STOP if you no longer want to receive messages.`
  if (template === "friendly_follow_up") return `${greeting}, this is ${senderName} from Avantia Build.\n\nI am checking in to see whether you need pricing or materials for a current or upcoming project. You can send us a material list, plan, photo, or supplier quote.\n\nIs there anything you need help sourcing this week?\n\nReply STOP if you no longer want to receive messages.`
  if (template === "request_material_list") return `${greeting}, please send us the material list, plans, photos, quantities, and delivery address for your project.\n\nWe will organize the request and check available pricing. You can reply directly or upload it here:\nhttps://build.avantiap.com/request-quote`
  if (template === "quote_follow_up") return `${greeting}, I am following up regarding your Avantia Build estimate.\n\nPlease let us know if you approve it, have questions, or want us to review any changes before proceeding.`
  if (template === "order_follow_up") return `${greeting}, I am following up on your Avantia Build order. Please let us know if anything changed or if you need an update on pricing, availability, or delivery.`
  return ""
}

function callHref(phone: string) {
  if (!phone) return "#"
  if (typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    return `openphone://dial?number=${encodeURIComponent(phone)}&from=${encodeURIComponent("+15169088319")}&action=call`
  }
  return `tel:${phone}`
}

export function ContactActions({ name, phone, email, senderName = "Avantia Build" }: { name: string; phone: string | null; email: string | null; senderName?: string }) {
  const router = useRouter()
  const normalizedPhone = normalizeAuraPhone(phone) || ""
  const [channel, setChannel] = useState<Channel | null>(null)
  const [template, setTemplate] = useState<TemplateKey>("welcome")
  const [message, setMessage] = useState("")
  const [subject, setSubject] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [feedback, setFeedback] = useState("")
  const [pending, startTransition] = useTransition()

  function resetComposer() {
    setChannel(null)
    setMessage("")
    setSubject("")
    setPhoto(null)
    setFeedback("")
  }

  function close() {
    if (pending) return
    resetComposer()
  }

  function openComposer() {
    const initialChannel: Channel = normalizedPhone ? "sms" : "email"
    setChannel(initialChannel)
    setTemplate("welcome")
    setMessage(templateMessage("welcome", name, senderName))
    setSubject("Welcome to Avantia Build")
  }

  function chooseTemplate(value: TemplateKey) {
    setTemplate(value)
    setMessage(templateMessage(value, name, senderName))
    if (value === "welcome") setSubject("Welcome to Avantia Build")
    else if (value === "quote_follow_up") setSubject("Your Avantia Build estimate")
    else if (value === "order_follow_up") setSubject("Your Avantia Build order")
    else setSubject("Message from Avantia Build")
  }

  function send() {
    if (!channel) return
    setFeedback("")
    startTransition(async () => {
      if (channel === "sms" && photo) {
        const formData = new FormData()
        formData.set("phone", normalizedPhone)
        formData.set("message", message)
        formData.set("photo", photo)
        const result = await prepareQuoPhotoMessageAction(formData)
        if (!result.ok) { setFeedback(result.error); return }
        window.location.href = result.deepLink
        resetComposer()
        return
      }
      const recipient = channel === "email" ? email || "" : normalizedPhone
      const result = await sendAuraMessageAction({ channel, recipient, subject, message })
      if (!result.ok) { setFeedback(result.error); return }
      resetComposer()
      router.refresh()
    })
  }

  const buttonClass = "inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"

  return <>
    <div className="flex items-center gap-1" aria-label={`Contact ${name}`}>
      <a href={normalizedPhone ? callHref(normalizedPhone) : undefined} aria-disabled={!normalizedPhone} title="Call with Q U O" aria-label={`Call ${name} with Q U O`} className={`${buttonClass} w-9 ${normalizedPhone ? "" : "pointer-events-none opacity-30"}`}><Phone className="h-4 w-4" /></a>
      <button type="button" disabled={!normalizedPhone && !email} onClick={openComposer} className={`${buttonClass} gap-2 px-3 text-xs font-semibold`}><Send className="h-3.5 w-3.5" />Send message<ChevronDown className="h-3.5 w-3.5" /></button>
    </div>

    {channel && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[180] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="contact-compose-title" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <section className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase text-[#0066cc]">{channel === "sms" ? "Q U O text" : channel === "email" ? "Email" : "WhatsApp"}</p><h2 id="contact-compose-title" className="mt-0.5 font-semibold">{name}</h2></div><button type="button" onClick={close} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200"><X className="h-4 w-4" /></button></header>
        <div className="grid gap-3 p-4">
          <label className="grid gap-1 text-xs font-semibold">Template<select value={template} onChange={(event) => chooseTemplate(event.target.value as TemplateKey)} className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal">{(Object.keys(templateLabels) as TemplateKey[]).map((key) => <option key={key} value={key}>{templateLabels[key]}</option>)}</select></label>
          <fieldset><legend className="text-xs font-semibold">Channel</legend><div className="mt-1 grid grid-cols-3 gap-1">{([['sms', 'Text', Smartphone], ['whatsapp', 'WhatsApp', MessageCircle], ['email', 'Email', Mail]] as const).map(([value, label, Icon]) => <button key={value} type="button" disabled={value === "email" ? !email : !normalizedPhone} onClick={() => setChannel(value)} className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-semibold disabled:opacity-30 ${channel === value ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white"}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div></fieldset>
          {channel === "email" ? <label className="grid gap-1 text-xs font-semibold">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} placeholder="Message from Avantia Build" className="min-h-10 rounded-md border border-slate-300 px-3 text-sm font-normal" /></label> : null}
          <label className="grid gap-1 text-xs font-semibold">Exact message preview<textarea autoFocus value={message} onChange={(event) => { setMessage(event.target.value); setTemplate("custom") }} maxLength={1600} rows={7} className="rounded-md border border-slate-300 p-3 text-sm font-normal leading-5" /></label>
          {channel === "sms" ? <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold"><ImagePlus className="h-4 w-4" />{photo ? photo.name : "Add photo"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setPhoto(event.target.files?.[0] || null)} /></label> : null}
          {channel === "sms" && photo ? <p className="text-xs text-slate-500">The Q U O app opens with the photo attached. Review it and press Send.</p> : null}
          {feedback ? <p role="alert" className="text-sm font-semibold text-rose-700">{feedback}</p> : null}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-3"><button type="button" onClick={close} disabled={pending} className="min-h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</button><button type="button" onClick={send} disabled={pending || !message.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-40">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{channel === "sms" && photo ? "Open Q U O" : "Send"}</button></footer>
      </section>
    </div>, document.body) : null}
  </>
}
