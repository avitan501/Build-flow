"use client"

import Link from "next/link"
import { Check, ChevronDown, Pause, Play, Send, Upload } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const concepts = [
  { id: 1, name: "Quote Rescue", eyebrow: "Avantia materials desk", headline: <>Send Your Quote.<br />We’ll Check the Rest.</>, summary: "Price · Availability · Delivery", primary: "Upload Your Quote", secondary: "Text It", videos: [["/videos/avantia-story/01-contractor-request.mp4", "/videos/avantia-story/01-contractor-request-poster.jpg"], ["/videos/avantia-story/08-material-actual-cost.mp4", "/videos/avantia-story/08-material-actual-cost-poster.jpg"]] },
  { id: 2, name: "Before / After", eyebrow: "Compare before you buy", headline: <>One Quote.<br />Better Options.</>, summary: "We compare the supplier, total price, and delivery.", primary: "Check My Quote", secondary: "Send a Photo", videos: [["/videos/marketing/supplier-comparison.mp4", "/videos/marketing/supplier-comparison-poster.jpg"], ["/videos/avantia-story/03-supplier-partner-network.mp4", "/videos/avantia-story/03-supplier-partner-network-poster.jpg"]] },
  { id: 3, name: "Crew Moving", eyebrow: "Materials this week?", headline: <>Keep the Crew<br />Moving.</>, summary: "Send the list. We chase the material—not your crew.", primary: "Send My List", secondary: "How It Works", videos: [["/videos/avantia-story/02-contractor-crew-moving.mp4", "/videos/avantia-story/02-contractor-crew-moving-poster.jpg"], ["/videos/avantia-story/09-job-gets-busy.mp4", "/videos/avantia-story/09-job-gets-busy-poster.jpg"]] },
  { id: 4, name: "Supplier Grid", eyebrow: "One request. More reach.", headline: <>Stop Calling<br />Every Supplier.</>, summary: "Avantia organizes the request and checks matching sources.", primary: "Start a Request", secondary: "Text My List", videos: [["/videos/avantia-story/04-supplier-send-products.mp4", "/videos/avantia-story/04-supplier-send-products-poster.jpg"], ["/videos/avantia-story/07-many-calls-one-job.mp4", "/videos/avantia-story/07-many-calls-one-job-poster.jpg"]] },
  { id: 5, name: "Delivery Mission", eyebrow: "From list to jobsite", headline: <>Materials.<br />Handled.</>, summary: "Quote review, supplier follow-up, and delivery coordination.", primary: "Send It to Avantia", secondary: "Upload Quote", videos: [["/videos/marketing/delivery-coordination.mp4", "/videos/marketing/delivery-coordination-poster.jpg"], ["/videos/avantia-story/05-designer-order-coordination.mp4", "/videos/avantia-story/05-designer-order-coordination-poster.jpg"], ["/videos/avantia-story/06-designer-materials-desk.mp4", "/videos/avantia-story/06-designer-materials-desk-poster.jpg"]] },
] as const

function Actions({ primary, secondary, dark = false }: { primary: string; secondary: string; dark?: boolean }) {
  return <div className="mt-7 flex w-full max-w-lg flex-col gap-2.5 sm:flex-row">
    <Link href="/beat-a-quote" className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 px-5 text-sm font-bold transition ${dark ? "bg-slate-950 text-white hover:bg-blue-700" : "bg-white text-black hover:bg-[#e7b85d]"}`}><Upload className="h-4 w-4" />{primary}</Link>
    <Link href="/request-quote" className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 border px-5 text-sm font-bold backdrop-blur-md transition ${dark ? "border-slate-300 bg-white text-slate-950 hover:bg-slate-100" : "border-white/65 bg-black/28 text-white hover:bg-white hover:text-black"}`}><Send className="h-4 w-4" />{secondary}</Link>
  </div>
}

