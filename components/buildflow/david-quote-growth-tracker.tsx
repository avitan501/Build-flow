"use client";

import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  Minus,
  Plus,
  Store,
  Quote,
  RotateCcw,
  Target,
  Upload,
  Users,
} from "lucide-react";
import { useState, useTransition } from "react";

import { updateQuoteGrowthMetricAction } from "@/app/admin/goals-progress/website-work/quote-challenge/actions";
import {
  CAMPAIGN_QUOTE_GROWTH_METRICS,
  DAILY_QUOTE_GROWTH_METRICS,
  QUOTE_GROWTH_PIPELINE,
  SUPPLIER_CAMPAIGN_METRICS,
  SUPPLIER_GROWTH_PIPELINE,
  type QuoteGrowthMetricDefinition,
  type QuoteGrowthMetricRecord,
  type QuoteGrowthPeriod,
} from "@/lib/david-quote-growth";

function MetricRow({
  definition,
  initial,
  period,
  periodStart,
}: {
  definition: QuoteGrowthMetricDefinition;
  initial: number;
  period: QuoteGrowthPeriod;
  periodStart: string;
}) {
  const [value, setValue] = useState(initial);
  const [savedValue, setSavedValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const complete = value >= definition.target;
  const percent = Math.min(100, Math.round((value / definition.target) * 100));

  function save(nextValue: number) {
    const safeValue = Math.max(0, Math.min(100000, Math.trunc(nextValue)));
    setValue(safeValue);
    setError(null);
    startTransition(async () => {
      const result = await updateQuoteGrowthMetricAction({
        metricKey: definition.key,
        period,
        periodStart,
        actualCount: safeValue,
      });
      if (!result.ok) {
        setValue(savedValue);
        setError(result.error);
        return;
      }
      setSavedValue(safeValue);
    });
  }

  return (
    <div className="grid gap-2 border-t border-slate-200 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_8rem] sm:items-center sm:px-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {complete ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
          <span className={`text-sm font-semibold ${complete ? "text-emerald-800" : "text-slate-900"}`}>{definition.label}</span>
          {definition.note ? <span className="text-[10px] font-semibold text-slate-400">{definition.note}</span> : null}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full transition-all ${complete ? "bg-emerald-500" : "bg-[#0878d1]"}`} style={{ width: `${percent}%` }} />
        </div>
        {error ? <p role="alert" className="mt-1 text-xs font-semibold text-rose-600">{error}</p> : null}
      </div>
      <span className="text-right text-xs font-bold tabular-nums text-slate-500">{value} / {definition.target}</span>
      <div className="flex items-center justify-end gap-1">
        <button type="button" disabled={pending || value === 0} onClick={() => save(value - 1)} aria-label={`Decrease ${definition.label}`} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-35"><Minus className="h-3.5 w-3.5" /></button>
        <input aria-label={`${definition.label} completed`} inputMode="numeric" type="number" min="0" max="100000" value={value} disabled={pending} onChange={(event) => setValue(Math.max(0, Number(event.target.value) || 0))} onBlur={() => value !== savedValue && save(value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} className="h-9 w-14 rounded-lg border border-slate-200 text-center text-sm font-bold tabular-nums outline-none focus:border-sky-400" />
        <button type="button" disabled={pending} onClick={() => save(value + 1)} aria-label={`Increase ${definition.label}`} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-950 text-white disabled:opacity-50"><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

function TrackerPanel({
  title,
  subtitle,
  definitions,
  records,
  period,
  periodStart,
}: {
  title: string;
  subtitle: string;
  definitions: QuoteGrowthMetricDefinition[];
  records: QuoteGrowthMetricRecord[];
  period: QuoteGrowthPeriod;
  periodStart: string;
}) {
  const values = new Map(records.map((record) => [record.metric_key, record.actual_count]));
  const complete = definitions.filter((definition) => (values.get(definition.key) ?? 0) >= definition.target).length;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,.05)]">
      <header className="flex items-center gap-3 px-4 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white"><Target className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-600">{complete}/{definitions.length}</span>
      </header>
      {definitions.map((definition) => <MetricRow key={`${period}-${definition.key}`} definition={definition} initial={values.get(definition.key) ?? 0} period={period} periodStart={periodStart} />)}
    </section>
  );
}

export function DavidQuoteGrowthTracker({
  dailyRecords,
  campaignRecords,
  dailyDate,
  campaignStart,
  campaignEnd,
}: {
  dailyRecords: QuoteGrowthMetricRecord[];
  campaignRecords: QuoteGrowthMetricRecord[];
  dailyDate: string;
  campaignStart: string;
  campaignEnd: string;
}) {
  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-2xl bg-[#071523] text-white shadow-[0_18px_50px_rgba(2,12,27,.18)]">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,.7fr)] lg:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">One offer. One market. 30 days.</p>
            <h1 className="mt-2 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">Beat Your Material Quote</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Send a quote or material list. Avantia checks suppliers, availability, delivery and the overall price—without an obligation to buy.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-bold text-white">Primary goal</p>
            <p className="mt-1 text-sm leading-5 text-slate-300">Collect 20 real quotes from contractors in Long Island, Queens and Brooklyn.</p>
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-sky-300"><Upload className="h-3.5 w-3.5" />PDF · screenshot · photo</div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
        <div className="grid sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-400 text-sm font-black text-slate-950">1</span>
            <div><p className="text-sm font-bold text-slate-950">Call 5 suppliers first</p><p className="text-xs text-slate-600">Find the right pricing contact.</p></div>
          </div>
          <ArrowRight className="hidden h-4 w-4 text-amber-500 sm:block" />
          <div className="flex items-center gap-3 border-t border-amber-200 px-4 py-4 sm:border-l sm:border-t-0">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-sm font-black text-white">2</span>
            <div><p className="text-sm font-bold text-slate-950">Then call 20 contractors</p><p className="text-xs text-slate-600">Ask for one real quote or list.</p></div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <TrackerPanel title="Today" subtitle={`${dailyDate} · resets with each workday`} definitions={DAILY_QUOTE_GROWTH_METRICS} records={dailyRecords} period="daily" periodStart={dailyDate} />
        <div className="grid gap-5">
          <TrackerPanel title="Supplier Network" subtitle="Build this first · 30-day goal" definitions={SUPPLIER_CAMPAIGN_METRICS} records={campaignRecords} period="campaign" periodStart={campaignStart} />
          <TrackerPanel title="Customer Growth" subtitle={`${campaignStart} → ${campaignEnd}`} definitions={CAMPAIGN_QUOTE_GROWTH_METRICS} records={campaignRecords} period="campaign" periodStart={campaignStart} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {[
          { title: "Supplier pipeline", icon: Store, stages: SUPPLIER_GROWTH_PIPELINE, tone: "text-amber-600" },
          { title: "Customer pipeline", icon: ArrowRight, stages: QUOTE_GROWTH_PIPELINE, tone: "text-[#0878d1]" },
        ].map(({ title, icon: Icon, stages, tone }) => (
          <section key={title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3"><Icon className={`h-4 w-4 ${tone}`} /><h2 className="text-sm font-bold text-slate-950">{title}</h2></header>
            <div className="overflow-x-auto"><div className="flex min-w-max items-center gap-2 p-4">{stages.map((stage, index) => <div key={stage} className="flex items-center gap-2"><span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">{stage}</span>{index < stages.length - 1 ? <ArrowRight className="h-3.5 w-3.5 text-slate-300" /> : null}</div>)}</div></div>
          </section>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3"><Users className="h-4 w-4 text-[#0878d1]" /><h2 className="text-sm font-bold">Contractors: start with</h2></header>
        <ol className="divide-y divide-slate-100">
          {["Contractors who already know David", "Previous Avantia customers", "Friend, foreman and architect referrals", "Local contractors with a current quote", "Small local quote-check ad"].map((source, index) => <li key={source} className="flex gap-3 px-4 py-3 text-sm text-slate-700"><span className="font-bold tabular-nums text-slate-400">{index + 1}</span><span>{source}</span></li>)}
        </ol>
      </section>

      <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3"><Quote className="h-4 w-4 text-[#0878d1]" /><span className="min-w-0 flex-1 text-sm font-bold">Operating rules</span><ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" /></summary>
        <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2">
          <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Do</p><ul className="mt-2 grid gap-2 text-sm text-slate-700"><li>Focus on renovation, drywall/framing, kitchen, roofing and siding.</li><li>Return a comparison before asking for an order.</li><li>Use human review while integrations are still growing.</li><li>Ask every satisfied customer for one referral.</li></ul></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-rose-700">Do not</p><ul className="mt-2 grid gap-2 text-sm text-slate-700"><li>Do not promise the lowest price.</li><li>Do not publish unverified live pricing.</li><li>Do not build a giant catalog before demand exists.</li><li>Do not send mass messages that risk the number.</li></ul></div>
        </div>
      </details>

      <div className="flex items-center justify-center gap-2 text-xs text-slate-400"><RotateCcw className="h-3.5 w-3.5" />Today starts fresh automatically. The 30-day totals stay.</div>
    </div>
  );
}
