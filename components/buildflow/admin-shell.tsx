"use client";

import {
  ChevronLeft,
  BarChart3,
  CalendarDays,
  Archive,
  ChevronRight,
  ClipboardList,
  Columns3,
  CreditCard,
  FileText,
  LayoutDashboard,
  Settings,
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
const WHATSAPP_CALL_URL = "https://web.whatsapp.com/";
const communicationLinks = [
  { href: "/admin/communications", label: "Calls & Communications", shortLabel: "Calls", icon: PhoneCall },
  { href: GOOGLE_MEET_URL, label: "Open Google Meet", shortLabel: "Meet", icon: Video },
  { href: WHATSAPP_CALL_URL, label: "Open WhatsApp to make a call", shortLabel: "WhatsApp", icon: MessageCircle },
  { href: "/admin/daily-summary", label: "Daily Work Summary", shortLabel: "Summary", icon: CalendarDays },
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

function navigationGroups(access: ManagerAccess) {
  return [
    { label: "Customers", links: access.customers ? [
      { href: "/admin/users", label: "Customer Directory", icon: Users },
      { href: "/owner/materials/requests", label: "Customer Requests", icon: FileText },
    ] : [] },
    {
      label: "Communications",
      links: access.communications ? [{ href: "/admin/communications", label: "Aura Communications", icon: PhoneCall }] : [],
    },
    {
      label: "Tasks",
      links: access.tasks ? [
        { href: "/admin/daily-summary", label: "Tasks & Daily Summary", icon: ClipboardList },
      ] : [],
    },
    {
      label: "Quotes & Orders",
      links: access.quotes ? [
        { href: "/admin/quotes", label: "Quotes", icon: FileText },
        { href: "/admin/orders", label: "Orders", icon: PackageOpen },
      ] : [],
    },
    {
      label: "Suppliers",
      links: [
        ...(access.suppliers ? [
          { href: "/admin/vendors", label: "Supplier Directory", icon: Store },
          { href: "/admin/supplier-quotes", label: "Supplier Quotes", icon: Archive },
          { href: "/admin/catalog", label: "Material Catalog", icon: PackageOpen },
          { href: "/admin/quote-comparison", label: "Quote Comparison", icon: Columns3 },
        ] : []),
      ],
    },
    {
      label: "AI Tools",
      links: [
        ...(access.aiTools ? [{ href: "/admin/ai-tools", label: "AI Tools coming soon", icon: Sparkles }] : []),
        ...(access.owner ? [{ href: "/admin/abc", label: "ABC Private Pricing", icon: Store }] : []),
        ...(access.traffic ? [{ href: "/admin/traffic", label: "Website Traffic", icon: BarChart3 }] : []),
        ...(access.managerSettings ? [{ href: "/admin/settings", label: "Manager Settings", icon: Settings }] : []),
        ...(access.owner ? [
          { href: "/admin/payments", label: "Payments", icon: CreditCard },
        ] : []),
      ],
    },
  ].filter((group) => group.links.length > 0);
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
  const groups = navigationGroups(access);
  const homeHref = "/admin/build-map";
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-100 px-6 pb-5 pt-7">
        <Link href={homeHref} onClick={onNavigate} aria-label="Avantia Build manager portal">
          <AvantiaBuildLockup />
        </Link>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0066cc]">{access.owner ? "Owner Workspace" : "Operations Manager"}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-5 py-5" aria-label="Manager navigation">
        <Link href={homeHref} onClick={onNavigate} className={`group flex min-h-16 items-center gap-3 rounded-lg px-4 text-[15px] font-semibold transition ${isActive(pathname, homeHref) ? "bg-[#0071e3] text-white shadow-sm" : "bg-slate-950 text-white hover:bg-slate-900"}`}>
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1">Manager Dashboard</span>
          <ChevronRight className="h-4 w-4 text-white/60 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
        <div className="mt-5 grid gap-5">
          {groups.map((group) => {
            const headingId = `manager-nav-${group.label.replaceAll(" ", "-").replaceAll("&", "and").toLowerCase()}`;
            return <section key={group.label} aria-labelledby={headingId}>
              <h2 id={headingId} className="px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{group.label}</h2>
              <div className="mt-1">{group.links.map((link) => {
                const Icon = link.icon;
                const active = isActive(pathname, link.href);
                return <Link key={link.href} href={link.href} onClick={onNavigate} className={`group flex min-h-11 items-center gap-3 rounded-md px-2 text-sm font-semibold transition ${active ? "bg-sky-50 text-[#0066cc]" : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"}`}><Icon className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1">{link.label}</span><ChevronRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-0.5" aria-hidden="true" /></Link>;
              })}</div>
            </section>;
          })}
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
          <span className="inline-flex h-11 items-center rounded-lg bg-slate-950 px-3 text-xs font-bold uppercase tracking-[0.12em] text-white">{access.owner ? "Owner" : "Manager"}</span>
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
