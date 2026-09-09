import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-12 text-[#071126] sm:py-20">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Avantia Build · 404</p>
      <h1 className="mt-3 text-3xl font-semibold">This page is unavailable.</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Browse materials, search for a product, or send us your material list.</p>
      <form action="/shop" className="mt-6 flex gap-2">
        <label htmlFor="unavailable-search" className="sr-only">Search products</label>
        <input id="unavailable-search" type="search" name="q" placeholder="Search products" className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-300 px-3" />
        <button className="min-h-11 rounded-md bg-[#0066cc] px-4 text-sm font-semibold text-white">Search</button>
      </form>
      <nav aria-label="Available pages" className="mt-4 flex flex-wrap gap-3">
        <Link href="/shop" className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold">Shop</Link>
        <Link href="/request-quote" className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold">Material request</Link>
      </nav>
    </main>
  );
}
