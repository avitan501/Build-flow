"use client"

import { Check, ChevronRight, Copy, Download, ImageIcon, MessageCircle, Share2, ShieldCheck, Smartphone } from "lucide-react"
import Image from "next/image"
import { useMemo, useState } from "react"

import { buildWhatsAppShareUrl, canShareImageFile, normalizeUsSharePhone, shareAds } from "@/lib/share-ads"

type Notice = { tone: "success" | "info" | "error"; text: string } | null

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand("copy")
  textarea.remove()
  if (!copied) throw new Error("Copy is not supported in this browser.")
}

export function ShareAdsCenter() {
  const [selectedAdId, setSelectedAdId] = useState(shareAds[0].id)
  const selectedAd = shareAds.find((ad) => ad.id === selectedAdId) ?? shareAds[0]
  const [selectedMessageId, setSelectedMessageId] = useState(selectedAd.messages[0].id)
  const selectedMessage = selectedAd.messages.find((message) => message.id === selectedMessageId) ?? selectedAd.messages[0]
  const [message, setMessage] = useState(selectedMessage.text)
  const [phone, setPhone] = useState("")
  const [notice, setNotice] = useState<Notice>(null)
  const [sharing, setSharing] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

  const normalizedPhone = useMemo(() => phone.trim() ? normalizeUsSharePhone(phone) : null, [phone])
  const phoneError = phone.trim() && !normalizedPhone ? "Enter a valid 10-digit U.S. mobile number." : ""
  const whatsappUrl = useMemo(() => buildWhatsAppShareUrl(message, phone), [message, phone])

  function selectAd(adId: string) {
    const next = shareAds.find((ad) => ad.id === adId) ?? shareAds[0]
    setSelectedAdId(next.id)
    setSelectedMessageId(next.messages[0].id)
    setMessage(next.messages[0].text)
    setNotice(null)
    setShowFallback(false)
  }

  function selectMessage(messageId: string) {
    const next = selectedAd.messages.find((item) => item.id === messageId) ?? selectedAd.messages[0]
    setSelectedMessageId(next.id)
    setMessage(next.text)
    setNotice(null)
  }

  async function copyMessage() {
    try {
      await copyText(message)
      setNotice({ tone: "success", text: "Message copied with its line breaks and emoji." })
    } catch {
      setNotice({ tone: "error", text: "Copy did not work. Select the message text and copy it manually." })
    }
  }

  async function shareImageAndMessage() {
    setSharing(true)
    setNotice(null)
    try {
      const response = await fetch(selectedAd.imagePath)
      if (!response.ok) throw new Error("The flyer could not be loaded.")
      const file = new File([await response.blob()], selectedAd.fileName, { type: "image/jpeg" })
      if (!canShareImageFile(navigator, file)) {
        setShowFallback(true)
        setNotice({ tone: "info", text: "Image sharing is not supported here. Use the three quick steps below." })
        return
      }
      await navigator.share({ files: [file], text: message, title: selectedAd.title })
      setNotice({ tone: "success", text: "The share sheet opened. Nothing is sent until you choose WhatsApp and press Send." })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setNotice({ tone: "info", text: "Sharing was canceled. Nothing was sent." })
      } else {
        setShowFallback(true)
        setNotice({ tone: "error", text: "The phone could not share both items together. Use the three quick steps below." })
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f3eee3] text-[#0b1b31]">
      <header className="border-b border-[#d8cfbf] bg-[#f8f4ec]">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-7 sm:py-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8d6a23]">Avantia private tools</p>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] sm:text-3xl">Share Ads</h1>
              <p className="mt-1 max-w-xl text-xs leading-5 text-[#526070] sm:text-sm">Pick a flyer, adjust the message, then share from your phone. You always press the final Send button.</p>
            </div>
            <span className="hidden h-11 items-center gap-2 border border-[#d8cfbf] bg-white px-3 text-xs font-bold text-[#526070] sm:inline-flex"><ShieldCheck className="h-4 w-4 text-[#19735a]" />Owner only</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-7 sm:py-8">
        <section aria-labelledby="flyer-heading">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8d6a23]">01 · Flyer</p><h2 id="flyer-heading" className="mt-1 text-lg font-black">Choose one</h2></div>
            <span className="text-[11px] font-semibold text-[#687483]">4 approved</span>
          </div>
          <div className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
            {shareAds.map((ad) => {
              const selected = ad.id === selectedAd.id
              return <button key={ad.id} type="button" onClick={() => selectAd(ad.id)} aria-pressed={selected} className={`group relative w-[42vw] min-w-[9.25rem] max-w-[11rem] snap-start overflow-hidden bg-white text-left outline-none transition sm:w-auto sm:min-w-0 sm:max-w-none ${selected ? "ring-2 ring-[#0b1b31] ring-offset-2 ring-offset-[#f3eee3]" : "ring-1 ring-[#d8cfbf] hover:ring-[#a9987c]"}`}>
                <div className="relative aspect-[9/16] overflow-hidden bg-[#ddd5c8]"><Image src={ad.imagePath} alt={ad.alt} fill sizes="(max-width: 640px) 42vw, 240px" className="object-cover" /></div>
                <div className="flex min-h-[3.4rem] items-center gap-2 px-2.5 py-2"><span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${selected ? "bg-[#0b1b31] text-white" : "border border-[#d8cfbf] text-transparent"}`}><Check className="h-3 w-3" /></span><span className="min-w-0"><span className="block truncate text-[11px] font-black">{ad.title}</span><span className="block truncate text-[9px] font-bold uppercase tracking-[.08em] text-[#8d6a23]">{ad.eyebrow}</span></span></div>
              </button>
            })}
          </div>
        </section>

        <section className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,.8fr)] lg:items-start" aria-labelledby="message-heading">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8d6a23]">02 · Message</p>
            <h2 id="message-heading" className="mt-1 text-lg font-black">Choose and edit</h2>
            <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Approved message versions">
              {selectedAd.messages.map((option) => <button key={option.id} type="button" onClick={() => selectMessage(option.id)} aria-pressed={option.id === selectedMessageId} className={`min-h-11 border px-3 text-xs font-black transition ${option.id === selectedMessageId ? "border-[#0b1b31] bg-[#0b1b31] text-white" : "border-[#d8cfbf] bg-[#f8f4ec] text-[#526070] hover:border-[#0b1b31]"}`}>{option.label}</button>)}
            </div>
            <label htmlFor="share-ad-message" className="sr-only">Advertising message</label>
            <textarea id="share-ad-message" value={message} onChange={(event) => setMessage(event.target.value)} rows={13} spellCheck className="mt-2 w-full resize-y border border-[#cfc5b5] bg-white px-3.5 py-3 text-[13px] leading-5 text-[#16243a] outline-none transition focus:border-[#0b1b31] focus:ring-2 focus:ring-[#0b1b31]/10" />
            <div className="mt-2 flex items-center justify-between gap-3 text-[10px] font-semibold text-[#687483]"><span>Editable before sharing</span><span>{message.length} characters</span></div>
          </div>

          <aside className="border-t border-[#d8cfbf] pt-5 lg:sticky lg:top-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8d6a23]">03 · Share</p>
            <h2 className="mt-1 text-lg font-black">Ready in seconds</h2>
            <label htmlFor="share-ad-phone" className="mt-4 block text-xs font-black">Recipient phone <span className="font-semibold text-[#7a8490]">(optional)</span></label>
            <div className={`mt-2 flex h-12 items-center border bg-white px-3 ${phoneError ? "border-[#b83a2e]" : "border-[#cfc5b5] focus-within:border-[#0b1b31]"}`}>
              <Smartphone className="h-4 w-4 shrink-0 text-[#687483]" />
              <input id="share-ad-phone" type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(event) => { setPhone(event.target.value); setNotice(null) }} placeholder="(516) 555-0123" aria-describedby={phoneError ? "share-ad-phone-error" : "share-ad-phone-help"} className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm font-bold outline-none" />
              {normalizedPhone ? <Check className="h-4 w-4 text-[#19735a]" aria-label="Valid phone number" /> : null}
            </div>
            {phoneError ? <p id="share-ad-phone-error" role="alert" className="mt-1.5 text-[11px] font-bold text-[#a52f25]">{phoneError}</p> : <p id="share-ad-phone-help" className="mt-1.5 text-[11px] leading-4 text-[#687483]">Leave blank to choose a person inside the phone share sheet.</p>}

            <button type="button" onClick={() => void shareImageAndMessage()} disabled={sharing || !message.trim()} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 bg-[#0b1b31] px-4 text-sm font-black text-white transition hover:bg-[#162d4d] disabled:cursor-not-allowed disabled:opacity-45"><Share2 className="h-4 w-4" />{sharing ? "Preparing…" : "Share Image + Message"}</button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void copyMessage()} disabled={!message.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#cfc5b5] bg-white px-3 text-xs font-black disabled:opacity-45"><Copy className="h-4 w-4" />Copy Message</button>
              <a href={selectedAd.imagePath} download={selectedAd.fileName} className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#cfc5b5] bg-white px-3 text-xs font-black"><Download className="h-4 w-4" />Download Flyer</a>
            </div>
            <a href={whatsappUrl ?? "#"} target="_blank" rel="noopener noreferrer" onClick={(event) => { if (!whatsappUrl) { event.preventDefault(); setNotice({ tone: "error", text: "Fix the recipient phone number before opening WhatsApp." }) } }} aria-disabled={!whatsappUrl} className={`mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 border px-4 text-sm font-black ${whatsappUrl ? "border-[#16785d] bg-[#e7f4ef] text-[#116048]" : "cursor-not-allowed border-[#d5d0c6] bg-[#ebe8e1] text-[#8d9298]"}`}><MessageCircle className="h-4 w-4" />Open WhatsApp<ChevronRight className="h-4 w-4" /></a>

            {notice ? <p role="status" className={`mt-3 border px-3 py-2.5 text-[11px] font-bold leading-4 ${notice.tone === "success" ? "border-[#b7d8cc] bg-[#eef8f4] text-[#116048]" : notice.tone === "error" ? "border-[#e0b7b2] bg-[#fff2f0] text-[#8f2b23]" : "border-[#b9ccdc] bg-[#eef5fa] text-[#234c6c]"}`}>{notice.text}</p> : null}

            <details open={showFallback ? true : undefined} className="mt-3 border border-[#d8cfbf] bg-[#f8f4ec] p-3" aria-label="Sharing fallback steps"><summary className="cursor-pointer text-[10px] font-black uppercase tracking-[.12em] text-[#8d6a23]">If WhatsApp shows only the image or text</summary><ol className="mt-2 space-y-1.5 text-xs font-bold"><li className="flex items-center gap-2"><ImageIcon className="h-3.5 w-3.5" />1. Download Flyer</li><li className="flex items-center gap-2"><Copy className="h-3.5 w-3.5" />2. Copy Message</li><li className="flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5" />3. Open WhatsApp</li></ol></details>

            <p className="mt-4 text-[10px] leading-4 text-[#687483]">Nothing sends automatically. WhatsApp or the phone share sheet always requires your final action.</p>
          </aside>
        </section>
      </div>
    </main>
  )
}
