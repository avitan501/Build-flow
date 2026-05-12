import type { ReactNode } from "react";
import Link from "next/link";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h10" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="m18.5 3 .6 1.9L21 5.5l-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6.6-1.9Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="7" height="7" rx="1.5" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" />
      <rect x="3" y="13" width="7" height="7" rx="1.5" />
      <rect x="14" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 9.5h14l-1 9A2 2 0 0 1 16 20H8a2 2 0 0 1-2-1.5l-1-9Z" />
      <path d="M9 9.5V8a3 3 0 1 1 6 0v1.5" />
    </svg>
  );
}

function MaterialsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v16" />
      <path d="M16 7.5c0-1.4-1.8-2.5-4-2.5s-4 1.1-4 2.5 1.8 2.5 4 2.5 4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 19 7v10l-7 4-7-4V7l7-4Z" />
      <path d="m3 7 9 5 9-5" />
      <path d="M12 12v9" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function OverviewIcon({ tone }: { tone: "blue" | "green" | "gold" }) {
  const bg = tone === "blue" ? "#e0f2fe" : tone === "green" ? "#dcfce7" : "#fef3c7";
  const stroke = tone === "blue" ? "#0369a1" : tone === "green" ? "#15803d" : "#a16207";
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: bg, color: stroke }}>
      {tone === "blue" ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20" />
          <path d="M6.5 22A2.5 2.5 0 0 1 4 19.5V6a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v3" />
        </svg>
      ) : tone === "green" ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8" />
          <path d="m8.5 12 2.2 2.2 4.8-4.8" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="4" width="12" height="16" rx="2" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
        </svg>
      )}
    </span>
  );
}

