import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

test("direct Meta media is downloaded after webhook acknowledgement and kept private", async () => {
  const root = process.cwd();
  const [broker, downloadRoute, inbox] = await Promise.all([
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
    readFile(path.join(root, "app/api/aura/attachments/[communicationId]/[attachmentId]/route.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/unified-communication-inbox.tsx"), "utf8"),
  ]);

  expect(broker).toContain("persistMetaWhatsAppMedia");
  expect(broker).toContain("https://graph.facebook.com/${params.config.graphVersion}/${encodeURIComponent(mediaId)}");
  expect(broker).toContain('headers: { Authorization: `Bearer ${params.config.accessToken}` }');
  expect(broker).toContain("trustedMetaMediaUrl(metadata.url)");
  expect(broker).toContain("boundedResponseBytes(download, META_MEDIA_MAX_BYTES)");
  expect(broker).toContain("inbound-whatsapp/${params.communicationId}/${mediaId}-");
  expect(broker).toContain("storage.from(RESEND_ATTACHMENT_BUCKET).upload");
  expect(broker).toContain("upsert: true");
  expect(broker).toContain("processingStatus: \"failed\"");
  expect(downloadRoute).toContain("inbound-whatsapp/${communicationId}/${attachmentId}-");
  expect(downloadRoute).toContain('Cache-Control": "private, no-store"');
  expect(downloadRoute).toContain("getSessionWithProfile");
  expect(inbox).toContain("Attachment unavailable — ask the customer to resend");
});

test("WhatsApp image, PDF, and voice inputs are available to AI but remain manager-reviewed", async () => {
  const root = process.cwd();
  const [broker, detector, inbox] = await Promise.all([
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
    readFile(path.join(root, "lib/aura/material-request-detection.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/unified-communication-inbox.tsx"), "utf8"),
  ]);

  expect(broker).toContain("transcribeWhatsAppAudio");
  expect(broker).toContain('form.set("model", "gpt-4o-mini-transcribe")');
  expect(broker).toContain("coalesce(communication.body, communication.transcript) as body");
  expect(broker).toContain("storedCommunicationMediaBytes(item, 10 * 1024 * 1024)");
  expect(broker).toContain('type !== "application/pdf"');
  expect(broker).toContain("file_data: `data:${type};base64,${bytesToBase64(bytes)}`");
  expect(broker).toContain("Latest-message PDF documents attached for factual review");
  expect(broker).toContain("AI found a material request. Review before creating it.");
  expect(detector).toContain('["sms", "whatsapp"].includes(channel)');
  expect(inbox).toContain("Review material request");
  expect(broker).not.toContain("createComparisonFromMetaWhatsApp");
});

