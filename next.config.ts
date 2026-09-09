import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const pdfRuntimeAssets = [
  "./node_modules/pdf-parse/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
];

const nextConfig: NextConfig = {
  deploymentId:
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 32) ||
    process.env.NEXT_DEPLOYMENT_ID,
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
      "/ai/renovation-estimator",
      "/unavailable",
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
      "/requests/:path*",
      "/search",
      "/signup",
      "/takeoff-review",
      "/upload",
    ];

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(self), usb=()" },
          // Inventory: Next inline hydration/styles, Supabase storage/realtime,
          // Sentry, PostHog, local/blob PDF/media and external supplier images.
          // Report-only until authenticated calls, uploads and embeds are verified.
          { key: "Content-Security-Policy-Report-Only", value: [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'self' blob:",
            "frame-ancestors 'self'",
            "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://us-assets.i.posthog.com https://vercel.live",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data:",
            "media-src 'self' blob: https:",
            "connect-src 'self' https://nprfhspwdflpqlopydmp.supabase.co wss://nprfhspwdflpqlopydmp.supabase.co https://*.ingest.us.sentry.io https://us.i.posthog.com https://us-assets.i.posthog.com https://vercel.live",
            "frame-src 'self' blob: https:",
            "worker-src 'self' blob:",
            "form-action 'self' https:",
          ].join("; ") },
        ],
      },
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
