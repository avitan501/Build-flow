import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("construction knowledge has one owner-only workspace and one existing store", async () => {
  const [toolsPage, knowledgePage, actions, smsPage] = await Promise.all([
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/construction-knowledge/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/construction-knowledge/actions.ts"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/sms-replies/page.tsx"), "utf8"),
  ])

  expect(toolsPage).toContain("/admin/ai-tools/construction-knowledge")
  expect(toolsPage).toContain("Construction Knowledge")
  expect(knowledgePage).toContain("!access.aiTools || !access.owner")
  expect(knowledgePage).toContain('from("aura_ai_reply_knowledge")')
  expect(knowledgePage).toContain("updateConstructionKnowledgeAction")
  expect(knowledgePage).toContain("Stable, reviewed facts only")
  expect(knowledgePage).toContain("Ask Construction AI")
  expect(knowledgePage).toContain("The answer uses active, reviewed facts from this page only.")
  expect(knowledgePage).toContain("guidanceForQuestion(question, knowledge)")
  expect(knowledgePage).toContain("Order Standards")
  expect(knowledgePage).toContain("Dumpster / container example")
  expect(knowledgePage).toContain("10, 15, 20, 30, or 40 yard container")
  expect(knowledgePage).toContain("Ask only unresolved questions")
  expect(knowledgePage).toContain("addOrderStandardAction")
  expect(actions).toContain("requireConstructionKnowledgeOwner")
  expect(actions).toContain("!profile.access.aiTools || !profile.access.owner")
  expect(actions).toContain('from("aura_ai_reply_knowledge")')
  expect(actions).toContain("reviewed_by: user.id")
  expect(actions).toContain("export async function addOrderStandardAction")
  expect(actions).toContain("order-standard-${slug}")
  expect(actions).toContain("Ask only what is still unresolved")
  expect(actions.match(/from\("aura_ai_reply_knowledge"\)/g)?.length).toBe(4)
  expect(actions).not.toContain("order_standards")
  expect(smsPage).toContain('href="/admin/ai-tools/construction-knowledge"')
  expect(smsPage).not.toContain("saveSmsAiKnowledgeAction")
})

test("knowledge RLS preserves staff reads and restricts every mutation to owners", async () => {
  const migration = await readFile(path.join(root, "supabase/migrations/20260830122854_owner_construction_knowledge.sql"), "utf8")

  expect(migration).toContain('create policy "aura_ai_reply_knowledge_manager_select"')
  expect(migration).toContain("private.is_admin_or_staff")
  expect(migration).toContain('create policy "aura_ai_reply_knowledge_owner_insert"')
  expect(migration).toContain('create policy "aura_ai_reply_knowledge_owner_update"')
  expect(migration).toContain('create policy "aura_ai_reply_knowledge_owner_delete"')
  expect(migration.match(/private\.is_admin\(\)/g)?.length).toBeGreaterThanOrEqual(4)
  expect(migration).toContain("on conflict (fact, source_path) do nothing")
  const seededFacts = migration.slice(migration.indexOf("insert into public.aura_ai_reply_knowledge"))
  expect(seededFacts).not.toMatch(/\$\d+(?:\.\d{2})?\b/)
  expect(seededFacts).not.toMatch(/in stock|available today|guaranteed delivery/i)
})
