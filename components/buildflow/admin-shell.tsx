"use client";

import {
  ChevronLeft,
  ChevronDown,
  BarChart3,
  CalendarDays,
  Archive,
  ClipboardList,
  ChevronRight,
  Columns3,
  ExternalLink,
  LayoutDashboard,
  Sparkles,
  Menu,
  MessageCircle,
  PhoneCall,
  PackageOpen,
  Store,
  Target,
  Users,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";

const QUO_INBOX_URL = "https://my.quo.com/inbox/PN7lAbkMJw/c/CN30389c1bd6c542e78fbcec10a4e91602";
const GOOGLE_MEET_URL = "https://meet.google.com/";
const WHATSAPP_CALL_URL = "https://web.whatsapp.com/";

const communicationLinks = [
  { href: QUO_INBOX_URL, label: "Calls & Messages", shortLabel: "Calls", icon: PhoneCall },
  { href: GOOGLE_MEET_URL, label: "Open Google Meet", shortLabel: "Meet", icon: Video },
  { href: WHATSAPP_CALL_URL, label: "Open WhatsApp to make a call", shortLabel: "WhatsApp", icon: MessageCircle },
  { href: "/admin/daily-summary", label: "Daily Work Summary", shortLabel: "Summary", icon: CalendarDays },
] as const;

const primaryLinks = [
  { href: "/admin/build-map", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Customers", icon: Users },
  { href: "/admin/vendors", label: "Suppliers", icon: Store },
  { href: "/admin/supplier-quotes", label: "Supplier Quotes", icon: Archive },
  { href: "/admin/catalog", label: "Material Catalog", icon: PackageOpen },
  { href: "/admin/quote-comparison", label: "Quote Comparison", icon: Columns3 },
] as const;

const sharedMoreLinks = [
  { href: "/admin/goals-progress", label: "Goals & Progress", icon: Target },
] as const;

const ownerMoreLinks = [
  { href: "/admin/traffic", label: "Website Traffic", icon: BarChart3 },
  { href: "/admin/ai-tools", label: "AI Tools", icon: Sparkles },
] as const;

type ManagerAccess = { owner: boolean; customers: boolean; suppliers: boolean };

function linksForAccess(access: ManagerAccess) {
  if (access.owner) return primaryLinks;
  return primaryLinks.filter((link) =>
    (link.href === "/admin/users" && access.customers) ||
    (link.href === "/admin/vendors" && access.suppliers) ||
    (link.href === "/admin/supplier-quotes" && access.suppliers) ||
    (link.href === "/admin/quote-comparison" && access.suppliers) ||
    link.href === "/admin/build-map" ||
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
  if (href === "/admin/goals-progress") {
    return pathname === href || pathname.startsWith("/admin/goals-progress/beat-your-quote-flyer");
  }
  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

function ManagerNavigation({ pathname, access, onNavigate }: { pathname: string; access: ManagerAccess; onNavigate?: () => void }) {
  const managerLinks = linksForAccess(access);
  const moreLinks = access.owner ? [...sharedMoreLinks, ...ownerMoreLinks] : [...sharedMoreLinks];
  const moreIsActive = moreLinks.some((link) => isActive(pathname, link.href));
  const [moreOpen, setMoreOpen] = useState(moreIsActive);
  const homeHref = "/admin/build-map";
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-100 px-6 pb-5 pt-7">
        <Link href={homeHref} onClick={onNavigate} aria-label="Avantia Build manager portal">
          <AvantiaBuildLockup />
        </Link>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0066cc]">Manager Portal</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-5 py-5" aria-label="Manager navigation">
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
              className={`group flex min-h-14 items-center gap-3 border-b border-slate-100 px-1 text-[15px] font-semibold transition ${
                active ? "text-[#0066cc]" : "text-slate-900 hover:text-[#0066cc]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">{link.label}</span>
              {external ? <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" /> : <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" aria-hidden="true" />}
            </Link>
          );
        })}
        <div className="border-b border-slate-100">
          <button
              type="button"
              onClick={() => setMoreOpen((current) => !current)}
              aria-expanded={moreOpen}
              className={`flex min-h-14 w-full items-center gap-3 px-1 text-[15px] font-semibold transition ${moreIsActive ? "text-[#0066cc]" : "text-slate-900 hover:text-[#0066cc]"}`}
            >
              <Menu className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 text-left">More</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
            </button>
          {moreOpen ? <div className="mb-2 ml-7 border-l border-slate-200 pl-3">{moreLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(pathname, link.href);
            return <Link key={link.href} href={link.href} onClick={onNavigate} className={`flex min-h-11 items-center gap-3 border-b border-slate-100 px-2 text-sm font-semibold ${active ? "text-[#0066cc]" : "text-slate-600 hover:text-[#0066cc]"}`}><Icon className="h-4 w-4 shrink-0" /><span>{link.label}</span></Link>;
          })}</div> : null}
        </div>
      </nav>

      <div className="border-t border-slate-100 px-5 pb-5 pt-3">
        <div className="grid grid-cols-4 gap-1" aria-label="Communication shortcuts">
          {communicationLinks.map((link) => {
            const Icon = link.icon;
            const external = link.href.startsWith("https://");
            const active = !external && isActive(pathname, link.href);
            const className = `flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[10px] font-semibold leading-3 hover:text-[#0066cc] ${active ? "text-[#0066cc]" : "text-slate-700"}`;
            const content = <><Icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="w-full truncate">{link.shortLabel}</span></>;
            if (external) return <Link key={link.href} href={link.href} onClick={onNavigate} target="_blank" rel="noopener noreferrer" aria-label={link.label} title={link.label} className={className}>{content}</Link>;
            return <Link key={link.href} href={link.href} onClick={onNavigate} aria-label={link.label} title={link.label} className={className}>{content}</Link>;
          })}
        </div>
        <Link href="/" onClick={onNavigate} className="flex min-h-12 items-center gap-3 border-t border-slate-100 px-1 text-sm font-semibold text-slate-800 hover:text-[#0066cc]">
          <ChevronLeft className="h-4 w-4" />
          View customer website
        </Link>
        <Link href="/account" onClick={onNavigate} className="flex min-h-12 items-center gap-3 border-t border-slate-100 px-1 text-sm font-semibold text-slate-800 hover:text-[#0066cc]">
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
        className={`fixed inset-0 z-[80] bg-slate-950/20 transition lg:hidden ${menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside className={`fixed inset-0 z-[81] bg-white transition-transform duration-300 lg:hidden ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          className="absolute right-5 top-[max(1.25rem,env(safe-area-inset-top))] z-10 inline-flex h-11 w-11 items-center justify-center bg-white text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
          aria-label="Close manager navigation"
        >
          <X className="h-5 w-5" />
        </button>
        <ManagerNavigation pathname={pathname} access={access} onNavigate={() => setMenuOpen(false)} />
      </aside>
    </div>
  );
}
