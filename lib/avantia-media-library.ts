import { BEAT_QUOTE_CAMPAIGN_MESSAGE } from "@/lib/campaign-messages"

export type AvantiaMediaAudience = "Contractors" | "Designers" | "Suppliers" | "General"

export type AvantiaStoryVideo = {
  id: string
  audience: AvantiaMediaAudience
  src: string
  poster: string
  captions: string
  title: string
  label: string
  transcript: string
  source: string
  version: string
}

export const approvedStoryVideos: AvantiaStoryVideo[] = [
  {
    id: "request",
    audience: "Contractors",
    src: "/videos/avantia-story/01-contractor-request.mp4",
    poster: "/videos/avantia-story/01-contractor-request-poster.jpg",
    captions: "/videos/avantia-story/request.vtt",
    title: "Request materials from your phone",
    label: "Send it from the jobsite",
    transcript: "Need material for the job? From your phone, send Avantia one list, photo, plan, or product link, and we will organize the request, compare practical options, and coordinate delivery after you approve, so you can stop chasing suppliers and get back to building.",
    source: "Approved nine-video Avantia story package",
    version: "Video 1 · current",
  },
  {
    id: "crew",
    audience: "Contractors",
    src: "/videos/avantia-story/02-contractor-crew-moving.mp4",
    poster: "/videos/avantia-story/02-contractor-crew-moving-poster.jpg",
    captions: "/videos/avantia-story/crew.vtt",
    title: "Keep the crew moving",
    label: "Keep the schedule moving",
    transcript: "Your crew is ready, but the material is not, and every missing item costs time and puts the schedule at risk, so send Avantia one list, photo, plan, or link, and we will organize the options, coordinate delivery after you approve, and help keep your crew moving and your job on schedule.",
    source: "Approved nine-video Avantia story package",
    version: "Video 2 · current",
  },
  {
    id: "suppliers",
    audience: "Suppliers",
    src: "/videos/avantia-story/03-supplier-partner-network.mp4",
    poster: "/videos/avantia-story/03-supplier-partner-network-poster.jpg",
    captions: "/videos/avantia-story/suppliers.vtt",
    title: "Join the supplier network",
    label: "Qualified supplier options",
    transcript: "Avantia receives material requests from contractors who need reliable supplier options, so if your company offers competitive pricing, dependable availability, and jobsite delivery, send us your information, and when the right request comes in, we may invite you to quote an opportunity that fits your business.",
    source: "Approved nine-video Avantia story package",
    version: "Video 3 · current",
  },
  {
    id: "products",
    audience: "Suppliers",
    src: "/videos/avantia-story/04-supplier-send-products.mp4",
    poster: "/videos/avantia-story/04-supplier-send-products-poster.jpg",
    captions: "/videos/avantia-story/products.vtt",
    title: "Send us what you sell",
    label: "Catalogs, prices, availability",
    transcript: "Do you sell construction materials? Send Avantia your catalog, current pricing, availability, and delivery area, and we will review it against the requests our clients send, so when your product and price are the right fit, we can present your company as a supplier option.",
    source: "Approved nine-video Avantia story package",
    version: "Video 4 · current",
  },
  {
    id: "designer-order",
    audience: "Designers",
    src: "/videos/avantia-story/05-designer-order-coordination.mp4",
    poster: "/videos/avantia-story/05-designer-order-coordination-poster.jpg",
    captions: "/videos/avantia-story/designer-order.vtt",
    title: "Every selection, one process",
    label: "Coordinate many vendors",
    transcript: "You find the perfect tile on one website, the lighting on another, and the flooring somewhere else, but ordering everything can become another full-time job, so send Avantia the links and selections, approve the final list, and we will coordinate the orders and deliveries for you.",
    source: "Approved nine-video Avantia story package",
    version: "Video 5 · current",
  },
  {
    id: "designer-desk",
    audience: "Designers",
    src: "/videos/avantia-story/06-designer-materials-desk.mp4",
    poster: "/videos/avantia-story/06-designer-materials-desk-poster.jpg",
    captions: "/videos/avantia-story/designer-desk.vtt",
    title: "One design. One materials desk.",
    label: "Finish schedules organized",
    transcript: "A beautiful design depends on every detail arriving at the right time, so send Avantia your finish schedule or project selection list, and we will organize the vendor details, follow the orders, and coordinate delivery after approval, while you stay focused on your client and the design.",
    source: "Approved nine-video Avantia story package",
    version: "Video 6 · current",
  },
  {
    id: "calls",
    audience: "Contractors",
    src: "/videos/avantia-story/07-many-calls-one-job.mp4",
    poster: "/videos/avantia-story/07-many-calls-one-job-poster.jpg",
    captions: "/videos/avantia-story/calls.vtt",
    title: "How many calls for one job?",
    label: "Upload the plans once",
    transcript: "How many people do you call for one job? Dumpster, lumber, windows, roofing, HVAC, flooring, drywall, tile, doors, paint—different supplier, different quote, different follow-up. Upload the plans once to Avantia. We help organize quantities, pricing, ordering, and delivery. One materials concierge behind the entire job.",
    source: "Approved nine-video Avantia story package",
    version: "Video 7 · current",
  },
  {
    id: "cost",
    audience: "Contractors",
    src: "/videos/avantia-story/08-material-actual-cost.mp4",
    poster: "/videos/avantia-story/08-material-actual-cost-poster.jpg",
    captions: "/videos/avantia-story/cost.vtt",
    title: "What did the material actually cost?",
    label: "See another option",
    transcript: "Your sub gives you one number—but what did the material actually cost? Send Avantia the plans, quote, or material list. We can help check quantities, price the material separately, and give you another option before you approve. Keep your sub. Keep your supplier. Use Avantia wherever you need clarity.",
    source: "Approved nine-video Avantia story package",
    version: "Video 8 · current",
  },
  {
    id: "busy",
    audience: "Contractors",
    src: "/videos/avantia-story/09-job-gets-busy.mp4",
    poster: "/videos/avantia-story/09-job-gets-busy-poster.jpg",
    captions: "/videos/avantia-story/busy.vtt",
    title: "When the job gets busy",
    label: "One missing item can stop the day",
    transcript: "One missing pump, one special light, one late delivery—and now the whole day stops. Send Avantia a plan, photo, link, list, or voice note. We can coordinate with your subs, track what your jobs use, and help source the small items everyone forgets. When the job gets busy, call your materials concierge.",
    source: "Approved nine-video Avantia story package",
    version: "Video 9 · current",
  },
]

