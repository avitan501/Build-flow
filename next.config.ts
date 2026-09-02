import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const pdfRuntimeAssets = [
  "./node_modules/pdf-parse/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  env: {
    NEXT_PUBLIC_SENTRY_ENVIRONMENT:
      process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    NEXT_PUBLIC_SENTRY_RELEASE:
      process.env.VERCEL_GIT_COMMIT_SHA || process.env.SENTRY_RELEASE || "",
  },
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

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  telemetry: false,
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeTracing: true,
  },
});
