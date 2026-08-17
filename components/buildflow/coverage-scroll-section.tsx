"use client"

import Image from "next/image"

const coverageDots = [
  [15, 14], [14, 23], [13, 38], [15, 51], [17, 57], [21, 47], [24, 55], [27, 39], [24, 29], [36, 44],
  [32, 57], [45, 66], [46, 75], [42, 72], [42, 55], [48, 47], [47, 39], [54, 28], [61, 38], [56, 49],
  [52, 75], [57, 60], [64, 56], [70, 64], [80, 84], [75, 75], [76, 56], [80, 53], [82, 48], [84, 43],
  [85, 40], [87, 35], [89, 30], [91, 23], [80, 29], [79, 38], [68, 34], [73, 36], [66, 44], [62, 31], [93, 17],
] as const

export function CoverageScrollSection({ language = "en" }: { language?: "en" | "es" }) {
  return (
    <section className="overflow-hidden border-y border-slate-200 bg-white px-4 py-2.5 sm:px-5 sm:py-3" aria-labelledby="coverage-heading">
      <div
        data-testid="coverage-scroll-card"
        className="mx-auto grid max-w-[88rem] grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-3 sm:grid-cols-[minmax(14rem,1fr)_11rem]"
      >
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#0066cc]">{language === "es" ? "En todo EE. UU." : "Across the U.S."}</p>
          <h2 id="coverage-heading" className="mt-0.5 text-base font-semibold leading-tight text-[#071126] sm:text-lg">{language === "es" ? "Servicio en 41 estados." : "Serving 41 states."}</h2>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500 sm:text-xs">{language === "es" ? "Encontramos opciones cerca de su obra." : "We find options near your jobsite."}</p>
        </div>
        <div className="relative aspect-[16/9] w-full overflow-hidden" data-testid="coverage-map">
          <Image src="/images/buildflow-retail/us-coverage-map.webp" alt={language === "es" ? "Mapa de cobertura de Avantia Build en Estados Unidos" : "Map showing Avantia Build coverage across the United States"} fill sizes="(min-width: 640px) 11rem, 7.5rem" className="object-contain" />
          {coverageDots.map(([left, top]) => (
            <span
              key={`${left}-${top}`}
              className="absolute h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[#0071e3] shadow-[0_0_0_1px_rgba(0,113,227,0.16)] sm:h-1.5 sm:w-1.5"
              style={{ left: `${left}%`, top: `${top}%` }}
              data-testid="coverage-dot"
              aria-hidden="true"
            />
          ))}
          <span className="sr-only">{coverageDots.length} coverage locations shown.</span>
        </div>
      </div>
    </section>
  )
}
