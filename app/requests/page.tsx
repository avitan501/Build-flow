import type { Metadata } from "next";
import Link from "next/link";

import { CustomerRequestLiveRefresh } from "@/components/buildflow/customer-request-live-refresh";
import { CustomerRequestOtp } from "@/components/buildflow/customer-request-otp";
import { getCustomerPortalRequests } from "@/lib/customer-request-portal";

export const metadata: Metadata = {
  title: "My Material Requests | Avantia Build",
  description:
    "Securely review the status and material details for your Avantia Build requests.",
};

export default async function CustomerRequestsPage() {
  const portal = await getCustomerPortalRequests();
  if (!portal.signedIn)
    return (
      <main className="min-h-screen bg-[#f5f5f7] px-4 py-8 text-slate-950 sm:py-14">
        <section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.09)] sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0071e3]">
            Secure customer access
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Open your request
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Use the same phone number that received the Avantia invitation. We
            will send a one-time code—your phone number is never used as a
            password.
          </p>
          <CustomerRequestOtp />
        </section>
      </main>
    );

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-7 text-slate-950 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0071e3]">
              Avantia Build
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              My material requests
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Live request status and customer-visible details only.
            </p>
          </div>
          <div className="grid justify-items-end gap-2">
            <Link
              href="/account"
              className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold"
            >
              Account & security
            </Link>
            <CustomerRequestLiveRefresh />
          </div>
        </header>
        {portal.requests.length ? (
          <div className="mt-5 grid gap-4">
            {portal.requests.map((request) => (
              <article
                key={request.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <header className="border-b border-slate-100 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[#0066cc]">
                        Request #{request.publicNumber}
                      </p>
                      <h2 className="mt-1 text-xl font-bold">
                        {request.title}
                      </h2>
                    </div>
                    <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800">
                      {request.statusLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Updated{" "}
                    {new Date(request.updatedAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  {request.deliveryAddress ? (
                    <p className="mt-2 text-sm text-slate-600">
                      <strong>Delivery:</strong> {request.deliveryAddress}
                    </p>
                  ) : null}
                </header>
                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Items
                    </h3>
                    <ul className="mt-2 grid gap-2">
                      {request.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"
                        >
                          <span>{item.name}</span>
                          <strong className="shrink-0">
                            {item.quantity} {item.unit}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  </section>
                  <div className="grid content-start gap-3">
                    <section className="rounded-xl border border-slate-200 p-3">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Missing details
                      </h3>
                      {request.missingQuestions.length ? (
                        <ul className="mt-2 space-y-1 text-sm text-amber-800">
                          {request.missingQuestions.map((question) => (
                            <li key={question}>• {question}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-emerald-700">
                          No questions are waiting for you.
                        </p>
                      )}
                    </section>
                    <section className="rounded-xl border border-slate-200 p-3">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Approval
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {request.approvalLabel}
                      </p>
                    </section>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="font-bold">No requests are linked yet</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              If you just received an invitation, confirm that you signed in
              with the same phone number. Otherwise, contact Avantia at (516)
              908-8319.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
