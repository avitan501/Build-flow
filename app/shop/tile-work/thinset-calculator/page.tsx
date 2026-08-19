import Link from "next/link"

import { ThinsetCalculator } from "@/components/buildflow/thinset-calculator"
import { pageMetadata } from "@/lib/site-metadata"
import { translateShopText } from "@/lib/shop-i18n"
import { getRequestedShopLanguage } from "@/lib/shop-language-server"

export const metadata = pageMetadata({
  title: "Thinset Material Calculator | Avantia Build",
  description: "Plan tile-setting material quantities for a construction project.",
  path: "/shop/tile-work/thinset-calculator",
})

export default async function ThinsetCalculatorPage() {
  const language = await getRequestedShopLanguage()
  const t = (text: string) => translateShopText(text, language)
  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-4 pb-28 text-slate-900 sm:px-6 sm:py-5 sm:pb-10 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-4">
        <Link href="/shop/tile-work" className="w-fit text-sm font-bold text-sky-700">
          {t("Back to Tile")}
        </Link>
        <h1 className="text-[2rem] font-bold tracking-normal text-slate-950 sm:text-[2.4rem]">{t("Thinset calculator")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">Estimate the number of thinset bags from the tile area, tile size, trowel, bag coverage, and waste.</p>
        <ThinsetCalculator />
      </section>
    </main>
  )
}
