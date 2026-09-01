"use client"

import Link from "next/link"
import { Check, ChevronDown, Pause, Play, Upload } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const concepts = [
  {
    id: 1,
    eyebrow: "Avantia materials desk",
    headline: <>Send Your Quote.<br />We’ll Check the Rest.</>,
    summary: "Price · Availability · Delivery",
    primary: "Upload Your Quote",
    secondary: "Text It",
  },
  {
    id: 2,
    eyebrow: "Before you buy",
    headline: <>Before You Order,<br />Send It.</>,
    summary: "We check pricing, availability, and delivery options.",
    primary: "Check My Quote",
    secondary: "Send by Text",
  },
  {
    id: 3,
    eyebrow: "Materials this week?",
    headline: <>Buying Materials<br />This Week?</>,
    summary: "Send your quote. We’ll check other supplier options.",
    primary: "Send My Quote",
    secondary: "Send a Photo",
  },
  {
    id: 4,
    eyebrow: "Compare before you commit",
    headline: <>One Quote.<br />More Options.</>,
    summary: "Suppliers · Availability · Delivery",
    primary: "Upload Quote",
    secondary: "Text My List",
  },
  {
    id: 5,
    eyebrow: "Keep building",
    headline: <>Stop Chasing<br />Suppliers.</>,
    summary: "Send the list. We’ll handle the checking and follow-up.",
    primary: "Send My List",
    secondary: "Upload a Quote",
  },
] as const

const videoSequence = [
  "/videos/avantia-story/01-contractor-request.mp4",
  "/videos/marketing/supplier-comparison.mp4",
  "/videos/avantia-story/02-contractor-crew-moving.mp4",
  "/videos/marketing/delivery-coordination.mp4",
] as const

const posterSequence = [
  "/videos/avantia-story/01-contractor-request-poster.jpg",
  "/videos/marketing/supplier-comparison-poster.jpg",
  "/videos/avantia-story/02-contractor-crew-moving-poster.jpg",
  "/videos/marketing/delivery-coordination-poster.jpg",
] as const

