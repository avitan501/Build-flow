import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/shop/sheet-rock/drywall-calculator": [
      "./node_modules/@napi-rs/canvas/**/*",
      "./node_modules/pdf-parse/**/*",
      "./node_modules/pdfjs-dist/**/*",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
  async headers() {
    const privateRoutes = [
      "/account/:path*",
      "/admin/:path*",
      "/api/:path*",
      "/cart",
      "/dashboard",
      "/login",
      "/materials/:path*",
      "/orders/:path*",
      "/owner/:path*",
      "/preview/:path*",
      "/preview-admin/:path*",
      "/projects/:path*",
      "/quotes/:path*",
      "/reset-password",
      "/search",
      "/signup",
      "/takeoff-review",
      "/upload",
    ];

    return [
      ...privateRoutes.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'; connect-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
