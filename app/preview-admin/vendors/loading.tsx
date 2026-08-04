export default function VendorsLoading() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-5 pb-28 text-slate-950 sm:px-6 lg:px-8" aria-busy="true">
      <span className="sr-only">Loading manager</span>
      <div className="mx-auto grid max-w-7xl gap-5">
        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
          <div className="h-3 w-28 animate-pulse rounded-full bg-sky-100" />
          <div className="mt-3 h-9 w-80 max-w-full animate-pulse rounded-2xl bg-slate-200" />
          <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded-full bg-slate-100" />
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
            <div className="h-6 w-44 animate-pulse rounded-2xl bg-slate-200" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
            <div className="h-6 w-56 animate-pulse rounded-2xl bg-slate-200" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
