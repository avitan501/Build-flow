import Link from "next/link";

import { requireAdminProfile } from "@/lib/auth";

type RoomStatus = "Live" | "UI Ready" | "Coming Soon" | "Blocked";

type BuildMapRoom = {
  zone: string;
  name: string;
  purpose: string;
  users: string;
  status: RoomStatus;
  actions: string[];
  href?: string;
  nextStep: string;
};

const rooms: BuildMapRoom[] = [
  {
    zone: "Front Door",
    name: "Home",
    purpose: "Public landing page that introduces BuildFlow and routes visitors into the platform.",
    users: "Visitors, leads, admins",
    status: "Live",
    actions: ["Read product story", "Open signup", "Open login"],
    href: "/",
    nextStep: "Keep refining the first-screen trust story and conversion path.",
  },
  {
    zone: "Front Door",
    name: "Signup",
    purpose: "Account creation page for new users entering the app.",
    users: "Builders, staff, admins",
    status: "Live",
    actions: ["Create account", "Enter profile details", "Start onboarding"],
    href: "/signup",
    nextStep: "Expand onboarding states without changing auth plumbing here.",
  },
  {
    zone: "Front Door",
    name: "Login",
    purpose: "Sign-in page for existing users returning to their workspace.",
    users: "Builders, staff, admins",
    status: "Live",
    actions: ["Sign in", "Recover access", "Continue into app"],
    href: "/login",
    nextStep: "Keep auth UX polished and consistent on mobile.",
  },
  {
    zone: "Main Hall",
    name: "Dashboard",
    purpose: "Core signed-in home base for the working user.",
    users: "Builders, staff, admins",
    status: "Live",
    actions: ["Review account state", "Open modules", "See current activity"],
    href: "/dashboard",
    nextStep: "Grow this into the true operating center for projects and orders.",
  },
  {
    zone: "Admin Wing",
    name: "Admin Users",
    purpose: "Admin-only user approvals and role-management workspace.",
    users: "Admins",
    status: "Live",
    actions: ["Approve users", "Change roles", "Review audit actions"],
    href: "/admin/users",
    nextStep: "Keep layout clean and finish admin management polish.",
  },
  {
    zone: "Admin Wing",
    name: "WhatsApp Draft Inbox",
    purpose: "Admin-only draft inbox preview for safe WhatsApp review workflows.",
    users: "Admins, internal staff",
    status: "UI Ready",
    actions: ["Preview draft threads", "Review permissions", "Plan manual moderation"],
    href: "/admin/whatsapp",
    nextStep: "Later connect this safely to real DB data after the approved migration path exists.",
  },
  {
    zone: "Project Floor",
    name: "Projects",
    purpose: "Project hub for jobs, progress, and linked workflows.",
    users: "Builders, project managers, admins",
    status: "Coming Soon",
    actions: ["Open project", "Review scope", "Track progress"],
    nextStep: "Create the first project shell and list/detail layout.",
  },
  {
    zone: "Project Floor",
    name: "Upload Plans",
    purpose: "Upload area for plans and reference files used in later estimating workflows.",
    users: "Builders, estimators, admins",
    status: "Coming Soon",
    actions: ["Upload files", "Attach to project", "Queue for review"],
    nextStep: "Design upload states and review checkpoints.",
  },
  {
    zone: "Project Floor",
    name: "AI Takeoff",
    purpose: "Future AI-assisted takeoff workspace for draft quantity extraction.",
    users: "Estimators, admins",
    status: "Blocked",
    actions: ["Run draft takeoff", "Inspect confidence", "Approve results"],
    nextStep: "Unblock after the safe upstream product/data path is ready.",
  },
  {
    zone: "Project Floor",
    name: "Material List",
    purpose: "Draft material-list workspace fed by quotes, plans, and future AI outputs.",
    users: "Estimators, purchasing, admins",
    status: "Coming Soon",
    actions: ["Review items", "Group materials", "Prepare ordering"],
    nextStep: "Define the draft material review UI and approval states.",
  },
  {
    zone: "Operations Wing",
    name: "Orders",
    purpose: "Order operations area for tracking requests, approvals, and movement toward fulfillment.",
    users: "Admins, internal staff",
    status: "Coming Soon",
    actions: ["Review order pipeline", "Track status", "Connect to projects"],
    nextStep: "Build the order overview once the project/material flow is settled.",
  },
  {
    zone: "Operations Wing",
    name: "Vendors",
    purpose: "Vendor and supplier relationship workspace.",
    users: "Purchasing, admins",
    status: "Coming Soon",
    actions: ["Compare suppliers", "Review notes", "Track vendor records"],
    nextStep: "Design the vendor directory and comparison views.",
  },
  {
    zone: "Operations Wing",
    name: "Clients",
    purpose: "Client account and relationship area for jobs and communication history.",
    users: "Admins, client-facing staff",
    status: "Coming Soon",
    actions: ["Open client profiles", "Review project history", "Manage handoff context"],
    nextStep: "Create a client list and profile-card layout.",
  },
  {
    zone: "Operations Wing",
    name: "Quote Upload",
    purpose: "Quote intake area for internal quote review and prep workflows.",
    users: "Admins, estimators",
    status: "Coming Soon",
    actions: ["Upload quote", "Review extraction", "Prepare material draft"],
    nextStep: "Build the admin quote intake UI without wiring real saves yet.",
  },
  {
    zone: "Operations Wing",
    name: "Payments",
    purpose: "Future payment tracking and collection workspace.",
    users: "Admins, finance staff",
    status: "Blocked",
    actions: ["Review payment status", "Track test mode", "Prepare payment flow"],
    nextStep: "Keep payments test-first and only wire after explicit approval.",
  },
  {
    zone: "Systems Room",
    name: "Google Drive",
    purpose: "Project file storage and delivery handoff layer.",
    users: "Admins, internal staff",
    status: "Coming Soon",
    actions: ["Open folders", "Store outputs", "Route approved documents"],
    nextStep: "Connect approved folder flow later without changing infra now.",
  },
  {
    zone: "Systems Room",
    name: "Notifications",
    purpose: "Notification center for internal and client-facing workflow updates.",
    users: "Admins, staff, later clients",
    status: "UI Ready",
    actions: ["Preview message states", "Plan channels", "Review delivery rules"],
    nextStep: "Finalize templates and channel controls.",
  },
  {
    zone: "Systems Room",
    name: "Settings",
    purpose: "Administrative settings area for safe product controls.",
    users: "Admins",
    status: "Coming Soon",
    actions: ["Review config sections", "Adjust safe defaults", "Manage internal options"],
    nextStep: "Define settings sections without touching live services.",
  },
  {
    zone: "Systems Room",
    name: "Control Center",
    purpose: "Separate internal control room outside the production app for rollout visibility.",
    users: "Admins",
    status: "Live",
    actions: ["Review rollout status", "Check blockers", "Jump back to Build Map"],
    nextStep: "Keep the separate Control Center linked to this production Build Map.",
  },
];

