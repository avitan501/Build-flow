"use client";

import {
  Files,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  PackageOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Store,
  UserRound,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";
import { EmployeeActivityReporter } from "@/components/buildflow/employee-activity-reporter";

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

type ManagerNavigationLink = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  relatedPaths?: string[];
  secondary?: Array<{ href: string; label: string; icon: LucideIcon }>;
};

export const MANAGER_NAV_STORAGE_KEY = "avantia-manager-nav";
export const MANAGER_NAV_SMALL_LAPTOP_QUERY = "(max-width: 1366px)";

export function managerNavigationDefaultCollapsed(input: { savedPreference: string | null; smallLaptop: boolean }) {
  if (input.savedPreference === "expanded") return false;
  if (input.savedPreference === "collapsed") return true;
  return input.smallLaptop;
}

function navigationLinks(access: ManagerAccess): ManagerNavigationLink[] {
  return [
    {
      href: "/admin/build-map",
      label: "Manager Dashboard",
      shortLabel: "Manager",
      icon: LayoutDashboard,
    },
    ...(access.customers ? [{ href: "/admin/users", label: "Customers", shortLabel: "Customers", icon: Users }] : []),
    ...(access.suppliers ? [
      {
        href: "/admin/catalog",
        label: "Material Catalog",
        shortLabel: "Catalog",
        icon: PackageOpen,
        relatedPaths: ["/admin/vendors", "/admin/supplier-approvals", "/admin/supplier-requests"],
        secondary: [{ href: "/admin/vendors", label: "Suppliers", icon: Store }],
      },
      { href: "/admin/documents", label: "Documents", shortLabel: "Documents", icon: Files },
    ] : []),
    ...(access.aiTools ? [{ href: "/admin/build-map?section=manager-tools#manager-tools", label: "Manager Tools", shortLabel: "Tools", icon: Wrench }] : []),
  ];
}

