import type { DepartmentEssentials as DepartmentEssentialsData } from "@/lib/department-essentials"

const SPRITE_POSITIONS = [
  "0% 0%",
  "33.333% 0%",
  "66.667% 0%",
  "100% 0%",
  "0% 100%",
  "33.333% 100%",
  "66.667% 100%",
  "100% 100%",
]

export function DepartmentEssentials({ data }: { data: DepartmentEssentialsData }) {
  const hasExtendedCatalog = data.items.length > 8

  return (
    <section aria-labelledby="department-essentials-heading" className="py-3 sm:py-5">
      <h2 id="department-essentials-heading" className="mb-4 text-lg font-semibold text-slate-950 sm:text-xl">Common materials</h2>

      <div
        className={hasExtendedCatalog
          ? "grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-5 sm:gap-x-6"
          : "grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-8 sm:gap-x-5"}
        data-testid="department-essentials"
      >
        {data.items.map((item, index) => {
          const name = typeof item === "string" ? item : item.name
          const imageUrl = typeof item === "string" ? data.spriteUrl : item.imageUrl

          return (
            <article key={name} className="min-w-0 text-center">
              <div
                role="img"
                aria-label={name}
                className="aspect-square w-full bg-white bg-no-repeat mix-blend-multiply"
                style={{
                  backgroundImage: `url(${imageUrl})`,
                  backgroundPosition: typeof item === "string" ? SPRITE_POSITIONS[index] : "center",
                  backgroundSize: typeof item === "string" ? "400% 200%" : "contain",
                }}
              />
              <h3 className="mt-2 line-clamp-2 text-[11px] font-semibold leading-[14px] text-slate-900 sm:text-xs sm:leading-4">{name}</h3>
            </article>
          )
        })}
      </div>
    </section>
  )
}
