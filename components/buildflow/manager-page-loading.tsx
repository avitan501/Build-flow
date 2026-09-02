export function ManagerPageLoading() {
  return (
    <main className="mx-auto w-full max-w-[96rem] p-4 sm:p-6" aria-label="Loading manager page" aria-busy="true">
      <div className="h-7 w-48 animate-pulse rounded-md bg-slate-200" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="mt-4 h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
    </main>
  );
}
