/** Persist only bounded numeric provider codes, never arbitrary webhook text/PII. */
export function whatsappDeliveryDiagnostic(errors: unknown): { codes: number[]; message: string } {
  const codes = Array.isArray(errors)
    ? [...new Set(errors.slice(0, 20).flatMap((error: unknown) => {
      const code = error && typeof error === "object" ? (error as { code?: unknown }).code : null;
      return typeof code === "number" && Number.isSafeInteger(code) && code > 0 && code <= 999999999 ? [code] : [];
    }))]
    : [];
  return {
    codes,
    message: codes.length
      ? `Meta WhatsApp delivery error ${codes.join(", ")}. Check these codes in Meta's WhatsApp error reference before retrying.`
      : "Meta WhatsApp delivery error: no numeric error code supplied. Check Meta support before retrying.",
  };
}
