import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import Script from "next/script";

import { AvantiaBuildClientShell } from "@/components/buildflow/buildflow-client-shell";
import { MobileBottomDock } from "@/components/buildflow/mobile-bottom-dock";
import { MobileClientHeader } from "@/components/buildflow/mobile-client-header";
import { SiteFooter } from "@/components/buildflow/site-footer";
import { TrafficTracker } from "@/components/buildflow/traffic-tracker";
import { WorkflowSettingsHydrator } from "@/components/buildflow/workflow-settings-hydrator";
import { getSessionWithProfile } from "@/lib/auth";
import { managerCapabilities } from "@/lib/owner-identity";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://build.avantiap.com"),
  applicationName: "Avantia Build",
  title: "Avantia Build | You Build. We Handle the Materials.",
  description: "Send your plans or material list. We compare suppliers, organize the order, and arrange jobsite delivery.",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { supabase, user, profile } = await getSessionWithProfile();
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
  const projectsHref = "/projects";
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
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {serializedSupabaseConfig ? (
          <Script id="avantia-supabase-config" strategy="beforeInteractive">
            {`window.__AVANTIA_SUPABASE__=${serializedSupabaseConfig}`}
          </Script>
        ) : null}
        <AvantiaBuildClientShell>
          <TrafficTracker />
          <WorkflowSettingsHydrator state={publicStateRow?.state ?? null} />
          <MobileClientHeader isSignedIn={isSignedIn} isAdmin={isAdmin} isOwner={managerAccess.owner} managerHref={managerHref} isPreviewAdminEnabled={isPreviewAdminEnabled} displayName={displayName} />
          {children}
          <SiteFooter />
          <MobileBottomDock projectsHref={projectsHref} />
        </AvantiaBuildClientShell>
      </body>
    </html>
  );
}
