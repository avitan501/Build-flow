"use client"

import Image from "next/image"
import { Pause, Play } from "lucide-react"
import { useState } from "react"

import { ShopTranslationBoundary } from "@/components/buildflow/shop-language-provider"

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

export function ShopBrandShowcase({ compact = false, transparent = false, title = "Shop Our Brands" }: { compact?: boolean; transparent?: boolean; title?: string }) {
  const [paused, setPaused] = useState(false)

  return (
    <ShopTranslationBoundary>
    <section aria-labelledby="shop-brands-heading" className={`${compact ? "mx-auto max-w-[88rem] overflow-hidden" : "mt-8"} ${transparent ? "bg-transparent" : "bg-white"}`}>
      <div className={`mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-10 ${compact ? "py-2.5 sm:py-3" : "py-8 sm:py-10"}`}>
        <div className="flex items-center justify-center gap-2 text-center">
          <h2 id="shop-brands-heading" className={`${compact ? "text-sm sm:text-base font-medium text-slate-500" : "text-2xl sm:text-3xl font-semibold text-[#1d1d1f]"} tracking-normal`}>{title}</h2>
          <button
            type="button"
            aria-label={paused ? "Play brand logos" : "Pause brand logos"}
            title={paused ? "Play brand logos" : "Pause brand logos"}
            onClick={() => setPaused((current) => !current)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
          >
            {paused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        </div>

        <div className={`${compact ? "mt-2" : "mt-6"} brand-marquee`} data-testid="shop-brand-grid">
          <div className="brand-marquee-track" style={{ animationPlayState: paused ? "paused" : "running" }}>
            {[0, 1].map((groupIndex) => (
              <div key={groupIndex} className="brand-marquee-group" aria-hidden={groupIndex === 1}>
                {SHOP_BRANDS.map((brand) => (
                  <div key={`${groupIndex}-${brand.name}`} className={`${compact ? "h-10 w-24 sm:h-12 sm:w-32" : "h-20 w-36 sm:h-24 sm:w-44"} flex shrink-0 items-center justify-center px-3 sm:px-4`}>
                    <div className={`${compact ? "h-6 max-w-20 sm:h-7 sm:max-w-24" : "h-9 max-w-28 sm:h-10 sm:max-w-32"} relative w-full`}>
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
    </ShopTranslationBoundary>
  )
}
