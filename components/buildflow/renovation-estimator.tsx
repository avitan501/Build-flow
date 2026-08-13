"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  Building2,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ClipboardCheck,
  Copy,
  DoorOpen,
  ExternalLink,
  Layers3,
  MapPin,
  PaintRoller,
  Plus,
  Printer,
  RotateCcw,
  Sparkles,
  Trash2,
  WalletCards,
} from "lucide-react";

import {
  ESTIMATOR_SOURCES,
  RENOVATION_SCOPE_OPTIONS,
  RENOVATION_UNIT_TYPE_OPTIONS,
  US_STATES,
  calculateRenovationEstimate,
  formatCurrency,
  type BudgetApproach,
  type RenovationClass,
  type RenovationEstimatorInput,
  type RenovationScope,
  type RenovationUnitMixEntry,
  type RenovationUnitType,
} from "@/lib/renovation-estimator";

const steps = ["Property", "Scope", "Strategy", "Estimate"] as const;

const scopePresentation: Record<RenovationScope, { icon: typeof Layers3; image: string; alt: string }> = {
  flooring: { icon: Layers3, image: "/images/buildflow-retail/flooring-department.webp", alt: "Flooring material samples" },
  bathrooms: { icon: Bath, image: "/images/buildflow-retail/tile-department.webp", alt: "Bathroom tile materials" },
  kitchen: { icon: ChefHat, image: "/images/buildflow-retail/kitchen.jpg", alt: "Kitchen cabinets and finishes" },
  paint: { icon: PaintRoller, image: "/images/buildflow-retail/finish.jpg", alt: "Interior paint and finish materials" },
  carpentry: { icon: DoorOpen, image: "/images/buildflow-retail/door-molding-department.webp", alt: "Interior door and molding materials" },
};

const classOptions: Array<{ value: RenovationClass; label: string; description: string }> = [
  { value: "A", label: "Class A", description: "Premium presentation and finish selections" },
  { value: "B", label: "Class B", description: "Upgraded, durable apartment finishes" },
  { value: "C", label: "Class C", description: "Standard rental-grade materials" },
  { value: "D", label: "Class D", description: "Functional, essential replacement" },
];

const budgetOptions: Array<{ value: BudgetApproach; label: string; description: string }> = [
  { value: "very-low", label: "Very low", description: "Cost-first selections" },
  { value: "middle", label: "Middle", description: "Balanced cost and durability" },
  { value: "better", label: "Better", description: "Upgraded material package" },
];

const initialInput: RenovationEstimatorInput = {
  squareFeetPerUnit: 700,
  unitCount: 1,
  unitMix: [{ unitType: "one-bedroom", unitCount: 1, squareFeetPerUnit: 700, bathroomCountPerUnit: 1 }],
  stateCode: "NY",
  scopes: [],
  bathroomCountPerUnit: 1,
  renovationClass: "C",
  budgetApproach: "middle",
  targetBudget: undefined,
  otherNotes: "",
};

function syncUnitMix(
  current: RenovationEstimatorInput,
  unitMix: RenovationUnitMixEntry[],
): RenovationEstimatorInput {
  const unitCount = unitMix.reduce((sum, entry) => sum + entry.unitCount, 0);
  const safeUnitCount = Math.max(unitCount, 1);

  return {
    ...current,
    unitMix,
    unitCount,
    squareFeetPerUnit: Math.round(
      unitMix.reduce((sum, entry) => sum + entry.squareFeetPerUnit * entry.unitCount, 0) / safeUnitCount,
    ),
    bathroomCountPerUnit:
      unitMix.reduce((sum, entry) => sum + entry.bathroomCountPerUnit * entry.unitCount, 0) / safeUnitCount,
  };
}

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  suffix,
  optional = false,
}: {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min: number;
  max: number;
  suffix?: string;
  optional?: boolean;
}) {
  return (
    <label htmlFor={id} className="grid gap-2 text-sm font-bold text-slate-900">
      <span>{label} {optional ? <span className="font-medium text-slate-400">(optional)</span> : null}</span>
      <span className="flex min-h-14 items-center overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm focus-within:border-[#0784e3] focus-within:ring-4 focus-within:ring-sky-100">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base font-semibold text-slate-950 outline-none"
        />
        {suffix ? <span className="shrink-0 border-l border-slate-200 bg-slate-50 px-4 py-4 text-xs font-bold text-slate-500">{suffix}</span> : null}
      </span>
    </label>
  );
}

