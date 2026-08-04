import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AvantiaBuildClientShell } from "@/components/buildflow/buildflow-client-shell";
import { MobileBottomDock } from "@/components/buildflow/mobile-bottom-dock";
import { MobileClientHeader } from "@/components/buildflow/mobile-client-header";
import { getSessionWithProfile } from "@/lib/auth";
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
  const { user, profile } = await getSessionWithProfile();
  const isSignedIn = Boolean(user);
  const isAdmin = profile?.role === "admin";
  const isPreviewAdminEnabled = process.env.VERCEL_ENV !== "production";
  const projectsHref = "/projects";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AvantiaBuildClientShell>
          <MobileClientHeader isSignedIn={isSignedIn} isAdmin={isAdmin} isPreviewAdminEnabled={isPreviewAdminEnabled} />
          {children}
          <MobileBottomDock projectsHref={projectsHref} />
        </AvantiaBuildClientShell>
      </body>
    </html>
  );
}
