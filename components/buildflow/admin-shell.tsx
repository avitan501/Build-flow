"use client";

import {
  Archive,
  Columns3,
  CreditCard,
  Handshake,
  LayoutDashboard,
  Sparkles,
  Menu,
  MessageCircle,
  PhoneCall,
  PackageOpen,
  Store,
  UserRound,
  Users,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";
import { EmployeeActivityReporter } from "@/components/buildflow/employee-activity-reporter";

const GOOGLE_MEET_URL = "https://meet.google.com/";
const communicationLinks = [
  { href: GOOGLE_MEET_URL, label: "Open Google Meet", shortLabel: "Meet", icon: Video },
  { href: "/admin/communications?channel=whatsapp", label: "View all WhatsApp conversations", shortLabel: "WhatsApp", icon: MessageCircle },
] as const;

type ManagerAccess = {
  owner: boolean;
  operationsManager: boolean;
  customers: boolean;
  communications: boolean;
  tasks: boolean;
  quotes: boolean;
  suppliers: boolean;
  aiTools: boolean;
  traffic: boolean;
  managerSettings: boolean;
};

function navigationLinks(access: ManagerAccess) {
  return [
    ...(access.customers ? [{ href: "/admin/users", label: "Customer Directory", icon: Users }] : []),
    ...(access.suppliers ? [
      { href: "/admin/vendors", label: "Supplier Directory", icon: Store },
      { href: "/owner/partnerships", label: "Supplier Partnerships", icon: Handshake },
      { href: "/admin/catalog", label: "Material Catalog", icon: PackageOpen },
    ] : []),
    ...(access.suppliers ? [
      { href: "/admin/supplier-quotes", label: "Supplier Quote Storage", icon: Archive },
      { href: "/admin/quote-comparison", label: "Quote Comparison", icon: Columns3 },
    ] : []),
    ...(access.aiTools ? [{ href: "/admin/ai-tools", label: "AI Tools", icon: Sparkles }] : []),
    ...(access.owner ? [{ href: "/admin/payments", label: "Payments", icon: CreditCard }] : []),
  ];
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
  const links = navigationLinks(access);
  const homeHref = "/admin/build-map";
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-100 px-6 pb-5 pt-7">
        <Link href={homeHref} onClick={onNavigate} aria-label="Avantia Build manager portal">
          <AvantiaBuildLockup />
        </Link>
        <Link href="/" onClick={onNavigate} className="mt-4 flex min-h-10 items-center text-sm font-semibold text-[#0066cc] hover:text-[#004f9e]">
          Customer Website
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-5 py-3" aria-label="Manager navigation">
        <Link href={homeHref} onClick={onNavigate} className={`group flex min-h-11 items-center gap-3 rounded-md px-2 text-sm font-semibold transition ${isActive(pathname, homeHref) ? "bg-sky-50 text-[#0066cc]" : "text-slate-800 hover:bg-slate-50"}`}>
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1">Manager Dashboard</span>
        </Link>
        <div className="mt-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(pathname, link.href);
            return <Link key={link.href} href={link.href} onClick={onNavigate} className={`group flex min-h-11 items-center gap-3 rounded-md px-2 text-sm font-semibold transition ${active ? "bg-sky-50 text-[#0066cc]" : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"}`}><Icon className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1">{link.label}</span></Link>;
          })}
        </div>
      </nav>

      <div className="border-t border-slate-100 px-5 pb-5 pt-3">
        {access.communications ? <Link href="/admin/communications" onClick={onNavigate} className={`mb-2 flex min-h-11 items-center gap-3 rounded-md px-2 text-sm font-semibold ${isActive(pathname, "/admin/communications") ? "bg-sky-50 text-[#0066cc]" : "text-slate-800 hover:bg-slate-50"}`}>
          <PhoneCall className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">Messages &amp; Calls</span>
        </Link> : null}
        <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Quick Access</p>
        <div className="grid grid-cols-2 gap-1" aria-label="Communication shortcuts">
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
        <Link href="/account" onClick={onNavigate} className="flex min-h-12 items-center gap-3 border-t border-slate-100 px-1 text-sm font-semibold text-slate-800 hover:text-[#0066cc]">
          <UserRound className="h-4 w-4" />
          My Account
        </Link>
        <EmployeeActivityReporter owner={access.owner} />
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
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{access.owner ? "Owner" : "Manager"}</span>
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
