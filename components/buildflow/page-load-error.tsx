"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export function PageLoadError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <main style={{ display: "grid", placeItems: "center", minHeight: "70vh", padding: 24, background: "#fff", color: "#0f172a" }}>
    <section aria-labelledby="page-load-error-heading" style={{ maxWidth: 420, textAlign: "center" }}>
      <p style={{ color: "#2463a7", fontWeight: 700 }}>AVANTIA BUILD</p>
      <h1 id="page-load-error-heading" style={{ fontSize: 24 }}>Couldn’t load this page</h1>
      <p>Please try loading the page again.</p>
      <button type="button" onClick={retry} style={{ minHeight: 44, background: "#060b1a", border: 0, borderRadius: 10, color: "white", cursor: "pointer", fontWeight: 700, padding: "12px 20px" }}>Reload page</button>
    </section>
  </main>;
}