export function HomepageConceptPreview() {
  const [conceptId, setConceptId] = useState(1)
  const [videoIndex, setVideoIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [approved, setApproved] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const concept = concepts.find((entry) => entry.id === conceptId) ?? concepts[0]
  const [videoSource, posterSource] = concept.videos[videoIndex] ?? concept.videos[0]

  useEffect(() => { const video = videoRef.current; if (!video || paused) return; void video.play().catch(() => undefined) }, [videoSource, paused])

  const togglePlayback = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) { void video.play(); setPaused(false) } else { video.pause(); setPaused(true) }
  }

  const text = <>
    <p className={`text-[10px] font-bold uppercase tracking-[0.26em] ${conceptId === 3 ? "text-amber-300" : conceptId === 5 ? "text-blue-700" : "text-white/72"}`}>{concept.eyebrow}</p>
    <h1 className="mt-3 text-balance text-[clamp(3rem,8.5vw,7rem)] font-semibold leading-[0.9] tracking-[-0.065em]">{concept.headline}</h1>
    <p className="mt-5 max-w-xl text-sm font-semibold leading-6 opacity-85 sm:text-base">{concept.summary}</p>
  </>

  return <main className="min-h-screen bg-[#030507] text-white">
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/80 px-3 py-2 backdrop-blur-xl sm:px-6"><div className="mx-auto flex max-w-7xl items-center gap-3">
      <p className="hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 sm:block">Choose a homepage</p>
      <nav aria-label="Homepage concepts" className="flex flex-1 items-center justify-center gap-1.5">{concepts.map((entry) => <button key={entry.id} type="button" onClick={() => { setConceptId(entry.id); setVideoIndex(0); setPaused(false); setApproved(null) }} className={`inline-flex h-10 min-w-10 items-center justify-center border text-sm font-bold transition ${conceptId === entry.id ? "border-white bg-white text-black" : "border-white/25 bg-black/25 text-white hover:border-white/60"}`} aria-label={`View homepage concept ${entry.id}`} aria-pressed={conceptId === entry.id}>{entry.id}</button>)}</nav>
      <button type="button" onClick={() => setApproved(concept.id)} className="inline-flex min-h-10 shrink-0 items-center gap-2 bg-[#1677ff] px-3 text-xs font-bold text-white sm:px-5 sm:text-sm"><Check className="h-4 w-4" /><span className="hidden sm:inline">Approve</span> #{concept.id}</button>
    </div></header>

    <section className={`relative min-h-[100svh] overflow-hidden ${conceptId === 5 ? "bg-[#edf2f7] text-slate-950" : "bg-black"}`}>
      <video key={videoSource} ref={videoRef} src={videoSource} poster={posterSource} autoPlay muted playsInline preload="auto" onEnded={() => setVideoIndex((current) => (current + 1) % concept.videos.length)} className={`absolute object-cover ${conceptId === 2 ? "inset-y-0 right-0 h-full w-full sm:w-[62%]" : conceptId === 4 ? "inset-y-0 right-0 h-full w-full lg:w-[68%]" : conceptId === 5 ? "inset-x-4 bottom-5 top-24 h-[calc(100%-7.25rem)] w-[calc(100%-2rem)] rounded-[2rem] sm:inset-x-[38%] sm:w-[60%]" : "inset-0 h-full w-full scale-[1.015]"}`} aria-hidden="true" />

      {conceptId === 1 ? <><div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.08)_40%,rgba(0,0,0,.84))]" /><div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pb-24 pt-24 sm:px-8 lg:px-12"><div className="max-w-3xl drop-shadow-[0_5px_28px_rgba(0,0,0,.65)]">{text}<Actions primary={concept.primary} secondary={concept.secondary} /><p className="mt-3 text-xs font-semibold text-white/65">No account. No obligation.</p></div></div></> : null}
      {conceptId === 2 ? <><div className="absolute inset-0 bg-[linear-gradient(90deg,#f4efe6_0%,#f4efe6_38%,rgba(244,239,230,.88)_52%,rgba(0,0,0,.12)_100%)]" /><div className="relative z-10 flex min-h-[100svh] items-center px-5 pt-16 text-slate-950 sm:w-[52%] sm:px-10 lg:px-16"><div className="max-w-xl"><p className="mb-8 inline-flex border-b-2 border-slate-950 pb-2 text-xs font-black uppercase tracking-[.2em]">Before / After</p>{text}<Actions primary={concept.primary} secondary={concept.secondary} dark /><p className="mt-4 text-xs font-bold text-slate-500">One business day review.</p></div></div></> : null}
      {conceptId === 3 ? <><div className="absolute inset-0 bg-black/45" /><div className="absolute inset-x-0 top-[18%] h-3 bg-amber-400" /><div className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-5 pt-20 text-center"><div className="max-w-5xl">{text}<div className="flex justify-center"><Actions primary={concept.primary} secondary={concept.secondary} /></div><p className="mt-4 font-mono text-xs uppercase tracking-[.15em] text-amber-300">Fast request intake · Human review</p></div></div></> : null}
      {conceptId === 4 ? <><div className="absolute inset-0 bg-[linear-gradient(90deg,#061d3b_0%,#061d3b_42%,rgba(6,29,59,.78)_66%,rgba(6,29,59,.18))]" /><div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(78,170,255,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(78,170,255,.3)_1px,transparent_1px)] [background-size:32px_32px]" /><div className="relative z-10 flex min-h-[100svh] items-center px-5 pt-16 sm:px-10 lg:w-1/2 lg:px-16"><div className="max-w-2xl border-l-4 border-sky-400 pl-5 sm:pl-8">{text}<Actions primary={concept.primary} secondary={concept.secondary} /><div className="mt-5 grid max-w-md grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-wide text-sky-200"><span className="border border-sky-300/25 p-2">Request</span><span className="border border-sky-300/25 p-2">Compare</span><span className="border border-sky-300/25 p-2">Deliver</span></div></div></div></> : null}
      {conceptId === 5 ? <><div className="absolute inset-0 bg-gradient-to-r from-[#edf2f7] via-[#edf2f7] to-transparent sm:w-[58%]" /><div className="relative z-10 flex min-h-[100svh] items-end px-5 pb-20 pt-24 sm:w-[50%] sm:items-center sm:px-10 lg:px-16"><div className="max-w-xl rounded-3xl bg-white/92 p-6 shadow-[0_25px_80px_rgba(15,23,42,.18)] backdrop-blur-xl sm:p-9">{text}<Actions primary={concept.primary} secondary={concept.secondary} dark /><p className="mt-4 text-xs font-bold text-slate-500">Local jobs · Real supplier follow-up</p></div></div></> : null}

      <button type="button" onClick={togglePlayback} className={`absolute bottom-5 right-5 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md ${conceptId === 5 ? "border-slate-300 bg-white/80 text-slate-950" : "border-white/40 bg-black/35 text-white"}`} aria-label={paused ? "Play video" : "Pause video"}>{paused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}</button>
      <div className="absolute bottom-7 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-1.5 sm:flex" aria-label={`Video ${videoIndex + 1} of ${concept.videos.length}`}>{concept.videos.map(([source], index) => <span key={source} className={`h-1 rounded-full transition-all ${index === videoIndex ? `w-8 ${conceptId === 5 ? "bg-slate-950" : "bg-white"}` : `w-3 ${conceptId === 5 ? "bg-slate-400" : "bg-white/35"}`}`} />)}</div>
      <a href="#concepts" className={`absolute bottom-5 left-5 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md ${conceptId === 5 ? "border-slate-300 bg-white/80 text-slate-950" : "border-white/40 bg-black/35 text-white"}`} aria-label="See all five concepts"><ChevronDown className="h-5 w-5" /></a>
    </section>

    <section id="concepts" className="bg-[#eef0f2] px-4 py-12 text-slate-950 sm:px-8 sm:py-16"><div className="mx-auto max-w-7xl"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0874d1]">Five real directions</p><h2 className="mt-2 text-3xl font-bold tracking-[-0.045em]">Different message. Different film. Different design.</h2></div><div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{concepts.map((entry) => <button key={entry.id} type="button" onClick={() => { setConceptId(entry.id); setVideoIndex(0); setPaused(false); setApproved(null); window.scrollTo({ top: 0, behavior: "smooth" }) }} className={`group overflow-hidden border text-left ${entry.id === 2 ? "bg-[#f4efe6]" : entry.id === 3 ? "bg-amber-400" : entry.id === 4 ? "bg-[#061d3b]" : entry.id === 5 ? "bg-white" : "bg-black"} ${conceptId === entry.id ? "border-[#1677ff] ring-2 ring-[#1677ff]" : "border-black/15"}`}><div className="relative aspect-[4/5] bg-cover bg-center" style={{ backgroundImage: `linear-gradient(180deg,transparent 20%,rgba(0,0,0,.86)),url(${entry.videos[0][1]})` }}><span className="absolute left-3 top-3 inline-flex h-8 w-8 items-center justify-center bg-white text-sm font-black text-black">{entry.id}</span><div className="absolute inset-x-3 bottom-4 text-white"><p className="text-[10px] font-bold uppercase tracking-wider text-white/65">{entry.name}</p><p className="mt-1 text-xl font-bold leading-[1.02] tracking-[-0.04em]">{entry.headline}</p></div></div></button>)}</div>{approved ? <div className="mt-6 border border-emerald-300 bg-emerald-50 px-4 py-4 text-sm font-bold text-emerald-900">Version {approved} selected. Tell Codex: “Approve homepage {approved}.”</div> : null}</div></section>
  </main>
}
