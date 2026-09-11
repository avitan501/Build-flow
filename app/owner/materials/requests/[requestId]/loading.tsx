export default function RequestLoading() {
  return <section role="status" aria-live="polite" className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
    <p className="text-sm font-semibold">Loading request…</p>
    <div aria-hidden="true" className="mt-5 space-y-3"><div className="h-8 w-2/3 rounded bg-slate-100" /><div className="h-24 rounded-xl bg-slate-100" /><div className="h-24 rounded-xl bg-slate-100" /></div>
  </section>;
}
