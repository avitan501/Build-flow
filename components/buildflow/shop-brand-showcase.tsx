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
    <section aria-labelledby="shop-brands-heading" className={`${compact ? "mt-0" : "mt-8"} border-y border-black/[0.06] bg-white`}>
      <div className={`mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-10 ${compact ? "py-8 sm:py-10" : "py-10 sm:py-14"}`}>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Trusted manufacturers</p>
          <h2 id="shop-brands-heading" className="mt-2 text-2xl font-semibold tracking-normal text-[#1d1d1f] sm:text-3xl">Brands we source</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6e6e73] sm:text-base">
            Tell us the brand, product, or specification you need. We will help find the right material for your project.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-2 border-l border-t border-slate-200 sm:grid-cols-4" data-testid="shop-brand-grid">
          {SHOP_BRANDS.map((brand) => (
            <div key={brand.name} className="flex min-h-20 items-center justify-center border-b border-r border-slate-200 bg-white px-4 py-4 sm:min-h-24">
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

      <div className="bg-[#0e2a4a] px-4 py-7 text-white sm:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <div>
            <h3 className="text-xl font-semibold tracking-normal">Need help finding something?</h3>
            <p className="mt-1 text-sm leading-6 text-white/70">Call us or text HELP and tell us what your project needs.</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
            <a href="tel:+19292077156" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[#0e2a4a] transition hover:bg-slate-100">
              Call us
            </a>
            <a href="sms:+19292077156?body=HELP" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 px-5 text-sm font-semibold text-white transition hover:bg-white/10">
              Text HELP
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
