"use client";

import { PageLoadError } from "@/components/buildflow/page-load-error";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#fff", color: "#0f172a", fontFamily: "system-ui, sans-serif" }}>
        <PageLoadError error={error} retry={retry} />
      </body>
    </html>
  );
}
