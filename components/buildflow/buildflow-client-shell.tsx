"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type BuildFlowClientShellProps = {
  children: ReactNode;
};

export function BuildFlowClientShell({ children }: BuildFlowClientShellProps) {
  const pathname = usePathname();
  const useAppShell = Boolean(pathname) && !pathname.startsWith("/admin");

  if (!useAppShell) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#d9e7fb_0%,#f4f8fd_34%,#dbe8f9_100%)] lg:px-6 lg:py-6">
      <div className="mx-auto flex min-h-screen w-full max-w-[31rem] flex-col bg-[linear-gradient(180deg,#f9fcff_0%,#f2f7ff_42%,#ffffff_100%)] lg:min-h-[calc(100vh-3rem)] lg:overflow-hidden lg:rounded-[34px] lg:border lg:border-white/70 lg:shadow-[0_28px_80px_rgba(15,23,42,0.16)]">
        {children}
      </div>
    </div>
  );
}
