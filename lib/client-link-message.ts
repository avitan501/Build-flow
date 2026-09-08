import { LEGACY_PRODUCTION_SITE_ORIGIN, PRODUCTION_SITE_ORIGIN } from "@/lib/site-url"

const ALLOWED_CLIENT_LINK_HOSTS = new Set([
  "avantiabuild.com",
  "www.avantiabuild.com",
  "build.avantiap.com",
  "buy.stripe.com",
])

function replaceEscapedNewlines(value: string) {
  return value.replace(/\\r\\n|\\n|\\r/g, "\n").replace(/\r\n?/g, "\n")
}

export function canonicalClientLink(rawUrl: string) {
  const source = String(rawUrl || "").trim().replace(/[.,;:!?]+$/, "")
  const parsed = new URL(source)
  if (parsed.protocol !== "https:" || !ALLOWED_CLIENT_LINK_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error("The client link must use an approved secure host.")
  }
  if (["undefined", "null"].some((placeholder) => parsed.href.toLowerCase().includes(placeholder))) {
    throw new Error("The client link is incomplete.")
  }
  if (parsed.origin === LEGACY_PRODUCTION_SITE_ORIGIN || parsed.hostname === "www.avantiabuild.com") {
    return `${PRODUCTION_SITE_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`
  }
  return parsed.href
}

function messageWithoutDuplicateLink(messageText: string, rawUrl: string, canonicalUrl: string) {
  let message = replaceEscapedNewlines(String(messageText || ""))
  for (const candidate of new Set([rawUrl.trim(), canonicalUrl])) {
    if (candidate) message = message.split(candidate).join("")
  }
  return message
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function buildClientLinkMessage({
  messageText,
  url,
  fallbackMessage,
}: {
  messageText?: string | null
  url: string
  fallbackMessage: string
}) {
  const canonicalUrl = canonicalClientLink(url)
  const cleanMessage = messageWithoutDuplicateLink(messageText || fallbackMessage, url, canonicalUrl) || fallbackMessage.trim()
  return `${cleanMessage}\n\n${canonicalUrl}`
}

export function splitClientLinkMessage(message: string) {
  const normalized = replaceEscapedNewlines(message).trim()
  const separator = normalized.lastIndexOf("\n\n")
  if (separator < 0) return { text: normalized, url: "" }
  return { text: normalized.slice(0, separator).trim(), url: normalized.slice(separator + 2).trim() }
}
