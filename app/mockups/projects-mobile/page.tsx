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

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h3.1l1.8 2H18a2.5 2.5 0 0 1 2.5 2.5v5A2.5 2.5 0 0 1 18 18H6a2.5 2.5 0 0 1-2.5-2.5v-7Z" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 6h10" />
      <path d="M7 10h10" />
      <path d="M7 14h6" />
      <rect x="4" y="3.5" width="16" height="17" rx="3" />
    </svg>
  );
}

function OrderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 12 3 3 7-7" />
      <rect x="4" y="4" width="16" height="16" rx="4" />
    </svg>
  );
}

function MaterialsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16.5 12 4l8 12.5" />
      <path d="M6.8 16.5h10.4" />
      <path d="M9.4 12h5.2" />
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

function ProjectsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="7" height="7" rx="1.5" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" />
      <rect x="3" y="13" width="7" height="7" rx="1.5" />
      <rect x="14" y="13" width="7" height="7" rx="1.5" />
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

function SectionPill({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-sky-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-sky-700 shadow-[0_8px_16px_rgba(148,163,184,0.08)]">{children}</span>;
}

function ProjectCard({ name }: { name: string }) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(239,246,255,0.88))] p-4 shadow-[0_16px_30px_rgba(148,163,184,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold tracking-[-0.03em] text-slate-950">{name}</p>
          <p className="mt-1 text-[12px] text-slate-500">Draft · Apr 30, 2026</p>
        </div>
        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">Draft</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] text-slate-500">
          <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-sky-100/80 text-sky-700"><FolderIcon /></span>
          Workspace ready
        </div>
        <button className="rounded-full border border-sky-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-800 shadow-[0_10px_18px_rgba(148,163,184,0.08)]">
          Open Workspace
        </button>
      </div>
    </div>
  );
}

function ToolCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(240,247,255,0.8))] p-4 shadow-[0_16px_28px_rgba(148,163,184,0.1)]">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(232,242,255,0.92))] text-sky-700 shadow-[0_10px_20px_rgba(148,163,184,0.1)]">
        {icon}
      </span>
      <p className="mt-3 text-[15px] font-semibold tracking-[-0.03em] text-slate-950">{title}</p>
      <p className="mt-1 text-[12.5px] leading-5 text-slate-500">{text}</p>
    </div>
  );
}

