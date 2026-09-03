"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Check, ChevronDown, MapPin, MessageSquareText, Pause, Play, Send, Upload } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { ShopBrandShowcase } from "@/components/buildflow/shop-brand-showcase"

const concepts = [
  { id: 1, name: "Quote Rescue", eyebrow: "Avantia materials desk", headline: <>Send Your Quote.<br />We’ll Check the Rest.</>, summary: "Price · Availability · Delivery", primary: "Upload Your Quote", secondary: "Text It", videos: [["/videos/avantia-story/01-contractor-request.mp4", "/videos/avantia-story/01-contractor-request-poster.jpg"], ["/videos/avantia-story/08-material-actual-cost.mp4", "/videos/avantia-story/08-material-actual-cost-poster.jpg"]] },
  { id: 2, name: "Light Supplier Reach", eyebrow: "More reach.", headline: <>Stop Calling<br />Every Supplier.</>, summary: "Avantia organizes the request and checks matching sources.", primary: "Send My List", secondary: "Text My List", videos: [["/videos/marketing/crew-downtime.mp4", "/videos/marketing/crew-downtime-poster.jpg"], ["/videos/marketing/delivery-coordination.mp4", "/videos/marketing/delivery-coordination-poster.jpg"]] },
  { id: 3, name: "Crew Moving", eyebrow: "Materials this week?", headline: <>Keep the Crew<br />Moving.</>, summary: "Send the list. We chase the material—not your crew.", primary: "Send My List", secondary: "How It Works", videos: [["/videos/avantia-story/02-contractor-crew-moving.mp4", "/videos/avantia-story/02-contractor-crew-moving-poster.jpg"], ["/videos/avantia-story/09-job-gets-busy.mp4", "/videos/avantia-story/09-job-gets-busy-poster.jpg"]] },
  { id: 4, name: "Supplier Grid", eyebrow: "One request. More reach.", headline: <>Stop Calling<br />Every Supplier.</>, summary: "Avantia organizes the request and checks matching sources.", primary: "Start a Request", secondary: "Text My List", videos: [["/videos/avantia-story/04-supplier-send-products.mp4", "/videos/avantia-story/04-supplier-send-products-poster.jpg"], ["/videos/avantia-story/07-many-calls-one-job.mp4", "/videos/avantia-story/07-many-calls-one-job-poster.jpg"]] },
  { id: 5, name: "Delivery Mission", eyebrow: "From list to jobsite", headline: <>Materials.<br />Handled.</>, summary: "Quote review, supplier follow-up, and delivery coordination.", primary: "Send It to Avantia", secondary: "Upload Quote", videos: [["/videos/marketing/delivery-coordination.mp4", "/videos/marketing/delivery-coordination-poster.jpg"], ["/videos/avantia-story/05-designer-order-coordination.mp4", "/videos/avantia-story/05-designer-order-coordination-poster.jpg"], ["/videos/avantia-story/06-designer-materials-desk.mp4", "/videos/avantia-story/06-designer-materials-desk-poster.jpg"]] },
] as const

const reviewHeroPhotos = [
  { src: "/images/buildflow-retail/framing-materials-yard.webp", position: "object-[62%_center]", label: "Framing lumber and structural materials" },
  { src: "/images/buildflow-retail/framing-jobsite-v3.webp", position: "object-[56%_center]", label: "A Long Island-style house under construction" },
  { src: "/images/buildflow-retail/exterior.jpg", position: "object-[58%_center]", label: "Exterior building materials ready for delivery" },
] as const

const reviewServices = [
  {
    title: "Beat Your Quote",
    description: "Send an existing quote. We’ll check the material, total, and delivery.",
    href: "/beat-a-quote",
    image: "/images/buildflow-retail/orders.jpg",
    action: "Check my quote",
  },
  {
    title: "Send Any Material List",
    description: "A typed list, photo, plan, or file is enough to start.",
    href: "/request-quote",
    image: "/images/buildflow-retail/uploads.jpg",
    action: "Send my list",
  },
  {
    title: "Find a Specific Item",
    description: "Search the material catalog or send the exact item you need.",
    href: "/shop",
    image: "/images/buildflow-retail/find-specific-item-designer-v3.webp",
    action: "Find an item",
  },
] as const