export const legacyMarketingInventory = [
  { id: "ai-takeoff", title: "AI takeoff", audience: "Contractors", src: "/videos/marketing/ai-takeoff.mp4", poster: "/videos/marketing/ai-takeoff-poster.jpg", captions: "/videos/marketing/ai-takeoff.vtt", text: "Send the plan. Avantia prepares the material list. You review before ordering." },
  { id: "crew-downtime", title: "Crew downtime", audience: "Contractors", src: "/videos/marketing/crew-downtime.mp4", poster: "/videos/marketing/crew-downtime-poster.jpg", captions: "/videos/marketing/crew-downtime.vtt", text: "Crew ready. Materials missing. One request helps keep the job moving." },
  { id: "delivery-coordination", title: "Delivery coordination", audience: "Contractors", src: "/videos/marketing/delivery-coordination.mp4", poster: "/videos/marketing/delivery-coordination-poster.jpg", captions: "/videos/marketing/delivery-coordination.vtt", text: "Coordinate the right materials to the right jobsite when the crew needs them." },
  { id: "nationwide-sourcing", title: "Nationwide sourcing", audience: "General", src: "/videos/marketing/nationwide-sourcing.mp4", poster: "/videos/marketing/nationwide-sourcing-poster.jpg", captions: "/videos/marketing/nationwide-sourcing.vtt", text: "For one project or many, tell Avantia the location and we look for supplier options nearby." },
  { id: "order-control", title: "Order control", audience: "General", src: "/videos/marketing/order-control.mp4", poster: "/videos/marketing/order-control-poster.jpg", captions: "/videos/marketing/order-control.vtt", text: "Materials, quantities, and jobsite details stay together. You approve the final order." },
  { id: "personal-shopper", title: "Personal material shopper", audience: "General", src: "/videos/marketing/personal-shopper.mp4", poster: "/videos/marketing/personal-shopper-poster.jpg", captions: "/videos/marketing/personal-shopper.vtt", text: "Send a photo, link, plan, or description. Avantia organizes the material request." },
  { id: "supplier-comparison", title: "Supplier comparison", audience: "Contractors", src: "/videos/marketing/supplier-comparison.mp4", poster: "/videos/marketing/supplier-comparison-poster.jpg", captions: "/videos/marketing/supplier-comparison.vtt", text: "Stop chasing supplier callbacks. Compare options and choose with better information." },
] as const

export const marketingPageInventory = [
  { id: "how-it-works", audience: "General", title: "How Avantia works", href: "/how-it-works", status: "Approved", source: "Current public website", version: "Current cinematic page", message: null },
  { id: "request-quote", audience: "Contractors", title: "Send a material request", href: "/request-quote", status: "Approved", source: "Current public website", version: "Current request flow", message: null },
  { id: "beat-a-quote", audience: "Contractors", title: "Beat a material quote", href: "/beat-a-quote", status: "Approved", source: "Current public website", version: "Current upload flow", message: BEAT_QUOTE_CAMPAIGN_MESSAGE },
  { id: "beat-quote-flyer", audience: "Contractors", title: "Beat Your Quote flyer", href: "/admin/goals-progress/beat-your-quote-flyer", status: "Approved", source: "Manager campaign flyer", version: "Current printable flyer", message: BEAT_QUOTE_CAMPAIGN_MESSAGE },
  { id: "locate-cheap-item", audience: "Contractors", title: "Locate Cheap Item", href: "/admin/ai-tools/locate-cheap-item", status: "Internal", source: "Manager Tools", version: "Live beta · source-backed", message: null },
  { id: "quote-comparison", audience: "Contractors", title: "Quote Comparison", href: "/admin/quote-comparison", status: "Internal", source: "Manager pricing workspace", version: "Current manager tool", message: null },
] as const
