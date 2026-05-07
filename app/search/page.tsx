import Link from "next/link";

import { SearchPanel } from "@/components/buildflow/search-panel";
import { getSessionWithProfile } from "@/lib/auth";
import type { ProjectRecord } from "@/lib/projects";

export default async function SearchPage() {
  const { supabase, user } = await getSessionWithProfile();
  const accountHref = user ? "/dashboard" : "/login";

  let projectRows: ProjectRecord[] = [];

  if (user) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, owner_id, name, address, status, created_at, updated_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .returns<ProjectRecord[]>();

    if (error) {
      throw new Error("Failed to load search projects.");
    }

    projectRows = data ?? [];
  }

  const items = [
    {
      title: user ? "My Projects" : "Log in to view projects",
      description: user ? "Open your project list and continue the next step." : "Sign in first to search real project records.",
      href: user ? "/projects" : "/login",
      tone: "navy" as const,
      badge: "Projects",
      keywords: ["project", "job", "address", "client", "workspace"],
    },
    {
      title: "Upload Plans or Photos",
      description: "Send files, drawings, room photos, or site documents into BuildFlow.",
      href: user ? "/upload" : "/login",
      tone: "emerald" as const,
      badge: "Upload",
      keywords: ["upload", "photo", "plan", "drawing", "document", "file"],
    },
    {
      title: user ? "Materials" : "Log in for materials",
      description: "Review material lists prepared for your project flow.",
      href: user ? "/materials" : "/login",
      tone: "slate" as const,
      badge: "Materials",
      keywords: ["materials", "products", "supply", "list", "takeoff"],
    },
    {
      title: user ? "Quotes" : "Log in for quotes",
      description: "Move from materials into quote review before orders.",
      href: user ? "/quotes" : "/login",
      tone: "slate" as const,
      badge: "Quote",
      keywords: ["quote", "pricing", "estimate", "review"],
    },
    {
      title: user ? "Orders" : "Log in for orders",
      description: "Review approvals, order flow, and follow-up status.",
      href: user ? "/orders" : "/login",
      tone: "slate" as const,
      badge: "Orders",
      keywords: ["orders", "approve", "approval", "delivery", "track"],
    },
    {
      title: user ? "Dashboard" : "Client account",
      description: user ? "Return to your signed-in client dashboard." : "Open login and continue into your account.",
      href: accountHref,
      tone: "navy" as const,
      badge: "Account",
      keywords: ["dashboard", "account", "login", "profile", "home"],
    },
    ...projectRows.map((project) => ({
      title: project.name,
      description: project.address || "Open this project workspace.",
      href: `/projects/${project.id}`,
      tone: "emerald" as const,
      badge: "Project",
      keywords: ["project", "address", project.status, project.name, project.address || ""],
    })),
  ];

  return (
    <main className="min-h-screen bg-[#eef3f9] px-4 py-6 text-slate-900 sm:px-8 sm:py-10">
      <section className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">BuildFlow Search</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Search your project flow</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Search now works as a real entry point. Type to find projects, uploads, materials, quotes, orders, and account pages.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href={accountHref} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#0e2341] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#13315a]">
            {user ? "Open Dashboard" : "Log in to Continue"}
          </Link>
          <Link href={user ? "/projects" : "/signup"} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white">
            {user ? "Open Projects" : "Create Account"}
          </Link>
        </div>

        <SearchPanel items={items} />
      </section>
    </main>
  );
}