function Actions({ primary, secondary, dark = false }: { primary: string; secondary: string; dark?: boolean }) {
  return <div className="relative -ml-2 mt-7 flex w-[calc(100vw-1.5rem)] max-w-none flex-col gap-2.5 sm:ml-0 sm:w-full sm:max-w-xl sm:flex-row">
    <Link href="/beat-a-quote" className={`inline-flex min-h-14 flex-1 items-center justify-center gap-2 px-6 text-sm font-bold transition ${dark ? "bg-slate-950 text-white hover:bg-blue-700" : "bg-white text-black hover:bg-[#e7b85d]"}`}><Upload className="h-4 w-4" />{primary}</Link>
    <Link href="/request-quote" className={`inline-flex min-h-14 flex-1 items-center justify-center gap-2 border px-6 text-sm font-bold backdrop-blur-md transition ${dark ? "border-slate-300 bg-white text-slate-950 hover:bg-slate-100" : "border-white/65 bg-black/28 text-white hover:bg-white hover:text-black"}`}><Send className="h-4 w-4" />{secondary}</Link>
  </div>
}

function HomepageReviewSections() {
  const videoCardRef = useRef<HTMLDivElement>(null)
  const [videoInView, setVideoInView] = useState(false)

  useEffect(() => {
    const card = videoCardRef.current
    if (!card) return

    const observer = new IntersectionObserver(
      ([entry]) => setVideoInView(entry.isIntersecting),
      { threshold: 0.35 },
    )
    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  return <>
    <div id="brands" className="border-y border-black/8 bg-[#f4efe6] py-3 text-slate-950">
      <ShopBrandShowcase compact transparent title="Materials from brands contractors know" />
      <p className="mx-auto -mt-0.5 flex max-w-[88rem] items-center justify-center gap-1.5 px-5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
        <MapPin className="h-3.5 w-3.5 text-[#1677ff]" aria-hidden="true" />
        Serving all 50 states
      </p>
    </div>

    <section className="overflow-hidden bg-[#f4efe6] px-5 py-14 text-slate-950 sm:px-8 sm:py-20" aria-labelledby="text-request-heading">
      <div className="mx-auto grid max-w-6xl items-center gap-9 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
        <div className="max-w-lg">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">From the jobsite</p>
          <h2 id="text-request-heading" className="mt-3 text-4xl font-semibold leading-[0.94] tracking-[-0.055em] text-balance sm:text-6xl">Send the list.<br />We’ll take it from there.</h2>
          <p className="mt-5 max-w-md text-sm font-semibold leading-6 text-slate-600 sm:text-base">Type it, photograph it, or attach the plan. Start with what you already have.</p>
          <Link href="/request-quote" className="mt-7 inline-flex min-h-12 items-center gap-2 border-b-2 border-slate-950 text-sm font-black text-slate-950 transition hover:border-[#1677ff] hover:text-[#1677ff]">
            Send a material request <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div
          ref={videoCardRef}
          className={`relative mx-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 p-2 shadow-[0_35px_90px_rgba(15,23,42,.2)] transition-[transform,opacity] duration-700 ease-out motion-reduce:transform-none ${videoInView ? "scale-100 opacity-100" : "scale-[0.965] opacity-90"}`}
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.55rem] bg-slate-900 sm:aspect-[16/10]">
            <video autoPlay muted loop playsInline preload="metadata" poster="/images/buildflow-retail/uploads.jpg" className="h-full w-full object-cover object-center" aria-label="A material request moving from a contractor's list through supplier comparison to jobsite delivery">
              <source src="/videos/homepage-material-process.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-2xl border border-white/20 bg-black/45 px-4 py-3 text-sm font-bold text-white shadow-lg backdrop-blur-md sm:inset-x-auto sm:bottom-5 sm:left-5">
              <MessageSquareText className="h-4 w-4 text-[#e7b85d]" aria-hidden="true" />
              Text a photo or material list
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="border-t border-black/8 bg-[#eef0f2] py-14 text-slate-950 sm:py-20" aria-labelledby="service-rail-heading">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1677ff]">Start with what you have</p>
        <div className="mt-2 flex items-end justify-between gap-6">
          <h2 id="service-rail-heading" className="max-w-2xl text-4xl font-semibold leading-[0.96] tracking-[-0.055em] text-balance sm:text-6xl">Three direct ways to start.</h2>
          <p className="hidden text-xs font-bold uppercase tracking-[0.14em] text-slate-500 sm:block">Swipe to explore →</p>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-7xl snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-5 [scrollbar-width:none] sm:gap-5 sm:px-8 [&::-webkit-scrollbar]:hidden">
        {reviewServices.map((service, index) => <Link key={service.title} href={service.href} className="group relative min-h-[27rem] w-[82vw] max-w-[23rem] shrink-0 snap-center overflow-hidden rounded-[1.5rem] bg-slate-950 text-white shadow-[0_22px_60px_rgba(15,23,42,.14)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1677ff]/30 sm:w-[calc((100%-2.5rem)/3)] sm:max-w-none">
          <Image src={service.image} alt="" fill sizes="(max-width: 640px) 82vw, 33vw" className="object-cover transition duration-700 ease-out group-hover:scale-[1.035]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.08)_15%,rgba(3,5,7,.2)_45%,rgba(3,5,7,.94)_100%)]" aria-hidden="true" />
          <span className="absolute left-5 top-5 inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-white/35 bg-black/25 px-2 text-xs font-black backdrop-blur-md">0{index + 1}</span>
          <div className="absolute inset-x-0 bottom-0 p-6">
            <h3 className="text-3xl font-semibold leading-[0.96] tracking-[-0.045em]">{service.title}</h3>
            <p className="mt-3 text-sm font-medium leading-6 text-white/72">{service.description}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#f1c66e]">{service.action}<ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" /></span>
          </div>
        </Link>)}
      </div>
    </section>
  </>
}

