"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"

const coverageDots = [
  [15, 14], [14, 23], [13, 38], [15, 51], [17, 57], [21, 47], [24, 55], [27, 39], [24, 29], [36, 44],
  [32, 57], [45, 66], [46, 75], [42, 72], [42, 55], [48, 47], [47, 39], [54, 28], [61, 38], [56, 49],
  [52, 75], [57, 60], [64, 56], [70, 64], [80, 84], [75, 75], [76, 56], [80, 53], [82, 48], [84, 43],
  [85, 40], [87, 35], [89, 30], [91, 23], [80, 29], [79, 38], [68, 34], [73, 36], [66, 44], [62, 31], [93, 17],
] as const

export function CoverageScrollSection({ language = "en" }: { language?: "en" | "es" }) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let frame = 0
    const update = () => {
      frame = 0
      const rect = card.getBoundingClientRect()
      const viewportCenter = window.innerHeight / 2
      const cardCenter = rect.top + rect.height / 2
      const travel = viewportCenter + rect.height / 2
      const focus = Math.max(0, 1 - Math.abs(cardCenter - viewportCenter) / travel)
      const easedFocus = 1 - Math.pow(1 - focus, 2)

      card.style.setProperty("--coverage-scale", String(0.92 + easedFocus * 0.08))
      card.style.setProperty("--coverage-opacity", String(0.78 + easedFocus * 0.22))
    }
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", scheduleUpdate, { passive: true })
    window.addEventListener("resize", scheduleUpdate)
    return () => {
      window.removeEventListener("scroll", scheduleUpdate)
      window.removeEventListener("resize", scheduleUpdate)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section className="mt-5 overflow-hidden px-3 py-3 sm:px-5 sm:py-5" aria-labelledby="coverage-heading">
      <div
        ref={cardRef}
        data-testid="coverage-scroll-card"
        className="mx-auto grid max-w-[88rem] origin-center items-center gap-3 overflow-hidden rounded-[22px] border border-slate-200/70 bg-white px-5 py-5 opacity-[var(--coverage-opacity)] shadow-[0_12px_36px_rgba(15,23,42,0.06)] [transform:scale(var(--coverage-scale))] [will-change:transform,opacity] motion-reduce:transform-none motion-reduce:opacity-100 sm:px-7 sm:py-6 lg:grid-cols-[minmax(14rem,0.8fr)_minmax(0,1fr)]"
        style={{ "--coverage-scale": 0.92, "--coverage-opacity": 0.78 } as React.CSSProperties}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0066cc]">{language === "es" ? "En todo EE. UU." : "Across the U.S."}</p>
          <h2 id="coverage-heading" className="mt-1.5 text-xl font-semibold leading-tight text-[#071126] sm:text-2xl">{language === "es" ? "Servicio en 41 estados." : "Serving 41 states."}</h2>
          <p className="mt-2 max-w-md text-sm leading-5 text-slate-600">{language === "es" ? "Díganos dónde está el proyecto. Encontramos opciones cercanas." : "Tell us the job location. We find options nearby."}</p>
        </div>
        <div className="relative mx-auto aspect-[16/9] w-full max-w-xs overflow-hidden sm:max-w-sm" data-testid="coverage-map">
          <Image src="/images/buildflow-retail/us-coverage-map.webp" alt={language === "es" ? "Mapa de cobertura de Avantia Build en Estados Unidos" : "Map showing Avantia Build coverage across the United States"} fill sizes="(min-width: 640px) 24rem, 100vw" className="object-contain" />
          {coverageDots.map(([left, top]) => (
            <span
              key={`${left}-${top}`}
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[#0071e3] shadow-[0_0_0_2px_rgba(0,113,227,0.16)] sm:h-2.5 sm:w-2.5"
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
