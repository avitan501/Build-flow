"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { MobileMenuDrawer, type MobileMenuLink } from "@/components/buildflow/mobile-menu-drawer";
import { placeholderImageMetadata } from "@/lib/shop-catalog";
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
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
  const [shopSearchOpen, setShopSearchOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState("");
  const [shopCartCount, setShopCartCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isShopPage = Boolean(pathname) && pathname.startsWith("/shop");
  const isCartPage = pathname === "/cart";
  const shopQuery = isShopPage ? searchParams.get("q") ?? "" : "";

  useEffect(() => {
    if (shopSearchOpen) {
      setDraftQuery(shopQuery);
      const timeout = window.setTimeout(() => searchInputRef.current?.focus(), 60);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        window.clearTimeout(timeout);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [shopQuery, shopSearchOpen]);

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
    { href: accountHref, label: "Account & Settings", gated: !isSignedIn },
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

  const normalizedQuery = draftQuery.trim().toLowerCase();
  const shopSuggestions = useMemo(() => {
    if (!normalizedQuery) return [...SHOP_CATEGORY_NAMES];
    return SHOP_CATEGORY_NAMES.filter((category) => category.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery]);

  const popularSearches = useMemo(() => {
    if (!normalizedQuery) return [...SHOP_POPULAR_SEARCHES];
    return SHOP_POPULAR_SEARCHES.filter((term) => term.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery]);

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

  function submitShopSearch() {
    updateShopSearch(draftQuery, undefined);
    setShopSearchOpen(false);
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
            <button
              type="button"
              onClick={() => {
                setShopSearchFocused(true);
                setShopSearchOpen(true);
              }}
              className={`flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-2xl border px-3 py-2 text-left shadow-sm transition ${shopSearchOpen || isActivePath(pathname, "/shop") ? "border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(235,244,255,0.92))]" : "border-slate-200/90 bg-white/95"}`}
              aria-haspopup="dialog"
              aria-expanded={shopSearchOpen}
              aria-controls="shop-search-overlay"
            >
              <SearchIcon />
              <span className="truncate text-sm text-slate-500">{shopQuery || "Search materials"}</span>
            </button>
          ) : (
            <Link href={searchHref} aria-label="Search materials" className="min-w-0 flex-1">
              <span className={`flex min-h-10 items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm transition ${isActivePath(pathname, "/search") || isActivePath(pathname, "/shop") || isActivePath(pathname, "/materials") || isActivePath(pathname, "/quotes") || isActivePath(pathname, "/orders") ? "border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(235,244,255,0.92))]" : "border-slate-200/90 bg-white/95"}`}>
                <SearchIcon />
                <span className="truncate text-sm text-slate-500">Search materials</span>
              </span>
            </Link>
          )}

          <Link href={accountHref} aria-label="Account" className="inline-flex">
            <IconShell active={isActivePath(pathname, "/account")}>
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

      {shopSearchOpen ? (
        <div id="shop-search-overlay" role="dialog" aria-modal="true" className="fixed inset-0 z-[80] bg-white/96 backdrop-blur-sm">
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
            <div className="mb-4 grid grid-cols-[48px_1fr_48px] items-center">
              <button
                type="button"
                onClick={() => {
                  setShopSearchOpen(false);
                  setShopSearchFocused(false);
                }}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
                aria-label="Close search"
              >
                <CloseIcon />
              </button>
              <div className="text-center text-sm font-semibold tracking-[0.18em] text-slate-900">BUILDFLOW</div>
              <div />
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <label htmlFor="shop-search-input" className="sr-only">Search materials</label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <SearchIcon />
                <input
                  id="shop-search-input"
                  ref={searchInputRef}
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitShopSearch();
                    }
                  }}
                  placeholder="Search materials"
                  className="flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                  autoComplete="off"
                  enterKeyHint="search"
                />
                {draftQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                    aria-label="Clear search"
                  >
                    <CloseIcon />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <div className="grid gap-4 p-2 sm:grid-cols-2">
                <div>
                  <div className="px-2 pb-2 pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Categories</div>
                  <div className="space-y-1">
                    {shopSuggestions.map((category) => {
                      const image = placeholderImageMetadata(category, category).imageUrl;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            updateShopSearch(category, category);
                            setShopSearchOpen(false);
                            setShopSearchFocused(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
                        >
                          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            <Image src={image} alt="" fill sizes="48px" className="object-contain p-1.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900">{category}</span>
                            <span className="block truncate text-xs text-slate-500">Browse {category.toLowerCase()} materials</span>
                          </span>
                          <span className="text-slate-400"><SearchIcon /></span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="px-2 pb-2 pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Popular searches</div>
                  <div className="space-y-1">
                    {popularSearches.map((term) => {
                      const image = placeholderImageMetadata("Materials", term).imageUrl;
                      return (
                        <button
                          key={term}
                          type="button"
                          onClick={() => {
                            updateShopSearch(term, null);
                            setShopSearchOpen(false);
                            setShopSearchFocused(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
                        >
                          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            <Image src={image} alt="" fill sizes="48px" className="object-contain p-1.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900">{term}</span>
                            <span className="block truncate text-xs text-slate-500">Search this material</span>
                          </span>
                          <span className="text-slate-400"><SearchIcon /></span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDraftQuery("");
                  updateShopSearch("", null);
                  setShopSearchOpen(false);
                  setShopSearchFocused(false);
                }}
                className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={submitShopSearch}
                className="flex-1 rounded-full bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(2,132,199,0.25)] transition hover:bg-sky-700"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
