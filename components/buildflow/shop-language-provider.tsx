"use client"

import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react"
import { usePathname } from "next/navigation"

import { SHOP_LANGUAGE_COOKIE, translateShopText, type ShopLanguage } from "@/lib/shop-i18n"

type ShopLanguageContextValue = {
  language: ShopLanguage
  setLanguage: (language: ShopLanguage) => void
  t: (value: string) => string
}

const ShopLanguageContext = createContext<ShopLanguageContextValue | null>(null)
const TRANSLATED_ATTRIBUTES = ["aria-label", "alt", "placeholder", "title"] as const

function translateReactNode(node: ReactNode, language: ShopLanguage): ReactNode {
  if (language === "en" || node == null || typeof node === "boolean" || typeof node === "number") return node
  if (typeof node === "string") return translateShopText(node, language)
  if (Array.isArray(node)) return Children.map(node, (entry) => translateReactNode(entry, language))
  if (!isValidElement(node)) return node

  const element = node as ReactElement<Record<string, unknown>>
  const props = element.props
  if (props["data-no-shop-translation"] !== undefined) return element

  const translatedProps: Record<string, unknown> = {}
  for (const attribute of TRANSLATED_ATTRIBUTES) {
    if (typeof props[attribute] === "string") translatedProps[attribute] = translateShopText(props[attribute], language)
  }
  if ("children" in props) translatedProps.children = Children.map(props.children as ReactNode, (child) => translateReactNode(child, language))

  return cloneElement(element, translatedProps)
}

export function ShopLanguageProvider({ initialLanguage, children }: { initialLanguage: ShopLanguage; children: ReactNode }) {
  const pathname = usePathname()
  const [language, updateLanguage] = useState<ShopLanguage>(initialLanguage)
  const isShop = Boolean(pathname?.startsWith("/shop"))

  useEffect(() => {
    if (!isShop) {
      document.documentElement.lang = "en"
      return
    }

    const storedLanguage = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SHOP_LANGUAGE_COOKIE}=`))
      ?.split("=")[1]
    const nextLanguage = storedLanguage === "es" ? "es" : "en"
    document.documentElement.lang = nextLanguage
    const timer = window.setTimeout(() => updateLanguage(nextLanguage), 0)
    return () => window.clearTimeout(timer)
  }, [isShop, pathname])

  useEffect(() => {
    document.documentElement.lang = isShop ? language : "en"
  }, [isShop, language])

  function setLanguage(nextLanguage: ShopLanguage) {
    if (nextLanguage === "es") {
      document.cookie = `${SHOP_LANGUAGE_COOKIE}=es; Path=/shop; Max-Age=31536000; SameSite=Lax`
    } else {
      document.cookie = `${SHOP_LANGUAGE_COOKIE}=; Path=/shop; Max-Age=0; SameSite=Lax`
    }
    window.location.reload()
  }

  const effectiveLanguage = language
  const value = useMemo(() => ({
    language: effectiveLanguage,
    setLanguage,
    t: (text: string) => translateShopText(text, effectiveLanguage),
  }), [effectiveLanguage])

  return <ShopLanguageContext.Provider value={value}>{children}</ShopLanguageContext.Provider>
}

export function ShopTranslationBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { language } = useShopLanguage()
  const activeLanguage = pathname && !pathname.startsWith("/shop") ? "en" : language
  return <>{translateReactNode(children, activeLanguage)}</>
}

export function useShopLanguage() {
  const context = useContext(ShopLanguageContext)
  if (!context) throw new Error("useShopLanguage must be used within ShopLanguageProvider")
  return context
}
