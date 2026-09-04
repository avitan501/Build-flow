import Link from "next/link"
import { redirect } from "next/navigation"
import { BookOpenCheck, CheckCircle2, ChevronLeft, ClipboardCheck, House, MessageSquareText, Search, ShieldCheck } from "lucide-react"

import { requireManagerPortalProfile } from "@/lib/auth"
import { formatSiteDate } from "@/lib/site-date-time"
import { addConstructionKnowledgeAction, addOrderStandardAction, deleteConstructionKnowledgeAction, setConstructionKnowledgeEnabledAction, updateConstructionKnowledgeAction } from "./actions"

type KnowledgeRow = {
  id: string
  fact: string
  category: string
  source_path: string
  enabled: boolean
  reviewed_at: string
  updated_at: string
}

const QUESTION_STOP_WORDS = new Set(["a", "an", "and", "are", "can", "do", "for", "how", "i", "in", "is", "it", "of", "on", "or", "should", "the", "to", "we", "what", "when", "with"])

const NEW_HOME_STANDARD_TEMPLATES = [
  {
    stage: "Framing",
    sourcePath: "/shop/framing",
    customerNeed: "A customer sends framing shorthand, a lumber list, a framing plan, or asks for a new-home framing package.",
    shorthand: "Read a bare 2x4x8 as wood dimensional lumber unless the customer says metal or another material. Keep every stated size, length, quantity, species, grade, and treatment exactly as written.",
    questions: "What sizes, lengths, and quantities are still missing? Can you send the framing plan or complete material list? What is the full delivery address, and when is the material needed?",
    confirmations: "Confirm engineered-member schedules, spans, species and grade, treatment or exposure needs, connectors and fasteners, structural drawings, engineer requirements, manufacturer instructions, and applicable local code before finalizing. These are project-specific, not universal defaults.",
    sampleReply: "Send me the framing plan or list, the full delivery address, and when you need it. I’ll keep every size and quantity exactly as written and flag only the missing details.",
  },
  {
    stage: "Roofing",
    sourcePath: "/shop/roofing",
    customerNeed: "A customer asks for a new-home roofing package, shingles, membrane, flashing, ventilation, or roofing accessories.",
    shorthand: "Keep stated roof squares, product type, brand, color, exposure, bundle count, and accessory quantities as written. Treat a square as estimating shorthand, not a final takeoff or waste allowance.",
    questions: "What roofing system or shingle is requested? What color and quantity or measured roof area do you have? Can you send the roof plan? What is the delivery address and needed date?",
    confirmations: "Confirm deck and slope conditions, underlayment, ice-and-water coverage, flashing, ventilation, fastening, wind or fire classifications, waste, manufacturer instructions, warranty requirements, and local code before finalizing. Do not assume these requirements are universal.",
    sampleReply: "What roofing product and color do you need, how many squares or what roof plan do you have, and what is the delivery address?",
  },
  {
    stage: "Exterior",
    sourcePath: "/shop/exterior",
    customerNeed: "A customer asks for siding, cladding, weatherproofing, exterior trim, or a new-home exterior-envelope package.",
    shorthand: "Preserve the stated material, profile, exposure, color, panel or piece quantities, trim names, and opening dimensions. Do not infer a weather barrier or flashing assembly from siding shorthand alone.",
    questions: "Which siding or cladding system, profile, and color are requested? What wall area, elevations, or quantities are available? Which trims and openings must be included? What is the delivery address and needed date?",
    confirmations: "Confirm substrate, weather-resistive barrier, drainage and flashing details, fastening, clearances, sealants, wind or fire requirements, manufacturer instructions, design professional details, and local code before finalizing. These are confirm-only project requirements.",
    sampleReply: "Which siding or cladding, profile, and color do you need? Send the elevations or quantities, delivery address, and needed date.",
  },
  {
    stage: "Insulation",
    sourcePath: "/request-quote?request=insulation",
    customerNeed: "A customer asks for a new-home insulation package for walls, ceilings, roof areas, floors, sound control, or mechanical spaces.",
    shorthand: "Keep stated batt, roll, board, foam, mineral-wool, thickness, width, R-value, square-foot, bag, or bundle information exactly as provided. Never infer required R-value or vapor control from location alone.",
    questions: "Which areas are being insulated? What cavity dimensions, material preference, and measured area or quantities are available? Can you send the insulation schedule or plans? What is the delivery address and needed date?",
    confirmations: "Confirm required R-values, assembly design, vapor and air control, ignition or thermal barriers, fire and acoustic assemblies, equipment clearances, manufacturer instructions, energy requirements, and local code before finalizing. None are universal defaults.",
    sampleReply: "Which areas are you insulating, what cavity sizes and quantities do you have, and can you send the insulation schedule or plans?",
  },
  {
    stage: "Drywall",
    sourcePath: "/shop/sheet-rock",
    customerNeed: "A customer sends a new-home drywall list or asks for board, compound, tape, bead, screws, primer, or related accessories.",
    shorthand: "Avantia may offer 5/8-inch as its normal Sheetrock option, but never replace an explicit thickness without confirmation. Read “1000 pc box” as one 1,000-count screw box. On an otherwise clear drywall list, matching tape may mean one standard roll, a five-gallon compound bucket may mean all-purpose compound, and primer may mean drywall primer unless the customer says otherwise.",
    questions: "What board dimensions, thicknesses, types, and quantities are requested or shown on the plans? Which areas have special assembly requirements? What is the delivery address and needed date? Ask whether to keep an explicit thickness that conflicts with the Avantia 5/8-inch option.",
    confirmations: "Confirm every fire-rated, shaft, moisture, wet-area, abuse-resistant, ceiling, acoustic, fastening, finish-level, manufacturer, plan, design-professional, and local-code requirement before finalizing. Never label these as universal defaults.",
    sampleReply: "Send the drywall list or plans, delivery address, and needed date. If you wrote a different thickness, should we keep it or price Avantia’s 5/8-inch option?",
  },
  {
    stage: "Tile",
    sourcePath: "/shop/tile-work",
    customerNeed: "A customer asks for tile, mortar or thinset, grout, backer board, waterproofing, or a new-home tile-setting package.",
    shorthand: "Keep the stated tile type, dimensions, finish, color, measured area, bag count, grout color, substrate, and installation location. Do not select thinset or waterproofing from square footage alone.",
    questions: "What tile type and size are being installed? What is the substrate? Is the location interior or exterior and wet or dry? What measured area and waste instruction are provided? What is the delivery address and needed date?",
    confirmations: "Confirm mortar and grout compatibility, substrate preparation, waterproofing, drainage and slope, movement joints, coverage and trowel requirements, cure conditions, manufacturer instructions, design details, and applicable code before finalizing. Wet-area requirements are not universal defaults.",
    sampleReply: "What tile type and size, what substrate, and is the area wet or dry? Send the square footage, address, and needed date too.",
  },
  {
    stage: "Paint",
    sourcePath: "/request-quote?request=paint",
    customerNeed: "A customer asks for new-home paint, primer, coatings, or a room-by-room paint and finish package.",
    shorthand: "Keep every stated brand, product line, color name or code, finish, container size, and quantity. A five-gallon primer on a clear drywall list may mean drywall primer unless another product or substrate is stated; never infer paint color or finish.",
    questions: "Which surfaces and rooms are being painted? What exact colors or codes and finishes are required? What product line and quantities or measured areas are available? Is the work interior or exterior? What is the delivery address and needed date?",
    confirmations: "Confirm substrate preparation, primer and topcoat compatibility, coats and coverage, moisture conditions, specialty or fire-rated coating requirements, VOC or occupancy requirements, manufacturer instructions, finish schedule, and local rules before finalizing. These are not universal defaults.",
    sampleReply: "Which rooms or surfaces, exact color codes, and finishes do you need? Send the quantities or areas, delivery address, and needed date.",
  },
  {
    stage: "Trim & Doors",
    sourcePath: "/shop/door-and-molding",
    customerNeed: "A customer asks for interior or exterior doors, jambs, casing, base, crown, molding, hardware, or a new-home trim package.",
    shorthand: "Keep stated door style, slab or prehung condition, size, handing, swing, jamb width, bore or prep, quantity, trim profile, width, length, species, material, and finish exactly as provided. Never infer handing or fire rating.",
    questions: "For doors, what style, size, handing, swing, jamb width, prep, and quantity are required? For trim, what profile, material, lengths, and quantities are required? Can you send the door schedule or finish schedule? What is the delivery address and needed date?",
    confirmations: "Confirm rough openings and field measurements, wall thickness, handing, hardware and keying, fire or egress requirements, safety glazing where relevant, moisture exposure, finish, manufacturer instructions, schedules, design-professional requirements, and local code before finalizing. These are project-specific.",
    sampleReply: "Send the door or trim schedule, missing sizes and quantities, delivery address, and needed date. I’ll flag handing, jamb, hardware, or profile details that still need confirmation.",
  },
] as const

