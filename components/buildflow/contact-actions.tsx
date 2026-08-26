"use client"

import { ChevronDown, LoaderCircle, Mail, MessageCircle, Paperclip, Phone, Play, Send, Smartphone, Video, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { createPortal } from "react-dom"

import { prepareQuoAttachmentMessageAction, sendAuraMessageAction, sendAuraVideoAction } from "@/app/owner/aura/actions"
import { normalizeAuraPhone } from "@/lib/aura/identity"
import { auraShareVideos, buildAuraShareVideoCaption, type AuraShareVideoId } from "@/lib/aura/share-videos"

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
  const [attachment, setAttachment] = useState<File | null>(null)
  const [feedback, setFeedback] = useState("")
  const [videoMenuOpen, setVideoMenuOpen] = useState(false)
  const [selectedVideoId, setSelectedVideoId] = useState<AuraShareVideoId | null>(null)
  const [videoFeedback, setVideoFeedback] = useState("")
  const [pending, startTransition] = useTransition()
  const selectedVideo = auraShareVideos.find((video) => video.id === selectedVideoId) || null

  function resetComposer() {
    setChannel(null)
    setMessage("")
    setSubject("")
    setAttachment(null)
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
      const result = await sendAuraMessageAction({ channel, recipient, subject, message })
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
      <a href={normalizedPhone ? callHref(normalizedPhone) : undefined} aria-disabled={!normalizedPhone} title="Call with Q U O" aria-label={`Call ${name} with Q U O`} className={`${buttonClass} w-9 ${normalizedPhone ? "" : "pointer-events-none opacity-30"}`}><Phone className="h-4 w-4" /></a>
      <button type="button" disabled={!normalizedPhone && !email} onClick={openComposer} className={`${buttonClass} gap-2 px-3 text-xs font-semibold`}><Send className="h-3.5 w-3.5" />Send message<ChevronDown className="h-3.5 w-3.5" /></button>
      <div className="relative">
        <button type="button" disabled={!normalizedPhone || pending} onClick={() => setVideoMenuOpen((open) => !open)} aria-expanded={videoMenuOpen} className={`${buttonClass} gap-2 px-3 text-xs font-semibold`}><Video className="h-3.5 w-3.5" />Send video<ChevronDown className="h-3.5 w-3.5" /></button>
        {videoMenuOpen ? <div className="absolute right-0 top-11 z-40 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
          {auraShareVideos.map((video) => <button key={video.id} type="button" onClick={() => { setSelectedVideoId(video.id); setVideoMenuOpen(false); setVideoFeedback("") }} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-slate-50"><span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white"><Play className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-900">{video.title}</span><span className="mt-0.5 block text-[11px] text-slate-500">{video.durationLabel}</span></span></button>)}
        </div> : null}
      </div>
      {videoFeedback ? <p role="status" className={`basis-full pt-1 text-xs font-semibold ${videoFeedback.includes("was sent") ? "text-emerald-700" : "text-rose-700"}`}>{videoFeedback}</p> : null}
    </div>

    {channel && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[180] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="contact-compose-title" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <section className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase text-[#0066cc]">{channel === "sms" ? "Q U O text" : channel === "email" ? "Email" : "WhatsApp"}</p><h2 id="contact-compose-title" className="mt-0.5 font-semibold">{name}</h2></div><button type="button" onClick={close} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200"><X className="h-4 w-4" /></button></header>
        <div className="grid gap-3 p-4">
          <label className="grid gap-1 text-xs font-semibold">Template<select value={template} onChange={(event) => chooseTemplate(event.target.value as TemplateKey)} className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal">{(Object.keys(templateLabels) as TemplateKey[]).map((key) => <option key={key} value={key}>{templateLabels[key]}</option>)}</select></label>
          <fieldset><legend className="text-xs font-semibold">Channel</legend><div className="mt-1 grid grid-cols-3 gap-1">{([['sms', 'Text', Smartphone], ['whatsapp', 'WhatsApp', MessageCircle], ['email', 'Email', Mail]] as const).map(([value, label, Icon]) => <button key={value} type="button" disabled={value === "email" ? !email : !normalizedPhone} onClick={() => setChannel(value)} className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-semibold disabled:opacity-30 ${channel === value ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white"}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div></fieldset>
          {channel === "email" ? <label className="grid gap-1 text-xs font-semibold">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} placeholder="Message from Avantia Build" className="min-h-10 rounded-md border border-slate-300 px-3 text-sm font-normal" /></label> : null}
          <label className="grid gap-1 text-xs font-semibold">Exact message preview<textarea autoFocus value={message} onChange={(event) => { setMessage(event.target.value); setTemplate("custom") }} maxLength={1600} rows={7} className="rounded-md border border-slate-300 p-3 text-sm font-normal leading-5" /></label>
          {channel === "sms" ? <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold"><Paperclip className="h-4 w-4" />{attachment ? attachment.name : "Add attachment"}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.tif,.tiff,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.mp4,.mov" className="sr-only" onChange={(event) => setAttachment(event.target.files?.[0] || null)} /></label> : null}
          {channel === "sms" && attachment ? <p className="text-xs text-slate-500">The Q U O app opens with the file ready. Review it and press Send. Maximum 5 MB.</p> : null}
          {feedback ? <p role="alert" className="text-sm font-semibold text-rose-700">{feedback}</p> : null}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-3"><button type="button" onClick={close} disabled={pending} className="min-h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</button><button type="button" onClick={send} disabled={pending || !message.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-40">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{channel === "sms" && attachment ? "Open Q U O with file" : "Send"}</button></footer>
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
