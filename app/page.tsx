export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-start justify-center px-6 py-16 sm:px-10">
        <div className="mb-3 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.24em] text-emerald-300">
          LIVE BUILD DEMO
        </div>
        <div className="mb-4 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-sm text-slate-300">
          BuildFlow Supply
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          BuildFlow Supply
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
          AI-powered construction supply, takeoff, and ordering platform.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          Updated from Telegram in one clean step.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <button className="rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200">
            Start Project
          </button>
          <button className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10">
            Browse Materials
          </button>
        </div>
      </section>
    </main>
  );
}
