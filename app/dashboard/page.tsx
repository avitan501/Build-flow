import Link from "next/link";

import { PremiumBadge, PremiumHero, PremiumInfoCard, PremiumMutedPanel, PremiumPageShell, PremiumPrimaryButton, PremiumSection } from "@/components/buildflow/premium-page";
import { requireSignedInProfile } from "@/lib/auth";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";

function ActionLink({ href, label, tone = "default" }: { href: string; label: string; tone?: "default" | "gold" }) {
  return (
    <Link
      href={href}
      className={
        tone === "gold"
          ? "inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_30px_rgba(220,168,69,0.22)] transition active:scale-[0.99]"
          : "inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99]"
      }
    >
      {label}
    </Link>
  );
}

export default async function DashboardPage() {
  const { user, profile } = await requireSignedInProfile();
  const { specMap } = getBuildflowWireframeData();
  const dashboard = specMap.get("dashboard");
  const projects = specMap.get("projects");
  const upload = specMap.get("upload");
  const materials = specMap.get("materials");
  const orders = specMap.get("orders");
  const whatsapp = specMap.get("admin-whatsapp");

  if (!dashboard || !projects || !upload || !materials || !orders || !whatsapp) {
    throw new Error("Missing BuildFlow dashboard route data.");
  }

  const isPending = profile?.approval_status === "pending";

  return (
    <PremiumPageShell>
      <PremiumHero
        eyebrow="Client Flow · signed in"
        title={isPending ? "Pending Approval" : `Welcome${profile?.full_name ? `, ${profile.full_name}` : ""}`}
        description={
          isPending
            ? "Your account is pending admin approval before full client actions unlock."
            : `BuildFlow command center for the client journey. Signed in as ${user.email}. Start a project, upload plans, review materials, and move toward approval.`
        }
        badges={
          <>
            <PremiumBadge>Client flow</PremiumBadge>
            <PremiumBadge tone={isPending ? "amber" : "emerald"}>{isPending ? "Pending" : dashboard.status}</PremiumBadge>
          </>
        }
        aside={
          <div className="rounded-[28px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.9))] p-5 shadow-[0_16px_36px_rgba(148,163,184,0.12)]">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Account state</div>
            <div className="mt-3 text-2xl font-semibold text-slate-950">{isPending ? "Pending" : `${dashboard.progress}%`}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{isPending ? "Limited access until approval is complete." : `${100 - dashboard.progress}% remaining in current rollout.`}</p>
          </div>
        }
      />

      {isPending ? (
        <PremiumMutedPanel tone="amber">
          <div className="text-xs font-semibold uppercase tracking-[0.16em]">Next step</div>
          <p className="mt-3 leading-6">Wait for admin approval before full client actions are enabled.</p>
        </PremiumMutedPanel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PremiumInfoCard label="Status badge" value={`${profile?.approval_status ?? "pending"} · role ${profile?.role ?? "client"}`} />
        <PremiumInfoCard label="Purpose" value={isPending ? "Show account approval state until admin review is complete." : dashboard.purpose} />
        <PremiumInfoCard label="Missing to 100%" value={isPending ? "Admin approval, approved-client actions, and project workflow access" : dashboard.missing[0]} />
        <PremiumInfoCard label="Next step" value={isPending ? "Wait for admin approval before full client actions are enabled." : dashboard.nextStep} />
      </div>

      <PremiumSection title="Main actions" description={isPending ? "Pending accounts can view status only. Full approved-client actions stay disabled." : "Clear client actions with the same premium design language as the homepage."}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {isPending ? (
            <>
              <div className="inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-400">My Projects</div>
              <div className="inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-400">Upload Plans</div>
              <div className="inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-400">WhatsApp Messages</div>
              <div className="inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-400">Materials</div>
              <div className="inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-400">Orders</div>
              <div className="inline-flex items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Awaiting Admin Approval</div>
            </>
          ) : (
            <>
              <ActionLink href="/projects/new" label="Start Project" tone="gold" />
              <ActionLink href="/upload" label="Upload Plans" />
              <ActionLink href="/materials" label="Review Materials" />
              <ActionLink href="/orders" label="Approve Order" />
              <ActionLink href="/projects" label="My Projects" />
              <ActionLink href={profile?.role === "admin" ? "/admin/whatsapp" : "/orders/demo"} label={profile?.role === "admin" ? "WhatsApp Operations" : "Track Delivery"} />
            </>
          )}
        </div>
      </PremiumSection>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <PremiumSection title="Status panels" description="Every part of the client flow should feel connected and easy to scan.">
          <div className="grid gap-3 md:grid-cols-2">
            <PremiumMutedPanel>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Projects</div>
              <p className="mt-3 leading-6">{isPending ? "Locked until admin approval is complete." : `${projects.progress}% complete. ${projects.nextStep}`}</p>
            </PremiumMutedPanel>
            <PremiumMutedPanel>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Upload</div>
              <p className="mt-3 leading-6">{isPending ? "Locked until admin approval is complete." : `${upload.progress}% complete. ${upload.nextStep}`}</p>
            </PremiumMutedPanel>
            <PremiumMutedPanel>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Materials</div>
              <p className="mt-3 leading-6">{isPending ? "Locked until admin approval is complete." : `${materials.progress}% complete. ${materials.nextStep}`}</p>
            </PremiumMutedPanel>
            <PremiumMutedPanel>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Orders</div>
              <p className="mt-3 leading-6">{isPending ? "Locked until admin approval is complete." : `${orders.progress}% complete. ${orders.nextStep}`}</p>
            </PremiumMutedPanel>
          </div>
        </PremiumSection>

        <PremiumSection title="What is missing" description="Keep unfinished parts explicit without breaking the premium feel.">
          <ul className="space-y-2 text-sm leading-6 text-slate-600">
            {(isPending
              ? ["Admin approval", "Approved-client actions", "Project and order workflow access"]
              : dashboard.missing
            ).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          {profile?.role === "admin" ? <div className="mt-5"><ActionLink href="/admin/users" label="Admin Users" tone="gold" /></div> : null}
        </PremiumSection>
      </div>
    </PremiumPageShell>
  );
}
