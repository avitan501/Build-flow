import { expect, test } from "@playwright/test";

import { sendClientQuoteEmail } from "@/lib/cart-submission-email";

test("client quote email is branded and excludes internal pricing", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  let requestBody: Record<string, unknown> | null = null;
  process.env.RESEND_API_KEY = "test-key";
  global.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body || "{}")) as Record<string, unknown>;
    return new Response(JSON.stringify({ id: "email-test-id" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const result = await sendClientQuoteEmail({
      comparisonId: "comparison-id",
      quoteNumber: "ABQ-TEST",
      recipientName: "Jacob Darry",
      recipientEmail: "jacob@example.com",
      jobAddress: "280 Lawrence Avenue, Lawrence, NY 11559",
      expiresOn: "2026-09-12",
      message: "Delivery is included.",
      items: [{
        description: "2 x 4 x 10 ft. studs",
        specification: "Douglas Fir",
        quantity: 400,
        unit: "piece",
        unitPrice: 7.19,
        lineTotal: 2876,
      }],
      deliveryCharge: 275,
      total: 3151,
      pdfBase64: "JVBERi0xLjQK",
      idempotencyKey: "client-quote-test",
    });

    expect(result).toEqual({ status: "sent", providerId: "email-test-id" });
    expect(requestBody).not.toBeNull();
    const body = requestBody as Record<string, unknown>;
    expect(body.from).toContain("office@build.avantiap.com");
    expect(body.reply_to).toBe("office@build.avantiap.com");
    expect(body.subject).toContain("ABQ-TEST");
    expect(String(body.html)).toContain("avantia-build-lockup-share.png");
    expect(String(body.html)).toContain("(516) 908-8319");
    expect(String(body.html)).toContain("processing fee of up to 3%");
    expect(String(body.html)).not.toContain("Valid through");
    expect(String(body.text)).toContain("processing fee of up to 3%");
    expect(String(body.text)).not.toContain("2026-09-12");
    expect(String(body.html)).not.toMatch(/supplier cost|private profit|markup/i);
    expect(body.attachments).toEqual([{ filename: "ABQ-TEST.pdf", content: "JVBERi0xLjQK" }]);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  }
});
