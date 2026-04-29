import Link from "next/link";

import { statusButtonClass, statusClasses } from "@/components/buildflow/wireframe";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";

const steps = [
  "Start Project",
  "Upload Plans",
  "Review Materials",
  "Review Quote",
  "Approve Order",
  "Track Delivery",
] as const;

type PageKey = "projects" | "projects-new" | "upload" | "materials" | "quotes" | "orders" | "orders-demo";

type PageMeta = Record<
  PageKey,
  {
    step: number;
    eyebrow: string;
    headline: string;
    summary: string;
    primaryCta?: { label: string; href: string; status: Parameters<typeof statusButtonClass>[0] };
    secondaryCta?: { label: string; href: string; status: Parameters<typeof statusButtonClass>[0] };
    helperCards: { label: string; value: string }[];
    milestoneLabel: string;
    previousStep?: { label: string; href: string };
    nextStep?: { label: string; href: string; status: Parameters<typeof statusButtonClass>[0] };
    checklist: string[];
    pagePreview: { title: string; body: string }[];
  }
>;

const pageMeta: PageMeta = {
  projects: {
    step: 0,
    eyebrow: "Client Portal Flow",
    headline: "Project list and next action",
    summary: "Show every project clearly and make the next action obvious: start a new project or continue with uploads.",
    primaryCta: { label: "Start Project", href: "/projects/new", status: "Preview" },
    secondaryCta: { label: "Upload Plans", href: "/upload", status: "Coming Soon" },
    milestoneLabel: "Choose the project you want to move forward today.",
    previousStep: { label: "Dashboard", href: "/dashboard" },
    nextStep: { label: "Upload Plans", href: "/upload", status: "Coming Soon" },
    checklist: [
      "Show each project address, stage, and next action in one row.",
      "If no project exists, keep Start Project as the strongest button.",
      "Make the upload step visible before the client has to hunt for it.",
    ],
    pagePreview: [
      { title: "Active projects", body: "List current client projects with a short stage badge like Start, Upload, Quote, or Delivery." },
      { title: "Next action column", body: "Each card should end with one direct next step such as Upload Plans or Review Quote." },
      { title: "Empty state", body: "If the client is brand new, explain the path and highlight Start Project first." },
    ],
    helperCards: [
      { label: "User goal", value: "See active projects and continue the next step without guessing." },
      { label: "Best next action", value: "Start a project if nothing exists yet, otherwise move into plan upload." },
      { label: "Clarity fix", value: "Put project status, address, and next step on each card." },
    ],
  },
  "projects-new": {
    step: 0,
    eyebrow: "Client Portal Flow",
    headline: "Start the project with the minimum required details",
    summary: "This page should feel like the clear beginning: name the project, add location details, and move straight into plan upload.",
    primaryCta: { label: "Continue to Upload Plans", href: "/upload", status: "Coming Soon" },
    secondaryCta: { label: "Back to Projects", href: "/projects", status: "Coming Soon" },
    milestoneLabel: "Create the shell, then move immediately to Upload Plans.",
    previousStep: { label: "Projects", href: "/projects" },
    nextStep: { label: "Upload Plans", href: "/upload", status: "Coming Soon" },
    checklist: [
      "Keep the form short enough to finish in under a minute.",
      "Explain why address and project name matter before file upload.",
      "End with one clear forward button: Continue to Upload Plans.",
    ],
    pagePreview: [
      { title: "Short setup form", body: "Use a one-column form with only the essential fields needed before plans arrive." },
      { title: "What happens next", body: "Set expectation that uploading plans is the next required step after project creation." },
      { title: "Save for later", body: "If a draft save exists later, keep it secondary so the main flow stays obvious." },
    ],
    helperCards: [
      { label: "User goal", value: "Create a project shell fast without being overloaded." },
      { label: "Best next action", value: "Finish the short setup and continue directly to uploads." },
      { label: "Clarity fix", value: "Use a short form, one column, and explain why each field matters." },
    ],
  },
  upload: {
    step: 1,
    eyebrow: "Client Portal Flow",
    headline: "Upload plans with confidence",
    summary: "Make it obvious which project the files belong to, what formats are accepted, and what happens right after upload.",
    primaryCta: { label: "Review Materials", href: "/materials", status: "Coming Soon" },
    secondaryCta: { label: "Back to Projects", href: "/projects", status: "Coming Soon" },
    milestoneLabel: "Confirm the upload, then move into Review Materials.",
    previousStep: { label: "Start Project", href: "/projects/new" },
    nextStep: { label: "Review Materials", href: "/materials", status: "Coming Soon" },
    checklist: [
      "Show the selected project name at the top before any file is added.",
      "List accepted formats and limits before the dropzone.",
      "After success, point directly to Review Materials instead of side paths.",
    ],
    pagePreview: [
      { title: "Project confirmation", body: "Display the project name and address so the client knows these files go to the right job." },
      { title: "Upload rules", body: "Call out accepted file types, max size, and how many drawings can be added at once." },
      { title: "Success state", body: "After upload, show a calm success banner with the next button to Review Materials." },
    ],
    helperCards: [
      { label: "User goal", value: "Attach the right plans to the right project in one attempt." },
      { label: "Best next action", value: "Upload files, confirm receipt, then move into materials review." },
      { label: "Clarity fix", value: "Show upload rules, accepted files, and a clear success state." },
    ],
  },
  materials: {
    step: 2,
    eyebrow: "Client Portal Flow",
    headline: "Review the draft materials list",
    summary: "Help the client understand what was found, what still needs attention, and how this leads into quote review.",
    primaryCta: { label: "Review Quote", href: "/quotes", status: "Coming Soon" },
    secondaryCta: { label: "Back to Upload Plans", href: "/upload", status: "Coming Soon" },
    milestoneLabel: "Turn uploaded plans into a materials summary the client can trust.",
    previousStep: { label: "Upload Plans", href: "/upload" },
    nextStep: { label: "Review Quote", href: "/quotes", status: "Coming Soon" },
    checklist: [
      "Group items by category so the client can scan fast.",
      "Flag missing or uncertain materials without pretending they are final.",
      "Keep Review Quote visible as the direct next step.",
    ],
    pagePreview: [
      { title: "Grouped materials", body: "Break the list into framing, concrete, finishes, and other simple groups." },
      { title: "Needs review", body: "Call out uncertain counts or missing items in a separate alert area." },
      { title: "Decision summary", body: "End with a short recap that prepares the client for quote review." },
    ],
    helperCards: [
      { label: "User goal", value: "Scan the materials summary without getting lost in detail." },
      { label: "Best next action", value: "Approve the draft direction, then continue to quotes." },
      { label: "Clarity fix", value: "Group by category and call out missing or uncertain items." },
    ],
  },
  quotes: {
    step: 3,
    eyebrow: "Client Portal Flow",
    headline: "Review the quote before approval",
    summary: "This page should compare the current draft clearly and prepare the client for the final order approval step.",
    primaryCta: { label: "Approve Order", href: "/orders", status: "Preview" },
    secondaryCta: { label: "Back to Materials", href: "/materials", status: "Coming Soon" },
    milestoneLabel: "Help the client decide before they approve the order.",
    previousStep: { label: "Review Materials", href: "/materials" },
    nextStep: { label: "Approve Order", href: "/orders", status: "Preview" },
    checklist: [
      "Show the recommended option first, with alternatives clearly separated.",
      "Keep totals and notes readable without fake pricing detail.",
      "Make Approve Order the single main next move.",
    ],
    pagePreview: [
      { title: "Recommended option", body: "Lead with the clearest draft option so the client knows where to focus first." },
      { title: "Alternatives and notes", body: "Keep alternatives below the main option with plain labels and short explanations." },
      { title: "Approval handoff", body: "Finish with a summary that leads into Approve Order without surprise." },
    ],
    helperCards: [
      { label: "User goal", value: "Understand the quote quickly enough to decide whether to move forward." },
      { label: "Best next action", value: "Review totals, open questions, and continue to order approval." },
      { label: "Clarity fix", value: "Separate recommended option, alternatives, and notes." },
    ],
  },
  orders: {
    step: 4,
    eyebrow: "Client Portal Flow",
    headline: "Approve the order with confidence",
    summary: "Turn the quote into a clear approval screen with timeline expectations, scope recap, and the next delivery stage.",
    primaryCta: { label: "Track Delivery", href: "/orders/demo", status: "Preview" },
    secondaryCta: { label: "Back to Quote Review", href: "/quotes", status: "Coming Soon" },
    milestoneLabel: "Approval should feel like a confident handoff, not a dead end.",
    previousStep: { label: "Review Quote", href: "/quotes" },
    nextStep: { label: "Track Delivery", href: "/orders/demo", status: "Preview" },
    checklist: [
      "Repeat the approved scope in plain language before the confirmation action.",
      "Show the next milestone after approval so the client knows what happens next.",
      "Keep delivery tracking visible as the immediate follow-up page.",
    ],
    pagePreview: [
      { title: "Approval summary", body: "Recap what the client is approving without adding pricing claims or hidden terms." },
      { title: "Timeline expectation", body: "Show draft milestone labels like Approved, Scheduled, In Progress, and Delivered." },
      { title: "After approval", body: "Point directly to Track Delivery so the journey never feels finished too early." },
    ],
    helperCards: [
      { label: "User goal", value: "Confirm the order knowing what is being approved and what happens next." },
      { label: "Best next action", value: "Approve the order and move into delivery tracking." },
      { label: "Clarity fix", value: "Show approvals, milestones, and delivery expectations together." },
    ],
  },
  "orders-demo": {
    step: 5,
    eyebrow: "Client Portal Flow",
    headline: "Track delivery and next milestones",
    summary: "The client should always know whether the order is confirmed, in progress, on the way, or delivered.",
    primaryCta: { label: "Back to Orders", href: "/orders", status: "Preview" },
    secondaryCta: { label: "Back to Dashboard", href: "/dashboard", status: "Live" },
    milestoneLabel: "Finish the journey with visible delivery status and the next milestone.",
    previousStep: { label: "Approve Order", href: "/orders" },
    checklist: [
      "Use a simple timeline with one current status and one next milestone.",
      "Keep the delivery story visible without requiring the client to contact support.",
      "Make it easy to jump back to the order if something needs review.",
    ],
    pagePreview: [
      { title: "Timeline", body: "Show draft stages like Confirmed, Scheduled, In Transit, and Delivered in one readable strip." },
      { title: "Current milestone", body: "Highlight where the order stands right now and what update the client should expect next." },
      { title: "Support fallback", body: "If the client needs help later, keep that secondary to the tracking story itself." },
    ],
    helperCards: [
      { label: "User goal", value: "See delivery progress without needing to ask for an update." },
      { label: "Best next action", value: "Track milestones and jump back if the order needs review." },
      { label: "Clarity fix", value: "Use a timeline with clear current state and next milestone." },
    ],
  },
};

