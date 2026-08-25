import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Boxes, ChevronDown } from "lucide-react"

const DEPARTMENT_STORIES = [
  {
    title: "Frame & Structure",
    description: "Everything that carries the building.",
    items: [
      { title: "Framing systems", detail: "Lumber, layouts, takeoffs, and full framing packages.", href: "/shop/framing", image: "/images/buildflow-retail/framing-materials-yard.webp", alt: "Framing lumber organized at a professional material yard" },
      { title: "Lumber & plywood", detail: "Dimensional lumber, sheathing, panels, and engineered wood.", href: "/shop/framing", image: "/images/buildflow-retail/lumber.jpg", alt: "Lumber and plywood staged for residential construction" },
      { title: "Structural hardware", detail: "Hangers, fasteners, adhesives, connectors, and anchors.", href: "/shop/framing", image: "/images/shop-showroom/professional/structural-hardware-v1.webp", alt: "Structural hardware being installed on heavy timber framing" },
    ],
  },
  {
    title: "Power, Water & Comfort",
    description: "The systems working behind every finished wall.",
    items: [
      { title: "Electrical", detail: "Wire, panels, boxes, fittings, and rough-in material.", href: "/shop/electrical", image: "/images/shop-showroom/categories/cinematic-rough-in.webp", alt: "Electrical and plumbing trades working inside a framed residence" },
      { title: "Plumbing", detail: "Pipe, valves, drainage, fixtures, and water systems.", href: "/request-quote?request=plumbing", image: "/images/buildflow-retail/roughIn.jpg", alt: "Organized plumbing and electrical rough-in material" },
      { title: "Lighting", detail: "Recessed, decorative, task, and exterior lighting.", href: "/request-quote?request=lighting", image: "/images/shop-showroom/professional/architectural-lighting-v1.webp", alt: "Architectural lighting being installed in a modern residence" },
      { title: "Insulation", detail: "Thermal, acoustic, batt, board, and related supplies.", href: "/request-quote?request=insulation", image: "/images/shop-showroom/professional/insulation-installation-v1.webp", alt: "Mineral wool insulation being installed in residential framing" },
    ],
  },
  {
    title: "Walls & Surfaces",
    description: "Build the room, then finish what people see.",
    items: [
      { title: "Drywall", detail: "Board, compound, tape, bead, screws, and accessories.", href: "/shop/sheet-rock", image: "/images/shop-showroom/professional/drywall-installation-v1.webp", alt: "Professional drywall crew installing gypsum board" },
      { title: "Tile", detail: "Tile, mortar, grout, waterproofing, and backer board.", href: "/shop/tile-work", image: "/images/shop-showroom/professional/tile-installation-v1.webp", alt: "Large-format porcelain tile being installed precisely" },
      { title: "Interior finishes", detail: "The materials that bring completed rooms together.", href: "/request-quote?request=material-list", image: "/images/shop-showroom/professional/interior-finishes-v1.webp", alt: "Finish carpenter installing refined interior millwork" },
    ],
  },
  {
    title: "Floors, Doors & Millwork",
    description: "The details that make every room feel complete.",
    items: [
      { title: "Flooring", detail: "Hardwood, engineered wood, vinyl, and transitions.", href: "/shop/wood-floor", image: "/images/buildflow-retail/flooring-department.webp", alt: "Flooring material prepared for a residential installation" },
      { title: "Doors & trim", detail: "Doors, jambs, casing, baseboard, crown, and hardware.", href: "/shop/door-and-molding", image: "/images/buildflow-retail/door-molding-department.webp", alt: "Interior doors, trim, casing, and molding material" },
      { title: "Custom millwork", detail: "Special profiles, finish carpentry, and made-to-order details.", href: "/shop/door-and-molding", image: "/images/buildflow-retail/millwork.jpg", alt: "Custom architectural millwork in a residential interior" },
    ],
  },
  {
    title: "Kitchen & Appliances",
    description: "Plan the package. Coordinate every finish.",
    items: [
      { title: "Kitchen packages", detail: "Plans, cabinetry, layouts, finishes, and project review.", href: "/shop/kitchen", image: "/images/shop-showroom/categories/cinematic-kitchen.webp", alt: "Cabinet installers working in a premium residential kitchen" },
      { title: "Cabinetry", detail: "Builder packages, custom layouts, doors, and hardware.", href: "/shop/kitchen", image: "/images/materials/photos/cabinets.jpg", alt: "Contemporary residential cabinetry and finish samples" },
      { title: "Appliances", detail: "Reliable appliance packages for homes and rental units.", href: "/shop/appliances", image: "/images/materials/photos/appliances.jpg", alt: "Residential kitchen appliance package" },
    ],
  },
  {
    title: "Exterior Envelope",
    description: "Keep the weather out and the building protected.",
    items: [
      { title: "Siding & cladding", detail: "Panels, trim, channels, starter strips, and fasteners.", href: "/shop/siding", image: "/images/shop-showroom/categories/cinematic-exterior-envelope.webp", alt: "Workers installing siding and the exterior envelope of a modern residence" },
      { title: "Roofing", detail: "Shingles, membranes, flashing, vents, and accessories.", href: "/shop/roofing", image: "/images/buildflow-retail/roofing-department.webp", alt: "Roofing materials installed on a residential project" },
      { title: "Windows", detail: "New-construction and replacement window packages.", href: "/shop/window", image: "/images/buildflow-retail/windows-department.webp", alt: "Residential windows and opening installation material" },
      { title: "Weatherproofing", detail: "Barriers, flashing, sealants, exterior trim, and protection.", href: "/shop/exterior", image: "/images/buildflow-retail/exterior.jpg", alt: "Residential exterior weatherproofing work" },
    ],
  },
  {
    title: "Concrete & Masonry",
    description: "Foundation, structure, and bulk jobsite material.",
    items: [
      { title: "Concrete & block", detail: "Concrete, cement, block, mortar, and reinforcement.", href: "/shop/concrete-masonry", image: "/images/shop-showroom/categories/cinematic-concrete-masonry.webp", alt: "Masons building a residential concrete block foundation" },
      { title: "Bulk materials", detail: "Sand, stone, aggregate, and one-yard delivery bags.", href: "/shop/concrete-masonry", image: "/images/materials/photos/concrete.jpg", alt: "Bulk concrete and masonry materials at a construction site" },
      { title: "Site preparation", detail: "Forms, rebar, mesh, anchors, and masonry tools.", href: "/shop/concrete-masonry", image: "/images/materials/products-real/concrete-form-plywood-real.jpg", alt: "Concrete forming material prepared for foundation work" },
    ],
  },
  {
    title: "Deals & Liquidation",
    description: "Limited quantities. Clear material. Better value.",
    items: [
      { title: "Liquidation materials", detail: "Curated surplus and limited-quantity material ready for the next project.", href: "/shop?category=Liquidation", image: "/images/shop-showroom/professional/liquidation-materials-v1.webp", alt: "Organized pallets of premium liquidation construction materials" },
      { title: "Panel deals", detail: "Discounted sheet goods and panels while current stock lasts.", href: "/shop?category=Liquidation", image: "/images/liquidation/mdf-board-24x96-half-inch-2.webp", alt: "Closeout MDF panel material" },
      { title: "Tile opportunities", detail: "Limited tile lots for projects that can use available sizes and finishes.", href: "/shop?category=Liquidation", image: "/images/materials/catalog/til-001.jpg", alt: "Tile available as a limited material lot" },
    ],
  },
] as const

