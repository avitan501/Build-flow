"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { UserRound } from "lucide-react";

export type MobileMenuLink = {
  href: string;
  label: string;
  description?: string;
  gated?: boolean;
  external?: boolean;
  badge?: string;
  prominent?: boolean;
  imageUrl?: string;
  section?: "Materials" | "Services" | "Coming Soon";
  disabled?: boolean;
};

type MobileMenuDrawerProps = {
  open: boolean;
  onClose: () => void;
  primaryLinks: MobileMenuLink[];
  requestLinks?: MobileMenuLink[];
  moreLinks?: MobileMenuLink[];
  adminLinks?: MobileMenuLink[];
  shopLinks?: MobileMenuLink[];
  shopOpen?: boolean;
  onShopOpenChange?: (open: boolean) => void;
  isSignedIn: boolean;
};

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`) || (href === "/search" && pathname === "/shop");
}

export function MobileMenuDrawer({ open, onClose, primaryLinks, requestLinks = [], moreLinks = [], adminLinks = [], shopLinks = [], shopOpen = false, onShopOpenChange, isSignedIn }: MobileMenuDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const drawerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const closeDrawer = useCallback(() => {
    onShopOpenChange?.(false);
    onClose();
  }, [onClose, onShopOpenChange]);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const drawer = drawerRef.current;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = drawer ? Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector)) : [];
    focusable[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }

      if (event.key !== "Tab" || !drawer) return;
      const currentFocusable = Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector));
      const first = currentFocusable[0];
      const last = currentFocusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousFocusRef.current?.focus();
    };
  }, [closeDrawer, open]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-[70] bg-slate-950/20 transition ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={closeDrawer}
      />
      <aside
        ref={drawerRef}
        id="mobile-navigation-drawer"
        aria-label="Site navigation"
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-0 z-[71] overflow-y-auto bg-white px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] transition duration-300 sm:px-8 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`mx-auto flex min-h-full w-full flex-col ${shopOpen ? "max-w-3xl" : "max-w-2xl"}`}>
          <div className={`grid grid-cols-[3rem_1fr_3rem] items-center pb-3 ${shopOpen ? "border-b border-slate-200" : ""}`}>
            {shopOpen ? (
              <button type="button" onClick={() => onShopOpenChange?.(false)} aria-label="Back to main menu" className="inline-flex h-11 w-11 items-center justify-center text-slate-800 transition hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
              </button>
            ) : <span />}
            {shopOpen ? <p className="text-center text-sm font-semibold text-slate-950">Shop</p> : <span />}
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close menu"
              className="inline-flex h-11 w-11 items-center justify-center justify-self-end text-slate-800 transition hover:text-black active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 6l12 12" />
                <path d="M18 6 6 18" />
              </svg>
            </button>
          </div>

          {shopOpen ? (
            <div className="pb-8 pt-8 sm:pt-10">
              <Link href="/shop" onClick={closeDrawer} className="group mb-9 flex items-end justify-between border-b border-slate-200 pb-5 text-slate-950 transition hover:text-[#0066cc]">
                <span><span className="block text-2xl font-semibold sm:text-3xl">Shop overview</span><span className="mt-1 block text-sm text-slate-500">Swipe through featured departments</span></span>
                <span className="text-sm font-semibold">Explore</span>
              </Link>
              {(["Materials", "Services", "Coming Soon"] as const).map((section) => {
                const links = shopLinks.filter((link) => link.section === section);
                if (!links.length) return null;
                return (
                  <section key={section} className="mb-10">
                    <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{section}</h2>
                    <nav className="grid gap-y-7 sm:grid-cols-2 sm:gap-x-10" aria-label={`${section} shop navigation`}>
                      {links.map((link) => link.disabled ? (
                        <div key={`${link.label}-${link.href}`} className="grid min-h-[7rem] grid-cols-[44%_1fr] items-center gap-4 text-slate-500">
                          <span className="relative aspect-[16/10] w-full overflow-hidden bg-[#f4f4f4] opacity-75">
                            {link.imageUrl ? <Image src={link.imageUrl} alt="" fill sizes="(min-width: 640px) 240px, 44vw" loading="eager" className="object-cover" /> : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-lg font-semibold leading-tight text-slate-800">{link.label}</span>
                            <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{link.badge ?? "Coming soon"}</span>
                          </span>
                        </div>
                      ) : (
                        <Link key={`${link.label}-${link.href}`} href={link.href} prefetch={false} onClick={closeDrawer} className="group grid min-h-[7rem] grid-cols-[44%_1fr] items-center gap-4 text-slate-950 transition hover:text-[#0066cc]">
                          <span className="relative aspect-[16/10] w-full overflow-hidden bg-[#f4f4f4]">
                            {link.imageUrl ? <Image src={link.imageUrl} alt="" fill sizes="(min-width: 640px) 240px, 44vw" loading="eager" className="object-cover transition duration-500 group-hover:scale-[1.04]" /> : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-lg font-semibold leading-tight">{link.label}</span>
                            <span className="mt-2 block text-sm text-slate-500 underline decoration-slate-300 underline-offset-4 group-hover:text-[#0066cc]">Open</span>
                          </span>
                        </Link>
                      ))}
                    </nav>
                  </section>
                );
              })}
            </div>
          ) : (
          <>

          <nav className="mt-12 grid gap-1 sm:mt-16" aria-label="Mobile full navigation">
            {primaryLinks.map((link) => {
              const active = !link.external && Boolean(pathname) && isActivePath(pathname, link.href);
              if (link.href === "/shop" && shopLinks.length) {
                return (
                  <button key={`${link.label}-${link.href}`} type="button" onClick={() => onShopOpenChange?.(true)} className={`group flex min-h-[4rem] w-full items-center justify-between px-1 py-3 text-left tracking-normal transition ${active ? "text-[#0066cc]" : "text-slate-950 hover:text-[#0066cc]"}`}>
                    <span className="min-w-0"><span className="block text-lg font-semibold sm:text-xl">{link.label}</span>{link.description ? <span className="mt-1 block text-xs font-normal leading-5 text-slate-500 sm:text-sm">{link.description}</span> : null}</span>
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                );
              }
              return (
                <Link
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  prefetch={false}
                  onClick={closeDrawer}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className={`group flex min-h-[4rem] items-center gap-4 px-1 py-3 tracking-normal transition ${
                    active
                      ? "text-[#0066cc]"
                      : "text-slate-950 hover:text-[#0066cc]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-lg font-semibold sm:text-xl">{link.label}</span>
                    {link.description ? <span className="mt-1 block text-xs font-normal leading-5 text-slate-500 sm:text-sm">{link.description}</span> : null}
                  </span>
                  {link.badge ? <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-sky-700">{link.badge}</span> : null}
                  {!link.badge && link.gated && !isSignedIn ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">Login</span> : null}
                </Link>
              );
            })}
          </nav>

          {requestLinks.length ? <div className="mt-8 pt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Requests</p>
            <nav className="mt-2 grid" aria-label="Request navigation">
              {requestLinks.map((link) => <Link key={`${link.label}-${link.href}`} href={link.href} prefetch={false} onClick={closeDrawer} className={`flex min-h-14 items-center px-1 text-base font-semibold ${Boolean(pathname) && isActivePath(pathname, link.href) ? "text-[#0066cc]" : "text-slate-800 hover:text-[#0066cc]"}`}><span>{link.label}</span></Link>)}
            </nav>
          </div> : null}

          {moreLinks.length ? <details className="group mt-8 pt-4">
            <summary className="flex min-h-14 cursor-pointer list-none items-center px-1 text-base font-semibold text-slate-900 marker:content-none"><span>More</span></summary>
            <nav className="grid" aria-label="More navigation">
              {moreLinks.map((link) => <Link key={`${link.label}-${link.href}`} href={link.href} prefetch={false} onClick={closeDrawer} className={`flex min-h-14 items-center gap-3 px-1 text-base font-semibold ${Boolean(pathname) && isActivePath(pathname, link.href) ? "text-[#0066cc]" : "text-slate-700 hover:text-[#0066cc]"}`}><span>{link.label}</span>{link.badge ? <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] uppercase tracking-[.1em] text-sky-700">{link.badge}</span> : null}</Link>)}
            </nav>
          </details> : null}

          {adminLinks.length > 0 ? (
            <div className="mt-10">
              <nav className="grid" aria-label="Manager navigation">
              {adminLinks.map((link) => {
                const active = Boolean(pathname) && isActivePath(pathname, link.href);
                return (
                  <Link
                    key={`${link.label}-${link.href}`}
                    href={link.href}
                    prefetch={false}
                    onClick={closeDrawer}
                    className={`flex min-h-14 items-center px-1 text-base font-semibold transition ${active ? "text-[#0066cc]" : "text-slate-800 hover:text-[#0066cc]"}`}
                  >
                    <span className="min-w-0"><span className="block">{link.label}</span>{link.description ? <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{link.description}</span> : null}</span>
                  </Link>
                );
              })}
              </nav>
            </div>
          ) : null}

          <div className="mt-auto pt-12">
            <Link
              href={isSignedIn ? "/requests" : "/login"}
              prefetch={false}
              onClick={(event) => {
                event.preventDefault();
                const destination = isSignedIn ? "/requests" : "/login";
                closeDrawer();
                router.push(destination);
              }}
              className="flex min-h-16 items-center gap-3 px-1 text-lg font-semibold text-slate-950 transition hover:text-[#0066cc]"
            >
              <UserRound className="h-5 w-5" aria-hidden="true" />
              <span>Account</span>
            </Link>
          </div>
          </>
          )}
        </div>
      </aside>
    </>
  );
}