function ClientJourneyStrip({ activeStep }: { activeStep: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      {steps.map((step, index) => {
        const isActive = index === activeStep;
        const isComplete = index < activeStep;
        return (
          <div
            key={step}
            className={`rounded-2xl border px-4 py-4 ${
              isActive
                ? "border-emerald-300 bg-emerald-50"
                : isComplete
                  ? "border-slate-300 bg-white"
                  : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {isComplete ? "Complete" : `Step ${index + 1}`}
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">{step}</div>
          </div>
        );
      })}
    </div>
  );
}

export function ClientWireframePage({ pageKey }: { pageKey: PageKey }) {
  const { specMap } = getBuildflowWireframeData();
  const spec = specMap.get(pageKey);
  const meta = pageMeta[pageKey];

  if (!spec) {
    throw new Error(`Missing client wireframe spec for ${pageKey}`);
  }

  const tone = statusClasses(spec.status);
  const remaining = Math.max(0, 100 - spec.progress);

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{meta.eyebrow}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{meta.headline}</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{meta.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Who this page is for: Client Flow</span>
                <span className={`rounded-full border px-3 py-1 ${tone.badge}`}>{spec.status}</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">Current step: {steps[meta.step]}</span>
              </div>
              <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Journey milestone</div>
                <p className="mt-2 leading-6">{meta.milestoneLabel}</p>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:min-w-80">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Page progress</div>
              <div className="mt-3 text-2xl font-semibold text-slate-900">{spec.progress}% complete</div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-slate-900" style={{ width: `${spec.progress}%` }} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{remaining}% remaining · next: {spec.nextStep}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">6-step client journey</h2>
            <p className="mt-1 text-sm text-slate-500">The client path should be obvious from start to delivery.</p>
          </div>
          <div className="mt-5">
            <ClientJourneyStrip activeStep={meta.step} />
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Previous step</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{meta.previousStep ? meta.previousStep.label : "This is the start"}</div>
              <div className="mt-3">
                {meta.previousStep ? (
                  <Link href={meta.previousStep.href} className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                    Go to {meta.previousStep.label}
                  </Link>
                ) : (
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Start of flow</span>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">You are here</div>
              <div className="mt-2 text-sm font-semibold text-emerald-950">{steps[meta.step]}</div>
              <p className="mt-2 text-sm leading-6 text-emerald-900">{meta.milestoneLabel}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next step</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{meta.nextStep ? meta.nextStep.label : "Journey complete"}</div>
              <div className="mt-3">
                {meta.nextStep ? (
                  <Link href={meta.nextStep.href} className={statusButtonClass(meta.nextStep.status, meta.nextStep.status === "Coming Soon")}>
                    {meta.nextStep.label}
                  </Link>
                ) : (
                  <span className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">Final step</span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Primary page actions</h2>
              <p className="mt-1 text-sm text-slate-500">Keep the main next step stronger than the fallback action.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {meta.primaryCta ? (
              <Link href={meta.primaryCta.href} className="inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
                {meta.primaryCta.label}
              </Link>
            ) : null}
            {meta.secondaryCta ? (
              <Link href={meta.secondaryCta.href} className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                {meta.secondaryCta.label}
              </Link>
            ) : null}
            {spec.actions.map((action) =>
              action.href ? (
                <Link key={`${pageKey}-${action.label}`} href={action.href} className={statusButtonClass(action.status || "Coming Soon", action.status === "Coming Soon")}>
                  {action.label}
                </Link>
              ) : null,
            )}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">What this page must communicate</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {meta.helperCards.map((card) => (
                <div key={card.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{card.value}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Clarity checklist</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
              {meta.checklist.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Wireframe note</div>
              <p className="mt-2 leading-6">This is still a safe preview page. It should explain the next action clearly without pretending the backend workflow is already finished.</p>
            </div>
          </article>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Suggested page layout</h2>
              <p className="mt-1 text-sm text-slate-500">Wireframe blocks that keep the client flow calm and obvious.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {meta.pagePreview.map((block, index) => (
              <div key={block.title} className={`rounded-3xl border p-5 ${index === 0 ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Panel {index + 1}</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{block.title}</div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{block.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">What is still missing</h2>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
            {spec.missing.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
