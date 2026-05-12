"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { MobileMenuDrawer, type MobileMenuLink } from "@/components/buildflow/mobile-menu-drawer";

type MobileClientHeaderProps = {
  isSignedIn: boolean;
  isAdmin: boolean;
  accountHref: string;
  searchHref: string;
  aiHref: string;
};

const HIDDEN_PATHS = new Set(["/login", "/signup", "/reset-password"]);

function shouldShowHeader(pathname: string) {
  if (HIDDEN_PATHS.has(pathname)) {
    return false;
  }

  return !pathname.startsWith("/admin");
}

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`) || (href === "/search" && pathname === "/shop");
}

function IconShell({ active, premium = false, children }: { active: boolean; premium?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`relative flex h-10 w-10 items-center justify-center rounded-2xl border transition active:scale-[0.98] ${
        premium
          ? "border-fuchsia-200/80 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.28),transparent_34%),radial-gradient(circle_at_top_right,rgba(96,165,250,0.32),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,244,255,0.96))] text-slate-950 shadow-[0_12px_26px_rgba(96,165,250,0.14)]"
          : active
            ? "border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(235,244,255,0.92))] text-slate-950 shadow-[0_10px_24px_rgba(148,163,184,0.14)]"
            : "border-slate-200/90 bg-white/95 text-slate-700 shadow-sm"
      }`}
    >
      {children}
    </span>
  );
}

export function MobileClientHeader({ isSignedIn, isAdmin, accountHref, searchHref, aiHref }: MobileClientHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const primaryLinks = useMemo<MobileMenuLink[]>(() => [
    { href: "/", label: "Home" },
    { href: isSignedIn ? "/projects" : "/login", label: "Projects", gated: !isSignedIn },
    { href: isSignedIn ? "/start-project" : "/login", label: "Start New Project", gated: !isSignedIn },
    { href: isSignedIn ? "/upload" : "/login", label: "Upload Plans", gated: !isSignedIn },
    { href: isSignedIn ? "/materials" : "/login", label: "Materials", gated: !isSignedIn },
    { href: isSignedIn ? "/quotes" : "/login", label: "Quotes", gated: !isSignedIn },
    { href: isSignedIn ? "/orders" : "/login", label: "Orders", gated: !isSignedIn },
    { href: searchHref, label: "Search Materials", gated: !isSignedIn },
    { href: accountHref, label: "Account", gated: !isSignedIn },
    { href: aiHref, label: "Ask AI" },
  ], [accountHref, aiHref, isSignedIn, searchHref]);

  const adminLinks = useMemo<MobileMenuLink[]>(() => {
    if (!isAdmin) {
      return [];
    }

    return [
      { href: "/admin/build-map", label: "Admin" },
      { href: "/admin/shop", label: "Shop" },
      { href: "/admin/users", label: "Users" },
      { href: "/admin/whatsapp", label: "WhatsApp" },
    ];
  }, [isAdmin]);

  if (!pathname || !shouldShowHeader(pathname)) {
    return null;
  }

  return (
    <>
      <div className="sticky top-0 z-[60] border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.94))] shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur">
        <div className="mx-auto flex w-full items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setMenuOpen(true)}
            className="inline-flex"
          >
            <IconShell active={menuOpen}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </svg>
            </IconShell>
          </button>

          <Link href={searchHref} aria-label="Search materials" className="min-w-0 flex-1">
            <span className={`flex min-h-10 items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm transition ${isActivePath(pathname, "/search") || isActivePath(pathname, "/shop") || isActivePath(pathname, "/materials") || isActivePath(pathname, "/quotes") || isActivePath(pathname, "/orders") ? "border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(235,244,255,0.92))]" : "border-slate-200/90 bg-white/95"}`}>
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span className="truncate text-sm text-slate-500">Search materials</span>
            </span>
          </Link>

          <Link href={accountHref} aria-label="Account" className="inline-flex">
            <IconShell active={isActivePath(pathname, "/dashboard")}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="8" r="4" />
              </svg>
            </IconShell>
          </Link>

          <Link href={aiHref} aria-label="Ask BuildFlow AI" className="inline-flex">
            <IconShell active={isActivePath(pathname, "/ai")} premium>
              <span className="relative text-sm font-semibold tracking-[-0.04em]">
                AI
                <span className="absolute -right-2 -top-1 text-[10px] text-fuchsia-500">✦</span>
              </span>
            </IconShell>
          </Link>
        </div>
      </div>

      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} primaryLinks={primaryLinks} adminLinks={adminLinks} isSignedIn={isSignedIn} />
    </>
  );
}
