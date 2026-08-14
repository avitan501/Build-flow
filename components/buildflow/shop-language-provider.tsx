"use client"

import { usePathname } from "next/navigation"
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { SHOP_LANGUAGE_COOKIE, translateShopText, type ShopLanguage } from "@/lib/shop-i18n"

type ShopLanguageContextValue = {
  language: ShopLanguage
  setLanguage: (language: ShopLanguage) => void
}

type TextRecord = { original: string; translated: string }
type AttributeRecord = { original: string; translated: string }

const ShopLanguageContext = createContext<ShopLanguageContextValue | null>(null)
const textRecords = new WeakMap<Text, TextRecord>()
const attributeRecords = new WeakMap<Element, Map<string, AttributeRecord>>()
const TRANSLATED_ATTRIBUTES = ["aria-label", "alt", "placeholder", "title"] as const
const SKIPPED_SUBTREE_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"])

function updateTextNode(node: Text, spanish: boolean) {
  const record = textRecords.get(node)
  if (!spanish) {
    if (!record) return
    textRecords.delete(node)
    if (node.data === record.translated) node.data = record.original
    return
  }

  if (record && node.data === record.translated) return
  const original = node.data
  const translated = translateShopText(original, "es")
  textRecords.set(node, { original, translated })
  if (translated !== original) node.data = translated
}

function updateElementAttributes(element: Element, spanish: boolean) {
  let records = attributeRecords.get(element)
  if (!spanish) {
    if (!records) return
    for (const [name, record] of records) {
      if (element.getAttribute(name) === record.translated) element.setAttribute(name, record.original)
    }
    attributeRecords.delete(element)
    return
  }

  for (const name of TRANSLATED_ATTRIBUTES) {
    const current = element.getAttribute(name)
    if (!current) continue
    const existing = records?.get(name)
    if (existing && current === existing.translated) continue
    const translated = translateShopText(current, "es")
    if (!records) {
      records = new Map()
      attributeRecords.set(element, records)
    }
    records.set(name, { original: current, translated })
    if (translated !== current) element.setAttribute(name, translated)
  }
}

function updateSurface(root: Node, spanish: boolean) {
  if (root instanceof Text) {
    if (!root.parentElement || root.parentElement.tagName === "TEXTAREA" || SKIPPED_SUBTREE_TAGS.has(root.parentElement.tagName) || root.parentElement.closest("[data-no-shop-translation]")) return
    updateTextNode(root, spanish)
    return
  }
  if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) return
  if (root instanceof Element) {
    if (SKIPPED_SUBTREE_TAGS.has(root.tagName) || root.closest("[data-no-shop-translation]")) return
    updateElementAttributes(root, spanish)
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const element = node instanceof Element ? node : node.parentElement
      if (element && (SKIPPED_SUBTREE_TAGS.has(element.tagName) || element.closest("[data-no-shop-translation]"))) return NodeFilter.FILTER_REJECT
      if (node instanceof Text && element?.tagName === "TEXTAREA") return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  let node = walker.nextNode()
  while (node) {
    if (node instanceof Text) updateTextNode(node, spanish)
    else if (node instanceof Element) updateElementAttributes(node, spanish)
    node = walker.nextNode()
  }
}

export function ShopLanguageProvider({ initialLanguage, children }: { initialLanguage: ShopLanguage; children: ReactNode }) {
  const pathname = usePathname()
  const [language, updateLanguage] = useState<ShopLanguage>(initialLanguage)
  const isShop = Boolean(pathname?.startsWith("/shop"))
  const spanish = isShop && language === "es"

  useEffect(() => {
    if (!isShop) return
    const storedLanguage = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SHOP_LANGUAGE_COOKIE}=`))
      ?.split("=")[1]
    if (storedLanguage !== "es") return
    const frame = window.requestAnimationFrame(() => updateLanguage("es"))
    return () => window.cancelAnimationFrame(frame)
  }, [isShop, pathname])

  useEffect(() => {
    document.documentElement.lang = spanish ? "es" : "en"
    updateSurface(document.body, spanish)
    if (!isShop) return

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") updateSurface(mutation.target, spanish)
        if (mutation.type === "attributes") updateElementAttributes(mutation.target as Element, spanish)
        for (const node of mutation.addedNodes) updateSurface(node, spanish)
      }
    })
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...TRANSLATED_ATTRIBUTES] })
    return () => observer.disconnect()
  }, [isShop, pathname, spanish])

  function setLanguage(nextLanguage: ShopLanguage) {
    updateLanguage(nextLanguage)
    if (nextLanguage === "es") {
      document.cookie = `${SHOP_LANGUAGE_COOKIE}=es; Path=/shop; Max-Age=31536000; SameSite=Lax`
    } else {
      document.cookie = `${SHOP_LANGUAGE_COOKIE}=; Path=/shop; Max-Age=0; SameSite=Lax`
    }
  }

  const value = useMemo(() => ({ language, setLanguage }), [language])
  return <ShopLanguageContext.Provider value={value}>{children}</ShopLanguageContext.Provider>
}

export function useShopLanguage() {
  const context = useContext(ShopLanguageContext)
  if (!context) throw new Error("useShopLanguage must be used within ShopLanguageProvider")
  return context
}