const NEW_HOME_SYSTEM_STANDARD_TEMPLATES = [
  {
    stage: "Concrete & Masonry",
    sourcePath: "/shop/concrete-masonry",
    customerNeed: "A customer asks for concrete, block, mortar, reinforcement, aggregate, or a new-home foundation and masonry material package.",
    shorthand: "Keep every stated mix or product, bag or yard quantity, block size, reinforcement size, mesh dimension, and accessory quantity. Treat “yard” as supplied volume shorthand only when the customer clearly uses it that way; never calculate structural quantities from a brief message.",
    questions: "What exact material or mix is requested? What quantities or approved takeoff are available? Can you send the foundation or masonry plan? What is the delivery address, access condition, and needed date?",
    confirmations: "Confirm design mix, strength, exposure, reinforcement, footing and wall details, frost or soil requirements, admixtures, placement conditions, testing, engineer details, manufacturer instructions, access and load limits, and local code before finalizing. These are project-specific.",
    sampleReply: "Which concrete or masonry materials and quantities do you need? Send the approved plan or takeoff, delivery address, access details, and needed date.",
  },
  {
    stage: "Windows",
    sourcePath: "/shop/window",
    customerNeed: "A customer asks for new-construction or replacement windows, a window schedule, or a complete new-home window package.",
    shorthand: "Keep stated unit size, rough opening, manufacturer, series, operation, handing, color, glazing, grille, jamb, flange, and quantity exactly as written. Never infer unit size from a room name or opening photo.",
    questions: "Can you send the window schedule? Which sizes, operation types, colors, and quantities are still missing? Is this new construction or replacement? What is the delivery address and needed date?",
    confirmations: "Confirm field measurements, rough openings, egress, safety glazing, energy and wind ratings, tempered or impact requirements, flashing and installation system, manufacturer instructions, design-professional requirements, and local code before ordering. None are universal defaults.",
    sampleReply: "Send the window schedule or the missing sizes, types, colors, and quantities. Is this new construction or replacement, and where and when is delivery needed?",
  },
  {
    stage: "Plumbing",
    sourcePath: "/request-quote?request=plumbing",
    customerNeed: "A customer asks for plumbing rough-in material, pipe and fittings, valves, drains, fixtures, trim, or a new-home plumbing package.",
    shorthand: "Keep every stated material, diameter, fitting type, connection, valve, fixture model, finish, quantity, and pipe length. Do not infer pipe material, fitting system, or fixture rough-in from a generic room name.",
    questions: "Is this rough-in, finish fixtures, or both? What pipe or fitting system, sizes, fixture models or finishes, and quantities are specified? Can you send the plumbing plans or fixture schedule? What is the delivery address and needed date?",
    confirmations: "Confirm approved plans, pressure and drainage application, compatible joining system, fixture rough-ins, backflow and venting requirements, listings, manufacturer instructions, licensed-trade review, and applicable plumbing code before finalizing. These are confirm-only project items.",
    sampleReply: "Is this plumbing rough-in, fixtures, or both? Send the plans or list with sizes, models, finishes, quantities, delivery address, and needed date.",
  },
  {
    stage: "Electrical",
    sourcePath: "/shop/electrical",
    customerNeed: "A customer asks for electrical rough-in material, wire or cable, panels, breakers, boxes, devices, lighting, or a new-home electrical package.",
    shorthand: "Keep stated cable type, conductor count and gauge, length, panel or breaker model, voltage, box or device type, color, rating, and quantity exactly as provided. Never infer conductor size, breaker rating, or panel compatibility.",
    questions: "Can you send the electrical plan or complete list? Which cable types and lengths, panel or breaker models, boxes, devices, fixtures, and quantities are missing? What is the delivery address and needed date?",
    confirmations: "Confirm load calculations, conductor and overcurrent sizing, panel and breaker compatibility, service and grounding details, wet or exterior listings, fire and energy requirements, manufacturer instructions, licensed-electrician review, and applicable electrical code. These are not universal defaults.",
    sampleReply: "Send the electrical plan or list with cable sizes and lengths, device or panel models, quantities, delivery address, and needed date.",
  },
  {
    stage: "HVAC & Mechanical",
    sourcePath: "/request-quote?request=hvac",
    customerNeed: "A customer asks for HVAC equipment, duct, registers, line sets, controls, ventilation, or a new-home mechanical material package.",
    shorthand: "Keep every stated equipment manufacturer and model, capacity, fuel, voltage, efficiency, duct dimension, line-set size and length, register size, control, accessory, and quantity. Never size equipment from house square footage alone.",
    questions: "Can you send the mechanical plans, equipment schedule, or approved load calculation? Which equipment models, capacities, duct or line-set sizes, controls, accessories, and quantities are specified? What is the delivery address and needed date?",
    confirmations: "Confirm approved load and ventilation calculations, equipment matchups, fuel and electrical requirements, refrigerant and line sizing, condensate and venting, clearances, listings, manufacturer instructions, licensed-trade review, permits, and applicable mechanical code before finalizing.",
    sampleReply: "Send the mechanical plan or equipment schedule with models, capacities, duct or line-set sizes, quantities, delivery address, and needed date.",
  },
  {
    stage: "Cabinets",
    sourcePath: "/shop/kitchen",
    customerNeed: "A customer asks for kitchen, bath, laundry, or other new-home cabinetry and related panels, trim, fillers, or hardware.",
    shorthand: "Keep stated cabinet codes, dimensions, door style, color, finish, construction, side exposure, hinge direction, quantity, panels, fillers, moldings, and hardware. Never infer layout dimensions or handing from a room name.",
    questions: "Can you send the approved cabinet layout or schedule? Which cabinet codes, dimensions, door style, finish, exposed sides, panels, fillers, moldings, hardware, and quantities are still missing? What is the delivery address and needed date?",
    confirmations: "Confirm final field dimensions, appliance and fixture clearances, fillers and finished ends, crown and toe-kick details, hardware, anchorage, accessibility or safety requirements, designer approval, manufacturer instructions, and applicable local requirements before ordering.",
    sampleReply: "Send the approved cabinet layout or list with cabinet codes, style, finish, panels, fillers, hardware, quantities, delivery address, and needed date.",
  },
  {
    stage: "Appliances",
    sourcePath: "/shop/appliances",
    customerNeed: "A customer asks for a new-home or rental appliance package, individual appliances, or appliance coordination with cabinets and utilities.",
    shorthand: "Keep exact manufacturer, model, fuel, voltage, finish, dimensions, hinge or door configuration, quantity, and requested accessories. Never substitute a model or infer fuel, voltage, venting, or opening compatibility.",
    questions: "Which appliance types and exact models or required dimensions are needed? What fuel, voltage, finish, handing, and quantities are specified? Can you send the appliance schedule? What is the delivery address and needed date?",
    confirmations: "Confirm final openings and clearances, utility locations and capacities, fuel and voltage, venting, water and drain connections, stacking or trim kits, manufacturer instructions, installer requirements, and applicable safety or local requirements before finalizing.",
    sampleReply: "Send the appliance schedule or exact models, dimensions, fuel or voltage, finish, quantities, delivery address, and needed date.",
  },
  {
    stage: "Flooring",
    sourcePath: "/shop/wood-floor",
    customerNeed: "A customer asks for hardwood, engineered wood, resilient flooring, underlayment, transitions, adhesive, or a new-home flooring package.",
    shorthand: "Keep stated material, species, grade, construction, width, thickness, color, finish, square footage, waste instruction, carton count, underlayment, adhesive, and transition details. Never infer waste, moisture system, or installation method.",
    questions: "What flooring material, product or species, width, color or finish, and measured area are specified? Which rooms and transitions are included? Is there an approved waste instruction? What is the delivery address and needed date?",
    confirmations: "Confirm substrate and moisture conditions, approved installation method, acclimation and site conditions, underlayment or adhesive compatibility, radiant-heat limitations, transitions, waste, manufacturer instructions, installer review, and applicable project requirements before finalizing.",
    sampleReply: "Which flooring product, width, color or finish, and square footage do you need? Send the room list, transitions, delivery address, and needed date.",
  },
] as const

