import Link from "next/link"

export default function ThinsetCalculatorPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-4 pb-28 text-slate-900 sm:px-6 sm:py-5 sm:pb-10 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-4">
        <Link href="/shop/tile-work" className="w-fit text-sm font-bold text-sky-700">
          Back to Tile work
        </Link>
        <h1 className="text-[2rem] font-bold tracking-normal text-slate-950 sm:text-[2.4rem]">Thinset calculator</h1>
        <section className="rounded-[20px] border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm font-medium text-slate-500 shadow-[0_14px_34px_rgba(148,163,184,0.08)]">
          Calculator flow will be added here.
        </section>
      </section>
    </main>
  )
}
