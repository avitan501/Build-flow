import { ChevronDown } from "lucide-react";

const workday = [
  ["Start on time", "Be logged in and ready to work at 9:00 AM every workday. Your regular hours are 9:00 AM–2:30 PM, New York time, including a 30-minute break. Work after 2:30 PM only when David asks."],
  ["Keep the website working", "Check the website regularly. Always tell David about problems you find and any fixes you make."],
  ["Pay", "Payment is sent to your bank account every two weeks."],
  ["A quiet, reliable setup", "Work somewhere quiet, with no background noise and a stable internet and phone connection throughout your shift."],
  ["Take the initiative", "Use your working hours proactively: move work forward, create follow-ups, and keep track of the next action without waiting to be reminded."],
  ["Close the loop", "Bring each task to Done or Blocked and keep David updated. If blocked, explain what is stopping you and what you need to continue."],
  ["Don’t miss a caller", "Answer incoming calls. If you miss one, make sure you call back."],
] as const;

const communication = [
  ["Use their preferred channel", "Reach people where it works best for them: WhatsApp, email, text, or phone."],
  ["Give calls some space", "Don’t call twice in a row. Wait at least five minutes before calling again."],
  ["Leave a useful message", "If there’s no answer, send a message explaining what you’re calling about and ask for a good time to call back."],
  ["Agree on the next follow-up", "Always agree on a clear time for the next step. For example: ‘Would it be okay if I call you by the end of the day about this?’"],
  ["Quotes need approval", "Get David’s approval before submitting or sending any quote."],
  ["David’s suppliers need approval", "Get David’s approval before contacting a supplier he introduced."],
] as const;

export function CarlosWorkingTogether() {
  return (
    <details id="working-together" className="group mt-4 rounded-xl border border-slate-200 bg-white">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
        <span>Working together <span className="ml-2 text-xs font-normal text-slate-500">Your work guide</span></span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5">
        <p className="max-w-2xl text-sm leading-6 text-slate-600">Carlos, here’s our shared guide to keeping the day smooth, staying proactive, and keeping each other informed.</p>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {[{ title: "Your workday", rules: workday }, { title: "Talking with clients & suppliers", rules: communication }].map(({ title, rules }) => (
            <section key={title} aria-label={title} className="min-w-0">
              <h2 className="mb-3 text-sm font-semibold text-slate-950">{title}</h2>
              <ul className="space-y-3">
                {rules.map(([label, explanation]) => (
                  <li key={label} className="text-sm leading-6 text-slate-600">
                    <strong className="font-semibold text-slate-900">{label}.</strong> {explanation}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </details>
  );
}
