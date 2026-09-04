"use client"

import { Check, Clipboard, ExternalLink, FileText, MessageSquareText, Play, ShieldCheck, Video } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { approvedStoryVideos, legacyMarketingInventory, marketingPageInventory, type AvantiaMediaAudience } from "@/lib/avantia-media-library"
import { auraShareVideos, buildAuraShareVideoCaption } from "@/lib/aura/share-videos"

type AudienceFilter = "All" | AvantiaMediaAudience

const audienceFilters: AudienceFilter[] = ["All", "Contractors", "Designers", "Suppliers", "General"]

function draftHref(message: string) {
  return `/admin/communications?channel=sms&draft=${encodeURIComponent(message)}`
}
function StatusPill({ status }: { status: "Approved" | "Internal" | "Needs review" }) {
  const tone = status === "Approved"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : status === "Internal"
      ? "border-sky-200 bg-sky-50 text-sky-800"
      : "border-amber-200 bg-amber-50 text-amber-800"
  return <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${tone}`}>{status}</span>
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return <button type="button" onClick={() => void copy()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 transition-[border-color,color] hover:border-sky-300 hover:text-sky-800"><span className="inline-flex h-5 w-5 items-center justify-center">{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Clipboard className="h-4 w-4" />}</span>{copied ? "Copied" : label}</button>
}

export function MediaMessagesLibrary() {
  const [audience, setAudience] = useState<AudienceFilter>("All")
  const filteredStories = useMemo(() => approvedStoryVideos.filter((item) => audience === "All" || item.audience === audience), [audience])
  const currentShareVideos = useMemo(() => auraShareVideos.map((video) => ({
    ...video,
    audience: "General" as const,
    caption: buildAuraShareVideoCaption(video),
  })).filter((item) => audience === "All" || item.audience === audience), [audience])
  const filteredPages = useMemo(() => marketingPageInventory.filter((item) => audience === "All" || item.audience === audience), [audience])
  const filteredReview = useMemo(() => legacyMarketingInventory.filter((item) => audience === "All" || item.audience === audience), [audience])

  return <div className="min-h-screen bg-[#f3f3f1] text-slate-950">
    <header className="border-b border-slate-800 bg-[#071126] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-7 sm:py-8">
        <Link href="/admin/ai-tools" className="inline-flex min-h-11 items-center text-xs font-bold text-sky-300 hover:text-white">← Manager Tools</Link>
        <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ff8a3d]">Approved media desk</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">Media &amp; Messages</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Preview approved assets, copy wording, or open an editable draft. Nothing sends from this page.</p>
          </div>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/15 bg-white/15">
            <div className="bg-[#071126] p-3"><strong className="block text-2xl">11</strong><span className="text-[10px] text-slate-400">current videos</span></div>
            <div className="bg-[#071126] p-3"><strong className="block text-2xl">6</strong><span className="text-[10px] text-slate-400">current pages</span></div>
            <div className="bg-[#071126] p-3"><strong className="block text-2xl">7</strong><span className="text-[10px] text-slate-400">need review</span></div>
          </div>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-7 sm:py-8">
      <section className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-[#f3f3f1]/95 px-4 py-3 backdrop-blur sm:-mx-7 sm:px-7" aria-label="Audience filters">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {audienceFilters.map((item) => <button key={item} type="button" onClick={() => setAudience(item)} className={`min-h-11 shrink-0 rounded-full px-4 text-xs font-bold transition-colors ${audience === item ? "bg-slate-950 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>{item}</button>)}
        </div>
      </section>

      <section className="mt-6" aria-labelledby="approved-story-heading">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-700">Current package</p><h2 id="approved-story-heading" className="mt-1 text-2xl font-black tracking-tight">Approved audience stories</h2></div>
          <span className="hidden text-xs font-semibold text-slate-500 sm:block">Video + poster + captions + exact voiceover</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredStories.map((story) => <article key={story.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.06)]">
            <div className="relative aspect-video bg-slate-950">
              <video controls playsInline preload="none" poster={story.poster} className="h-full w-full object-contain" aria-label={story.title}>
                <source src={story.src} type="video/mp4" />
                <track src={story.captions} kind="captions" srcLang="en" label="English" default />
              </video>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">{story.audience}</p><h3 className="mt-1 text-lg font-black leading-6">{story.title}</h3></div><StatusPill status="Approved" /></div>
              <p className="mt-2 text-xs font-semibold text-slate-500">{story.label}</p>
              <details className="mt-3 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-bold text-slate-700">Exact approved voiceover</summary><p className="mt-2 text-xs leading-5 text-slate-600">{story.transcript}</p></details>
              <div className="mt-3 grid grid-cols-2 gap-2"><CopyButton text={story.transcript} label="Copy words" /><Link href={draftHref(story.transcript)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white"><MessageSquareText className="h-4 w-4" />Open draft</Link></div>
              <div className="mt-3 border-t border-slate-100 pt-3 text-[10px] leading-4 text-slate-500"><p><strong className="text-slate-700">Source:</strong> {story.source}</p><p><strong className="text-slate-700">Version:</strong> {story.version}</p></div>
            </div>
          </article>)}
        </div>
      </section>

      {currentShareVideos.length ? <section className="mt-10" aria-labelledby="share-heading">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">Existing contact menu</p><h2 id="share-heading" className="mt-1 text-2xl font-black tracking-tight">Current quick-share videos</h2></div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">{currentShareVideos.map((video) => <article key={video.id} className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-[13rem_minmax(0,1fr)]"><video controls playsInline preload="none" src={video.path} className="aspect-video h-full min-h-44 w-full bg-slate-950 object-contain sm:aspect-auto" /><div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">General · {video.durationLabel}</p><h3 className="mt-1 text-lg font-black">{video.title}</h3></div><StatusPill status="Approved" /></div><details className="mt-3 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-bold">Exact current caption</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{video.caption}</p></details><div className="mt-3 grid grid-cols-2 gap-2"><CopyButton text={video.caption} label="Copy caption" /><Link href={draftHref(video.caption)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white"><MessageSquareText className="h-4 w-4" />Open draft</Link></div><p className="mt-3 text-[10px] text-slate-500"><strong>Source:</strong> production contact share menu · <strong>Version:</strong> current</p></div></article>)}</div>
      </section> : null}

      <section className="mt-10" aria-labelledby="pages-heading">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c55312]">Pages &amp; campaigns</p><h2 id="pages-heading" className="mt-1 text-2xl font-black tracking-tight">Price-checking and marketing destinations</h2></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filteredPages.map((page) => <article key={page.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#c55312]"><FileText className="h-5 w-5" /></span><StatusPill status={page.status} /></div><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{page.audience}</p><h3 className="mt-1 text-lg font-black">{page.title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{page.source} · {page.version}</p>{page.message ? <details className="mt-3 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-bold">Exact matching message</summary><p className="mt-2 text-xs leading-5 text-slate-600">{page.message}</p></details> : <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">No matching outbound message is approved in the repository.</p>}<div className="mt-3 flex flex-wrap gap-2"><Link href={page.href} target="_blank" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-bold"><ExternalLink className="h-4 w-4" />Open page</Link>{page.message ? <><CopyButton text={page.message} /><Link href={draftHref(page.message)} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-950 px-3 text-xs font-bold text-white">Draft</Link></> : null}</div></article>)}</div>
      </section>

      {filteredReview.length ? <details className="mt-10 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60">
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 sm:px-5"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><Video className="h-5 w-5" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">Repository marketing drafts</strong><span className="block text-xs text-amber-900/70">Present on disk, but not proven approved or emailed</span></span><span className="text-xs font-bold text-amber-800">{filteredReview.length}</span></summary>
        <div className="grid gap-2 border-t border-amber-200 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">{filteredReview.map((item) => <article key={item.id} className="rounded-xl border border-amber-200 bg-white p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-800">{item.audience}</p><h3 className="mt-1 text-sm font-black">{item.title}</h3></div><StatusPill status="Needs review" /></div><p className="mt-2 text-xs leading-5 text-slate-600">{item.text}</p><div className="mt-3 flex gap-2"><a href={item.src} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 text-xs font-bold"><Play className="h-3.5 w-3.5" />Preview</a><CopyButton text={item.text} /></div><p className="mt-2 text-[10px] text-slate-500">Source: repository `/public/videos/marketing` · version not approved</p></article>)}</div>
      </details> : null}

      <aside className="mt-8 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>Safe handoff:</strong> Open draft only prefills the existing Communications composer. You still choose the person, review the wording, attach media if needed, and press Send yourself. Repository history proves the assets above exist; it does not prove which files were delivered by email or remain accessible in an old Drive folder.</div></aside>
    </main>
  </div>
}
