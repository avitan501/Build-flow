import type { NextConfig } from "next";

const pdfRuntimeAssets = [
  "./node_modules/pdf-parse/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    qualities: [75, 82],
  },
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/admin/catalog": pdfRuntimeAssets,
    "/admin/ai-tools/estimate-converter": pdfRuntimeAssets,
    "/shop/sheet-rock/drywall-calculator": pdfRuntimeAssets,
    "/shop/wood-floor/flooring-calculator": pdfRuntimeAssets,
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
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'; connect-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