const zones = [
  ["Front Door", "Visitors enter, sign up, and log in."],
  ["Main Hall", "The main operating hub after login."],
  ["Admin Wing", "Internal-only rooms for admin review and control."],
  ["Project Floor", "Future build and estimating workflows."],
  ["Operations Wing", "Orders, vendors, clients, quotes, and payments."],
  ["Systems Room", "Notifications, settings, storage, and control surfaces."],
] as const;

function statusTone(status: RoomStatus) {
  if (status === "Live") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
  if (status === "UI Ready") return "border-sky-400/25 bg-sky-400/10 text-sky-100";
  if (status === "Blocked") return "border-amber-400/25 bg-amber-400/10 text-amber-100";
  return "border-white/10 bg-white/5 text-slate-200";
}

function roomBorder(status: RoomStatus) {
  if (status === "Live") return "border-emerald-400/20";
  if (status === "UI Ready") return "border-sky-400/20";
  if (status === "Blocked") return "border-amber-400/20";
  return "border-white/10";
}

export default async function AdminBuildMapPage() {
  await requireAdminProfile();

  const summary = {
    live: rooms.filter((room) => room.status === "Live").length,
    uiReady: rooms.filter((room) => room.status === "UI Ready").length,
    comingSoon: rooms.filter((room) => room.status === "Coming Soon").length,
    blocked: rooms.filter((room) => room.status === "Blocked").length,
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                BuildFlow Supply · Admin only
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Build Map
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                A mobile-first visual map of the whole BuildFlow product as rooms inside one building.
                This page is UI only: no database work, no Supabase changes, no WhatsApp sending,
                no Vercel changes, and no OpenClaw changes.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:min-w-64">
              <Link
                href="/admin/users"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Open Admin Users
              </Link>
              <Link
                href="/admin/whatsapp"
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/15"
              >
                Open WhatsApp Draft Inbox
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Live rooms</div>
              <div className="mt-2 text-2xl font-semibold">{summary.live}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">UI ready</div>
              <div className="mt-2 text-2xl font-semibold">{summary.uiReady}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Coming soon</div>
              <div className="mt-2 text-2xl font-semibold">{summary.comingSoon}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Blocked</div>
              <div className="mt-2 text-2xl font-semibold">{summary.blocked}</div>
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100">
              <div className="text-xs uppercase tracking-[0.18em] text-amber-200/80">Current blocker</div>
              <div className="mt-2 text-sm font-semibold leading-6">
                Safe database path for later WhatsApp Draft Inbox migration and real data hookup.
              </div>
            </div>
          </div>
        </div>

        {zones.map(([zone, note]) => {
          const zoneRooms = rooms.filter((room) => room.zone === zone);
          if (zoneRooms.length === 0) return null;

          return (
            <section key={zone} className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-6">
              <div className="mb-5 flex flex-col gap-2">
                <h2 className="text-xl font-semibold sm:text-2xl">{zone}</h2>
                <p className="text-sm leading-6 text-slate-400">{note}</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {zoneRooms.map((room) => (
                  <article
                    key={room.name}
                    className={`rounded-[28px] border bg-slate-950/40 p-5 ${roomBorder(room.status)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          {room.zone}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-white">{room.name}</h3>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusTone(room.status)}`}>
                        {room.status}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-300">{room.purpose}</p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Who uses it</div>
                        <div className="mt-2 text-sm font-medium text-slate-100">{room.users}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next build step</div>
                        <div className="mt-2 text-sm font-medium leading-6 text-slate-100">{room.nextStep}</div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Key actions</div>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
                        {room.actions.map((action) => (
                          <li key={action}>• {action}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      {room.href ? (
                        <Link
                          href={room.href}
                          className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                        >
                          Open page
                        </Link>
                      ) : (
                        <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-400">
                          No page live yet
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </section>
    </main>
  );
}
