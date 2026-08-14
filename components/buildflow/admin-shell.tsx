"use client";

import {
  ChevronLeft,
  ChevronDown,
  BarChart3,
  ClipboardList,
  Columns3,
  ExternalLink,
  LayoutDashboard,
  Sparkles,
  Menu,
  PhoneCall,
  PackageOpen,
  Store,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";

const QUO_INBOX_URL = "https://my.quo.com/inbox/PN7lAbkMJw/c/CN30389c1bd6c542e78fbcec10a4e91602";

const primaryLinks = [
  { href: "/admin/users", label: "Customers", icon: Users },
  { href: "/admin/vendors", label: "Suppliers", icon: Store },
  { href: "/admin/catalog", label: "Material Catalog", icon: PackageOpen },
  { href: "/admin/quote-comparison", label: "Quote Comparison", icon: Columns3 },
] as const;

const moreLinks = [
  { href: "/admin/traffic", label: "Website Traffic", icon: BarChart3 },
  { href: "/admin/ai-tools", label: "AI Tools", icon: Sparkles },
  { href: "/admin/build-map", label: "Dashboard", icon: LayoutDashboard },
] as const;

type ManagerAccess = { owner: boolean; customers: boolean; suppliers: boolean };

function linksForAccess(access: ManagerAccess) {
  if (access.owner) return primaryLinks;
  return primaryLinks.filter((link) =>
    (link.href === "/admin/users" && access.customers) ||
    (link.href === "/admin/vendors" && access.suppliers) ||
    (link.href === "/admin/quote-comparison" && access.suppliers) ||
    link.href === "/admin/catalog",
  );
}

function isActive(pathname: string, href: string) {
  const hrefPath = href.split("?")[0];
  if (href === "/owner/materials") {
    return pathname === href;
  }
  if (hrefPath === "/admin/users") {
    return pathname.startsWith("/admin/users");
  }
  if (href === "/admin/vendors") {
    return pathname.startsWith("/admin/vendors") || pathname.startsWith("/admin/supplier-approvals") || pathname.startsWith("/admin/supplier-requests");
  }
  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

function ManagerNavigation({ pathname, access, onNavigate }: { pathname: string; access: ManagerAccess; onNavigate?: () => void }) {
  const managerLinks = linksForAccess(access);
  const moreIsActive = moreLinks.some((link) => isActive(pathname, link.href));
  const [moreOpen, setMoreOpen] = useState(moreIsActive);
  const homeHref = access.owner ? "/admin/build-map" : access.customers ? "/admin/users" : "/admin/vendors";
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 px-5 py-5">
        <Link href={homeHref} onClick={onNavigate} aria-label="Avantia Build manager portal">
          <AvantiaBuildLockup showSlogan />
        </Link>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager Portal</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Manager navigation">
        {managerLinks.map((link) => {
          const Icon = link.icon;
          const external = link.href.startsWith("https://");
          const active = !external && isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                active ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">{link.label}</span>
              {external ? <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" /> : null}
            </Link>
          );
        })}
        {access.owner ? (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setMoreOpen((current) => !current)}
              aria-expanded={moreOpen}
              className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${moreIsActive ? "bg-slate-100 text-slate-950" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"}`}
            >
              <Menu className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 text-left">More</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
            </button>
            {moreOpen ? <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-2">{moreLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(pathname, link.href);
              return <Link key={link.href} href={link.href} onClick={onNavigate} className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold ${active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}><Icon className="h-4 w-4 shrink-0" /><span>{link.label}</span></Link>;
            })}</div> : null}
          </div>
        ) : null}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <Link href={QUO_INBOX_URL} onClick={onNavigate} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          <PhoneCall className="h-4 w-4" />
          <span className="min-w-0 flex-1">Calls & Messages</span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
        </Link>
        <Link href="/" onClick={onNavigate} className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          <ChevronLeft className="h-4 w-4" />
          View customer website
        </Link>
        <Link href="/account" onClick={onNavigate} className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          <ClipboardList className="h-4 w-4" />
          Account
        </Link>
      </div>
    </div>
  );
}

export function AdminShell({ children, access }: { children: ReactNode; access: ManagerAccess }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f5f7] lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-r border-slate-200 lg:block">
        <ManagerNavigation pathname={pathname} access={access} />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-50 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800"
            aria-label="Open manager navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0"><AvantiaBuildLockup compact /></div>
          <span className="inline-flex h-11 items-center rounded-lg bg-slate-950 px-3 text-xs font-bold uppercase tracking-[0.12em] text-white">Manager</span>
        </header>
        {children}
      </div>

      <div
        className={`fixed inset-0 z-[80] bg-slate-950/40 transition lg:hidden ${menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside className={`fixed inset-y-0 left-0 z-[81] w-[88vw] max-w-[20rem] border-r border-slate-200 bg-white shadow-2xl transition-transform lg:hidden ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
          aria-label="Close manager navigation"
        >
          <X className="h-5 w-5" />
        </button>
        <ManagerNavigation pathname={pathname} access={access} onNavigate={() => setMenuOpen(false)} />
      </aside>
    </div>
  );
}
