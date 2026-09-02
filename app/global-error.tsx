"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
          }}
        >
          <section style={{ maxWidth: "460px", textAlign: "center" }}>
            <p style={{ color: "#2463a7", fontWeight: 700 }}>AVANTIA BUILD</p>
            <h1>Something went wrong.</h1>
            <p>The problem was reported. Please try again.</p>
            <button
              onClick={reset}
              style={{
                background: "#060b1a",
                border: 0,
                borderRadius: "10px",
                color: "white",
                cursor: "pointer",
                fontWeight: 700,
                padding: "12px 18px",
              }}
              type="button"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
