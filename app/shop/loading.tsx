export default function ShopLoading() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-3 py-3 pb-28 text-slate-900 sm:px-6 sm:py-5 sm:pb-10 lg:px-8" aria-busy="true">
      <span className="sr-only">Loading shop</span>
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-3 h-8 w-64 max-w-full animate-pulse rounded-2xl bg-slate-200" />
          <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded-full bg-slate-100" />
          <div className="mt-5 flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-10 w-28 shrink-0 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="min-h-[228px] overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
              <div className="m-3 aspect-square animate-pulse rounded-[18px] bg-slate-100" />
              <div className="space-y-2 px-3 pb-3">
                <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200" />
                <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
                <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
