import Link from "next/link"

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler"
import { getSessionWithProfile } from "@/lib/auth"
import { isOwnerIdentity } from "@/lib/owner-access"

const heroImage =
  "/images/buildflow-retail/hero.jpg"

const featureCards = [
  {
    eyebrow: "Projects",
    title: "Organize jobs clearly",
    body: "Keep job details, address, timeline, and client info ready before uploads begin.",
    hrefKey: "projects" as const,
    image: "/images/buildflow-retail/projects.jpg",
    iconBg: "bg-sky-600",
    icon: "grid" as const,
  },
  {
    eyebrow: "Uploads",
    title: "Collect plans fast",
    body: "Send plans, photos, and documents so the next material step has the right context.",
    hrefKey: "upload" as const,
    image: "/images/buildflow-retail/uploads.jpg",
    iconBg: "bg-cyan-500",
    icon: "upload" as const,
  },
  {
    eyebrow: "Orders",
    title: "Review with confidence",
    body: "Review quotes, approve orders, and keep project decisions lined up in one flow.",
    hrefKey: "orders" as const,
    image: "/images/buildflow-retail/orders.jpg",
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
  const { user, profile } = await getSessionWithProfile()
  const isSignedIn = Boolean(user)
  const isOwner = Boolean(
    user &&
      isOwnerIdentity({
        email: user.email || profile?.email,
        phone: user.phone || profile?.phone,
      }),
  )
  const startHref = isSignedIn ? "/shop" : "/login"
  const gatedHref = isSignedIn ? null : "/login"
  const projectsHref = gatedHref ?? "/projects"
  const uploadHref = gatedHref ?? "/upload"
  const ordersHref = gatedHref ?? "/orders"

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
              <div className="inline-flex items-center gap-3 rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.9))] px-3 py-3 shadow-[0_12px_28px_rgba(148,163,184,0.1)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#0e2341_0%,#1a4b86_100%)] text-sm font-semibold tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(14,35,65,0.2)]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 19h16" />
                    <path d="M5 19V9l7-4 7 4v10" />
                    <path d="M9 19v-5h6v5" />
                  </svg>
                </span>
                <div>
                  <p className="text-base font-semibold tracking-tight text-slate-950">instabuild.ca</p>
                  <p className="text-xs text-slate-500">Builder command center</p>
                </div>
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Built for builders</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.4rem]">
                The problem solver for the builder
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                A cleaner way to start a job, choose materials by trade, keep the project address connected, and move decisions forward.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={startHref} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_30px_rgba(220,168,69,0.22)] active:scale-[0.99]">
                  Start Building
                </Link>
                <Link href="/shop" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm active:scale-[0.99]">
                  Open Shop
                </Link>
                {isOwner ? (
                  <Link href="/owner/materials" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-[#0e2341] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(14,35,65,0.18)] active:scale-[0.99]">
                    Add Materials
                  </Link>
                ) : null}
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
                  <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/88 backdrop-blur-sm">Job ready</span>
                </div>
                <div>
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/12 text-white shadow-[0_10px_24px_rgba(15,23,42,0.2)] backdrop-blur-sm">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 19h16" />
                      <path d="M5 19V9l7-4 7 4v10" />
                      <path d="M9 19v-5h6v5" />
                    </svg>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold tracking-tight text-white">Project setup, departments, and buying decisions in one place.</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-white/82">Keep the experience practical for the field while the page still feels clean and professional.</p>
                </div>
              </div>
            </div>
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
      </section>
    </main>
  )
}
