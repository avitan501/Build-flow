import Link from "next/link"

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler"
import { getSessionWithProfile } from "@/lib/auth"

const heroImage =
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1400&q=80"
const materialsImage =
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=80"

const flowSteps = [
  {
    title: "Create Project",
    number: "1",
    text: "Open the project and keep the basics in one place.",
  },
  {
    title: "Upload Plans",
    number: "2",
    text: "Send drawings, photos, and notes from the field.",
  },
  {
    title: "Review Materials & Quote",
    number: "3",
    text: "See what is needed before anything moves forward.",
  },
  {
    title: "Approve Order",
    number: "4",
    text: "Stay in control before any order is confirmed.",
  },
]

const featureCards = [
  {
    eyebrow: "Projects",
    title: "Organize jobs clearly",
    body: "Keep job details, address, timeline, and client info ready before uploads begin.",
    hrefKey: "projects" as const,
    image: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
    iconBg: "bg-sky-600",
    icon: "grid" as const,
  },
  {
    eyebrow: "Uploads",
    title: "Collect plans fast",
    body: "Send plans, photos, and documents so the next material step has the right context.",
    hrefKey: "upload" as const,
    image: "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=1200&q=80",
    iconBg: "bg-cyan-500",
    icon: "upload" as const,
  },
  {
    eyebrow: "Orders",
    title: "Review with confidence",
    body: "Review quotes, approve orders, and keep project decisions lined up in one flow.",
    hrefKey: "orders" as const,
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80",
    iconBg: "bg-amber-500",
    icon: "shield" as const,
  },
]

