import Link from "next/link";

import type { RouteSpec, UiStatus } from "@/lib/buildflow-wireframe";

const journeySteps = ["Start Project", "Upload Plans", "Review Materials", "Approve Order"] as const;

export function audienceLabel(audience: RouteSpec["audience"]) {
  if (audience === "admin") return "Admin / Ops";
  if (audience === "signed_in") return "Client Flow";
  return "Public / Client";
}

export function flowLabel(flow: RouteSpec["flow"]) {
  if (flow === "whatsapp") return "WhatsApp Operations";
  if (flow === "admin") return "Admin / Ops";
  if (flow === "client") return "Client Flow";
  if (flow === "ai") return "AI Takeoff";
  return "Orders";
}

function activeStepForSpec(spec: RouteSpec) {
  if (spec.key === "upload") return 1;
  if (spec.key === "materials" || spec.key === "quotes" || spec.key === "takeoff-review" || spec.key === "admin-materials" || spec.key === "admin-quotes") return 2;
  if (spec.key === "orders" || spec.key === "orders-demo" || spec.key === "admin-orders" || spec.key === "admin-vendors") return 3;
  if (spec.flow === "client") return 0;
  return undefined;
}

export function JourneyStrip({ activeStep }: { activeStep?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {journeySteps.map((step, index) => {
        const isActive = activeStep === index;
        return (
          <div
            key={step}
            className={`rounded-2xl border px-4 py-4 ${
              isActive ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step {index + 1}</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">{step}</div>
          </div>
        );
      })}
    </div>
  );
}

export function statusClasses(status: UiStatus) {
  if (status === "Live") {
    return {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      card: "border-emerald-200 bg-emerald-50/70",
      button: "border-emerald-300 bg-emerald-500 text-white hover:bg-emerald-600",
      subtle: "bg-emerald-50 text-emerald-700",
    };
  }
  if (status === "Preview" || status === "Needs Work") {
    return {
      badge: "border-orange-200 bg-orange-50 text-orange-700",
      card: "border-orange-200 bg-orange-50/70",
      button: "border-orange-300 bg-orange-500 text-white hover:bg-orange-600",
      subtle: "bg-orange-50 text-orange-700",
    };
  }
  if (status === "Blocked") {
    return {
      badge: "border-red-200 bg-red-50 text-red-700",
      card: "border-red-200 bg-red-50/70",
      button: "border-red-300 bg-red-500 text-white hover:bg-red-600",
      subtle: "bg-red-50 text-red-700",
    };
  }
  return {
    badge: "border-slate-200 bg-slate-100 text-slate-600",
    card: "border-slate-200 bg-slate-100/80",
    button: "border-slate-200 bg-slate-200 text-slate-500",
    subtle: "bg-slate-100 text-slate-600",
  };
}

export function statusButtonClass(status: UiStatus, disabled?: boolean) {
  const tone = statusClasses(status);
  return `inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${tone.button} ${disabled ? "pointer-events-none opacity-55" : ""}`;
}

export function PageStatusHeader({
  title,
  purpose,
  status,
  progress,
  missing,
  nextStep,
  backHref = "/admin/build-map",
  audience,
  flow,
  activeStep,
}: {
  title: string;
  purpose: string;
  status: UiStatus;
  progress: number;
  missing: string[];
  nextStep: string;
  backHref?: string;
  audience?: RouteSpec["audience"];
  flow?: RouteSpec["flow"];
  activeStep?: number;
}) {
  const tone = statusClasses(status);
  const remaining = Math.max(0, 100 - progress);
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">BuildFlow wireframe</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{purpose}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
            {audience ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                Who this page is for: {audienceLabel(audience)}
              </span>
            ) : null}
            {flow ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                Area: {flowLabel(flow)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:min-w-72">
          <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${tone.badge}`}>
            {status}
          </span>
          <div className={`rounded-2xl border px-4 py-3 text-sm ${tone.card}`}>
            {progress}% complete · {remaining}% remaining
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Core user journey</div>
        <JourneyStrip activeStep={activeStep} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Missing to reach 100%</div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {missing.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next step</div>
          <p className="mt-3 text-sm leading-6 text-slate-700">{nextStep}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className={statusButtonClass(status)}>
              Next Step
            </button>
            <Link href={backHref} className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              Back to Build Map
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ActionGrid({ title = "Main actions", actions }: { title?: string; actions: RouteSpec["actions"] }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">Clear buttons only. Preview and blocked steps stay visibly limited.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const status = action.status || "Coming Soon";
          const disabled = action.disabled || !action.href || status === "Coming Soon";
          const content = (
            <>
              <span>{action.label}</span>
              <span className="text-[11px] uppercase tracking-[0.16em] opacity-85">{status}</span>
            </>
          );

          return action.href && !disabled ? (
            <Link key={`${action.label}-${action.href}`} href={action.href} className={statusButtonClass(status)}>
              {content}
            </Link>
          ) : (
            <div key={action.label} className={statusButtonClass(status, true)}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ProgressMiniCards({ specs }: { specs: RouteSpec[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {specs.map((spec) => {
        const tone = statusClasses(spec.status);
        return (
          <article key={spec.key} className={`rounded-[24px] border p-5 ${tone.card}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{spec.title}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{spec.flow}</div>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone.badge}`}>
                {spec.status}
              </span>
            </div>
            <div className="mt-4 text-sm text-slate-700">{spec.progress}% complete</div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
              <div className="h-full rounded-full bg-slate-900" style={{ width: `${spec.progress}%` }} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{spec.nextStep}</p>
            <Link href={spec.href} className="mt-4 inline-flex text-sm font-semibold text-slate-900 underline underline-offset-4">
              Open page
            </Link>
          </article>
        );
      })}
    </section>
  );
}

export function SimpleWireframePage({ spec, detailCards, backHref = "/admin/build-map" }: { spec: RouteSpec; detailCards: { label: string; value: string; status?: UiStatus }[]; backHref?: string }) {
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageStatusHeader
          title={spec.title}
          purpose={spec.purpose}
          status={spec.status}
          progress={spec.progress}
          missing={spec.missing}
          nextStep={spec.nextStep}
          backHref={backHref}
          audience={spec.audience}
          flow={spec.flow}
          activeStep={activeStepForSpec(spec)}
        />

        <ActionGrid actions={spec.actions} />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {detailCards.map((card) => {
            const tone = statusClasses(card.status || spec.status);
            return (
              <article key={card.label} className={`rounded-[24px] border p-5 shadow-sm ${tone.card}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{card.value}</p>
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}
