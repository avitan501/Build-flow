import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()
const toolsPath = path.join(root, "app/admin/ai-tools/page.tsx")
const dealsPath = path.join(root, "app/admin/ai-tools/construction-amazon-deals/page.tsx")
const affiliateActionsPath = path.join(root, "app/admin/goals-progress/affiliate-actions.ts")

async function readDealsPage() {
  return readFile(dealsPath, "utf8")
}

test("Manager Tools exposes the Construction Amazon Deals route to owners only", async () => {
  const tools = await readFile(toolsPath, "utf8")

  expect(tools).toContain('access.owner ? [{ href: "/admin/ai-tools/construction-amazon-deals"')
  expect(tools).toContain('title: "Amazon Construction Deals"')
  expect(tools).toContain('badge: "Owner"')
  expect(tools).not.toContain('href: "/admin/ai-tools/amazon-deals"')
})

test("the deals page enforces manager and owner authorization before loading data", async () => {
  const source = await readDealsPage()
  const authIndex = source.indexOf("await requireManagerPortalProfile()")
  const guardIndex = source.indexOf('if (!access.aiTools || !access.owner) redirect("/")')
  const queryIndex = source.indexOf('.from("affiliate_programs")')

  expect(authIndex).toBeGreaterThan(-1)
  expect(guardIndex).toBeGreaterThan(authIndex)
  expect(queryIndex).toBeGreaterThan(guardIndex)
})

test("the page reads the verified Amazon Associates record with the complete safe data shape", async () => {
  const source = await readDealsPage()
  const selectedFields = [
    "supplier_name",
    "affiliate_status",
    "api_status",
    "category",
    "published_commission",
    "cookie_window",
    "new_york_access",
    "safe_tracking_id",
    "deep_links_allowed",
    "product_feeds_allowed",
    "api_allowed",
    "product_images_allowed",
    "affiliate_test_url",
    "application_url",
    "next_action",
    "last_verified_date",
  ]

  expect(source).toContain('.from("affiliate_programs")')
  expect(source).toContain('.eq("supplier_name", "Amazon Associates")')
  expect(source).toContain(".maybeSingle<AmazonProgram>()")
  for (const field of selectedFields) expect(source).toContain(field)
})

