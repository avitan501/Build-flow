import type { MetadataRoute } from "next"

const SITE_URL = "https://build.avantiap.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account/",
        "/admin/",
        "/api/",
        "/cart",
        "/dashboard",
        "/login",
        "/materials",
        "/orders",
        "/owner/",
        "/preview/",
        "/preview-admin/",
        "/projects/",
        "/quotes",
        "/reset-password",
        "/search",
        "/signup",
        "/takeoff-review",
        "/upload",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
