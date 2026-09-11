import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import Script from "next/script";
import { Fragment, Suspense } from "react";

import { AvantiaBuildClientShell } from "@/components/buildflow/buildflow-client-shell";
import { MobileClientHeader } from "@/components/buildflow/mobile-client-header";
import { PostHogAnalytics } from "@/components/buildflow/posthog-analytics";
import { PrivateWebVitals } from "@/components/buildflow/private-web-vitals";
import { PublicContactBar } from "@/components/buildflow/public-contact-bar";
import { SiteFooter } from "@/components/buildflow/site-footer";
import { ShopLanguageProvider } from "@/components/buildflow/shop-language-provider";
import { TrafficTracker } from "@/components/buildflow/traffic-tracker";
import { WorkflowSettingsHydrator } from "@/components/buildflow/workflow-settings-hydrator";
import { getSessionWithProfile } from "@/lib/auth";
import { managerCapabilities, STAFF_EMAILS } from "@/lib/owner-identity";
import { parseShopLanguage, SHOP_LANGUAGE_COOKIE } from "@/lib/shop-i18n";
import { PRODUCTION_SITE_ORIGIN } from "@/lib/site-url";
import { getSupabasePublicEnv, hasSupabasePublicEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { PublicWorkflowState } from "@/lib/workflow-public";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const searchEngineIdentity = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${PRODUCTION_SITE_ORIGIN}/#organization`,
      name: "Avantia Build",
      url: PRODUCTION_SITE_ORIGIN,
      logo: `${PRODUCTION_SITE_ORIGIN}/images/avantia/avantia-app-icon-512.png`,
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+1-516-990-1990",
        contactType: "sales",
        areaServed: {
          "@type": "State",
          name: "New York",
        },
        availableLanguage: ["English", "Spanish"],
      },
    },
    {
      "@type": "WebSite",
      "@id": `${PRODUCTION_SITE_ORIGIN}/#website`,
      name: "Avantia Build",
      url: PRODUCTION_SITE_ORIGIN,
      publisher: { "@id": `${PRODUCTION_SITE_ORIGIN}/#organization` },
    },
  ],
}).replace(/</g, "\\u003c");

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCTION_SITE_ORIGIN),
  applicationName: "Avantia Build",
  title: "Avantia Build | You Build. We Handle the Materials.",
  description: "Send your plans or material list. We compare suppliers, organize the order, and arrange jobsite delivery.",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Avantia Build",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "96x96", type: "image/x-icon" }],
    shortcut: [{ url: "/favicon.ico", sizes: "96x96", type: "image/x-icon" }],
    apple: [{ url: "/images/avantia/avantia-app-icon-512.png", sizes: "512x512", type: "image/png" }],
  },
  openGraph: {
    title: "Avantia Build | Materials Priced & Delivered",
    description: "Send plans or a material list. WhatsApp: (516) 990-1990.",
    url: "/",
    siteName: "Avantia Build",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Avantia Build | Materials Priced & Delivered",
    description: "Send plans or a material list. WhatsApp: (516) 990-1990.",
  },
  other: {
    "impact-site-verification": "08c0dd51-7fec-49c5-b32b-c32ee98fcbcc",
  },
};

function PublicHeaderFallback() {
  return <MobileClientHeader isSignedIn={false} isAdmin={false} isPreviewAdminEnabled={process.env.VERCEL_ENV !== "production"} />;
}

// Optional personalization must never hold the public page's first HTML.
// Authorization remains in each protected page/action, not in this chrome.
async function OptionalSessionChrome() {
  let session;
  try {
    session = await getSessionWithProfile();
  } catch (error) {
    unstable_rethrow(error);
    return <PublicHeaderFallback />;
  }
  const { user, profile } = session;
  const isSignedIn = Boolean(user);
  const managerAccess = managerCapabilities({
    email: user?.email || profile?.email,
    role: profile?.role,
    approvalStatus: profile?.approval_status,
    isActive: profile?.is_active,
  });
  const isAdmin = managerAccess.owner || managerAccess.customers || managerAccess.suppliers;
  const managerHref = managerAccess.owner ? "/admin/build-map" : managerAccess.customers ? "/admin/users" : "/admin/vendors";
  const isPreviewAdminEnabled = process.env.VERCEL_ENV !== "production";
  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || null;
  const analyticsActorType = managerAccess.owner
    ? "owner"
    : managerAccess.operationsManager
      ? "staff"
      : user
        ? "client"
        : "anonymous";
  const normalizedAnalyticsEmail = (user?.email || profile?.email || "").trim().toLowerCase();
  const analyticsActorCohort = managerAccess.owner
    ? "owner"
    : managerAccess.operationsManager
      ? normalizedAnalyticsEmail === STAFF_EMAILS[0]
        ? "operations_primary"
        : "operations_secondary"
      : user
        ? "client"
        : "anonymous";
  return <>
    <PostHogAnalytics actorId={user?.id ?? null} actorType={analyticsActorType} actorCohort={analyticsActorCohort} />
    <TrafficTracker disabled={isAdmin} />
    <MobileClientHeader isSignedIn={isSignedIn} isAdmin={isAdmin} isOwner={managerAccess.owner} managerHref={managerHref} isPreviewAdminEnabled={isPreviewAdminEnabled} displayName={displayName} />
  </>;
}

async function OptionalWorkflowSettings() {
  if (!hasSupabasePublicEnv()) return null;
  let state: PublicWorkflowState | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("workflow_public_catalog")
      .select("state").eq("id", "singleton")
      .abortSignal(AbortSignal.timeout(3000))
      .maybeSingle<{ state: PublicWorkflowState }>();
    if (error) return null;
    state = data?.state ?? null;
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
  return <WorkflowSettingsHydrator state={state} />;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const shopLanguage = parseShopLanguage(cookieStore.get(SHOP_LANGUAGE_COOKIE)?.value);
  const supabaseBrowserConfig = hasSupabasePublicEnv() ? getSupabasePublicEnv() : null;
  const serializedSupabaseConfig = supabaseBrowserConfig
    ? JSON.stringify(supabaseBrowserConfig).replace(/</g, "\\u003c")
    : null;

  return (
    <html
      lang={shopLanguage}
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: searchEngineIdentity }} />
        {serializedSupabaseConfig ? (
          <Script id="avantia-supabase-config" strategy="beforeInteractive">
            {`window.__AVANTIA_SUPABASE__=${serializedSupabaseConfig}`}
          </Script>
        ) : null}
        <ShopLanguageProvider initialLanguage={shopLanguage}>
          <AvantiaBuildClientShell>
            <Fragment>
              <PrivateWebVitals />
              <Suspense fallback={null}><OptionalWorkflowSettings /></Suspense>
              <Suspense fallback={<PublicHeaderFallback />}><OptionalSessionChrome /></Suspense>
              {children}
              <SiteFooter />
              <PublicContactBar />
            </Fragment>
          </AvantiaBuildClientShell>
        </ShopLanguageProvider>
      </body>
    </html>
  );
}
