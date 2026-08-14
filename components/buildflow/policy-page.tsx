import Link from "next/link"

type PolicySection = { title: string; paragraphs: string[] }

export function PolicyPage({ eyebrow, title, updated, introduction, sections }: { eyebrow: string; title: string; updated: string; introduction: string; sections: PolicySection[] }) {
  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 py-8 pb-28 text-slate-950 sm:px-6 sm:py-12 sm:pb-14">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-[#071126] px-5 py-7 text-white sm:px-8 sm:py-9">
          <Link href="/" className="text-sm font-semibold text-sky-200 hover:text-white">Back to Avantia Build</Link>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-300">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-2 text-xs text-slate-300">Last updated {updated}</p>
        </header>
        <div className="px-5 py-7 sm:px-8 sm:py-9">
          <p className="text-base leading-7 text-slate-700">{introduction}</p>
          <div className="mt-8 grid gap-7">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-bold text-slate-950">{section.title}</h2>
                <div className="mt-2 grid gap-3">
                  {section.paragraphs.map((paragraph) => <p key={paragraph} className="text-sm leading-6 text-slate-600">{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>
          <aside className="mt-8 rounded-lg border border-sky-200 bg-sky-50 px-4 py-4 text-sm leading-6 text-slate-700">
            Questions? Contact <a className="font-semibold text-[#0066cc]" href="mailto:office@build.avantiap.com">office@build.avantiap.com</a> or call <a className="font-semibold text-[#0066cc]" href="tel:+15169088319">(516) 908-8319</a>.
          </aside>
        </div>
      </article>
    </main>
  )
}
