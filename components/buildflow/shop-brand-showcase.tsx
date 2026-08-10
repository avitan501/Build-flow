import Image from "next/image"

const SHOP_BRANDS = [
  { name: "Andersen", logo: "/images/brands/andersen.svg" },
  { name: "GAF", logo: "/images/brands/gaf.svg" },
  { name: "Pella", logo: "/images/brands/pella.png" },
  { name: "QUIKRETE", logo: "/images/brands/quikrete.gif" },
  { name: "USG", logo: "/images/brands/usg.svg" },
  { name: "Georgia-Pacific", logo: "/images/brands/georgia-pacific.svg" },
  { name: "TimberTech", logo: "/images/brands/timbertech.svg" },
  { name: "Trex", logo: "/images/brands/trex.svg" },
]

export function ShopBrandShowcase({ compact = false }: { compact?: boolean }) {
  return (
    <section aria-labelledby="shop-brands-heading" className={`${compact ? "mx-auto mt-0 max-w-6xl overflow-hidden rounded-[28px] border border-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]" : "mt-8 border-y border-black/[0.06]"} bg-white`}>
      <div className={`mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-10 ${compact ? "py-6 sm:py-8" : "py-10 sm:py-14"}`}>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Trusted manufacturers</p>
          <h2 id="shop-brands-heading" className="mt-2 text-2xl font-semibold tracking-normal text-[#1d1d1f] sm:text-3xl">Brands we source</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6e6e73] sm:text-base">
            Tell us the brand, product, or specification you need. We will help find the right material for your project.
          </p>
        </div>

        <div className={`${compact ? "mt-5 gap-2 sm:gap-3" : "mt-7 border-l border-t border-slate-200"} grid grid-cols-2 sm:grid-cols-4`} data-testid="shop-brand-grid">
          {SHOP_BRANDS.map((brand) => (
            <div key={brand.name} className={`flex min-h-20 items-center justify-center bg-white px-4 py-4 sm:min-h-24 ${compact ? "rounded-2xl border border-slate-200 shadow-sm" : "border-b border-r border-slate-200"}`}>
              <div className="relative h-9 w-full max-w-32 sm:h-10">
                <Image src={brand.logo} alt={`${brand.name} logo`} fill sizes="(max-width: 640px) 38vw, 160px" loading="eager" className="object-contain" />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
          Brand availability varies. All trademarks belong to their respective owners.
        </p>
      </div>

      <div className="bg-[#0e2a4a] px-4 py-4 text-white sm:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <div>
            <h3 className="text-base font-semibold tracking-normal">Need help finding something?</h3>
            <p className="mt-0.5 text-xs leading-5 text-white/70">Call or text HELP with what you need.</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
            <a href="tel:+19292077156" className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 text-xs font-semibold text-[#0e2a4a] transition hover:bg-slate-100">
              Call us
            </a>
            <a href="sms:+19292077156?body=HELP" className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/35 px-4 text-xs font-semibold text-white transition hover:bg-white/10">
              Text HELP
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
