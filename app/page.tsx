import Link from "next/link"

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler"
import { getSessionWithProfile } from "@/lib/auth"

const serviceCards = [
  {
    symbol: "↗",
    eyebrow: "Projects",
    title: "Start every job clean",
    body: "Create the project, attach the address, and keep the next material steps tied to the right job.",
    hrefKey: "projects" as const,
  },
  {
    symbol: "◇",
    eyebrow: "Shop",
    title: "Choose by department",
    body: "Browse materials and services in the shop without forcing a login before checkout.",
    hrefKey: "shop" as const,
  },
  {
    symbol: "{ }",
    eyebrow: "Plans",
    title: "Upload files with context",
    body: "Send drawings, schedules, and service details into the project flow for review.",
    hrefKey: "start" as const,
  },
  {
    symbol: "✓",
    eyebrow: "Review",
    title: "Keep every request together",
    body: "Review selected materials and uploaded plans together before the final submission.",
    hrefKey: "projects" as const,
  },
]

const imageTiles = [
  {
    label: "Lumber",
    image: "/images/buildflow-retail/lumber.jpg",
  },
  {
    label: "Kitchen",
    image: "/images/buildflow-retail/kitchen.jpg",
  },
  {
    label: "Finish",
    image: "/images/buildflow-retail/finish.jpg",
  },
]

function SymbolBadge({ symbol }: { symbol: string }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#edf7ff_100%)] text-lg font-semibold text-[#0E2A4A] shadow-[0_10px_26px_rgba(14,42,74,0.08)]">
      {symbol}
    </span>
  )
}

export default async function Home() {
  const { user } = await getSessionWithProfile()
  const isSignedIn = Boolean(user)

  const startHref = "/projects/new?next=%2Fshop"
  const hrefs = {
    projects: "/projects",
    shop: "/shop",
    start: startHref,
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-[#f7f9fc] pb-28 text-slate-950 sm:pb-16">
      <RecoveryLinkHandler />

      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-5 sm:px-8 sm:py-8 lg:px-10">
        <section className="grid gap-5 rounded-[34px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-7 lg:grid-cols-[1.03fr_0.97fr] lg:items-stretch lg:p-9">
          <div className="flex flex-col justify-center py-2">
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.03] text-[#071126] sm:text-6xl lg:text-7xl">
              A cleaner way to build from plan to project.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Start a project, add the address, browse materials, upload plans, and keep every request organized before checkout.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={startHref}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#071126] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(7,17,38,0.2)] transition active:scale-[0.99]"
              >
                Start Building
              </Link>
              <Link
                href="/shop"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition active:scale-[0.99]"
              >
                Open Shop
              </Link>
              {!isSignedIn ? (
                <>
                  <Link
                    href="/login"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-[#0E2A4A] shadow-sm transition active:scale-[0.99]"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-sky-100 bg-[#eaf6ff] px-6 py-3 text-sm font-semibold text-[#0E2A4A] transition active:scale-[0.99]"
                  >
                    Create account
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden rounded-[28px] border border-slate-200 bg-[#eef6ff]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(180deg,rgba(7,17,38,0.06),rgba(7,17,38,0.42)),url(/images/buildflow-retail/hero.jpg)",
                backgroundPosition: "center",
                backgroundSize: "cover",
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,rgba(244,207,117,0.38),transparent_30%)]" />
            <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
              <div className="ml-auto grid grid-cols-3 gap-2 rounded-[22px] border border-white/40 bg-white/72 p-2 text-[#071126] shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur">
                {["↗", "◇", "∞"].map((symbol) => (
                  <span key={symbol} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-semibold shadow-sm">
                    {symbol}
                  </span>
                ))}
              </div>
              <div className="max-w-sm rounded-[24px] border border-white/35 bg-white/84 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur">
                <p className="text-sm font-semibold text-[#2a6fbb]">Job flow</p>
                <div className="mt-4 space-y-3">
                  {[
                    ["01", "Project name and address"],
                    ["02", "Materials and plan uploads"],
                    ["03", "One request for review"],
                  ].map(([step, label]) => (
                    <div key={step} className="flex items-center gap-3 border-t border-slate-200 pt-3 first:border-t-0 first:pt-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#071126] text-xs font-semibold text-white">
                        {step}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {serviceCards.map((card) => (
            <Link
              key={card.title}
              href={hrefs[card.hrefKey]}
              className="group rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_22px_54px_rgba(15,23,42,0.1)]"
            >
              <SymbolBadge symbol={card.symbol} />
              <p className="mt-5 text-sm font-semibold text-[#2a6fbb]">{card.eyebrow}</p>
              <h2 className="mt-2 text-xl font-semibold text-[#071126]">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{card.body}</p>
              <span className="mt-5 inline-flex text-sm font-semibold text-[#0E2A4A] underline underline-offset-4">
                Open
              </span>
            </Link>
          ))}
        </section>

        <section className="grid gap-4 rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.06)] sm:p-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-[#2a6fbb]">Departments</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#071126] sm:text-4xl">
              Materials stay visual, simple, and easy to find.
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              The shop can stay practical while the homepage gives customers a sharper first impression.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {imageTiles.map((tile) => (
              <div key={tile.label} className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
                <div
                  className="h-40 bg-cover bg-center sm:h-52"
                  style={{ backgroundImage: `url(${tile.image})` }}
                  role="img"
                  aria-label={`${tile.label} material preview`}
                />
                <div className="bg-white px-4 py-3 text-sm font-semibold text-slate-900">{tile.label}</div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
