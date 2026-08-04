export default function CartLoading() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eaf4ff_0%,#f8fbff_42%,#ffffff_100%)] px-4 py-4 pb-28 text-slate-950 sm:px-8 sm:pb-10 lg:px-10 lg:pb-12" aria-busy="true">
      <span className="sr-only">Loading cart</span>
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-[0_18px_44px_rgba(148,163,184,0.14)]">
          <div className="h-3 w-24 animate-pulse rounded-full bg-sky-100" />
          <div className="mt-3 h-8 w-72 max-w-full animate-pulse rounded-2xl bg-slate-200" />
          <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded-full bg-slate-100" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_18px_42px_rgba(148,163,184,0.12)]">
                <div className="flex gap-4">
                  <div className="h-24 w-24 shrink-0 animate-pulse rounded-[18px] bg-slate-100 sm:w-28" />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="h-5 w-full max-w-sm animate-pulse rounded-full bg-slate-200" />
                    <div className="h-4 w-32 animate-pulse rounded-full bg-slate-100" />
                    <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </section>

          <aside className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_18px_44px_rgba(148,163,184,0.14)]">
            <div className="h-7 w-40 animate-pulse rounded-2xl bg-slate-200" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between gap-4">
                  <div className="h-4 w-24 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-4 w-16 animate-pulse rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