export function HomepageConceptPreview({ initialConceptId = 1, reviewOnly = false }: { initialConceptId?: number; reviewOnly?: boolean }) {
  const [conceptId, setConceptId] = useState(initialConceptId)
  const [videoIndex, setVideoIndex] = useState(0)
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [approved, setApproved] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const concept = concepts.find((entry) => entry.id === conceptId) ?? concepts[0]
  const [videoSource, posterSource] = concept.videos[videoIndex] ?? concept.videos[0]

  useEffect(() => { const video = videoRef.current; if (!video || paused) return; void video.play().catch(() => undefined) }, [videoSource, paused])

  useEffect(() => {
    if (!reviewOnly || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const interval = window.setInterval(() => {
      setHeroPhotoIndex((current) => (current + 1) % reviewHeroPhotos.length)
    }, 5600)
    return () => window.clearInterval(interval)
  }, [paused, reviewOnly])

  const togglePlayback = () => {
    if (reviewOnly) {
      setPaused((current) => !current)
      return
    }
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
    {!reviewOnly ? <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/80 px-3 py-2 backdrop-blur-xl sm:px-6"><div className="mx-auto flex max-w-7xl items-center gap-3">
      <p className="hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 sm:block">Choose a homepage</p>
      <nav aria-label="Homepage concepts" className="flex flex-1 items-center justify-center gap-1.5">{concepts.map((entry) => <button key={entry.id} type="button" onClick={() => { setConceptId(entry.id); setVideoIndex(0); setPaused(false); setApproved(null) }} className={`inline-flex h-10 min-w-10 items-center justify-center border text-sm font-bold transition ${conceptId === entry.id ? "border-white bg-white text-black" : "border-white/25 bg-black/25 text-white hover:border-white/60"}`} aria-label={`View homepage concept ${entry.id}`} aria-pressed={conceptId === entry.id}>{entry.id}</button>)}</nav>
      <button type="button" onClick={() => setApproved(concept.id)} className="inline-flex min-h-10 shrink-0 items-center gap-2 bg-[#1677ff] px-3 text-xs font-bold text-white sm:px-5 sm:text-sm"><Check className="h-4 w-4" /><span className="hidden sm:inline">Approve</span> #{concept.id}</button>
    </div></header> : null}

    <section className={`relative min-h-[100svh] overflow-hidden ${conceptId === 5 ? "bg-[#edf2f7] text-slate-950" : "bg-black"}`}>
      {reviewOnly ? <div className="absolute inset-y-0 right-0 h-full w-full overflow-hidden sm:w-[62%]" aria-label={reviewHeroPhotos[heroPhotoIndex].label} role="img">
        {reviewHeroPhotos.map((photo, index) => <Image
          key={photo.src}
          src={photo.src}
          alt=""
          fill
          priority={index === 0}
          sizes="(max-width: 640px) 100vw, 62vw"
          className={`object-cover brightness-[.42] contrast-[1.02] saturate-[.55] transition-[opacity,transform] duration-[1400ms] ease-out motion-reduce:transform-none motion-reduce:transition-none ${photo.position} ${index === heroPhotoIndex ? "scale-[1.035] opacity-100" : "scale-100 opacity-0"}`}
        />)}
      </div> : <video key={videoSource} ref={videoRef} src={videoSource} poster={posterSource} autoPlay muted playsInline preload="auto" onEnded={() => setVideoIndex((current) => (current + 1) % concept.videos.length)} className={`absolute object-cover ${conceptId === 2 ? "inset-y-0 right-0 h-full w-full sm:w-[62%]" : conceptId === 4 ? "inset-y-0 right-0 h-full w-full lg:w-[68%]" : conceptId === 5 ? "inset-x-4 bottom-5 top-24 h-[calc(100%-7.25rem)] w-[calc(100%-2rem)] rounded-[2rem] sm:inset-x-[38%] sm:w-[60%]" : "inset-0 h-full w-full scale-[1.015]"}`} aria-hidden="true" />}

      {conceptId === 1 ? <><div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.08)_40%,rgba(0,0,0,.84))]" /><div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pb-24 pt-24 sm:px-8 lg:px-12"><div className="max-w-3xl drop-shadow-[0_5px_28px_rgba(0,0,0,.65)]">{text}<Actions primary={concept.primary} secondary={concept.secondary} /><p className="mt-3 text-xs font-semibold text-white/65">No account. No obligation.</p></div></div></> : null}
      {conceptId === 2 ? <><div className="absolute inset-0 bg-[linear-gradient(90deg,#f4efe6_0%,#f4efe6_42%,rgba(244,239,230,.95)_58%,rgba(244,239,230,.36)_100%)]" /><div className="relative z-10 flex min-h-[100svh] items-center px-5 pt-16 text-slate-950 sm:w-[54%] sm:px-10 lg:px-16"><div className="max-w-2xl"><p className="mb-3 inline-flex border-b-2 border-slate-950 pb-2 text-xs font-black uppercase tracking-[.2em]">One request</p>{text}<Actions primary={concept.primary} secondary={concept.secondary} dark /><p className="mt-4 text-xs font-semibold text-slate-500">One business day review.</p></div></div></> : null}
      {conceptId === 3 ? <><div className="absolute inset-0 bg-black/45" /><div className="absolute inset-x-0 top-[18%] h-3 bg-amber-400" /><div className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-5 pt-20 text-center"><div className="max-w-5xl">{text}<div className="flex justify-center"><Actions primary={concept.primary} secondary={concept.secondary} /></div><p className="mt-4 font-mono text-xs uppercase tracking-[.15em] text-amber-300">Fast request intake · Human review</p></div></div></> : null}
      {conceptId === 4 ? <><div className="absolute inset-0 bg-[linear-gradient(90deg,#061d3b_0%,#061d3b_42%,rgba(6,29,59,.78)_66%,rgba(6,29,59,.18))]" /><div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(78,170,255,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(78,170,255,.3)_1px,transparent_1px)] [background-size:32px_32px]" /><div className="relative z-10 flex min-h-[100svh] items-center px-5 pt-16 sm:px-10 lg:w-1/2 lg:px-16"><div className="max-w-2xl border-l-4 border-sky-400 pl-5 sm:pl-8">{text}<Actions primary={concept.primary} secondary={concept.secondary} /><div className="mt-5 grid max-w-md grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-wide text-sky-200"><span className="border border-sky-300/25 p-2">Request</span><span className="border border-sky-300/25 p-2">Compare</span><span className="border border-sky-300/25 p-2">Deliver</span></div></div></div></> : null}
      {conceptId === 5 ? <><div className="absolute inset-0 bg-gradient-to-r from-[#edf2f7] via-[#edf2f7] to-transparent sm:w-[58%]" /><div className="relative z-10 flex min-h-[100svh] items-end px-5 pb-20 pt-24 sm:w-[50%] sm:items-center sm:px-10 lg:px-16"><div className="max-w-xl rounded-3xl bg-white/92 p-6 shadow-[0_25px_80px_rgba(15,23,42,.18)] backdrop-blur-xl sm:p-9">{text}<Actions primary={concept.primary} secondary={concept.secondary} dark /><p className="mt-4 text-xs font-bold text-slate-500">Local jobs · Real supplier follow-up</p></div></div></> : null}

      <button type="button" onClick={togglePlayback} className={`absolute bottom-5 right-5 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md ${conceptId === 5 ? "border-slate-300 bg-white/80 text-slate-950" : "border-white/40 bg-black/35 text-white"}`} aria-label={paused ? `Play ${reviewOnly ? "photos" : "video"}` : `Pause ${reviewOnly ? "photos" : "video"}`}>{paused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}</button>
      <div className="absolute bottom-7 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-1.5 sm:flex" aria-label={reviewOnly ? `Photo ${heroPhotoIndex + 1} of ${reviewHeroPhotos.length}` : `Video ${videoIndex + 1} of ${concept.videos.length}`}>{reviewOnly ? reviewHeroPhotos.map((photo, index) => <span key={photo.src} className={`h-1 rounded-full transition-all ${index === heroPhotoIndex ? "w-8 bg-slate-950" : "w-3 bg-slate-500/45"}`} />) : concept.videos.map(([source], index) => <span key={source} className={`h-1 rounded-full transition-all ${index === videoIndex ? `w-8 ${conceptId === 5 ? "bg-slate-950" : "bg-white"}` : `w-3 ${conceptId === 5 ? "bg-slate-400" : "bg-white/35"}`}`} />)}</div>
      <a href={reviewOnly ? "#brands" : "#concepts"} className={`absolute bottom-5 left-5 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md ${conceptId === 5 ? "border-slate-300 bg-white/80 text-slate-950" : "border-white/40 bg-black/35 text-white"}`} aria-label={reviewOnly ? "See more" : "See all five concepts"}><ChevronDown className="h-5 w-5" /></a>
    </section>

    {reviewOnly ? <HomepageReviewSections /> : null}
    {!reviewOnly ? <section id="concepts" className="bg-[#eef0f2] px-4 py-12 text-slate-950 sm:px-8 sm:py-16"><div className="mx-auto max-w-7xl"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0874d1]">Five real directions</p><h2 className="mt-2 text-3xl font-bold tracking-[-0.045em]">Different message. Different film. Different design.</h2></div><div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{concepts.map((entry) => <button key={entry.id} type="button" onClick={() => { setConceptId(entry.id); setVideoIndex(0); setPaused(false); setApproved(null); window.scrollTo({ top: 0, behavior: "smooth" }) }} className={`group overflow-hidden border text-left ${entry.id === 2 ? "bg-[#f4efe6]" : entry.id === 3 ? "bg-amber-400" : entry.id === 4 ? "bg-[#061d3b]" : entry.id === 5 ? "bg-white" : "bg-black"} ${conceptId === entry.id ? "border-[#1677ff] ring-2 ring-[#1677ff]" : "border-black/15"}`}><div className="relative aspect-[4/5] bg-cover bg-center" style={{ backgroundImage: `linear-gradient(180deg,transparent 20%,rgba(0,0,0,.86)),url(${entry.videos[0][1]})` }}><span className="absolute left-3 top-3 inline-flex h-8 w-8 items-center justify-center bg-white text-sm font-black text-black">{entry.id}</span><div className="absolute inset-x-3 bottom-4 text-white"><p className="text-[10px] font-bold uppercase tracking-wider text-white/65">{entry.name}</p><p className="mt-1 text-xl font-bold leading-[1.02] tracking-[-0.04em]">{entry.headline}</p></div></div></button>)}</div>{approved ? <div className="mt-6 border border-emerald-300 bg-emerald-50 px-4 py-4 text-sm font-bold text-emerald-900">Version {approved} selected. Tell Codex: “Approve homepage {approved}.”</div> : null}</div></section> : null}
  </main>
}
