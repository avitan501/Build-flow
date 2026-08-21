"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function AccountSignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        try {
          setBusy(true);
          const supabase = createClient();
          await supabase.auth.signOut();
          router.push("/");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {busy ? "Signing out..." : "Sign Out"}
    </button>
  );
}
