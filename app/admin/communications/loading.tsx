export default function CommunicationsLoading() {
  return (
    <main className="h-[calc(100dvh-4rem)] bg-[#f5f5f7] p-2 sm:p-4 lg:h-screen lg:px-6">
      <div className="mx-auto grid h-full max-w-[96rem] animate-pulse overflow-hidden rounded-lg border border-slate-200 bg-white md:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="border-r border-slate-200 p-3">
          <div className="h-6 w-24 rounded bg-slate-200" />
          <div className="mt-4 h-10 rounded bg-slate-100" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-14 rounded bg-slate-100" />)}
          </div>
        </div>
        <div className="hidden p-6 md:block"><div className="h-16 rounded bg-slate-100" /><div className="mt-8 h-28 w-2/3 rounded bg-slate-100" /></div>
      </div>
    </main>
  )
}
