"use client";

import {
  Boxes,
  Building2,
  ChevronLeft,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Settings,
  Store,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";

const managerLinks = [
  { href: "/admin/build-map", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/settings/material-order-questions", label: "Departments & Questions", icon: Building2 },
  { href: "/admin/users", label: "Customers & Requests", icon: Users },
  { href: "/admin/vendors", label: "Suppliers", icon: Store },
  { href: "/owner/materials", label: "Catalog & Subcategories", icon: Boxes },
  { href: "/admin/settings", label: "Integrations", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/owner/materials") {
    return pathname === href;
  }
  if (href === "/admin/users") {
    return pathname.startsWith("/admin/users") || pathname.startsWith("/owner/materials/requests");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ManagerNavigation({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 px-5 py-5">
        <Link href="/admin/build-map" onClick={onNavigate} aria-label="Avantia Build manager dashboard">
          <AvantiaBuildLockup showSlogan />
        </Link>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager Portal</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Manager navigation">
        {managerLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                active ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
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

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f5f7] lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-r border-slate-200 lg:block">
        <ManagerNavigation pathname={pathname} />
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
        <ManagerNavigation pathname={pathname} onNavigate={() => setMenuOpen(false)} />
      </aside>
    </div>
  );
}