function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "green" }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.18em] ${tone === "green" ? "border-emerald-100 bg-emerald-50/90 text-emerald-700" : "border-slate-100 bg-white/95 text-slate-500"}`}>
      {children}
    </span>
  );
}

function ProjectCard({ name }: { name: string }) {
  return (
    <div className="min-w-[185px] rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          <FolderIcon />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold tracking-[-0.03em] text-slate-950">{name}</p>
          <p className="mt-1 text-[11px] text-slate-500">Draft · Apr 30, 2026</p>
        </div>
      </div>
      <div className="mt-4 inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-emerald-700">
        WORKSPACE
      </div>
    </div>
  );
}

function ToolCard({ icon, title, text, tone }: { icon: ReactNode; title: string; text: string; tone: "blue" | "green" | "purple" }) {
  const toneClass = tone === "blue" ? "bg-sky-50 text-sky-700" : tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-fuchsia-50 text-fuchsia-700";

  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold tracking-[-0.03em] text-slate-950">{title}</p>
        <p className="mt-1 text-[12px] leading-5 text-slate-500">{text}</p>
      </div>
      <span className="text-slate-400">
        <ChevronRightIcon />
      </span>
    </div>
  );
}

function OverviewCard({ value, label, tone }: { value: string; label: string; tone: "blue" | "green" | "gold" }) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <OverviewIcon tone={tone} />
      <div className="flex-1">
        <p className="text-[28px] font-semibold leading-none tracking-[-0.05em] text-slate-950">{value}</p>
        <p className="mt-1 text-[12px] text-slate-500">{label}</p>
      </div>
      <span className="text-slate-400">
        <ChevronRightIcon />
      </span>
    </div>
  );
}

function DockItem({ label, active, icon, accent }: { label: string; active?: boolean; accent?: boolean; icon: ReactNode }) {
  return (
    <div className={`flex flex-1 flex-col items-center gap-1 rounded-[18px] px-1 py-1.5 ${active ? "bg-sky-50 text-slate-900" : "text-slate-500"}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${accent ? "bg-[linear-gradient(180deg,#f7d87e_0%,#e0ad32_100%)] text-slate-900 shadow-[0_10px_16px_rgba(224,173,50,0.28)]" : active ? "bg-white text-slate-900 shadow-[0_8px_14px_rgba(148,163,184,0.12)]" : "bg-transparent"}`}>
        {icon}
      </span>
      <span className={`text-[10px] font-medium ${active || accent ? "text-slate-900" : "text-slate-500"}`}>{label}</span>
    </div>
  );
}

export default function ProjectsMobileMockupPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#edf6ff_0%,#f7fbff_45%,#edf4fb_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-5">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/70">BuildFlow mockup</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Projects mobile preview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Updated to follow the reference more closely: brighter, cleaner, and more app-like.</p>
        </div>

        <div className="relative w-full max-w-[390px] overflow-hidden rounded-[42px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.48))] p-3 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
          <div className="absolute left-1/2 top-2 h-6 w-32 -translate-x-1/2 rounded-full bg-slate-950" />
          <div className="relative overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(180deg,#f7fbff_0%,#edf6ff_100%)] px-4 pb-28 pt-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.38),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.85),transparent_22%)]" />

            <div className="relative">
              <header className="rounded-[26px] border border-white/85 bg-white/92 px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <button className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-800">
                    <MenuIcon />
                  </button>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#163c86] text-base font-semibold text-white shadow-[0_8px_16px_rgba(22,60,134,0.22)]">BF</div>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold tracking-[-0.03em] text-slate-950">BuildFlow</p>
                      <p className="truncate text-[11px] text-slate-500">Construction materials + project flow</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-700 shadow-[0_8px_16px_rgba(15,23,42,0.04)]">
                      <SearchIcon />
                    </button>
                    <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-700 shadow-[0_8px_16px_rgba(15,23,42,0.04)]">
                      <UserIcon />
                    </button>
                    <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-700 shadow-[0_8px_16px_rgba(15,23,42,0.04)]">
                      <SparkleIcon />
                      <span className="absolute right-1 top-1 text-[10px] text-fuchsia-500">•</span>
                    </button>
                  </div>
                </div>
              </header>

              <section className="mt-5 rounded-[30px] border border-white/90 bg-white/94 px-5 py-6 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
                <p className="text-[12px] font-semibold uppercase tracking-[0.32em] text-slate-500">Projects</p>
                <h2 className="mt-3 text-[36px] font-semibold leading-[0.95] tracking-[-0.06em] text-slate-950">Your projects</h2>
                <p className="mt-4 max-w-[17rem] text-[14px] leading-7 text-slate-600">Create a new project or open an existing workspace to manage plans, materials, quotes, and orders.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Pill>CLIENT</Pill>
                  <Pill tone="green">PROJECTS HUB</Pill>
                </div>

                <div className="mt-6 rounded-[28px] border border-slate-100 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500">Primary action</p>
                  <div className="mt-4 flex items-center gap-3 rounded-[20px] bg-[linear-gradient(180deg,#ffd669_0%,#f0bf4a_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_14px_24px_rgba(240,191,74,0.24)]">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 shadow-[0_8px_16px_rgba(15,23,42,0.08)]">
                      <PlusIcon />
                    </span>
                    <span className="flex-1 text-[17px] font-semibold tracking-[-0.03em] text-slate-950">Start New Project</span>
                    <span className="rounded-full bg-white/72 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-slate-800">LIVE</span>
                  </div>
                  <p className="mt-4 text-[14px] leading-6 text-slate-600">Create a new job or continue from an existing workspace.</p>
                </div>

                <div className="mt-7 flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-[17px] font-semibold tracking-[-0.04em] text-slate-950">My projects</h3>
                  </div>
                  <Link href="#" className="inline-flex items-center gap-1 text-[13px] font-medium text-sky-700">
                    View all projects <ChevronRightIcon />
                  </Link>
                </div>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <ProjectCard name="204 Oak Wood" />
                  <ProjectCard name="Test Project 001" />
                  <ProjectCard name="Kika" />
                </div>

                <div className="mt-7">
                  <h3 className="text-[17px] font-semibold tracking-[-0.04em] text-slate-950">Project tools</h3>
                  <div className="mt-4 space-y-3">
                    <ToolCard icon={<MaterialsIcon />} title="Materials" text="Review material items" tone="blue" />
                    <ToolCard icon={<QuoteIcon />} title="Quotes" text="Check pricing and approvals" tone="green" />
                    <ToolCard icon={<OrdersIcon />} title="Orders" text="Track approved orders" tone="purple" />
                  </div>
                </div>

                <div className="mt-7">
                  <h3 className="text-[17px] font-semibold tracking-[-0.04em] text-slate-950">Overview</h3>
                  <div className="mt-4 space-y-3">
                    <OverviewCard value="11" label="Total" tone="blue" />
                    <OverviewCard value="3" label="Active" tone="green" />
                    <OverviewCard value="8" label="Draft" tone="gold" />
                  </div>
                </div>
              </section>
            </div>

            <div className="pointer-events-none absolute inset-x-3 bottom-4">
              <div className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(244,248,255,0.52))] p-2 shadow-[0_24px_44px_rgba(15,23,42,0.12)] backdrop-blur-[18px]">
                <div className="grid grid-cols-5 gap-1">
                  <DockItem label="Home" icon={<HomeIcon />} />
                  <DockItem label="Projects" active icon={<GridIcon />} />
                  <DockItem label="Shop" accent icon={<ShopIcon />} />
                  <DockItem label="Account" icon={<UserIcon />} />
                  <DockItem label="Search" icon={<SearchIcon />} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