test("construction search filters cover four useful categories and encode every Amazon query", async () => {
  const source = await readDealsPage()

  expect(source).toContain('label: "Fasteners & screws"')
  expect(source).toContain('label: "Power tools"')
  expect(source).toContain('label: "Jobsite safety"')
  expect(source).toContain('label: "Measuring & layout"')
  expect(source).toContain("searchCategories.map")
  expect(source).toContain("amazonSearchUrl(category.query)")
  expect(source).toContain("encodeURIComponent(query)")
  expect(source.match(/label: "/g)).toHaveLength(4)
})

test("research, verified affiliate, and dashboard links use the correct external-link protections", async () => {
  const source = await readDealsPage()
  const researchSection = source.slice(source.indexOf("Research construction products"), source.indexOf('aria-label="Amazon deal workflow"'))

  expect(source).toContain("https://www.amazon.com/s?k=")
  expect(researchSection).toContain('target="_blank"')
  expect(researchSection).toContain('rel="noopener noreferrer"')
  expect(researchSection).toContain("prefetch={false}")
  expect(researchSection).toContain("not proof of a deal")
  expect(researchSection).not.toContain("sponsored")
  expect(source).toContain("program.affiliate_test_url")
  expect(source).toContain('rel="noopener noreferrer sponsored"')
  expect(source).toContain("Open verified Amazon link")
  expect(source).toContain("program.application_url")
  expect(source).toContain("Associates dashboard")
  expect(source.match(/target="_blank"/g)?.length).toBeGreaterThanOrEqual(3)
})

test("canonical readiness is visible and incomplete setup can sync through the existing idempotent action", async () => {
  const [source, affiliateActions] = await Promise.all([
    readDealsPage(),
    readFile(affiliateActionsPath, "utf8"),
  ])

  expect(source).toContain('.from("affiliate_program_checklist")')
  expect(source).toContain('.eq("program_id", program.id)')
  expect(source).toContain('aria-label="Amazon setup readiness"')
  expect(source).toContain("Canonical setup checklist")
  expect(source).toContain("{completedChecklist} of {checklist.length} complete")
  expect(source).toContain("Read directly from the existing Affiliate Program tracker")
  expect(source).toContain("recordAmazonAffiliateLinkAction")
  expect(source).toContain("const needsVerifiedSync = verified && checklist.some")
  expect(source).toContain("Sync verified setup")
  expect(source).toMatch(/needsVerifiedSync \?[\s\S]{0,900}Sync verified setup/)
  expect(affiliateActions).toContain("export async function recordAmazonAffiliateLinkAction")
  expect(affiliateActions).toContain("program.notes.includes(AMAZON_LINK_NOTE)")
  expect(affiliateActions).toContain("activityLookupError")
  expect(affiliateActions).toContain("if (!existingActivity)")
  expect(affiliateActions).toContain("if (activityError)")
  expect(affiliateActions).toContain("if (checklistError)")
  expect(source).toContain('sync=${result.ok ? "ok" : "error"}')
  expect(source).toContain('role="status"')
  expect(source).toContain('role="alert"')
  expect(source).not.toMatch(/separate (?:Amazon )?store|live[- ]price/i)
  expect(source).not.toContain('href="/shop/amazon"')
})

test("empty and database-error states remain actionable without leaking technical errors", async () => {
  const source = await readDealsPage()
  const errorBranch = source.slice(source.indexOf("{error || checklistError || !program"), source.indexOf(" : <>"))

  expect(errorBranch).toContain("Amazon setup could not be loaded.")
  expect(errorBranch).toContain("Open the Affiliate Program tracker")
  expect(errorBranch).toContain('href="/admin/goals-progress#supplier-affiliate-program"')
  expect(errorBranch).not.toContain("error.message")
  expect(errorBranch).not.toContain("JSON.stringify")
})

test("deal claims stay in manual review unless both feed and API permissions are connected", async () => {
  const source = await readDealsPage()

  expect(source).toContain("Boolean(program?.product_feeds_allowed && program?.api_allowed)")
  expect(source).toContain('feedConnected ? "Feed connected" : "Manual review"')
  expect(source).toContain("No automatic deal feed is connected.")
  expect(source).toContain("never labels a price as a deal unless a manager verifies it at the source")
  expect(source).not.toMatch(/sale price|percent off|save \d+|limited-time deal/i)
  expect(source).not.toMatch(/\$\d+(?:\.\d{2})?\b/)
})

test("mobile layout uses responsive grids, wrapping actions, and bounded content without horizontal overflow", async () => {
  const source = await readDealsPage()

  expect(source).toContain('className="min-h-screen bg-[#f2f0eb] px-3 py-5 sm:px-6 sm:py-8"')
  expect(source).toContain("mx-auto max-w-6xl")
  expect(source).toContain("flex flex-wrap")
  expect(source).toContain("sm:grid-cols-2")
  expect(source).toContain("lg:grid-cols-4")
  expect(source).toContain("overflow-hidden")
  expect(source).not.toMatch(/min-w-\[(?:[4-9]\d\d|\d{4,})px\]/)
})

test("the page has one clear H1, semantic account data, labeled workflow, and touch-sized links", async () => {
  const source = await readDealsPage()

  expect(source.match(/<h1\b/g)).toHaveLength(1)
  expect(source).toContain(">Amazon Construction Deals</h1>")
  expect(source).toContain("<dl")
  expect(source).toContain("<dt")
  expect(source).toContain("<dd")
  expect(source).toContain('aria-label="Amazon deal workflow"')
  expect(source).toContain('href="/admin/ai-tools"')
  expect(source.match(/min-h-(?:10|11|14)/g)?.length).toBeGreaterThanOrEqual(3)
  expect(source).toContain('title: "Find"')
  expect(source).toContain('title: "Verify"')
  expect(source).toContain('title: "Publish"')
})