function questionTerms(question: string) {
  return [...new Set(question.toLowerCase().match(/[a-z0-9]+/g)?.filter((term) => term.length > 1 && !QUESTION_STOP_WORDS.has(term)) ?? [])]
}

function guidanceForQuestion(question: string, knowledge: KnowledgeRow[]) {
  const terms = questionTerms(question)
  if (!terms.length) return []
  return knowledge
    .filter((entry) => entry.enabled)
    .map((entry) => {
      const searchable = `${entry.category} ${entry.fact}`.toLowerCase()
      const score = terms.reduce((total, term) => total + (searchable.includes(term) ? 1 : 0), 0)
      return { entry, score }
    })
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score || Date.parse(right.entry.reviewed_at || right.entry.updated_at) - Date.parse(left.entry.reviewed_at || left.entry.updated_at))
    .slice(0, 3)
    .map((match) => match.entry)
}

export default async function ConstructionKnowledgePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; question?: string }> }) {
  const params = await searchParams
  const { supabase, access } = await requireManagerPortalProfile()
  if (!access.aiTools || !access.owner) redirect("/")

  const { data, error } = await supabase
    .from("aura_ai_reply_knowledge")
    .select("id,fact,category,source_path,enabled,reviewed_at,updated_at")
    .order("reviewed_at", { ascending: false })
    .limit(200)
    .returns<KnowledgeRow[]>()
  const knowledge = data ?? []
  const question = String(params.question || "").trim().replace(/\s+/g, " ").slice(0, 300)
  const guidance = question ? guidanceForQuestion(question, knowledge) : []

  return <main className="min-h-screen bg-[#f5f6f8] px-3 py-5 sm:px-6 sm:py-8">
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/ai-tools" className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-sky-700"><ChevronLeft aria-hidden="true" className="h-4 w-4" />Manager Tools</Link>
      <header className="mt-4 rounded-2xl bg-slate-950 px-5 py-6 text-white shadow-lg sm:px-7">
        <div className="flex items-start gap-4"><span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500"><BookOpenCheck className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-sky-300">Owner only</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Construction Knowledge</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Review the stable construction facts Avantia may use in customer replies. This uses the existing AI knowledge store—there is no duplicate database.</p></div></div>
      </header>

      {params.saved ? <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Construction knowledge saved.</p> : null}
      {params.error || error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">The knowledge could not be saved. Check the fact and its source, then try again.</p> : null}

      <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700" /><div><h2 className="text-sm font-bold text-amber-950">Stable, reviewed facts only</h2><p className="mt-1 text-xs leading-5 text-amber-900">Do not enter live price, current stock, guaranteed delivery, or project-specific claims here. Keep those in the catalog or request workflow for manager confirmation.</p></div></div></section>

      <section className="mt-4 rounded-2xl border border-sky-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="ask-construction-ai">
        <div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><MessageSquareText className="h-5 w-5" /></span><div><h2 id="ask-construction-ai" className="font-bold text-slate-950">Ask Construction AI</h2><p className="mt-1 text-xs leading-5 text-slate-500">Ask one work question. The answer uses active, reviewed facts from this page only.</p></div></div>
        <form method="get" className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="construction-question" className="sr-only">One construction question</label>
          <input id="construction-question" name="question" defaultValue={question} required maxLength={300} placeholder="Example: What should we ask when a customer needs a dumpster?" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950" />
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-bold text-white"><Search className="h-4 w-4" />Get guidance</button>
        </form>
        {question ? <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-live="polite">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-sky-700">Approved guidance</p>
          <h3 className="mt-1 text-sm font-bold text-slate-950">{question}</h3>
          {guidance.length ? <ul className="mt-3 space-y-3">{guidance.map((entry) => <li key={entry.id} className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 shadow-sm"><p>{entry.fact}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{entry.category} · {entry.source_path}</p></li>)}</ul> : <p className="mt-3 text-sm leading-6 text-slate-600">No approved standard answers this yet. Add or review an Order Standard below before the customer AI uses it.</p>}
        </div> : null}
      </section>

      <section id="order-standards" className="mt-4 rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="order-standards-title">
        <div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><ClipboardCheck className="h-5 w-5" /></span><div><h2 id="order-standards-title" className="font-bold text-slate-950">Order Standards</h2><p className="mt-1 text-xs leading-5 text-slate-500">Turn a repeat order into a clear playbook: when it applies, the useful options, the next questions, and what still needs confirmation.</p></div></div>

        <details className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50" open>
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-indigo-950">Dumpster / container example</summary>
          <div className="grid gap-3 border-t border-indigo-200 px-4 py-4 text-xs leading-5 text-indigo-950 sm:grid-cols-2">
            <div><p className="font-bold">Relevant options</p><p className="mt-1">10, 15, 20, 30, or 40 yard container; mixed construction debris; clean concrete or dirt; roofing debris; household cleanout.</p></div>
            <div><p className="font-bold">Questions that matter</p><p className="mt-1">Debris type, size or estimated amount, full delivery address, needed date, placement location, and pickup or swap timing.</p></div>
            <div><p className="font-bold">Confirm before finalizing</p><p className="mt-1">Restricted materials, weight limits, truck access, street permit needs, delivery window, pickup timing, and current price.</p></div>
            <div><p className="font-bold">Short reply example</p><p className="mt-1">Yes—we can help with a dumpster. What are you throwing out, what size do you need, and what is the delivery address?</p></div>
          </div>
        </details>

        <form action={addOrderStandardAction} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-700">Standard name<input name="standardName" required maxLength={100} defaultValue="Dumpster / container request" className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
          <label className="text-xs font-bold text-slate-700">Source path or HTTPS URL<input name="sourcePath" required maxLength={500} defaultValue="/admin/ai-tools/construction-knowledge#order-standards" className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">Use when<textarea name="customerNeed" required maxLength={300} rows={2} defaultValue="A customer asks for a dumpster, debris container, container delivery, pickup, or swap." className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">Relevant options<textarea name="options" maxLength={500} rows={3} defaultValue="10, 15, 20, 30, or 40 yard container; mixed construction debris; clean concrete or dirt; roofing debris; household cleanout." className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">Ask only unresolved questions<textarea name="questions" required maxLength={500} rows={3} defaultValue="What material is going in it? What size do you need, or how much debris is there? What is the full delivery address? When should it arrive? Where should it be placed? When should it be picked up or swapped?" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">Confirm before finalizing<textarea name="confirmations" required maxLength={400} rows={3} defaultValue="Restricted materials, weight limits, truck access, street permit needs, delivery window, pickup timing, and current price." className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">Short customer reply example<textarea name="sampleReply" required maxLength={300} rows={2} defaultValue="Yes—we can help with a dumpster. What are you throwing out, what size do you need, and what is the delivery address?" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
          <div className="flex items-center justify-between gap-3 sm:col-span-2"><p className="max-w-xl text-[10px] leading-4 text-slate-500">Saving creates one active order-standard fact in the existing AI knowledge store. Review the generated fact below and pause it any time.</p><button type="submit" className="min-h-11 shrink-0 rounded-lg bg-indigo-700 px-4 text-xs font-bold text-white">Save order standard</button></div>
        </form>
      </section>

      <section id="new-home-standards" className="mt-4 rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="new-home-standards-title">
        <div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-800"><House className="h-5 w-5" /></span><div><h2 id="new-home-standards-title" className="font-bold text-slate-950">New Home Common Standards</h2><p className="mt-1 text-xs leading-5 text-slate-500">Owner-review starter pack organized by construction stage. Save only the stages Avantia wants the customer AI to use.</p></div></div>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950"><strong>Review-only:</strong> nothing below is active until the owner reviews and saves one template. Common shorthand helps intake; local-code, fire, structural, wet-area, energy, and manufacturer requirements are confirm-only project items—not universal defaults.</div>

        <div className="mt-4 space-y-3">
          {[...NEW_HOME_STANDARD_TEMPLATES, ...NEW_HOME_SYSTEM_STANDARD_TEMPLATES].map((template, index) => <details key={template.stage} className="rounded-xl border border-slate-200 bg-slate-50" open={index === 0}>
            <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-slate-950">{String(index + 1).padStart(2, "0")} · {template.stage}</summary>
            <form action={addOrderStandardAction} className="grid gap-3 border-t border-slate-200 p-3 sm:grid-cols-2">
              <input type="hidden" name="standardName" value={`New home — ${template.stage}`} />
              <label className="text-xs font-bold text-slate-700 sm:col-span-2">Use when<textarea name="customerNeed" required maxLength={300} rows={2} defaultValue={template.customerNeed} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
              <label className="text-xs font-bold text-slate-700 sm:col-span-2">Common / default intake shorthand<textarea name="options" maxLength={500} rows={4} defaultValue={template.shorthand} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
              <label className="text-xs font-bold text-slate-700 sm:col-span-2">Truly required intake questions<textarea name="questions" required maxLength={500} rows={4} defaultValue={template.questions} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
              <label className="text-xs font-bold text-slate-700 sm:col-span-2">Confirm-only safety, plans, manufacturer, and code items<textarea name="confirmations" required maxLength={400} rows={4} defaultValue={template.confirmations} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
              <label className="text-xs font-bold text-slate-700">Source path or HTTPS URL<input name="sourcePath" required maxLength={500} defaultValue={template.sourcePath} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
              <label className="text-xs font-bold text-slate-700">Short customer reply<textarea name="sampleReply" required maxLength={300} rows={3} defaultValue={template.sampleReply} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
              <div className="flex items-center justify-between gap-3 sm:col-span-2"><p className="text-[10px] leading-4 text-slate-500">Saves one reviewed {template.stage.toLowerCase()} standard to the existing AI knowledge store.</p><button type="submit" className="min-h-11 shrink-0 rounded-lg bg-cyan-800 px-4 text-xs font-bold text-white">Review and save {template.stage}</button></div>
            </form>
          </details>)}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-bold text-slate-950">Add a reviewed fact</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Add a website path or authoritative HTTPS source so the fact can be checked later.</p>
        <form action={addConstructionKnowledgeAction} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-700">Category<input name="category" required maxLength={80} placeholder="drywall" className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
          <label className="text-xs font-bold text-slate-700">Source path or HTTPS URL<input name="sourcePath" required maxLength={500} placeholder="/shop/sheet-rock" className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">Reviewed fact<textarea name="fact" required maxLength={2000} rows={3} placeholder="Write one clear fact the AI can safely use." className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
          <div className="flex justify-end sm:col-span-2"><button type="submit" className="min-h-11 rounded-lg bg-slate-950 px-4 text-xs font-bold text-white">Add approved fact</button></div>
        </form>
      </section>

      <section className="mt-4 space-y-3" aria-label="Reviewed construction knowledge">
        {knowledge.length ? knowledge.map((entry) => <article key={entry.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${entry.enabled ? "border-emerald-200" : "border-slate-200 opacity-75"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase text-slate-700">{entry.category}</span><span className="text-[10px] font-bold text-slate-500">{entry.enabled ? "Active" : "Paused"}</span></div><div className="flex gap-1"><form action={setConstructionKnowledgeEnabledAction}><input type="hidden" name="knowledgeId" value={entry.id} /><input type="hidden" name="enabled" value={entry.enabled ? "false" : "true"} /><button type="submit" className="min-h-11 px-2 text-[11px] font-bold text-sky-700">{entry.enabled ? "Pause" : "Enable"}</button></form><form action={deleteConstructionKnowledgeAction}><input type="hidden" name="knowledgeId" value={entry.id} /><button type="submit" className="min-h-11 px-2 text-[11px] font-bold text-rose-700">Remove</button></form></div></div>
          <form action={updateConstructionKnowledgeAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="knowledgeId" value={entry.id} />
            <label className="text-xs font-bold text-slate-700">Category<input name="category" required maxLength={80} defaultValue={entry.category} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
            <label className="text-xs font-bold text-slate-700">Source<input name="sourcePath" required maxLength={500} defaultValue={entry.source_path} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
            <label className="text-xs font-bold text-slate-700 sm:col-span-2">Fact<textarea name="fact" required maxLength={2000} rows={3} defaultValue={entry.fact} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm leading-6" /></label>
            <div className="flex items-center justify-between gap-3 sm:col-span-2"><span className="text-[10px] text-slate-500">Last reviewed {formatSiteDate(entry.reviewed_at || entry.updated_at)}</span><button type="submit" className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-800">Save changes</button></div>
          </form>
        </article>) : <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No reviewed facts yet. AI will rely on the conversation, catalog matches, and safety fallback.</p>}
      </section>
    </div>
  </main>
}