function DockItem({ label, active, icon }: { label: string; active?: boolean; icon: ReactNode }) {
  return (
    <div className={`flex flex-1 flex-col items-center gap-1 rounded-[18px] px-1 py-1.5 ${active ? "bg-white/70 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_20px_rgba(148,163,184,0.1)]" : "text-slate-500"}`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? "border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(235,245,255,0.9))]" : "bg-white/35"}`}>{icon}</span>
      <span className={`text-[10px] font-medium ${active ? "text-slate-900" : "text-slate-500"}`}>{label}</span>
    </div>
  );
}

export default function ProjectsMobileMockupPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(186,230,253,0.35),transparent_24%),linear-gradient(180deg,#edf6ff_0%,#f8fbff_42%,#edf4fb_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/80">BuildFlow mockup</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Projects mobile preview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">A static client-facing concept for reviewing the premium mobile Projects experience before updating the real flow.</p>
        </div>

        <div className="relative w-full max-w-[390px] overflow-hidden rounded-[42px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,255,255,0.4))] p-3 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
          <div className="absolute left-1/2 top-2 h-6 w-32 -translate-x-1/2 rounded-full bg-slate-950" />
          <div className="relative overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(180deg,#fafdff_0%,#eef6ff_45%,#f9fbff_100%)] px-4 pb-28 pt-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.26),transparent_24%),radial-gradient(circle_at_85%_14%,rgba(191,219,254,0.34),transparent_18%),radial-gradient(circle_at_50%_120%,rgba(186,230,253,0.28),transparent_36%)]" />
            <div className="relative">
              <header className="flex items-center justify-between gap-2">
                <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/75 text-slate-800 shadow-[0_12px_20px_rgba(148,163,184,0.1)]">
                  <MenuIcon />
                </button>

                <div className="flex items-center gap-2 rounded-2xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(236,244,255,0.85))] px-3 py-2 shadow-[0_14px_24px_rgba(148,163,184,0.1)]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#0f172a_0%,#1d4ed8_100%)] text-sm font-semibold text-white">BF</div>
                  <div>
                    <p className="text-[14px] font-semibold tracking-[-0.03em] text-slate-950">BuildFlow</p>
                    <p className="text-[10px] text-slate-500">Projects workspace</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/75 text-slate-800 shadow-[0_12px_20px_rgba(148,163,184,0.1)]">
                    <SearchIcon />
                  </button>
                  <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/75 text-slate-800 shadow-[0_12px_20px_rgba(148,163,184,0.1)]">
                    <UserIcon />
                  </button>
                  <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(223,242,255,0.96))] text-sky-700 shadow-[0_12px_20px_rgba(96,165,250,0.14)]">
                    <SparkleIcon />
                  </button>
                </div>
              </header>

              <section className="mt-5 rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.82))] p-5 shadow-[0_22px_40px_rgba(148,163,184,0.14)]">
                <div className="flex flex-wrap gap-2">
                  <SectionPill>Client</SectionPill>
                  <SectionPill>Projects Hub</SectionPill>
                </div>
                <h2 className="mt-4 text-[30px] font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950">Your Projects</h2>
                <p className="mt-3 max-w-[17rem] text-[14px] leading-6 text-slate-600">Create a new project or open an existing workspace to manage plans, materials, quotes, and orders.</p>
              </section>

              <section className="mt-4 rounded-[30px] border border-sky-200/70 bg-[linear-gradient(145deg,#dff2ff_0%,#ffffff_55%,#ebf5ff_100%)] p-5 shadow-[0_24px_44px_rgba(96,165,250,0.16)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-sky-700">Primary action</p>
                    <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-slate-950">Start New Project</h3>
                    <p className="mt-2 text-[13px] leading-5 text-slate-600">Create a new job and begin your project workspace.</p>
                  </div>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-[0_12px_24px_rgba(148,163,184,0.12)]">
                    <PlusIcon />
                  </span>
                </div>
                <button className="mt-4 flex w-full items-center justify-center rounded-[22px] bg-[linear-gradient(180deg,#1d4ed8_0%,#1e40af_100%)] px-4 py-4 text-[15px] font-semibold text-white shadow-[0_18px_34px_rgba(29,78,216,0.28)]">
                  Start New Project
                </button>
              </section>

              <section className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[18px] font-semibold tracking-[-0.04em] text-slate-950">My Projects</p>
                    <p className="text-[12px] text-slate-500">Open an existing workspace in one tap.</p>
                  </div>
                  <Link href="#" className="text-[12px] font-semibold text-sky-700">View all projects</Link>
                </div>
                <div className="space-y-3">
                  <ProjectCard name="204 Oak Wood" />
                  <ProjectCard name="Test Project 001" />
                  <ProjectCard name="Kika" />
                </div>
              </section>

              <section className="mt-5">
                <div className="mb-3">
                  <p className="text-[18px] font-semibold tracking-[-0.04em] text-slate-950">Project tools</p>
                  <p className="text-[12px] text-slate-500">Quick actions connected to every project.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <ToolCard icon={<MaterialsIcon />} title="Materials" text="Review material items" />
                  <ToolCard icon={<QuoteIcon />} title="Quotes" text="Check pricing and approvals" />
                  <ToolCard icon={<OrderIcon />} title="Orders" text="Track approved orders" />
                </div>
              </section>

              <section className="mt-5 rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.82))] p-4 shadow-[0_18px_34px_rgba(148,163,184,0.12)]">
                <div className="flex items-center gap-4">
                  <div className="relative h-24 w-28 overflow-hidden rounded-[24px] border border-white/80 bg-[linear-gradient(150deg,#cfe8ff_0%,#ffffff_45%,#d6ecff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#d8e8d8]" />
                    <div className="absolute left-4 top-9 h-10 w-16 rounded-t-full border-[5px] border-b-0 border-slate-700/70" />
                    <div className="absolute bottom-8 left-6 h-10 w-12 rounded-t-sm bg-white shadow-[0_8px_16px_rgba(148,163,184,0.14)]" />
                    <div className="absolute bottom-8 left-[4.75rem] h-7 w-7 rounded-t-sm bg-sky-50" />
                    <div className="absolute right-3 top-3 h-6 w-6 rounded-full bg-white/70 blur-md" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-sky-700">Visual detail</p>
                    <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-slate-950">Clean home + plans aesthetic</h3>
                    <p className="mt-1 text-[12.5px] leading-5 text-slate-500">A soft construction accent keeps the page warm, residential, and premium without becoming busy.</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="pointer-events-none absolute inset-x-3 bottom-4">
              <div className="rounded-[28px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.44),rgba(240,247,255,0.2))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.74),0_24px_44px_rgba(15,23,42,0.16)] backdrop-blur-[20px]">
                <div className="grid grid-cols-5 gap-1">
                  <DockItem label="Home" icon={<HomeIcon />} />
                  <DockItem label="Projects" active icon={<ProjectsIcon />} />
                  <DockItem label="Shop" icon={<ShopIcon />} />
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
