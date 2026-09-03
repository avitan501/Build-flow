import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  AURA_EMAIL_ATTACHMENT_MAX_BYTES,
  isTrustedResendAttachmentDownloadUrl,
  parseSafeResendAttachment,
  safeAuraEmailAttachmentName,
} from "@/lib/aura/resend-attachment-policy";

test("accepts only bounded supplier quote attachments from the trusted Resend CDN", () => {
  expect(parseSafeResendAttachment({
    id: "att_123",
    filename: "supplier/quote.pdf",
    size: 4096,
    content_type: "application/pdf",
    download_url: "https://inbound-cdn.resend.com/email/attachments/att_123?signature=test",
  })).toEqual({
    id: "att_123",
    name: "supplier_quote.pdf",
    size: 4096,
    type: "application/pdf",
    downloadUrl: "https://inbound-cdn.resend.com/email/attachments/att_123?signature=test",
  });
  expect(parseSafeResendAttachment({
    id: "att_124",
    filename: "quote.exe",
    size: 4096,
    content_type: "application/x-msdownload",
    download_url: "https://inbound-cdn.resend.com/file",
  })).toBeNull();
  expect(parseSafeResendAttachment({
    id: "att_125",
    filename: "large.pdf",
    size: AURA_EMAIL_ATTACHMENT_MAX_BYTES + 1,
    content_type: "application/pdf",
    download_url: "https://inbound-cdn.resend.com/file",
  })).toBeNull();
});

test("rejects SSRF-shaped attachment links and sanitizes download names", () => {
  expect(isTrustedResendAttachmentDownloadUrl("https://inbound-cdn.resend.com/file")).toBe(true);
  expect(isTrustedResendAttachmentDownloadUrl("http://inbound-cdn.resend.com/file")).toBe(false);
  expect(isTrustedResendAttachmentDownloadUrl("https://inbound-cdn.resend.com.evil.test/file")).toBe(false);
  expect(isTrustedResendAttachmentDownloadUrl("https://127.0.0.1/file")).toBe(false);
  expect(safeAuraEmailAttachmentName("../../vendor\u0000quote.pdf")).toBe(".._.._vendor_quote.pdf");
});

test("verified inbound email attachments are durable, private, and review-only", async () => {
  const root = process.cwd();
  const [resend, attachmentStore, downloadRoute, broker] = await Promise.all([
    readFile(path.join(root, "lib/aura/resend.ts"), "utf8"),
    readFile(path.join(root, "lib/aura/resend-attachments.ts"), "utf8"),
    readFile(path.join(root, "app/api/aura/attachments/[communicationId]/[attachmentId]/route.ts"), "utf8"),
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
  ]);

  expect(resend.indexOf("verifyAuraResendWebhook")).toBeLessThan(resend.indexOf("storeAuraResendEvent"));
  expect(resend).toContain("persistAuraResendAttachments");
  expect(attachmentStore).toContain("/emails/receiving/${emailId}/attachments");
  expect(attachmentStore).toContain('storage.from(AURA_EMAIL_ATTACHMENT_BUCKET)');
  expect(attachmentStore).toContain("upsert: true");
  expect(attachmentStore).toContain("bytes.byteLength !== attachment.size");
  expect(downloadRoute).toContain("managerCapabilities");
  expect(downloadRoute).toContain("access.suppliers");
  expect(downloadRoute).toContain('Cache-Control": "private, no-store"');
  expect(downloadRoute).toContain("session.supabase.storage.from(AURA_EMAIL_ATTACHMENT_BUCKET).download(storagePath)");
  expect(broker).toContain("persistResendAttachments");
  expect(broker).toContain("inbound-email/${params.communicationId}");

  for (const source of [resend, attachmentStore, downloadRoute, broker]) {
    expect(source).not.toContain("createComparisonFromQuote");
    expect(source).not.toContain("supplier_quote_items");
    expect(source).not.toContain("material_supplier_prices");
  }
});