export function HomepageConceptPreview() {
  const [conceptId, setConceptId] = useState(1)
  const [videoIndex, setVideoIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [approved, setApproved] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const concept = concepts.find((entry) => entry.id === conceptId) ?? concepts[0]

  useEffect(() => {
    const video = videoRef.current
    if (!video || paused) return
    void video.play().catch(() => undefined)
  }, [videoIndex, paused])

  const togglePlayback = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play()
      setPaused(false)
    } else {
      video.pause()
      setPaused(true)
    }
  }

  return (
    <main className="min-h-screen bg-[#030507] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/72 px-3 py-2 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <p className="hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 sm:block">Choose a homepage</p>
          <nav aria-label="Homepage concepts" className="flex flex-1 items-center justify-center gap-1.5">
            {concepts.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => { setConceptId(entry.id); setApproved(null) }}
                className={`inline-flex h-10 min-w-10 items-center justify-center border text-sm font-bold transition ${conceptId === entry.id ? "border-white bg-white text-black" : "border-white/25 bg-black/25 text-white hover:border-white/60"}`}
                aria-label={`View homepage concept ${entry.id}`}
                aria-pressed={conceptId === entry.id}
              >
                {entry.id}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setApproved(concept.id)}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 bg-[#1677ff] px-3 text-xs font-bold text-white sm:px-5 sm:text-sm"
          >
            <Check className="h-4 w-4" />
            <span className="hidden sm:inline">Approve</span> #{concept.id}
          </button>
        </div>
      </header>

      <section className="relative min-h-[100svh] overflow-hidden bg-black">
        <video
          key={videoSequence[videoIndex]}
          ref={videoRef}
          src={videoSequence[videoIndex]}
          poster={posterSequence[videoIndex]}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={() => setVideoIndex((current) => (current + 1) % videoSequence.length)}
          className="absolute inset-0 h-full w-full scale-[1.015] object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.18)_0%,rgba(0,0,0,.08)_38%,rgba(0,0,0,.78)_82%,#030507_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_35%,transparent_0%,rgba(0,0,0,.12)_52%,rgba(0,0,0,.58)_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pb-24 pt-24 sm:px-8 sm:pb-20 lg:px-12 lg:pb-24">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-white/72 sm:text-xs">{concept.eyebrow}</p>
            <h1 className="mt-3 max-w-[12ch] text-balance text-[clamp(3rem,8.5vw,7rem)] font-semibold leading-[0.9] tracking-[-0.065em] drop-shadow-[0_5px_28px_rgba(0,0,0,.55)]">
              {concept.headline}
            </h1>
            <p className="mt-5 max-w-xl text-sm font-semibold leading-6 text-white/90 sm:text-base">{concept.summary}</p>
            <div className="mt-7 flex max-w-lg flex-col gap-2.5 sm:flex-row">
              <Link href="/beat-a-quote" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-white px-5 text-sm font-bold text-black transition hover:bg-[#e7b85d]">
                <Upload className="h-4 w-4" /> {concept.primary}
              </Link>
              <Link href="/request-quote" className="inline-flex min-h-12 flex-1 items-center justify-center border border-white/65 bg-black/28 px-5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white hover:text-black">
                {concept.secondary}
              </Link>
            </div>
            <p className="mt-3 text-xs font-semibold text-white/65">No account. No obligation.</p>
          </div>
        </div>

        <button type="button" onClick={togglePlayback} className="absolute bottom-5 right-5 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/35 backdrop-blur-md" aria-label={paused ? "Play video" : "Pause video"}>
          {paused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
        </button>
        <div className="absolute bottom-7 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-1.5 sm:flex" aria-label={`Video ${videoIndex + 1} of ${videoSequence.length}`}>
          {videoSequence.map((source, index) => <span key={source} className={`h-1 rounded-full transition-all ${index === videoIndex ? "w-8 bg-white" : "w-3 bg-white/35"}`} />)}
        </div>
        <a href="#concepts" className="absolute bottom-5 left-5 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/35 backdrop-blur-md" aria-label="See all five concepts">
          <ChevronDown className="h-5 w-5" />
        </a>
      </section>

      <section id="concepts" className="bg-[#eef0f2] px-4 py-12 text-slate-950 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0874d1]">Five directions</p><h2 className="mt-2 text-3xl font-bold tracking-[-0.045em]">Tap a frame to review it.</h2></div>
            <p className="hidden text-sm text-slate-500 sm:block">The video sequence is shared. Only the message changes.</p>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {concepts.map((entry, index) => (
              <button key={entry.id} type="button" onClick={() => { setConceptId(entry.id); setApproved(null); window.scrollTo({ top: 0, behavior: "smooth" }) }} className={`group overflow-hidden border bg-black text-left ${conceptId === entry.id ? "border-[#1677ff] ring-2 ring-[#1677ff]" : "border-black/15"}`}>
                <div className="relative aspect-[4/5] bg-cover bg-center" style={{ backgroundImage: `linear-gradient(180deg,transparent 20%,rgba(0,0,0,.9)),url(${posterSequence[index % posterSequence.length]})` }}>
                  <span className="absolute left-3 top-3 inline-flex h-8 w-8 items-center justify-center bg-white text-sm font-black text-black">{entry.id}</span>
                  <p className="absolute inset-x-3 bottom-4 text-xl font-bold leading-[1.02] tracking-[-0.04em] text-white">{entry.headline}</p>
                </div>
              </button>
            ))}
          </div>
          {approved ? <div className="mt-6 border border-emerald-300 bg-emerald-50 px-4 py-4 text-sm font-bold text-emerald-900">Version {approved} selected. Tell Codex: “Approve homepage {approved}.”</div> : null}
        </div>
      </section>
    </main>
  )
}
