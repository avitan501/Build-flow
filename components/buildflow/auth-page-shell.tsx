import Link from "next/link";
import type { ReactNode } from "react";

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";

export function AuthPageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-white px-5 pb-12 pt-[max(2rem,env(safe-area-inset-top))] sm:px-8 sm:pt-12">
      <section className="mx-auto w-full max-w-[30rem]">
        <Link href="/" aria-label="Avantia Build home" className="mx-auto flex w-fit justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-4">
          <AvantiaBuildLockup compact className="items-center" />
        </Link>

        <h1 className="mt-10 text-center text-[1.75rem] font-semibold leading-tight text-[#1d1d1f] sm:mt-12 sm:text-[2rem]">
          {title}
        </h1>

        <div className="mt-8 sm:mt-10">{children}</div>
      </section>
    </main>
  );
}
