"use client"

import { ChevronDown, ContactRound, LoaderCircle, Mail, MessageCircle, Paperclip, Phone, Play, Send, Smartphone, Video, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { createPortal } from "react-dom"

import { prepareQuoAttachmentMessageAction, sendAuraMessageAction, sendAuraVideoAction, sendAuraWelcomePackageAction } from "@/app/owner/aura/actions"
import { recordCommunicationActivityAction } from "@/app/admin/activity-actions"
import { normalizeAuraPhone } from "@/lib/aura/identity"
import { auraShareVideos, buildAuraShareVideoCaption, type AuraShareVideoId } from "@/lib/aura/share-videos"

type Channel = "sms" | "whatsapp" | "email"
type TemplateKey = "welcome" | "friendly_follow_up" | "request_material_list" | "quote_follow_up" | "order_follow_up" | "custom"

const templateLabels: Record<TemplateKey, string> = {
  welcome: "Welcome Package",
  friendly_follow_up: "Friendly follow-up",
  request_material_list: "Request material list",
  quote_follow_up: "Quote follow-up",
  order_follow_up: "Order follow-up",
  custom: "Custom message",
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there"
}

function welcomePackageMessages(name: string) {
  return [
    `Hi ${firstName(name)}, Carlos from Avantia Build. We compare construction material quotes, negotiate supplier pricing, and coordinate delivery. See how it works: https://build.avantiap.com`,
    "Send me whatever you have—a material list, photo, plan, or another supplier’s quote. We’ll work from there.",
  ] as const
}

function templateMessage(template: TemplateKey, name: string, senderName: string) {
  const greeting = `Hi ${firstName(name)}`
  if (template === "welcome") return welcomePackageMessages(name)[0]
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

export function ContactActions({ name, phone, email, senderName = "Avantia Build", showWelcomePackageButton = false }: { name: string; phone: string | null; email: string | null; senderName?: string; showWelcomePackageButton?: boolean }) {
  const router = useRouter()
  const normalizedPhone = normalizeAuraPhone(phone) || ""
  const [channel, setChannel] = useState<Channel | null>(null)
  const [template, setTemplate] = useState<TemplateKey>("welcome")
  const [isWelcomePackage, setIsWelcomePackage] = useState(false)
  const [message, setMessage] = useState("")
  const [welcomeFollowUp, setWelcomeFollowUp] = useState("")
  const [subject, setSubject] = useState("")
  const [attachment, setAttachment] = useState<File | null>(null)
  const [feedback, setFeedback] = useState("")
  const [contactMenuOpen, setContactMenuOpen] = useState(false)
  const [videoMenuOpen, setVideoMenuOpen] = useState(false)
  const [selectedVideoId, setSelectedVideoId] = useState<AuraShareVideoId | null>(null)
  const [videoFeedback, setVideoFeedback] = useState("")
  const [pending, startTransition] = useTransition()
  const selectedVideo = auraShareVideos.find((video) => video.id === selectedVideoId) || null

  function resetComposer() {
    setChannel(null)
    setMessage("")
    setWelcomeFollowUp("")
    setSubject("")
    setAttachment(null)
    setFeedback("")
    setIsWelcomePackage(false)
  }

  function close() {
    if (pending) return
    resetComposer()
  }

  function openComposer(preferredChannel?: Channel) {
    const initialChannel: Channel = preferredChannel === "whatsapp" && normalizedPhone
      ? "whatsapp"
      : normalizedPhone ? "sms" : "email"
    setContactMenuOpen(false)
    setVideoMenuOpen(false)
    setChannel(initialChannel)
    setTemplate("welcome")
    setIsWelcomePackage(true)
    const welcome = welcomePackageMessages(name)
    setMessage(welcome[0])
    setWelcomeFollowUp(welcome[1])
    setSubject("Welcome to Avantia Build")
  }

  function chooseTemplate(value: TemplateKey) {
    setTemplate(value)
    setIsWelcomePackage(value === "welcome")
    setMessage(templateMessage(value, name, senderName))
    setWelcomeFollowUp(value === "welcome" ? welcomePackageMessages(name)[1] : "")
    if (value === "welcome" && channel === "email" && normalizedPhone) setChannel("sms")
    if (value === "welcome") setSubject("Welcome to Avantia Build")
    else if (value === "quote_follow_up") setSubject("Your Avantia Build estimate")
    else if (value === "order_follow_up") setSubject("Your Avantia Build order")
    else setSubject("Message from Avantia Build")
  }

  function send() {
    if (!channel) return
    setFeedback("")
    startTransition(async () => {
      if (channel === "sms" && attachment) {
        const formData = new FormData()
        formData.set("phone", normalizedPhone)
        formData.set("message", message)
        formData.set("attachment", attachment)
        const result = await prepareQuoAttachmentMessageAction(formData)
        if (!result.ok) { setFeedback(result.error); return }
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
          window.location.href = result.deepLink
        } else {
          await navigator.clipboard?.writeText(message).catch(() => undefined)
          window.open(result.quoWebUrl, "_blank", "noopener,noreferrer")
          window.open(result.attachmentUrl, "_blank", "noopener,noreferrer")
          setFeedback("Q U O opened. The message was copied; attach the prepared file from the second tab.")
          setAttachment(null)
          return
        }
        resetComposer()
        return
      }
      const recipient = channel === "email" ? email || "" : normalizedPhone
      const welcomeIdempotencyKey = isWelcomePackage && channel !== "email" && normalizedPhone
        ? `welcome/${normalizedPhone.replace(/\D/g, "")}`
        : undefined
      const result = isWelcomePackage && channel !== "email"
        ? await sendAuraWelcomePackageAction({ channel, recipient, recipientLabel: name, messages: [message, welcomeFollowUp], idempotencyKey: welcomeIdempotencyKey! })
        : await sendAuraMessageAction({ channel, recipient, recipientLabel: name, subject, message, idempotencyKey: welcomeIdempotencyKey })
      if (!result.ok) { setFeedback(result.error); return }
      resetComposer()
      router.refresh()
    })
  }

  function confirmVideoSend() {
    if (!selectedVideo) return
    setVideoFeedback("")
    startTransition(async () => {
      const result = await sendAuraVideoAction({ recipient: normalizedPhone, recipientName: name, videoId: selectedVideo.id })
      if (!result.ok) { setVideoFeedback(result.error); return }
      setVideoFeedback(`${result.title} was sent by WhatsApp.`)
      setSelectedVideoId(null)
      router.refresh()
    })
  }

  const buttonClass = "inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"

  return <>
    <div className="relative flex flex-wrap items-center gap-1" aria-label={`Contact ${name}`}>
      {showWelcomePackageButton ? <button type="button" disabled={!normalizedPhone} onClick={() => openComposer("sms")} className="inline-flex h-9 items-center justify-center rounded-md border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-sky-800 disabled:opacity-35"><Send className="mr-1.5 h-3.5 w-3.5" />Send Welcome Package</button> : null}
      <button type="button" disabled={!normalizedPhone && !email} onClick={() => { setContactMenuOpen((open) => !open); setVideoMenuOpen(false) }} aria-expanded={contactMenuOpen} aria-haspopup="menu" aria-label={`Contact ${name}`} title="Contact" className={`${buttonClass} w-10 gap-0.5 text-[#0066cc]`}><ContactRound className="h-4 w-4" /><ChevronDown className="h-3 w-3" /></button>
      {contactMenuOpen ? <div role="menu" className="absolute right-0 top-11 z-40 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
        <a href={normalizedPhone ? callHref(normalizedPhone) : undefined} aria-disabled={!normalizedPhone} onClick={() => { setContactMenuOpen(false); if (normalizedPhone) void recordCommunicationActivityAction({ channel: "call", recipient: normalizedPhone, label: name, outcome: "opened_on_device", durationSeconds: 0 }) }} className={`flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold hover:bg-slate-50 ${normalizedPhone ? "text-slate-800" : "pointer-events-none opacity-35"}`}><Phone className="h-4 w-4 text-[#0066cc]" />Call</a>
        <button type="button" disabled={!normalizedPhone && !email} onClick={() => openComposer()} className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-35"><Send className="h-4 w-4 text-[#0066cc]" />Send a Message</button>
        <button type="button" disabled={!normalizedPhone} onClick={() => openComposer("whatsapp")} className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-35"><MessageCircle className="h-4 w-4 text-emerald-600" />Send WhatsApp</button>
        <button type="button" disabled={!normalizedPhone || pending} onClick={() => { setContactMenuOpen(false); setVideoMenuOpen(true) }} className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-35"><Video className="h-4 w-4 text-[#0066cc]" />Send a Video</button>
      </div> : null}
      {videoMenuOpen ? <div className="absolute right-0 top-11 z-40 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
        {auraShareVideos.map((video) => <button key={video.id} type="button" onClick={() => { setSelectedVideoId(video.id); setVideoMenuOpen(false); setVideoFeedback("") }} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-slate-50"><span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white"><Play className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-900">{video.title}</span><span className="mt-0.5 block text-[11px] text-slate-500">{video.durationLabel}</span></span></button>)}
      </div> : null}
      {videoFeedback ? <p role="status" className={`basis-full pt-1 text-xs font-semibold ${videoFeedback.includes("was sent") ? "text-emerald-700" : "text-rose-700"}`}>{videoFeedback}</p> : null}
    </div>

    {channel && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[180] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="contact-compose-title" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <section className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase text-[#0066cc]">{channel === "sms" ? "Q U O text" : channel === "email" ? "Email" : "WhatsApp"}</p><h2 id="contact-compose-title" className="mt-0.5 font-semibold">{name}</h2></div><button type="button" onClick={close} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200"><X className="h-4 w-4" /></button></header>
        <div className="grid gap-3 p-4">
          <label className="grid gap-1 text-xs font-semibold">Template<select value={template} onChange={(event) => chooseTemplate(event.target.value as TemplateKey)} className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal">{(Object.keys(templateLabels) as TemplateKey[]).map((key) => <option key={key} value={key}>{templateLabels[key]}</option>)}</select></label>
          <fieldset><legend className="text-xs font-semibold">Channel</legend><div className="mt-1 grid grid-cols-3 gap-1">{([['sms', 'Text', Smartphone], ['whatsapp', 'WhatsApp', MessageCircle], ['email', 'Email', Mail]] as const).map(([value, label, Icon]) => <button key={value} type="button" disabled={value === "email" ? !email || isWelcomePackage : !normalizedPhone} onClick={() => setChannel(value)} className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-semibold disabled:opacity-30 ${channel === value ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white"}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div></fieldset>
          {channel === "email" ? <label className="grid gap-1 text-xs font-semibold">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} placeholder="Message from Avantia Build" className="min-h-10 rounded-md border border-slate-300 px-3 text-sm font-normal" /></label> : null}
          <label className="grid gap-1 text-xs font-semibold">{isWelcomePackage ? "Message 1 of 2" : "Exact message preview"}<textarea autoFocus value={message} onChange={(event) => { setMessage(event.target.value); setTemplate("custom") }} maxLength={1600} rows={isWelcomePackage ? 5 : 7} className="rounded-md border border-slate-300 p-3 text-sm font-normal leading-5" /></label>
          {isWelcomePackage ? <label className="grid gap-1 text-xs font-semibold">Message 2 of 2<textarea value={welcomeFollowUp} onChange={(event) => { setWelcomeFollowUp(event.target.value); setTemplate("custom") }} maxLength={1600} rows={4} className="rounded-md border border-slate-300 p-3 text-sm font-normal leading-5" /></label> : null}
          {channel === "sms" ? <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold"><Paperclip className="h-4 w-4" />{attachment ? attachment.name : "Add attachment"}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.tif,.tiff,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.mp4,.mov" className="sr-only" onChange={(event) => setAttachment(event.target.files?.[0] || null)} /></label> : null}
          {channel === "sms" && attachment ? <p className="text-xs text-slate-500">The Q U O app opens with the file ready. Review it and press Send. Maximum 5 MB.</p> : null}
          {feedback ? <p role="alert" className="text-sm font-semibold text-rose-700">{feedback}</p> : null}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-3"><button type="button" onClick={close} disabled={pending} className="min-h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</button><button type="button" onClick={send} disabled={pending || !message.trim() || (isWelcomePackage && !welcomeFollowUp.trim())} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-40">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{channel === "sms" && attachment ? "Open Q U O with file" : isWelcomePackage ? "Send 2 messages" : "Send"}</button></footer>
      </section>
    </div>, document.body) : null}

    {selectedVideo && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[180] grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="send-video-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setSelectedVideoId(null) }}>
      <section className="w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-4"><div><p className="text-[10px] font-bold uppercase text-[#0066cc]">WhatsApp video · {selectedVideo.durationLabel}</p><h2 id="send-video-title" className="mt-1 text-lg font-semibold">{selectedVideo.title}</h2></div><button type="button" disabled={pending} onClick={() => setSelectedVideoId(null)} aria-label="Close" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200"><X className="h-4 w-4" /></button></header>
        <div className="p-4"><video src={selectedVideo.path} controls playsInline preload="metadata" className="aspect-video w-full rounded-md bg-slate-950 object-contain" /><p className="mt-3 text-sm text-slate-600">Send this video to <strong className="text-slate-900">{name}</strong> at {normalizedPhone}?</p><div className="mt-3 max-h-44 overflow-y-auto rounded-md bg-slate-50 p-3"><p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{buildAuraShareVideoCaption(selectedVideo, name)}</p></div>{videoFeedback ? <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">{videoFeedback}</p> : null}</div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-3"><button type="button" disabled={pending} onClick={() => setSelectedVideoId(null)} className="min-h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</button><button type="button" disabled={pending} onClick={confirmVideoSend} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-40">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Confirm send</button></footer>
      </section>
    </div>, document.body) : null}
  </>
}