function isActive(pathname: string, href: string, relatedPaths: string[] = []) {
  const hrefPath = href.split("?")[0];
  if (href === "/owner/materials") return pathname === href;
  if (hrefPath === "/admin/users") return pathname.startsWith("/admin/users");
  if (href === "/admin/goals-progress") return pathname === href || pathname.startsWith("/admin/goals-progress/beat-your-quote-flyer");
  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`) || relatedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function NavigationTooltip({ id, label }: { id: string; label: string }) {
  return (
    <span
      id={id}
      role="tooltip"
      className="pointer-events-none absolute left-[calc(100%+.55rem)] top-1/2 z-[90] hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg group-hover:block group-focus-visible:block"
    >
      {label}
    </span>
  );
}

function NavigationLink({
  link,
  pathname,
  collapsed,
  onNavigate,
}: {
  link: ManagerNavigationLink;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = link.icon;
  const active = isActive(pathname, link.href, link.relatedPaths);
  const tooltipId = `manager-nav-${link.shortLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div>
      <Link
        href={link.href}
        prefetch={false}
        onClick={onNavigate}
        aria-label={collapsed ? link.shortLabel : undefined}
        aria-describedby={collapsed ? tooltipId : undefined}
        aria-current={active ? "page" : undefined}
        className={`group relative flex min-h-10 items-center rounded-lg text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 ${collapsed ? "mx-auto w-10 justify-center" : "gap-2.5 px-2.5"} ${active ? "bg-[#eaf4ff] text-[#0066cc]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.3 : 1.9} />
        {collapsed ? <NavigationTooltip id={tooltipId} label={link.shortLabel} /> : <span className="min-w-0 flex-1 truncate">{link.shortLabel}</span>}
      </Link>

      {!collapsed && link.secondary?.length ? (
        <div className="ml-[1.15rem] mt-0.5 border-l border-slate-200 pl-3">
          {link.secondary.map((secondary) => {
            const SecondaryIcon = secondary.icon;
            const secondaryActive = isActive(pathname, secondary.href);
            return (
              <Link
                key={secondary.href}
                href={secondary.href}
                prefetch={false}
                onClick={onNavigate}
                aria-current={secondaryActive ? "page" : undefined}
                className={`flex min-h-8 items-center gap-2 rounded-md px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0071e3] ${secondaryActive ? "bg-sky-50 text-[#0066cc]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
              >
                <SecondaryIcon className="h-3.5 w-3.5" />
                <span>{secondary.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ManagerNavigation({
  pathname,
  access,
  collapsed = false,
  onCollapsedChange,
  onNavigate,
}: {
  pathname: string;
  access: ManagerAccess;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onNavigate?: () => void;
}) {
  const links = navigationLinks(access);

  return (
    <div className="flex h-full flex-col overflow-visible bg-white">
      <div className={`relative flex h-16 shrink-0 items-center border-b border-slate-100 ${collapsed ? "justify-center px-2" : "justify-between gap-2 px-3"}`}>
        <Link href="/" prefetch={false} onClick={onNavigate} aria-label="Open the Avantia Build customer website" className="min-w-0 overflow-hidden">
          {collapsed ? (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-[13px] font-black tracking-[-0.04em] text-white">AV</span>
          ) : (
            <AvantiaBuildLockup compact className="max-w-[8.75rem]" />
          )}
        </Link>
        {onCollapsedChange && !collapsed ? (
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            aria-label="Collapse manager navigation"
            aria-expanded="true"
            className="group relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 outline-none transition hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-[#0071e3]"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className={`flex flex-1 flex-col gap-1 overflow-visible py-3 ${collapsed ? "px-2" : "px-3"}`} aria-label="Manager navigation">
        {collapsed && onCollapsedChange ? (
          <button
            type="button"
            onClick={() => onCollapsedChange(false)}
            aria-label="Expand manager navigation"
            aria-describedby="manager-nav-expand-tooltip"
            aria-expanded="false"
            className="group relative mx-auto mb-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 outline-none transition hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-[#0071e3]"
          >
            <PanelLeftOpen className="h-[18px] w-[18px]" />
            <NavigationTooltip id="manager-nav-expand-tooltip" label="Expand" />
          </button>
        ) : null}
        {links.map((link) => <NavigationLink key={link.href} link={link} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />)}
      </nav>

      <div className={`shrink-0 border-t border-slate-100 py-2.5 ${collapsed ? "px-2" : "px-3"}`}>
        {access.communications ? (
          <NavigationLink
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={onNavigate}
            link={{ href: "/admin/communications", label: "Communications", shortLabel: "Communication", icon: MessagesSquare }}
          />
        ) : null}
        <Link
          href="/account"
          prefetch={false}
          onClick={onNavigate}
          aria-label={collapsed ? "Account" : undefined}
          aria-describedby={collapsed ? "manager-nav-account" : undefined}
          className={`group relative mt-1 flex min-h-10 items-center rounded-lg text-[13px] font-semibold text-slate-600 outline-none transition hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-[#0071e3] ${collapsed ? "mx-auto w-10 justify-center" : "gap-2.5 px-2.5"}`}
        >
          <UserRound className="h-[18px] w-[18px] shrink-0" />
          {collapsed ? <NavigationTooltip id="manager-nav-account" label="Account" /> : <span className="min-w-0 flex-1">My Account</span>}
        </Link>
        <EmployeeActivityReporter owner={access.owner} compact={collapsed} />
      </div>
    </div>
  );
}

export function AdminShell({ children, access }: { children: ReactNode; access: ManagerAccess }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(true);

  useEffect(() => {
    const savedPreference = window.localStorage.getItem(MANAGER_NAV_STORAGE_KEY);
    const frame = window.requestAnimationFrame(() => {
      setDesktopCollapsed(managerNavigationDefaultCollapsed({
        savedPreference,
        smallLaptop: window.matchMedia(MANAGER_NAV_SMALL_LAPTOP_QUERY).matches,
      }));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function updateDesktopCollapsed(nextCollapsed: boolean) {
    setDesktopCollapsed(nextCollapsed);
    window.localStorage.setItem(MANAGER_NAV_STORAGE_KEY, nextCollapsed ? "collapsed" : "expanded");
  }

  return (
    <div className={`min-h-screen bg-[#f5f5f7] lg:grid ${desktopCollapsed ? "lg:grid-cols-[4.5rem_minmax(0,1fr)]" : "lg:grid-cols-[13rem_minmax(0,1fr)]"}`}>
      <aside className="sticky top-0 z-[60] hidden h-screen overflow-visible border-r border-slate-200 lg:block" data-collapsed={desktopCollapsed}>
        <ManagerNavigation pathname={pathname} access={access} collapsed={desktopCollapsed} onCollapsedChange={updateDesktopCollapsed} />
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
          <Link href="/" aria-label="Open the Avantia Build customer website" className="min-w-0"><AvantiaBuildLockup compact /></Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{access.owner ? "Owner" : "Manager"}</span>
        </header>
        {children}
      </div>

      <div
        className={`fixed inset-0 z-[80] bg-slate-950/20 transition lg:hidden ${menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside className={`fixed inset-0 z-[81] bg-white transition-transform duration-300 lg:hidden ${menuOpen ? "translate-x-0" : "-translate-x-full"}`} aria-hidden={!menuOpen} inert={!menuOpen}>
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
