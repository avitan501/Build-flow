import { access, readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import { approvedStoryVideos, legacyMarketingInventory, marketingPageInventory } from "@/lib/avantia-media-library"
import { auraShareVideos, buildAuraShareVideoCaption } from "@/lib/aura/share-videos"

const root = process.cwd()

async function expectPublicAsset(assetPath: string) {
  await expect(access(path.join(root, "public", assetPath.replace(/^\//, "")))).resolves.toBeUndefined()
}

test("media desk inventories only proven approved story assets and exact scripts", async () => {
  expect(approvedStoryVideos).toHaveLength(9)
  expect(new Set(approvedStoryVideos.map((item) => item.id)).size).toBe(9)
  expect(new Set(approvedStoryVideos.map((item) => item.audience))).toEqual(new Set(["Contractors", "Designers", "Suppliers"]))

  for (const story of approvedStoryVideos) {
    expect(story.transcript.length).toBeGreaterThan(40)
    expect(story.source).toBe("Approved nine-video Avantia story package")
    await Promise.all([expectPublicAsset(story.src), expectPublicAsset(story.poster), expectPublicAsset(story.captions)])
  }

  expect(auraShareVideos).toHaveLength(2)
  for (const video of auraShareVideos) {
    await expectPublicAsset(video.path)
    expect(buildAuraShareVideoCaption(video)).toContain(video.title)
    expect(buildAuraShareVideoCaption(video)).toContain("Reply STOP")
  }
})
test("unapproved repository marketing files remain visibly separated from current assets", async () => {
  expect(legacyMarketingInventory).toHaveLength(7)
  for (const item of legacyMarketingInventory) {
    await Promise.all([expectPublicAsset(item.src), expectPublicAsset(item.poster), expectPublicAsset(item.captions)])
  }

  const library = await readFile(path.join(root, "components/buildflow/media-messages-library.tsx"), "utf8")
  expect(library).toContain("Repository marketing drafts")
  expect(library).toContain("Present on disk, but not proven approved or emailed")
  expect(library).toContain('status="Needs review"')
  expect(library).not.toContain("sendAuraMessageAction")
})

test("marketing pages preserve exact campaign copy and do not invent missing messages", () => {
  expect(marketingPageInventory.map((item) => item.href)).toEqual(expect.arrayContaining([
    "/how-it-works",
    "/request-quote",
    "/beat-a-quote",
    "/admin/goals-progress/beat-your-quote-flyer",
    "/admin/ai-tools/locate-cheap-item",
    "/admin/quote-comparison",
  ]))
  const messages = marketingPageInventory.filter((item) => item.message)
  expect(messages).toHaveLength(2)
  expect(new Set(messages.map((item) => item.message))).toEqual(new Set(["Already have a construction material quote? Send it to Avantia Build and we'll try to beat it. https://build.avantiap.com/beat-a-quote"]))
})

test("manager links and communication handoff are review-only", async () => {
  const [page, tools, dashboard, communicationsPage, inbox, cinematic] = await Promise.all([
    readFile(path.join(root, "app/admin/ai-tools/media-messages/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/build-map/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/communications/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/unified-communication-inbox.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/concierge-video-library.tsx"), "utf8"),
  ])

  expect(page).toContain("requireManagerPortalProfile")
  expect(page).toContain("if (!access.aiTools) redirect")
  expect(tools).toContain('href: "/admin/ai-tools/media-messages"')
  expect(dashboard).toContain('{ href: "/admin/ai-tools/media-messages", label: "Media & Messages" }')
  expect(communicationsPage).toContain("requestedDraft")
  expect(communicationsPage).toContain('slice(0, 1600)')
  expect(inbox).toContain('const [message, setMessage] = useState(initialDraft)')
  expect(inbox).toContain('initialDraft ? "__new__"')
  expect(cinematic).toContain('from "@/lib/avantia-media-library"')
  expect(cinematic).not.toContain("Need material for the job? From your phone")
})