function FeatureIcon({ type }: { type: (typeof featureCards)[number]["icon"] }) {
  if (type === "upload") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 16V5" />
        <path d="m7 10 5-5 5 5" />
        <path d="M5 19h14" />
      </svg>
    )
  }

  if (type === "shield") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
        <path d="m9.5 12 1.7 1.7 3.8-4" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export default async function Home() {
  const { user } = await getSessionWithProfile()
  const isSignedIn = Boolean(user)
  const gatedHref = isSignedIn ? null : "/login"
  const projectsHref = gatedHref ?? "/projects"
  const uploadHref = gatedHref ?? "/upload"
  const ordersHref = gatedHref ?? "/orders"
  const shopHref = gatedHref ?? "/search"

  const hrefs = {
    projects: projectsHref,
    upload: uploadHref,
    orders: ordersHref,
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-[linear-gradient(180deg,#f7fbff_0%,#eef6ff_45%,#ffffff_100%)] text-slate-900">
      <RecoveryLinkHandler />

      <section className="relative mx-auto flex min-h-screen max-w-4xl flex-col gap-5 px-4 pb-28 pt-4 sm:gap-6 sm:px-8 sm:pb-12 sm:pt-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.18),_transparent_58%)]" />

        <section className="overflow-hidden rounded-[32px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,247,255,0.92))] shadow-[0_20px_50px_rgba(148,163,184,0.12)]">
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Client workflow</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.4rem]">Start your project with confidence</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">Upload plans, organize materials, review quotes, and approve orders in one clean workflow.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={projectsHref} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_30px_rgba(220,168,69,0.22)] active:scale-[0.99]">
                  Log in to Start Project
                </Link>
                <Link href="/signup" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm active:scale-[0.99]">
                  Create Account
                </Link>
                <span className="inline-flex min-h-11 items-center rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">Nothing moves forward without approval</span>
              </div>
            </div>

            <div
              className="relative min-h-[260px] overflow-hidden rounded-[28px] border border-sky-100/80 shadow-[0_18px_42px_rgba(15,23,42,0.16)]"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(14,35,65,0.08) 0%, rgba(14,35,65,0.34) 48%, rgba(14,35,65,0.76) 100%), url(${heroImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(243,203,114,0.26),transparent_36%)]" />
              <div className="relative flex h-full flex-col justify-between p-5 text-white sm:p-6">
                <div className="flex justify-end">
                  <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/88 backdrop-blur-sm">Premium client view</span>
                </div>
                <div>
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/12 text-white shadow-[0_10px_24px_rgba(15,23,42,0.2)] backdrop-blur-sm">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 19h16" />
                      <path d="M5 19V9l7-4 7 4v10" />
                      <path d="M9 19v-5h6v5" />
                    </svg>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold tracking-tight text-white">A cleaner front door for projects, materials, quotes, and approvals.</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-white/82">Professional residential imagery keeps the product feeling real, while overlays and compact cards keep every next action easy to read.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,247,255,0.92))] px-5 py-5 shadow-[0_20px_50px_rgba(148,163,184,0.12)] sm:px-6 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">How BuildFlow works</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">One clear path from project setup to approval</h2>
            </div>
            <span className="shrink-0 rounded-full border border-sky-100 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm">4 steps</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {flowSteps.map((step) => (
              <div key={step.number} className="rounded-[26px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(241,247,255,0.82))] px-4 py-4 shadow-[0_12px_28px_rgba(148,163,184,0.08)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,#0f315f_0%,#17457b_100%)] text-xs font-semibold text-white shadow-[0_10px_20px_rgba(14,35,65,0.18)]">{step.number}</div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{step.title}</p>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {featureCards.map((card) => (
            <article key={card.title} className="overflow-hidden rounded-[28px] border border-sky-100 bg-white shadow-[0_18px_40px_rgba(148,163,184,0.1)]">
              <div
                className="relative min-h-[148px]"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(14,35,65,0.08) 0%, rgba(14,35,65,0.5) 100%), url(${card.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(243,203,114,0.24),transparent_36%)]" />
                <div className={`absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl ${card.iconBg} text-white shadow-[0_12px_24px_rgba(15,23,42,0.2)]`}>
                  <FeatureIcon type={card.icon} />
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{card.eyebrow}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
                <Link href={hrefs[card.hrefKey]} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#0e2341] underline underline-offset-4 active:scale-[0.99]">
                  {isSignedIn ? `Open ${card.eyebrow.toLowerCase()}` : `Log in to view ${card.eyebrow.toLowerCase()}`}
                </Link>
              </div>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-[28px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(232,243,255,0.88))] shadow-[0_18px_46px_rgba(148,163,184,0.12)]">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Search materials</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">Make material search feel like a real buying tool</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Search what you need, keep results tied to the right project, and move forward with more confidence once you sign in.</p>
              <div className="mt-4 flex min-h-14 items-center gap-3 rounded-[20px] border border-sky-100 bg-white px-4 py-3 text-slate-900 shadow-[0_12px_26px_rgba(148,163,184,0.1)]">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <span className="text-sm text-slate-500">Search lumber, drywall, insulation, concrete, and finish materials after login</span>
              </div>
              <Link href={shopHref} className="mt-4 inline-flex text-sm font-semibold text-sky-700 underline underline-offset-4 active:scale-[0.99]">
                {isSignedIn ? "Open search" : "Open search after login"}
              </Link>
            </div>
            <div
              className="relative min-h-[220px] border-t border-sky-100/70 lg:min-h-full lg:border-l lg:border-t-0"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(14,35,65,0.06) 0%, rgba(14,35,65,0.54) 100%), url(${materialsImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(243,203,114,0.24),transparent_38%)]" />
              <div className="relative flex h-full flex-col justify-end p-5 text-white sm:p-6">
                <div className="inline-flex max-w-max items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-sm">Project-linked search</div>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/82">Clean imagery, clear contrast, and a stronger feature frame make search feel helpful instead of placeholder.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-sky-100 bg-white px-5 py-4 text-center shadow-[0_12px_28px_rgba(148,163,184,0.08)]">
          <p className="text-sm font-medium text-slate-700">Nothing is ordered, charged, or sent without approval.</p>
        </section>
      </section>
    </main>
  )
}
