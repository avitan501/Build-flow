import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { retrieveInternalAuraDocuments, type AuraInternalKnowledgeDocument } from "@/lib/aura/internal-library";

const root = process.cwd();

test("internal Aura library is owner-only, searchable, and not a messaging source", async () => {
  const [page, tools, migration, broker] = await Promise.all([
    readFile(path.join(root, "app/admin/ai-tools/internal-library/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260831021500_create_internal_aura_library.sql"), "utf8"),
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
  ]);

  expect(page).toContain("!access.aiTools || !access.owner");
  expect(page).toContain('from("aura_internal_knowledge_documents")');
  expect(page).toContain("retrieveInternalAuraDocuments");
  expect(page).toContain("Retrieval only — never customer-sendable");
  expect(tools).toContain("/admin/ai-tools/internal-library");
  expect(migration).toContain("check (retrieval_only)");
  expect(migration).toContain("check (not customer_send_allowed)");
  expect(migration).toContain("revoke all on table public.aura_internal_knowledge_documents from public, anon, authenticated");
  expect(migration).toContain('create policy "aura_internal_library_staff_read"');
  expect(migration).toContain('create policy "aura_internal_library_owner_insert"');
  expect(broker).not.toContain("aura_internal_knowledge_documents");
});

test("retrieval ranks a matching internal playbook and excludes archived or sendable rows", () => {
  const base = {
    category: "operations",
    source_refs: [],
    status: "reviewed_internal" as const,
    retrieval_only: true as const,
    customer_send_allowed: false as const,
    reviewed_at: null,
    updated_at: "2026-08-31T00:00:00Z",
  };
  const documents: AuraInternalKnowledgeDocument[] = [
    { ...base, id: "1", slug: "pdf", title: "PDF supplier workflow", summary: "Import quote rows", content_markdown: "Preserve vendor and delivery", tags: ["documents"] },
    { ...base, id: "2", slug: "sms", title: "SMS reliability", summary: "Durable queue", content_markdown: "Idempotency", tags: ["sms"] },
    { ...base, id: "3", slug: "old", title: "Old PDF", summary: "Archived", content_markdown: "PDF", tags: ["documents"], status: "archived" },
  ];
  expect(retrieveInternalAuraDocuments(documents, "PDF vendor").map((entry) => entry.slug)).toEqual(["pdf"]);
});
