"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RecoveryLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hash = window.location.hash;

    if (!hash) {
      return;
    }

    const params = new URLSearchParams(hash.slice(1));

    if (params.get("type") === "recovery") {
      router.replace(`/reset-password${hash}`);
    }
  }, [router]);

  return null;
}
