import { readFile } from "node:fs/promises"
import path from "node:path"

import { loadImage } from "@napi-rs/canvas"
import { expect, test } from "@playwright/test"

import { buildWhatsAppShareUrl, canShareImageFile, normalizeUsSharePhone, shareAds } from "../lib/share-ads"

test("normalizes valid U.S. recipient numbers into E.164", () => {
  expect(normalizeUsSharePhone("(516) 555-0123")).toBe("+15165550123")
  expect(normalizeUsSharePhone("1 516 555 0123")).toBe("+15165550123")
  expect(normalizeUsSharePhone("516-055-0123")).toBeNull()
  expect(normalizeUsSharePhone("516-555-012")).toBeNull()
})

test("WhatsApp links preserve line breaks, emoji, and an optional recipient", () => {
  const message = "Line one\n\n📲 Line two"
  const direct = buildWhatsAppShareUrl(message, "5165550123")
  expect(direct).toBe(`https://wa.me/15165550123?text=${encodeURIComponent(message)}`)
  expect(decodeURIComponent(String(direct).split("text=")[1])).toBe(message)
  expect(buildWhatsAppShareUrl(message)).toBe(`https://wa.me/?text=${encodeURIComponent(message)}`)
  expect(buildWhatsAppShareUrl(message, "bad-number")).toBeNull()
})

test("the approved static library contains four flyers and two messages per flyer", () => {
  expect(shareAds).toHaveLength(4)
  expect(shareAds.every((ad) => ad.imagePath.startsWith("/marketing/share-ads/") && ad.messages.length === 2)).toBeTruthy()
  expect(new Set(shareAds.flatMap((ad) => ad.messages.map((message) => message.id))).size).toBe(8)
  expect(shareAds.flatMap((ad) => ad.messages).every((message) => message.text.includes("avantiabuild.com"))).toBeTruthy()
})

test("image Web Share support requires share and a positive canShare result", () => {
  const file = new File(["flyer"], "flyer.jpg", { type: "image/jpeg" })
  expect(canShareImageFile(undefined, file)).toBeFalsy()
  expect(canShareImageFile({ share: async () => undefined, canShare: () => false } as Pick<Navigator, "share" | "canShare">, file)).toBeFalsy()
  expect(canShareImageFile({ share: async () => undefined, canShare: (data) => data?.files?.[0] === file } as Pick<Navigator, "share" | "canShare">, file)).toBeTruthy()
})

test("every approved flyer remains an original 1080 by 1920 JPG", async () => {
  for (const ad of shareAds) {
    const asset = path.join(process.cwd(), "public", ad.imagePath)
    const image = await loadImage(asset)
    expect({ width: image.width, height: image.height }).toEqual({ width: 1080, height: 1920 })
  }
})

test("the owner page exposes safe share actions, download, and the explicit fallback", async () => {
  const [component, page, navigation, search] = await Promise.all([
    readFile(path.join(process.cwd(), "components/buildflow/share-ads-center.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "app/admin/share-ads/page.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "lib/manager-global-search.ts"), "utf8"),
  ])
  expect(page).toContain('requireOwnerAccess("/admin/share-ads")')
  expect(component).toContain("Share Image + Message")
  expect(component).toContain("Copy Message")
  expect(component).toContain("Download Flyer")
  expect(component).toContain("Open WhatsApp")
  expect(component).toContain("If WhatsApp shows only the image or text")
  expect(component).toContain("Nothing sends automatically")
  expect(navigation).toContain('href: "/admin/share-ads"')
  expect(search).toContain('id: "share-ads"')
})
