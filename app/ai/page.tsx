import Link from "next/link";

import { getSessionWithProfile } from "@/lib/auth";

const aiOptions = [
  {
    title: "Start Project",
    description: "Open the guided project flow before you upload anything.",
    href: "/start-project",
    accent: "from-sky-500/15 to-cyan-500/10",
  },
  {
    title: "Upload Plans",
    description: "Send plans, photos, or sketches so the next material step has context.",
    href: "/upload",
    accent: "from-emerald-500/15 to-teal-500/10",
  },
  {
    title: "Review Materials",
    description: "Go straight into materials search and review after login.",
    href: "/search",
    accent: "from-amber-500/18 to-yellow-500/12",
  },
];

export default async function BuildFlowAiPage() {
  const { user } = await getSessionWithProfile();
  const projectHref = user ? "/start-project" : "/login";
  const uploadHref = user ? "/upload" : "/login";
  const reviewHref = user ? "/search" : "/login";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef4fb_0%,#f8fbff_44%,#ffffff_100%)] px-4 py-6 text-slate-900 sm:px-8 sm:py-10">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-[32px] border border-slate-200/90 bg-white shadow-[0_24px_60px_rgba(148,163,184,0.14)]">
        <div className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(96,165,250,0.16),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,247,255,0.98))] px-6 py-7 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-100 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-700 shadow-sm">
            <span>Ask BuildFlow AI</span>
            <span className="text-fuchsia-500">✦</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.4rem]">Ask BuildFlow AI</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            The full AI backend is still rolling out, but this screen already gives clients a useful front door into the next best actions inside BuildFlow.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {aiOptions.map((option) => {
              const href = option.title === "Start Project" ? projectHref : option.title === "Upload Plans" ? uploadHref : reviewHref;

              return (
                <Link
                  key={option.title}
                  href={href}
                  className={`rounded-[26px] border border-slate-200 bg-gradient-to-br ${option.accent} from-white via-white to-slate-50 p-5 shadow-[0_14px_32px_rgba(148,163,184,0.12)] transition active:scale-[0.99]`}
                >
                  <p className="text-base font-semibold text-slate-950">{option.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{option.description}</p>
                  <span className="mt-4 inline-flex text-sm font-semibold text-[#0e2341]">Open →</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-slate-50/90 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Coming soon</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Full AI answers inside the client workflow</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Soon this screen will answer project questions, review plans, and guide materials more directly. For now it routes people into the best real workflow step instead of a dead end.</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={user ? "/dashboard" : "/login"} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#0e2341] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#13315a]">
              {user ? "Open Dashboard" : "Log in to continue"}
            </Link>
            <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
