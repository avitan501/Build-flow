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
  return (
    <section aria-labelledby="department-essentials-heading" className="py-3 sm:py-5">
      <h2 id="department-essentials-heading" className="mb-4 text-lg font-semibold text-slate-950 sm:text-xl">Department Essentials</h2>

      <div className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-8 sm:gap-x-5" data-testid="department-essentials">
        {data.items.map((item, index) => (
          <article key={item} className="min-w-0 text-center">
            <div
              role="img"
              aria-label={item}
              className="aspect-square w-full bg-white bg-no-repeat mix-blend-multiply"
              style={{
                backgroundImage: `url(${data.spriteUrl})`,
                backgroundPosition: SPRITE_POSITIONS[index],
                backgroundSize: "400% 200%",
              }}
            />
            <h3 className="mt-2 line-clamp-2 text-[11px] font-semibold leading-[14px] text-slate-900 sm:text-xs sm:leading-4">{item}</h3>
          </article>
        ))}
      </div>
    </section>
  )
}