export function ShopShowroom({ embedded = false }: { embedded?: boolean }) {
  const Root = embedded ? "section" : "main"
  const CollectionRoot = embedded ? "details" : "div"

  return (
    <Root className={`block overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] ${embedded ? "px-3 py-4 sm:px-5 sm:py-7" : "py-3 sm:py-5"}`} aria-label={embedded ? "Shop materials" : undefined}>
      <CollectionRoot className={embedded ? "group/showroom mx-auto block w-full max-w-[110rem] overflow-hidden rounded-[8px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,.07)]" : "contents"}>
        {embedded ? (
          <summary className="flex min-h-[84px] cursor-pointer list-none items-center gap-4 px-5 py-4 outline-none transition hover:bg-black/[.025] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0071e3] [&::-webkit-details-marker]:hidden sm:min-h-[100px] sm:px-8">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[#0066cc] sm:h-12 sm:w-12">
              <Boxes className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xl font-semibold leading-tight sm:text-3xl">Shop Materials</span>
              <span className="mt-1 block truncate text-sm text-black/50 sm:text-base">Browse eight construction departments</span>
            </span>
            <span className="hidden shrink-0 text-sm font-semibold text-[#0066cc] sm:block">View departments</span>
            <ChevronDown className="h-5 w-5 shrink-0 text-black/55 transition-transform duration-300 group-open/showroom:rotate-180" aria-hidden="true" />
          </summary>
        ) : null}

        <div className={embedded ? "border-t border-black/10 bg-[#f5f5f7] py-2 sm:py-3" : "contents"}>
        {DEPARTMENT_STORIES.map((department, departmentIndex) => (
        <details
          id={department.title.toLowerCase().replaceAll(" & ", "-").replaceAll(", ", "-").replaceAll(" ", "-")}
          key={department.title}
          className="group/department mx-auto w-[calc(100%-1rem)] max-w-[110rem] scroll-mt-20 border-b border-black/10 bg-white first:rounded-t-[8px] last:rounded-b-[8px] last:border-b-0 sm:w-[calc(100%-2rem)]"
        >
          <summary className="flex min-h-[72px] cursor-pointer list-none items-center gap-4 px-4 py-3 outline-none transition hover:bg-black/[.025] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0071e3] [&::-webkit-details-marker]:hidden sm:min-h-[82px] sm:px-7">
            <span className="w-7 shrink-0 text-[11px] font-semibold tabular-nums text-black/35">{String(departmentIndex + 1).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-6">
              <h2 id={`department-${departmentIndex}`} className="truncate text-lg font-semibold leading-tight sm:w-[19rem] sm:shrink-0 sm:text-2xl">{department.title}</h2>
              <span className="mt-1 block truncate text-sm text-black/50 sm:mt-0 sm:text-base">{department.description}</span>
            </span>
            <span className="hidden shrink-0 text-xs font-semibold text-[#0066cc] sm:block">View materials</span>
            <ChevronDown className="h-5 w-5 shrink-0 text-black/55 transition-transform duration-300 group-open/department:rotate-180" aria-hidden="true" />
          </summary>

          <div className="border-t border-black/10 bg-[#f5f5f7] py-5 sm:py-7">
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scroll-padding-left:1rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 sm:px-7 sm:[scroll-padding-left:1.75rem]">
              {department.items.map((item) => (
                <Link key={item.title} href={item.href} className="group w-[78vw] max-w-[27rem] shrink-0 snap-start overflow-hidden rounded-[8px] bg-white shadow-[0_7px_24px_rgba(0,0,0,.08)] sm:w-[22rem] lg:w-[25rem]">
                  <span className="relative block aspect-[4/5] overflow-hidden bg-[#e8e8ed]">
                    <Image src={item.image} alt={item.alt} fill sizes="(min-width: 1024px) 400px, (min-width: 640px) 352px, 78vw" quality={82} className="object-cover transition duration-700 group-hover:scale-[1.02]" />
                    <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.02)_40%,rgba(0,0,0,.72)_100%)]" />
                    <span className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                      <span className="block text-2xl font-semibold leading-tight">{item.title}</span>
                      <span className="mt-2 block max-w-sm text-sm leading-6 text-white/75">{item.detail}</span>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white">Explore <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></span>
                    </span>
                  </span>
                </Link>
              ))}
              <span aria-hidden="true" className="w-px shrink-0" />
            </div>
          </div>
        </details>
        ))}

        <section className="bg-[#f5f5f7] px-6 py-20 text-center sm:px-10 sm:py-28">
        <h2 className="text-[clamp(2.3rem,5vw,4.5rem)] font-semibold leading-none tracking-[0]">Don&apos;t see the exact item?</h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-black/55 sm:text-lg">Send a photo, model number, supplier quote, list, or blueprint. We&apos;ll organize the request and find the material.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-4">
          <Link href="/request-quote?request=custom-item" className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#0071e3] px-6 text-sm font-semibold text-white hover:bg-[#0077ed]">Find an item</Link>
          <Link href="/request-quote" className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-[#0066cc] hover:underline">Send a list <span className="ml-1" aria-hidden="true">›</span></Link>
        </div>
        </section>
        </div>
      </CollectionRoot>
    </Root>
  )
}
