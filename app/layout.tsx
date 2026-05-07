import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { MobileBottomDock } from "@/components/buildflow/mobile-bottom-dock";
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
  title: "BuildFlow",
  description: "Approval-first construction materials workflow for BuildFlow.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await getSessionWithProfile();
  const isSignedIn = Boolean(user);
  const gatedHref = isSignedIn ? null : "/login";
  const accountHref = isSignedIn ? "/dashboard" : "/login";
  const projectsHref = gatedHref ?? "/projects";
  const uploadHref = gatedHref ?? "/upload";
  const searchHref = gatedHref ?? "/shop";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <MobileBottomDock accountHref={accountHref} projectsHref={projectsHref} uploadHref={uploadHref} searchHref={searchHref} />
      </body>
    </html>
  );
}
