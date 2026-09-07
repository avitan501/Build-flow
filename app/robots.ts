import type { MetadataRoute } from "next"

import { PRODUCTION_SITE_ORIGIN } from "@/lib/site-url"

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
    sitemap: `${PRODUCTION_SITE_ORIGIN}/sitemap.xml`,
    host: PRODUCTION_SITE_ORIGIN,
  }
}
