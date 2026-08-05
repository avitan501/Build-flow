import Image from "next/image"

import type { DepartmentEssentials as DepartmentEssentialsData } from "@/lib/department-essentials"

export function DepartmentEssentials({ data }: { data: DepartmentEssentialsData }) {
  return (
    <section aria-labelledby="department-essentials-heading" className="border-y border-slate-200 bg-white py-6 sm:py-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Commonly requested</p>
          <h2 id="department-essentials-heading" className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">Department Essentials</h2>
        </div>
        <span className="hidden text-xs font-medium text-slate-400 sm:block">Add any item to a project request</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8" data-testid="department-essentials">
        {data.items.map((item, index) => (
          <article key={item} className="min-w-0 border border-slate-200 bg-white p-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
              <Image src={data.imageUrl} alt="" fill sizes="(max-width: 640px) 44vw, (max-width: 1024px) 22vw, 130px" className="object-cover" style={{ objectPosition: `${20 + (index % 4) * 20}% center` }} />
            </div>
            <h3 className="mt-2 text-[13px] font-semibold leading-4 text-slate-900">{item}</h3>
          </article>
        ))}
      </div>
    </section>
  )
}
