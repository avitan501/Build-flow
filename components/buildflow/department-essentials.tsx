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
    <section aria-labelledby="department-essentials-heading" className="border-y border-slate-200 bg-white py-4 sm:py-5">
      <h2 id="department-essentials-heading" className="mb-3 text-lg font-semibold text-slate-950">Department Essentials</h2>

      <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-8" data-testid="department-essentials">
        {data.items.map((item, index) => (
          <article key={item} className="min-w-0 bg-white text-center">
            <div
              role="img"
              aria-label={item}
              className="aspect-square w-full border border-slate-200 bg-white bg-no-repeat"
              style={{
                backgroundImage: `url(${data.spriteUrl})`,
                backgroundPosition: SPRITE_POSITIONS[index],
                backgroundSize: "400% 200%",
              }}
            />
            <h3 className="mt-1.5 line-clamp-2 text-[10px] font-semibold leading-3 text-slate-800 sm:text-[11px] sm:leading-[14px]">{item}</h3>
          </article>
        ))}
      </div>
    </section>
  )
}
