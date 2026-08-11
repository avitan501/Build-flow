import Image from "next/image"

const SHOP_BRANDS = [
  { name: "Andersen", logo: "/images/brands/andersen.svg", scale: "scale-95" },
  { name: "GAF", logo: "/images/brands/gaf.svg", scale: "scale-110" },
  { name: "Pella", logo: "/images/brands/pella.png", scale: "scale-125" },
  { name: "QUIKRETE", logo: "/images/brands/quikrete.gif", scale: "scale-95" },
  { name: "USG", logo: "/images/brands/usg.svg", scale: "scale-95" },
  { name: "Georgia-Pacific", logo: "/images/brands/georgia-pacific.svg", scale: "scale-105" },
  { name: "TimberTech", logo: "/images/brands/timbertech.svg", scale: "scale-95" },
  { name: "Trex", logo: "/images/brands/trex.svg", scale: "scale-75" },
]

export function ShopBrandShowcase({ compact = false, transparent = false }: { compact?: boolean; transparent?: boolean }) {
  return (
    <section aria-labelledby="shop-brands-heading" className={`${compact ? "mx-auto max-w-[88rem] overflow-hidden" : "mt-8"} ${transparent ? "bg-transparent" : "bg-white"}`}>
      <div className={`mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-10 ${compact ? "py-3 sm:py-4" : "py-8 sm:py-10"}`}>
        <div className="text-center">
          <h2 id="shop-brands-heading" className={`${compact ? "text-sm sm:text-base font-medium text-slate-500" : "text-2xl sm:text-3xl font-semibold text-[#1d1d1f]"} tracking-normal`}>Shop Our Brands</h2>
        </div>

        <div className={`${compact ? "mt-3" : "mt-6"} brand-marquee`} data-testid="shop-brand-grid">
          <div className="brand-marquee-track">
            {[0, 1].map((groupIndex) => (
              <div key={groupIndex} className="brand-marquee-group" aria-hidden={groupIndex === 1}>
                {SHOP_BRANDS.map((brand) => (
                  <div key={`${groupIndex}-${brand.name}`} className={`${compact ? "h-12 w-28 sm:h-14 sm:w-36" : "h-20 w-36 sm:h-24 sm:w-44"} flex shrink-0 items-center justify-center px-3 sm:px-4`}>
                    <div className={`${compact ? "h-7 max-w-24 sm:h-8 sm:max-w-28" : "h-9 max-w-28 sm:h-10 sm:max-w-32"} relative w-full`}>
                      <Image
                        src={brand.logo}
                        alt={groupIndex === 0 ? `${brand.name} logo` : ""}
                        fill
                        sizes="176px"
                        loading="eager"
                        className={`object-contain ${brand.scale}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