function EstimateSnapshot({ input }: { input: RenovationEstimatorInput }) {
  const estimate = useMemo(() => calculateRenovationEstimate(input), [input]);
  const hasScope = input.scopes.length > 0;
  const isMixedProject = input.unitMix.length > 1;

  return (
    <aside className="border-t border-slate-200 bg-[#0E2A4A] p-5 text-white lg:border-l lg:border-t-0 lg:p-7" aria-label="Live estimate snapshot">
      <div className="sticky top-24">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300">Live planning snapshot</p>
        <p className="mt-4 text-3xl font-semibold">{hasScope ? formatCurrency(estimate.estimatedTotal) : "—"}</p>
        <p className="mt-1 text-sm text-slate-300">{hasScope ? `${formatCurrency(estimate.perUnitSubtotal)} material subtotal per unit` : "Select the work you want to price."}</p>

        <dl className="mt-7 divide-y divide-white/12 border-y border-white/12">
          <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-slate-300">Apartments</dt><dd className="font-bold">{input.unitCount}</dd></div>
          <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-slate-300">{isMixedProject ? "Average area" : "Area per unit"}</dt><dd className="font-bold">{input.squareFeetPerUnit.toLocaleString()} sq. ft.</dd></div>
          {isMixedProject ? <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-slate-300">Unit types</dt><dd className="font-bold">{input.unitMix.length}</dd></div> : null}
          <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-slate-300">Finish target</dt><dd className="font-bold">Class {input.renovationClass}</dd></div>
          <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-slate-300">Location</dt><dd className="font-bold">{input.stateCode}</dd></div>
        </dl>

        <div className="mt-6 flex items-start gap-3 text-xs leading-5 text-slate-300">
          <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
          <p>Materials only. Labor, demolition, permits, tax, delivery, and concealed repairs are not included.</p>
        </div>
      </div>
    </aside>
  );
}

export function RenovationEstimator() {
  const [isReady, setIsReady] = useState(false);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<RenovationEstimatorInput>(initialInput);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const estimate = useMemo(() => calculateRenovationEstimate(input), [input]);
  const materialGroups = useMemo(
    () => input.scopes.map((scope) => {
      const lineItems = estimate.lineItems.filter((item) => item.category === scope);
      const total = lineItems.reduce((sum, item) => sum + item.total, 0);
      const option = RENOVATION_SCOPE_OPTIONS.find((item) => item.value === scope);

      return {
        scope,
        label: option?.label ?? scope,
        lineItems,
        total,
        perUnitTotal: total / input.unitCount,
      };
    }).filter((group) => group.lineItems.length > 0),
    [estimate.lineItems, input.scopes, input.unitCount],
  );

  const selectedState = US_STATES.find((state) => state.code === input.stateCode);
  const targetDifference = input.targetBudget ? input.targetBudget - estimate.estimatedTotal : null;
  const isMixedProject = input.unitMix.length > 1;

  useEffect(() => {
    const readyTimer = window.setTimeout(() => setIsReady(true), 0);
    return () => window.clearTimeout(readyTimer);
  }, []);

  function update<K extends keyof RenovationEstimatorInput>(key: K, value: RenovationEstimatorInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function toggleScope(scope: RenovationScope) {
    update("scopes", input.scopes.includes(scope) ? input.scopes.filter((item) => item !== scope) : [...input.scopes, scope]);
  }

  function updateUnitMixEntry(index: number, patch: Partial<RenovationUnitMixEntry>) {
    setInput((current) => syncUnitMix(
      current,
      current.unitMix.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry),
    ));
    setError(null);
  }

  function changeUnitType(index: number, unitType: RenovationUnitType) {
    if (input.unitMix.some((entry, entryIndex) => entryIndex !== index && entry.unitType === unitType)) return;
    const preset = RENOVATION_UNIT_TYPE_OPTIONS.find((option) => option.value === unitType);
    if (!preset) return;

    updateUnitMixEntry(index, {
      unitType,
      squareFeetPerUnit: preset.defaultSquareFeet,
      bathroomCountPerUnit: preset.defaultBathrooms,
    });
  }

  function addUnitType() {
    const preset = RENOVATION_UNIT_TYPE_OPTIONS.find(
      (option) => !input.unitMix.some((entry) => entry.unitType === option.value),
    );
    if (!preset) return;

    setInput((current) => syncUnitMix(current, [...current.unitMix, {
      unitType: preset.value,
      unitCount: 1,
      squareFeetPerUnit: preset.defaultSquareFeet,
      bathroomCountPerUnit: preset.defaultBathrooms,
    }]));
    setError(null);
  }

  function removeUnitType(index: number) {
    if (input.unitMix.length === 1) return;
    setInput((current) => syncUnitMix(current, current.unitMix.filter((_, entryIndex) => entryIndex !== index)));
    setError(null);
  }

  function continueFlow() {
    const invalidUnitMix = input.unitMix.length === 0 || input.unitMix.some(
      (entry) => entry.squareFeetPerUnit < 200 || entry.squareFeetPerUnit > 10000 || entry.unitCount < 1 || entry.unitCount > 1000,
    );
    if (step === 0 && (!input.stateCode || invalidUnitMix || input.unitCount > 1000)) {
      setError("Enter 200–10,000 sq. ft. and 1–1,000 units across the apartment mix.");
      return;
    }
    if (step === 1 && input.scopes.length === 0) {
      setError("Select at least one renovation scope.");
      return;
    }
    if (step === 1 && input.scopes.includes("bathrooms") && input.unitMix.some((entry) => entry.bathroomCountPerUnit < 1 || entry.bathroomCountPerUnit > 10)) {
      setError("Enter between 1 and 10 bathrooms for each apartment type.");
      return;
    }
    setError(null);
    setStep((current) => Math.min(3, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setError(null);
    setStep((current) => Math.max(0, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copyEstimate() {
    const scopeNames = input.scopes.map((scope) => RENOVATION_SCOPE_OPTIONS.find((option) => option.value === scope)?.label ?? scope).join(", ");
    const unitMix = input.unitMix.map((entry) => {
      const option = RENOVATION_UNIT_TYPE_OPTIONS.find((item) => item.value === entry.unitType);
      return `${entry.unitCount} × ${option?.shortLabel ?? entry.unitType} at ${entry.squareFeetPerUnit.toLocaleString()} sq. ft.`;
    }).join(", ");
    const lines = estimate.lineItems.map((item) => `${item.label}: ${item.quantity.toLocaleString()} ${item.unit} — ${formatCurrency(item.total)}`);
    const text = [
      "Avantia Build apartment renovation planning estimate",
      `${input.unitCount} unit(s) in ${selectedState?.label ?? input.stateCode}`,
      `Unit mix: ${unitMix}`,
      `Scope: ${scopeNames}`,
      `Class ${input.renovationClass} / ${budgetOptions.find((option) => option.value === input.budgetApproach)?.label}`,
      ...lines,
      `Planning range: ${formatCurrency(estimate.lowEstimate)}–${formatCurrency(estimate.highEstimate)}`,
      `Estimated materials: ${formatCurrency(estimate.estimatedTotal)}`,
      "Planning estimate only. Labor, demolition, disposal, permits, tax, delivery, concealed damage, and hazardous-material remediation are excluded.",
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function restart() {
    setInput(initialInput);
    setStep(0);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main data-testid="renovation-estimator" data-ready={isReady} className="min-h-screen bg-[#eef3f8] text-slate-950 print:bg-white">
      {step < 3 ? (
        <section className="relative isolate overflow-hidden border-b border-slate-200 bg-[#0E2A4A] text-white print:hidden">
          <Image src="/images/buildflow-retail/eitan-renovation.webp" alt="Apartment renovation underway with building materials" fill priority sizes="100vw" className="-z-20 object-cover object-center opacity-45" />
          <div className="absolute inset-0 -z-10 bg-[#0E2A4A]/78" aria-hidden="true" />
          <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-sky-300"><Sparkles className="h-4 w-4" aria-hidden="true" /> Avantia renovation intelligence</div>
            <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight sm:text-5xl">What will this apartment renovation need?</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">Build a material quantity plan and a realistic purchasing range for one apartment or an entire portfolio.</p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-slate-200">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-300" aria-hidden="true" /> No login</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-300" aria-hidden="true" /> Materials only</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-300" aria-hidden="true" /> All 50 states + DC</span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8 print:max-w-none print:p-0">
        <div className="mb-5 grid grid-cols-4 overflow-hidden rounded-lg border border-slate-200 bg-white print:hidden" aria-label="Estimator progress">
          {steps.map((label, index) => (
            <div key={label} className={`relative min-w-0 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.08em] sm:text-xs ${index <= step ? "text-[#0066cc]" : "text-slate-400"}`}>
              <span className="block truncate">{index + 1}. {label}</span>
              <span className={`absolute inset-x-0 bottom-0 h-1 ${index <= step ? "bg-[#0784e3]" : "bg-transparent"}`} />
            </div>
          ))}
        </div>

        <div className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.09)] print:border-0 print:shadow-none ${step < 3 ? "lg:grid lg:grid-cols-[minmax(0,1fr)_22rem]" : ""}`}>
          <div className="min-w-0 p-5 sm:p-8 lg:p-10">
            {step === 0 ? (
              <section aria-labelledby="property-heading">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-[#0066cc]"><Building2 className="h-5 w-5" aria-hidden="true" /></span>
                  <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0066cc]">Property</p><h2 id="property-heading" className="mt-1 text-2xl font-semibold sm:text-3xl">Where and how large is the project?</h2></div>
                </div>

                <div className="mt-8">
                  <label htmlFor="project-state" className="grid gap-2 text-sm font-bold text-slate-900">
                    <span>Project state</span>
                    <span className="relative flex min-h-14 items-center rounded-lg border border-slate-300 bg-white shadow-sm focus-within:border-[#0784e3] focus-within:ring-4 focus-within:ring-sky-100">
                      <MapPin className="pointer-events-none absolute left-4 h-5 w-5 text-slate-400" aria-hidden="true" />
                      <select id="project-state" value={input.stateCode} onChange={(event) => update("stateCode", event.target.value)} className="h-14 w-full appearance-none bg-transparent pl-12 pr-10 text-base font-semibold text-slate-950 outline-none">
                        {US_STATES.map((state) => <option key={state.code} value={state.code}>{state.label}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-4 text-slate-400" aria-hidden="true">⌄</span>
                    </span>
                  </label>

                  <div className="mt-6 flex items-end justify-between gap-4">
                    <div><h3 className="text-sm font-bold text-slate-900">Apartment mix</h3><p className="mt-1 text-xs leading-5 text-slate-500">Use one row for every apartment type in the project.</p></div>
                    <span className="shrink-0 text-xs font-bold text-[#0066cc]">{input.unitCount.toLocaleString()} total</span>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-300">
                    <div className="grid grid-cols-[minmax(0,1fr)_4.25rem_5.25rem_2.5rem] gap-2 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      <span>Type</span><span>Units</span><span>Sq. ft.</span><span className="sr-only">Remove</span>
                    </div>
                    {input.unitMix.map((entry, index) => {
                      const option = RENOVATION_UNIT_TYPE_OPTIONS.find((item) => item.value === entry.unitType);

                      return (
                        <div key={entry.unitType} className="grid min-h-16 grid-cols-[minmax(0,1fr)_4.25rem_5.25rem_2.5rem] items-center gap-2 border-t border-slate-200 px-3 py-2">
                          <select aria-label={`Unit type ${index + 1}`} value={entry.unitType} onChange={(event) => changeUnitType(index, event.target.value as RenovationUnitType)} className="h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-950 outline-none focus:border-[#0784e3] focus:ring-2 focus:ring-sky-100">
                            {RENOVATION_UNIT_TYPE_OPTIONS.map((unitOption) => <option key={unitOption.value} value={unitOption.value} disabled={input.unitMix.some((item, entryIndex) => entryIndex !== index && item.unitType === unitOption.value)}>{unitOption.shortLabel}</option>)}
                          </select>
                          <input aria-label={`Unit count for ${option?.label ?? entry.unitType}`} type="number" inputMode="numeric" min={1} max={1000} value={entry.unitCount} onChange={(event) => updateUnitMixEntry(index, { unitCount: Number(event.target.value) })} className="h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-center text-sm font-semibold outline-none focus:border-[#0784e3] focus:ring-2 focus:ring-sky-100" />
                          <input aria-label={`Square feet for ${option?.label ?? entry.unitType}`} type="number" inputMode="numeric" min={200} max={10000} value={entry.squareFeetPerUnit} onChange={(event) => updateUnitMixEntry(index, { squareFeetPerUnit: Number(event.target.value) })} className="h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-center text-sm font-semibold outline-none focus:border-[#0784e3] focus:ring-2 focus:ring-sky-100" />
                          {input.unitMix.length > 1 ? <button type="button" onClick={() => removeUnitType(index)} aria-label={`Remove ${option?.label ?? entry.unitType}`} title={`Remove ${option?.label ?? entry.unitType}`} className="inline-flex h-10 w-10 items-center justify-center text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" aria-hidden="true" /></button> : <span />}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <button type="button" onClick={addUnitType} disabled={input.unitMix.length === RENOVATION_UNIT_TYPE_OPTIONS.length} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" aria-hidden="true" /> Add unit type</button>
                    <p className="text-xs text-slate-500">Average {input.squareFeetPerUnit.toLocaleString()} sq. ft.</p>
                  </div>
                </div>
              </section>
            ) : null}

            {step === 1 ? (
              <section aria-labelledby="scope-heading">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-[#0066cc]"><ClipboardCheck className="h-5 w-5" aria-hidden="true" /></span>
                  <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0066cc]">Renovation scope</p><h2 id="scope-heading" className="mt-1 text-2xl font-semibold sm:text-3xl">What would you like to replace?</h2></div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {RENOVATION_SCOPE_OPTIONS.map((option) => {
                    const selected = input.scopes.includes(option.value);
                    const presentation = scopePresentation[option.value];
                    const Icon = presentation.icon;
                    return (
                      <button key={option.value} type="button" onClick={() => toggleScope(option.value)} aria-pressed={selected} className={`group overflow-hidden rounded-lg border text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100 ${selected ? "border-[#0784e3] bg-sky-50 shadow-[0_10px_24px_rgba(7,132,227,0.12)]" : "border-slate-200 bg-white hover:border-sky-300"}`}>
                        <span className="relative block aspect-[16/7] overflow-hidden bg-slate-100"><Image src={presentation.image} alt={presentation.alt} fill sizes="(min-width: 1280px) 18vw, (min-width: 640px) 40vw, 100vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" /><span className="absolute inset-0 bg-slate-950/12" /></span>
                        <span className="flex min-h-[7rem] items-start gap-3 p-4">
                          <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-[#0784e3] text-white" : "bg-slate-100 text-slate-600"}`}>{selected ? <Check className="h-4 w-4" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}</span>
                          <span><span className="block text-sm font-bold text-slate-950">{option.label}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{option.description}</span></span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {input.scopes.includes("bathrooms") ? (
                  input.unitMix.length === 1 ? (
                    <div className="mt-6 max-w-sm"><NumberField id="bathroom-count" label="Bathrooms per apartment" value={input.unitMix[0].bathroomCountPerUnit} onChange={(value) => updateUnitMixEntry(0, { bathroomCountPerUnit: value ?? 0 })} min={1} max={10} suffix="BATHS" /></div>
                  ) : (
                    <div className="mt-6 max-w-md"><p className="text-sm font-bold text-slate-900">Bathrooms per apartment type</p><div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-300">{input.unitMix.map((entry, index) => {
                      const option = RENOVATION_UNIT_TYPE_OPTIONS.find((item) => item.value === entry.unitType);
                      return <label key={entry.unitType} className="flex min-h-14 items-center justify-between gap-4 px-4 text-sm font-semibold text-slate-800"><span>{option?.label ?? entry.unitType}</span><input aria-label={`Bathrooms for ${option?.label ?? entry.unitType}`} type="number" inputMode="numeric" min={1} max={10} value={entry.bathroomCountPerUnit} onChange={(event) => updateUnitMixEntry(index, { bathroomCountPerUnit: Number(event.target.value) })} className="h-10 w-20 rounded-lg border border-slate-300 px-2 text-center font-bold outline-none focus:border-[#0784e3] focus:ring-2 focus:ring-sky-100" /></label>;
                    })}</div></div>
                  )
                ) : null}

                <label htmlFor="other-scope" className="mt-6 grid gap-2 text-sm font-bold text-slate-900">
                  <span>Other work or special requirements <span className="font-medium text-slate-400">(optional)</span></span>
                  <textarea id="other-scope" value={input.otherNotes ?? ""} onChange={(event) => update("otherNotes", event.target.value)} rows={4} placeholder="Windows, appliances, occupied units, special delivery access, or anything else..." className="resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-medium leading-6 text-slate-950 outline-none shadow-sm placeholder:text-slate-400 focus:border-[#0784e3] focus:ring-4 focus:ring-sky-100" />
                </label>
              </section>
            ) : null}

            {step === 2 ? (
              <section aria-labelledby="strategy-heading">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-[#0066cc]"><WalletCards className="h-5 w-5" aria-hidden="true" /></span>
                  <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0066cc]">Finish and budget</p><h2 id="strategy-heading" className="mt-1 text-2xl font-semibold sm:text-3xl">What standard are you targeting?</h2></div>
                </div>

                <fieldset className="mt-8">
                  <legend className="text-sm font-bold text-slate-900">Property class</legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {classOptions.map((option) => (
                      <button key={option.value} type="button" onClick={() => update("renovationClass", option.value)} aria-pressed={input.renovationClass === option.value} className={`min-h-[5.5rem] rounded-lg border p-4 text-left transition ${input.renovationClass === option.value ? "border-[#0784e3] bg-sky-50 ring-1 ring-[#0784e3]" : "border-slate-200 bg-white hover:border-sky-300"}`}>
                        <span className="flex items-start justify-between gap-3"><span><span className="block text-sm font-bold text-slate-950">{option.label}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{option.description}</span></span>{input.renovationClass === option.value ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0784e3]" aria-hidden="true" /> : null}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="mt-7">
                  <legend className="text-sm font-bold text-slate-900">Budget approach</legend>
                  <div className="mt-3 grid overflow-hidden rounded-lg border border-slate-300 sm:grid-cols-3">
                    {budgetOptions.map((option, index) => (
                      <button key={option.value} type="button" onClick={() => update("budgetApproach", option.value)} aria-pressed={input.budgetApproach === option.value} className={`min-h-[5.5rem] px-4 py-3 text-left transition ${index ? "border-t border-slate-300 sm:border-l sm:border-t-0" : ""} ${input.budgetApproach === option.value ? "bg-[#0E2A4A] text-white" : "bg-white text-slate-950 hover:bg-slate-50"}`}>
                        <span className="block text-sm font-bold">{option.label}</span><span className={`mt-1 block text-xs leading-5 ${input.budgetApproach === option.value ? "text-slate-300" : "text-slate-500"}`}>{option.description}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="mt-7 max-w-md"><NumberField id="target-budget" label="Total target material budget" value={input.targetBudget} onChange={(value) => update("targetBudget", value)} min={0} max={1000000000} suffix="USD" optional /></div>

                {input.renovationClass === "A" && input.budgetApproach === "very-low" ? <div className="mt-6 border-l-4 border-amber-400 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-950">Class A and a very-low purchasing budget point in opposite directions. The result will use entry pricing within a premium finish target and should be reviewed carefully.</div> : null}
              </section>
            ) : null}

            {step === 3 ? (
              <section aria-labelledby="estimate-heading" data-testid="renovation-estimate-results">
                <div className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#0066cc]"><Sparkles className="h-4 w-4" aria-hidden="true" /> Material plan ready</p><h1 id="estimate-heading" className="mt-2 text-2xl font-semibold sm:text-4xl">Your apartment renovation estimate</h1><p className="mt-2 text-sm leading-6 text-slate-600">{input.unitCount} unit{input.unitCount === 1 ? "" : "s"} · {isMixedProject ? `${input.unitMix.length} apartment types` : `${input.squareFeetPerUnit.toLocaleString()} sq. ft. each`} · {selectedState?.label} · Class {input.renovationClass}</p>{isMixedProject ? <div className="mt-3 flex flex-wrap gap-2">{input.unitMix.map((entry) => {
                    const option = RENOVATION_UNIT_TYPE_OPTIONS.find((item) => item.value === entry.unitType);
                    return <span key={entry.unitType} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{entry.unitCount} {option?.shortLabel ?? entry.unitType} · {entry.squareFeetPerUnit.toLocaleString()} sq. ft.</span>;
                  })}</div> : null}</div>
                  <div className="flex gap-2 print:hidden">
                    <button type="button" onClick={copyEstimate} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700" aria-label="Copy estimate" title="Copy estimate"><Copy className="h-4 w-4" aria-hidden="true" /></button>
                    <button type="button" onClick={() => window.print()} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700" aria-label="Print estimate" title="Print estimate"><Printer className="h-4 w-4" aria-hidden="true" /></button>
                  </div>
                </div>

                {copied ? <div role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">Estimate copied.</div> : null}

                <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-3">
                  <div className="order-2 bg-white p-4 sm:order-1 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 sm:text-xs sm:tracking-[0.12em]">Per unit</p><p className="mt-2 text-xl font-semibold sm:text-2xl">{formatCurrency(estimate.perUnitSubtotal)}</p><p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">Before adjustments</p></div>
                  <div className="order-1 col-span-2 bg-[#0E2A4A] p-4 text-white sm:order-2 sm:col-span-1 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-sky-300 sm:text-xs sm:tracking-[0.12em]">Estimated materials</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(estimate.estimatedTotal)}</p><p className="mt-1 text-xs text-slate-300">For {input.unitCount} unit{input.unitCount === 1 ? "" : "s"}</p></div>
                  <div className="order-3 bg-white p-4 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 sm:text-xs sm:tracking-[0.12em]">Planning range</p><p className="mt-2 text-sm font-semibold sm:text-xl">{formatCurrency(estimate.lowEstimate)}–{formatCurrency(estimate.highEstimate)}</p><p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">Before tax and delivery</p></div>
                </div>

                {targetDifference !== null ? <div className={`mt-5 rounded-lg border px-4 py-4 text-sm font-semibold ${targetDifference >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}>{targetDifference >= 0 ? `The estimate is ${formatCurrency(targetDifference)} below your target material budget.` : `The estimate is ${formatCurrency(Math.abs(targetDifference))} above your target material budget.`}</div> : null}

                <div className="mt-8">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div><h3 className="text-xl font-semibold">Material schedule</h3><p className="mt-1 text-sm text-slate-600">One total per category. Open a category to see its material split.</p></div>
                    <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">{materialGroups.length} categor{materialGroups.length === 1 ? "y" : "ies"}</span>
                  </div>

                  <div className="mt-4 grid gap-2 print:hidden">
                    {materialGroups.map((group) => {
                      const Icon = scopePresentation[group.scope].icon;

                      return (
                        <details key={group.scope} data-testid={`renovation-category-${group.scope}`} className="group overflow-hidden rounded-lg border border-slate-200 bg-white open:border-sky-300 open:shadow-sm">
                          <summary className="grid min-h-20 cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-sky-100 [&::-webkit-details-marker]:hidden">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-[#0066cc]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                            <span className="min-w-0"><strong className="block text-sm text-slate-950">{group.label}</strong><span className="mt-0.5 block text-xs text-slate-500">{group.lineItems.length} material{group.lineItems.length === 1 ? "" : "s"} · {formatCurrency(group.perUnitTotal)} per unit</span></span>
                            <span className="text-right"><strong className="block text-base text-slate-950">{formatCurrency(group.total)}</strong><span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Subtotal</span></span>
                            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
                          </summary>
                          <div className="border-t border-slate-200 bg-slate-50 px-4 py-1">
                            {group.lineItems.map((item) => (
                              <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-slate-200 py-3 last:border-b-0">
                                <div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{item.label}</p><p className="mt-0.5 text-xs text-slate-500">{item.quantity.toLocaleString()} {item.unit} × {formatCurrency(item.unitCost, 2)}</p></div>
                                <p className="text-sm font-bold text-slate-900">{formatCurrency(item.total)}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      );
                    })}
                  </div>

                  <div className="hidden print:block">
                    {materialGroups.map((group) => (
                      <section key={group.scope} className="break-inside-avoid border-b border-slate-300 py-4">
                        <div className="flex items-center justify-between gap-4"><h4 className="font-bold">{group.label}</h4><strong>{formatCurrency(group.total)}</strong></div>
                        {group.lineItems.map((item) => <div key={item.id} className="mt-2 flex justify-between gap-4 text-sm text-slate-700"><span>{item.label} · {item.quantity.toLocaleString()} {item.unit} × {formatCurrency(item.unitCost, 2)}</span><span>{formatCurrency(item.total)}</span></div>)}
                      </section>
                    ))}
                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-500">Category subtotals include all units and stated material waste, before state, volume, and contingency adjustments.</p>
                  {input.otherNotes?.trim() ? <div className="mt-3 flex items-start justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"><div><p className="text-sm font-bold text-amber-950">Other requested work</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-amber-900">{input.otherNotes}</p></div><span className="shrink-0 text-xs font-bold uppercase tracking-[0.08em] text-amber-700">Not priced</span></div> : null}
                </div>

                <div className="mt-8">
                  <h3 className="text-base font-bold">Portfolio calculation</h3><dl className="mt-3 grid overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-sm sm:grid-cols-2">
                    <div className="flex justify-between gap-4 bg-white px-4 py-3"><dt className="text-slate-600">Unit package subtotal</dt><dd className="shrink-0 font-bold">{formatCurrency(estimate.portfolioSubtotal)}</dd></div>
                    <div className="flex justify-between gap-4 bg-white px-4 py-3"><dt className="text-slate-600">State goods-price adjustment</dt><dd className="shrink-0 font-bold">{estimate.stateAdjustment.amount < 0 ? "−" : "+"}{formatCurrency(Math.abs(estimate.stateAdjustment.amount))}</dd></div>
                    <div className="flex justify-between gap-4 bg-white px-4 py-3"><dt className="text-slate-600">Planning volume adjustment</dt><dd className="shrink-0 font-bold text-emerald-700">−{formatCurrency(estimate.volumeSavings)}</dd></div>
                    <div className="flex justify-between gap-4 bg-white px-4 py-3"><dt className="text-slate-600">Procurement contingency</dt><dd className="shrink-0 font-bold">{formatCurrency(estimate.procurementContingency)}</dd></div>
                  </dl>
                </div>

                <details className="group mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white print:hidden">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-bold text-slate-900 [&::-webkit-details-marker]:hidden"><span>Estimate assumptions and exclusions</span><ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
                  <div className="grid gap-6 border-t border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                    <div><h3 className="text-sm font-bold">Key assumptions</h3><ul className="mt-3 grid gap-2 text-xs leading-5 text-slate-600">{estimate.assumptions.map((item) => <li key={item} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0784e3]" />{item}</li>)}</ul></div>
                    <div><h3 className="text-sm font-bold">Not included</h3><ul className="mt-3 grid gap-2 text-xs leading-5 text-slate-600">{estimate.exclusions.map((item) => <li key={item} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />{item}</li>)}</ul></div>
                  </div>
                </details>

                <div className="mt-5 border-l-4 border-[#0784e3] bg-sky-50 px-4 py-3 text-sm leading-6 text-slate-700"><strong className="text-slate-950">Planning estimate only.</strong> Verify field measurements, exact products, and current supplier pricing before purchase.</div>

                <details className="group mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white print:hidden">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-bold text-slate-900 [&::-webkit-details-marker]:hidden"><span>Method and price references</span><ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 p-4">{ESTIMATOR_SOURCES.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-sky-300 hover:text-[#0066cc]">{source.title}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>)}</div>
                </details>

                <div className="hidden print:grid print:grid-cols-2 print:gap-8 print:pt-6">
                  <div><h3 className="text-base font-bold">Key assumptions</h3><ul className="mt-3 grid gap-2 text-sm text-slate-600">{estimate.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></div>
                  <div><h3 className="text-base font-bold">Not included</h3><ul className="mt-3 grid gap-2 text-sm text-slate-600">{estimate.exclusions.map((item) => <li key={item}>{item}</li>)}</ul></div>
                </div>

                <div className="mt-9 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row print:hidden">
                  <button type="button" onClick={() => setStep(2)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-800"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Adjust answers</button>
                  <button type="button" onClick={restart} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#0E2A4A] px-5 text-sm font-bold text-white"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Start another estimate</button>
                  <Link href="/request-quote" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#0784e3] px-5 text-sm font-bold text-white sm:ml-auto">Request supplier pricing <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                </div>
              </section>
            ) : null}

            {error ? <div role="alert" className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error}</div> : null}

            {step < 3 ? (
              <div className="mt-9 flex items-center justify-between gap-3 border-t border-slate-200 pt-6 print:hidden">
                {step > 0 ? <button type="button" onClick={goBack} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back</button> : <span />}
                <button type="button" onClick={continueFlow} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#0784e3] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(7,132,227,0.22)] hover:bg-[#006fc4]">{step === 2 ? "Build estimate" : "Continue"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            ) : null}
          </div>

          {step < 3 ? <EstimateSnapshot input={input} /> : null}
        </div>
      </section>
    </main>
  );
}
