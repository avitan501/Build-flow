import type { MetadataRoute } from "next"

const SITE_URL = "https://build.avantiap.com"

type SitemapPage = {
  path: string
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>
  priority: number
}

const pages: SitemapPage[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/shop", changeFrequency: "weekly", priority: 0.9 },
  { path: "/beat-a-quote", changeFrequency: "monthly", priority: 0.9 },
  { path: "/request-quote", changeFrequency: "monthly", priority: 0.9 },
  { path: "/shop/framing", changeFrequency: "weekly", priority: 0.8 },
  { path: "/shop/electrical", changeFrequency: "weekly", priority: 0.8 },
  { path: "/shop/tile-work", changeFrequency: "weekly", priority: 0.8 },
  { path: "/shop/sheet-rock", changeFrequency: "weekly", priority: 0.8 },
  { path: "/shop/door-and-molding", changeFrequency: "weekly", priority: 0.8 },
  { path: "/shop/wood-floor", changeFrequency: "weekly", priority: 0.8 },
  { path: "/shop/siding", changeFrequency: "weekly", priority: 0.8 },
  { path: "/shop/roofing", changeFrequency: "weekly", priority: 0.8 },
  { path: "/shop/window", changeFrequency: "weekly", priority: 0.8 },
  { path: "/shop/concrete-masonry", changeFrequency: "weekly", priority: 0.8 },
  { path: "/shop/exterior", changeFrequency: "weekly", priority: 0.8 },
  { path: "/shop/kitchen", changeFrequency: "weekly", priority: 0.8 },
  { path: "/shop/appliances", changeFrequency: "weekly", priority: 0.8 },
  { path: "/shop/services", changeFrequency: "monthly", priority: 0.7 },
  { path: "/shop/paper-work", changeFrequency: "monthly", priority: 0.7 },
  { path: "/ai/renovation-estimator", changeFrequency: "monthly", priority: 0.7 },
  { path: "/shop/sheet-rock/drywall-calculator", changeFrequency: "monthly", priority: 0.7 },
  { path: "/shop/tile-work/thinset-calculator", changeFrequency: "monthly", priority: 0.7 },
  { path: "/shop/wood-floor/flooring-calculator", changeFrequency: "monthly", priority: 0.7 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.6 },
  { path: "/delivery-policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/returns", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
  { path: "/accessibility", changeFrequency: "yearly", priority: 0.2 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    changeFrequency,
    priority,
  }))
}
