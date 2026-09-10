export default function BuildMapLoading() {
  return (
    <main className="min-h-screen bg-[#f5f5f7] px-3 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[96rem] animate-pulse">
        <div className="h-8 w-44 rounded bg-slate-200" />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 rounded-xl bg-white" />)}
        </div>
        <div className="mt-5 h-14 rounded-xl bg-white" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-16 rounded-xl bg-white" />)}
        </div>
      </div>
    </main>
  )
}
