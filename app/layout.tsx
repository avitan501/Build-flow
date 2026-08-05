import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AvantiaBuildClientShell } from "@/components/buildflow/buildflow-client-shell";
import { MobileBottomDock } from "@/components/buildflow/mobile-bottom-dock";
import { MobileClientHeader } from "@/components/buildflow/mobile-client-header";
import { SiteFooter } from "@/components/buildflow/site-footer";
import { WorkflowSettingsHydrator } from "@/components/buildflow/workflow-settings-hydrator";
import { getSessionWithProfile } from "@/lib/auth";
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

export const metadata: Metadata = {
  title: "Avantia Build",
  description: "Everything it takes to build.",
  icons: {
    icon: "/images/avantia/avantia-app-icon-512.png",
    apple: "/images/avantia/avantia-app-icon-512.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { supabase, user, profile } = await getSessionWithProfile();
  const isSignedIn = Boolean(user);
  const isAdmin = profile?.role === "admin";
  const isPreviewAdminEnabled = process.env.VERCEL_ENV !== "production";
  const projectsHref = "/projects";
  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || null;
  const { data: publicStateRow } = supabase
    ? await supabase.from("workflow_public_catalog").select("state").eq("id", "singleton").maybeSingle<{ state: PublicWorkflowState }>()
    : { data: null };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AvantiaBuildClientShell>
          <WorkflowSettingsHydrator state={publicStateRow?.state ?? null} />
          <MobileClientHeader isSignedIn={isSignedIn} isAdmin={isAdmin} isPreviewAdminEnabled={isPreviewAdminEnabled} displayName={displayName} />
          {children}
          <SiteFooter />
          <MobileBottomDock projectsHref={projectsHref} />
        </AvantiaBuildClientShell>
      </body>
    </html>
  );
}
