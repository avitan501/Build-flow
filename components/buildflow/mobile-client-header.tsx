"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MobileMenuDrawer, type MobileMenuLink } from "@/components/buildflow/mobile-menu-drawer";
import { SHOP_CATEGORY_NAMES, SHOP_POPULAR_SEARCHES } from "@/lib/shop";
import { SHOP_CART_UPDATED_EVENT, readShopCartCount } from "@/lib/shop-cart";

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
            ? "border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(235,244,255,0.92))] text-slate-950 shadow-[0_10px_24px_rgba(148,163,184,0.14)]"
            : "border-slate-200/90 bg-white/95 text-slate-700 shadow-sm"
      }`}
    >
      {children}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
      <path d="M3 4h2l2.2 10.2A1 1 0 0 0 8.2 15H18a1 1 0 0 0 1-.8L21 7H6" />
    </svg>
  );
}

export function MobileClientHeader({ isSignedIn, isAdmin, accountHref, searchHref, aiHref }: MobileClientHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopSearchFocused, setShopSearchFocused] = useState(false);
  const [shopCartCount, setShopCartCount] = useState(0);
  const isShopPage = Boolean(pathname) && pathname.startsWith("/shop");
  const isCartPage = pathname === "/cart";
  const shopQuery = isShopPage ? searchParams.get("q") ?? "" : "";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncCartCount = () => setShopCartCount(readShopCartCount());

    syncCartCount();
    window.addEventListener("storage", syncCartCount);
    window.addEventListener(SHOP_CART_UPDATED_EVENT, syncCartCount as EventListener);

    return () => {
      window.removeEventListener("storage", syncCartCount);
      window.removeEventListener(SHOP_CART_UPDATED_EVENT, syncCartCount as EventListener);
    };
  }, []);

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
      { href: "/owner/materials", label: "Material Admin" },
      { href: "/shop", label: "Shop" },
      { href: "/admin/users", label: "Users" },
      { href: "/admin/whatsapp", label: "WhatsApp" },
    ];
  }, [isAdmin]);

  const normalizedQuery = shopQuery.trim().toLowerCase();
  const shopSuggestions = useMemo(() => {
    if (!shopSearchFocused) return [] as string[];
    if (!normalizedQuery) return [...SHOP_CATEGORY_NAMES];
    return SHOP_CATEGORY_NAMES.filter((category) => category.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, shopSearchFocused]);

  const popularSearches = useMemo(() => {
    if (!shopSearchFocused) return [] as string[];
    if (!normalizedQuery) return [...SHOP_POPULAR_SEARCHES];
    return SHOP_POPULAR_SEARCHES.filter((term) => term.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, shopSearchFocused]);

  if (!pathname || !shouldShowHeader(pathname)) {
    return null;
  }

  function updateShopSearch(nextQuery: string, nextCategory?: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextQuery.trim()) {
      params.set("q", nextQuery);
    } else {
      params.delete("q");
    }

    if (nextCategory && nextCategory.trim()) {
      params.set("category", nextCategory);
    } else if (nextCategory === null) {
      params.delete("category");
    }

    const queryString = params.toString();
    router.replace(queryString ? `/shop?${queryString}` : "/shop", { scroll: false });
  }

  return (
    <>
      <div className="sticky top-0 z-[60] border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.94))] shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur">
        <div className="mx-auto flex w-full items-center gap-2 px-3 py-2.5">
          <button type="button" aria-label="Open navigation menu" onClick={() => setMenuOpen(true)} className="inline-flex">
            <IconShell active={menuOpen}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </svg>
            </IconShell>
          </button>

          {isShopPage ? (
            <div className="relative min-w-0 flex-1">
              <div className={`flex min-h-10 items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm transition ${shopSearchFocused || isActivePath(pathname, "/shop") ? "border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(235,244,255,0.92))]" : "border-slate-200/90 bg-white/95"}`}>
                <SearchIcon />
                <input
                  value={shopQuery}
                  onChange={(event) => {
                    const nextQuery = event.target.value;
                    updateShopSearch(nextQuery);
                  }}
                  onFocus={() => setShopSearchFocused(true)}
                  placeholder="Search materials"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              {shopSearchFocused ? (
                <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-20 overflow-hidden rounded-[24px] border border-sky-100/90 bg-white shadow-[0_18px_40px_rgba(148,163,184,0.16)]">
                  <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#f9fcff_0%,#f3f8ff_100%)] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Shop search</p>
                        <p className="mt-1 text-sm text-slate-600">Start with a category or a common jobsite search.</p>
                      </div>
                      <button type="button" onClick={() => setShopSearchFocused(false)} className="text-xs font-semibold text-slate-500">
                        Close
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Categories</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {shopSuggestions.length > 0 ? shopSuggestions.map((category) => (
                          <button
                            key={category}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              updateShopSearch(category, category);
                              setShopSearchFocused(false);
                            }}
                            className="rounded-full border border-sky-100 bg-sky-50/70 px-3 py-2 text-sm font-semibold text-sky-700"
                          >
                            {category}
                          </button>
                        )) : <p className="text-sm text-slate-500">No category suggestions match yet.</p>}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Popular searches</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {popularSearches.length > 0 ? popularSearches.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              updateShopSearch(term, null);
                              setShopSearchFocused(false);
                            }}
                            className="rounded-full border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm font-semibold text-emerald-700"
                          >
                            {term}
                          </button>
                        )) : <p className="text-sm text-slate-500">No popular searches match yet.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <Link href={searchHref} aria-label="Search materials" className="min-w-0 flex-1">
              <span className={`flex min-h-10 items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm transition ${isActivePath(pathname, "/search") || isActivePath(pathname, "/shop") || isActivePath(pathname, "/materials") || isActivePath(pathname, "/quotes") || isActivePath(pathname, "/orders") ? "border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(235,244,255,0.92))]" : "border-slate-200/90 bg-white/95"}`}>
                <SearchIcon />
                <span className="truncate text-sm text-slate-500">Search materials</span>
              </span>
            </Link>
          )}

          <Link href={accountHref} aria-label="Account" className="inline-flex">
            <IconShell active={isActivePath(pathname, "/dashboard")}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="8" r="4" />
              </svg>
            </IconShell>
          </Link>

          {isShopPage || isCartPage ? (
            <Link href="/cart" aria-label="Cart" className="inline-flex">
              <IconShell active={isCartPage || shopCartCount > 0}>
                <CartIcon />
                {shopCartCount > 0 ? <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">{shopCartCount}</span> : null}
              </IconShell>
            </Link>
          ) : null}

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
