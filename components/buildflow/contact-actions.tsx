"use client"

import { ImagePlus, LoaderCircle, Mail, MessageCircle, Phone, Send, Smartphone, X } from "lucide-react"
import { useState, useTransition } from "react"
import { createPortal } from "react-dom"

import { prepareQuoPhotoMessageAction, sendAuraMessageAction } from "@/app/owner/aura/actions"

type Channel = "sms" | "whatsapp" | "email"

function phoneNumber(value: string | null) {
  const raw = value?.trim() || ""
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""
  if (raw.startsWith("+")) return `+${digits}`
  return digits.length === 10 ? `+1${digits}` : `+${digits}`
}

function callHref(phone: string) {
  if (!phone) return "#"
  if (typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    return `openphone://dial?number=${encodeURIComponent(phone)}&from=${encodeURIComponent("+15169088319")}&action=call`
  }
  return `tel:${phone}`
}

export function ContactActions({ name, phone, email }: { name: string; phone: string | null; email: string | null }) {
  const normalizedPhone = phoneNumber(phone)
  const [channel, setChannel] = useState<Channel | null>(null)
  const [message, setMessage] = useState("")
  const [subject, setSubject] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [feedback, setFeedback] = useState("")
  const [pending, startTransition] = useTransition()

  function close() {
    if (pending) return
    setChannel(null)
    setMessage("")
    setSubject("")
    setPhoto(null)
    setFeedback("")
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
        close()
        return
      }
      const recipient = channel === "email" ? email || "" : normalizedPhone
      const result = await sendAuraMessageAction({ channel, recipient, subject, message })
      if (!result.ok) { setFeedback(result.error); return }
      close()
    })
  }

  const buttonClass = "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"

  return <>
    <div className="flex items-center gap-1" aria-label={`Contact ${name}`}>
      <a href={normalizedPhone ? callHref(normalizedPhone) : undefined} aria-disabled={!normalizedPhone} title="Call with Q U O" aria-label={`Call ${name} with Q U O`} className={`${buttonClass} ${normalizedPhone ? "" : "pointer-events-none opacity-30"}`}><Phone className="h-4 w-4" /></a>
      <button type="button" disabled={!normalizedPhone} onClick={() => setChannel("sms")} title="Text with Q U O" aria-label={`Text ${name} with Q U O`} className={buttonClass}><Smartphone className="h-4 w-4" /></button>
      <button type="button" disabled={!email} onClick={() => setChannel("email")} title="Send email" aria-label={`Email ${name}`} className={buttonClass}><Mail className="h-4 w-4" /></button>
      <button type="button" disabled={!normalizedPhone} onClick={() => setChannel("whatsapp")} title="Send WhatsApp" aria-label={`WhatsApp ${name}`} className={buttonClass}><MessageCircle className="h-4 w-4" /></button>
    </div>

    {channel && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[180] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="contact-compose-title" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <section className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase text-[#0066cc]">{channel === "sms" ? "Q U O text" : channel === "email" ? "Email" : "WhatsApp"}</p><h2 id="contact-compose-title" className="mt-0.5 font-semibold">{name}</h2></div><button type="button" onClick={close} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200"><X className="h-4 w-4" /></button></header>
        <div className="grid gap-3 p-4">
          {channel === "email" ? <label className="grid gap-1 text-xs font-semibold">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} placeholder="Message from Avantia Build" className="min-h-10 rounded-md border border-slate-300 px-3 text-sm font-normal" /></label> : null}
          <label className="grid gap-1 text-xs font-semibold">Message<textarea autoFocus value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1600} rows={4} className="rounded-md border border-slate-300 p-3 text-sm font-normal" /></label>
          {channel === "sms" ? <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold"><ImagePlus className="h-4 w-4" />{photo ? photo.name : "Add photo"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setPhoto(event.target.files?.[0] || null)} /></label> : null}
          {channel === "sms" && photo ? <p className="text-xs text-slate-500">The Q U O app opens with the photo attached. Review it and press Send.</p> : null}
          {feedback ? <p role="alert" className="text-sm font-semibold text-rose-700">{feedback}</p> : null}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-3"><button type="button" onClick={close} disabled={pending} className="min-h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</button><button type="button" onClick={send} disabled={pending || !message.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-40">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{channel === "sms" && photo ? "Open Q U O" : "Send"}</button></footer>
      </section>
    </div>, document.body) : null}
  </>
}
