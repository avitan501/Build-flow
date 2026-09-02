import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

test("public quote fallback sends every attachment and verifies the saved count", async () => {
  const [form, action] = await Promise.all([
    readFile(
      path.join(root, "components/buildflow/quote-request-form.tsx"),
      "utf8",
    ),
    readFile(path.join(root, "app/request-quote/actions.ts"), "utf8"),
  ]);

  expect(form).toContain(
    "files.length === 1 && totalSize <= directAttachmentSize",
  );
  expect(form).toContain(
    'submission.set("attachmentUploads", JSON.stringify(uploads))',
  );
  expect(action).toContain("attachments?: QuoteIntakeAttachmentPayload[]");
  expect(action).toContain("attachments: attachments.map((attachment) => ({");
  expect(action).not.toContain("attachment: attachments[0]\n      ? {");
  expect(action).toContain(
    "saved.attachmentCount === attachments.length",
  );
});

test("Edge fallback accepts legacy attachment but persists the plural contract as one batch", async () => {
  const edge = await readFile(
    path.join(root, "supabase/functions/public-quote-intake/index.ts"),
    "utf8",
  );

  expect(edge).toContain("attachments?: QuoteAttachmentPayload[]");
  expect(edge).toContain("attachment?: QuoteAttachmentPayload");
  expect(edge).toContain("return payload.attachment ? [payload.attachment] : []");
  expect(edge).toContain("const maxAttachmentCount = 10");
  expect(edge).toContain(
    "for (const [index, attachment] of incomingAttachments.entries())",
  );
  expect(edge).toContain(
    "for (const attachment of preparedAttachments)",
  );
  expect(edge).toContain('.insert(attachmentRows)');
  expect(edge).toContain(
    "insertedAttachments?.length !== attachmentRows.length",
  );
  expect(edge).toContain(
    "attachmentCount: preparedAttachments.length",
  );
});

test("Edge fallback rolls back every finalized and staged file on any failure", async () => {
  const edge = await readFile(
    path.join(root, "supabase/functions/public-quote-intake/index.ts"),
    "utf8",
  );

  expect(edge).toContain("const storedFilePaths: string[] = []");
  expect(edge).toContain("storedFilePaths.push(storedFilePath)");
  expect(edge).toContain(
    "const rollbackPaths = [...new Set([...storedFilePaths, ...temporaryPaths])]",
  );
  expect(edge).toContain(
    'supabase.storage.from("project-uploads").remove(rollbackPaths)',
  );
  expect(edge).toContain(
    'supabase.from("projects").delete().eq("id", projectId)',
  );
  expect(edge).toContain('return json({ error: "save_failed" }, 500)');
});
