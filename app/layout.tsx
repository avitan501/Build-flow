import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";
import { Fragment } from "react";

import { AvantiaBuildClientShell } from "@/components/buildflow/buildflow-client-shell";
import { MobileBottomDock } from "@/components/buildflow/mobile-bottom-dock";
import { MobileClientHeader } from "@/components/buildflow/mobile-client-header";
import { SiteFooter } from "@/components/buildflow/site-footer";
import { ShopLanguageProvider } from "@/components/buildflow/shop-language-provider";
import { TrafficTracker } from "@/components/buildflow/traffic-tracker";
import { WorkflowSettingsHydrator } from "@/components/buildflow/workflow-settings-hydrator";
import { getSessionWithProfile } from "@/lib/auth";
import { managerCapabilities } from "@/lib/owner-identity";
import { parseShopLanguage, SHOP_LANGUAGE_COOKIE } from "@/lib/shop-i18n";
import { getSupabasePublicEnv, hasSupabasePublicEnv } from "@/lib/supabase/env";
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
      "@id": "https://build.avantiap.com/#organization",
      name: "Avantia Build",
      url: "https://build.avantiap.com",
      logo: "https://build.avantiap.com/images/avantia/avantia-app-icon-512.png",
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+1-516-908-8319",
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
      "@id": "https://build.avantiap.com/#website",
      name: "Avantia Build",
      url: "https://build.avantiap.com",
      publisher: { "@id": "https://build.avantiap.com/#organization" },
    },
  ],
}).replace(/</g, "\\u003c");

export const metadata: Metadata = {
  metadataBase: new URL("https://build.avantiap.com"),
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
    icon: "/images/avantia/avantia-app-icon-512.png",
    shortcut: "/images/avantia/avantia-app-icon-512.png",
    apple: "/images/avantia/avantia-app-icon-512.png",
  },
  openGraph: {
    title: "Avantia Build | Materials Priced & Delivered",
    description: "Send plans or a material list. WhatsApp: (516) 908-8319.",
    url: "/",
    siteName: "Avantia Build",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Avantia Build | Materials Priced & Delivered",
    description: "Send plans or a material list. WhatsApp: (516) 908-8319.",
  },
  other: {
    "impact-site-verification": "08c0dd51-7fec-49c5-b32b-c32ee98fcbcc",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { supabase, user, profile } = await getSessionWithProfile();
  const cookieStore = await cookies();
  const shopLanguage = parseShopLanguage(cookieStore.get(SHOP_LANGUAGE_COOKIE)?.value);
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
  const supabaseBrowserConfig = hasSupabasePublicEnv() ? getSupabasePublicEnv() : null;
  const serializedSupabaseConfig = supabaseBrowserConfig
    ? JSON.stringify(supabaseBrowserConfig).replace(/</g, "\\u003c")
    : null;
  const { data: publicStateRow } = supabase
    ? await supabase.from("workflow_public_catalog").select("state").eq("id", "singleton").maybeSingle<{ state: PublicWorkflowState }>()
    : { data: null };

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
              <TrafficTracker disabled={isAdmin} />
              <WorkflowSettingsHydrator state={publicStateRow?.state ?? null} />
              <MobileClientHeader isSignedIn={isSignedIn} isAdmin={isAdmin} isOwner={managerAccess.owner} managerHref={managerHref} isPreviewAdminEnabled={isPreviewAdminEnabled} displayName={displayName} />
              {children}
              <SiteFooter />
              <MobileBottomDock />
            </Fragment>
          </AvantiaBuildClientShell>
        </ShopLanguageProvider>
      </body>
    </html>
  );
}
