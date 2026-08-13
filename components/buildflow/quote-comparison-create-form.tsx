"use client";

import { ArrowRight, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createQuoteComparisonAction } from "@/app/admin/quote-comparison/actions";

type ProjectOption = { id: string; name: string; address: string | null };

export function QuoteComparisonCreateForm({
  projects,
  departments,
  enabled,
}: {
  projects: ProjectOption[];
  departments: string[];
  enabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [jobAddress, setJobAddress] = useState("");
  const [projectId, setProjectId] = useState("");

  function chooseProject(value: string) {
    setProjectId(value);
    const project = projects.find((entry) => entry.id === value);
    if (project?.address && !jobAddress) setJobAddress(project.address);
    if (project && !title) setTitle(`${project.name} material quotes`);
  }

  function submit() {
    setError("");
    startTransition(async () => {
      const result = await createQuoteComparisonAction({ title, department, jobAddress, projectId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/quote-comparison/${result.data.comparisonId}`);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        disabled={!enabled}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#005bb5] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        <Plus className="h-4 w-4" /> New comparison
      </button>
    );
  }

  return (
    <section className="border border-slate-200 bg-white shadow-sm" aria-labelledby="new-comparison-title">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0071e3]">New comparison</p>
          <h2 id="new-comparison-title" className="mt-1 text-xl font-bold text-slate-950">Start with the job details</h2>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600" aria-label="Close new comparison form"><X className="h-4 w-4" /></button>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800 sm:col-span-2">
          Comparison name
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: 280 Lawrence framing package" className="min-h-12 rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-sky-100" />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
          Project <span className="font-normal text-slate-400">Optional</span>
          <select value={projectId} onChange={(event) => chooseProject(event.target.value)} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0071e3]">
            <option value="">No project selected</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
          Department
          <select value={department} onChange={(event) => setDepartment(event.target.value)} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0071e3]">
            <option value="">Choose department</option>
            {departments.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800 sm:col-span-2">
          Delivery address <span className="font-normal text-slate-400">Optional</span>
          <input value={jobAddress} onChange={(event) => setJobAddress(event.target.value)} placeholder="Jobsite address" className="min-h-12 rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-sky-100" />
        </label>
        {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 sm:col-span-2">{error}</p> : null}
        <div className="flex justify-end sm:col-span-2">
          <button type="button" onClick={submit} disabled={pending || !title.trim()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {pending ? "Creating…" : "Create comparison"}<ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
