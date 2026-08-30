"use client";

import { useEffect } from "react";

export function CustomerRequestAutoDownload({ publicNumber }: { publicNumber: number | null }) {
  useEffect(() => {
    if (!publicNumber) return;
    const link = document.createElement("a");
    link.href = `/requests/${publicNumber}/pdf`;
    link.download = `Avantia-Request-${publicNumber}.pdf`;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [publicNumber]);
  return null;
}
