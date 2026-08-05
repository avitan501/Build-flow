"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type AvantiaBuildClientShellProps = {
  children: ReactNode;
};

export function AvantiaBuildClientShell({ children }: AvantiaBuildClientShellProps) {
  const pathname = usePathname();
  const useAppShell = Boolean(pathname) && !pathname.startsWith("/admin");
  const isHome = pathname === "/";
  const isAccount = pathname === "/account";
  const isShopLanding = pathname === "/shop";
  const isOwnerWorkspace = Boolean(pathname?.startsWith("/owner"));
  const isManagerPreview = Boolean(pathname?.startsWith("/preview-admin"));

  if (!useAppShell) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#d9e7fb_0%,#f4f8fd_34%,#dbe8f9_100%)] lg:px-6 lg:py-6">
      <div
        className={`mx-auto flex min-h-screen w-full flex-col bg-[linear-gradient(180deg,#f9fcff_0%,#f2f7ff_42%,#ffffff_100%)] lg:min-h-[calc(100vh-3rem)] lg:rounded-[34px] lg:border lg:border-white/70 lg:shadow-[0_28px_80px_rgba(15,23,42,0.16)] ${
          isOwnerWorkspace
            ? "max-w-[96rem] lg:overflow-visible"
            : isManagerPreview
              ? "max-w-[96rem] lg:overflow-visible"
              : isHome || isAccount || isShopLanding
              ? "max-w-[76rem] lg:overflow-visible"
              : "max-w-[31rem] lg:overflow-hidden"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
