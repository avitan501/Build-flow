"use client"

import { ArrowLeft, Building2, Calculator, ChevronDown, ChevronUp, Eye, FileUp, ListChecks, MessageSquareText, Plus, Save, Settings2, ShoppingBag, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import {
  createMaterialCategoryAction,
  createMaterialOptionAction,
  createMaterialQuestionAction,
  deleteMaterialOptionAction,
  deleteMaterialQuestionAction,
  moveMaterialOptionAction,
  moveMaterialQuestionAction,
  updateMaterialCategoryAction,
  updateMaterialOptionAction,
  updateMaterialQuestionAction,
} from "@/app/admin/settings/material-order-questions/actions"
import { MaterialQuestionnaireWizard } from "@/components/buildflow/material-questionnaire-wizard"
import { DEPARTMENT_SYMBOL_OPTIONS } from "@/components/buildflow/department-symbol-badges"
import {
  departmentExperienceFor,
  departmentOverrideFor,
  isDepartmentHidden,
  type ManagerCatalogAddOns,
} from "@/lib/manager-add-ons"
import {
  MATERIAL_DEPARTMENTS,
  MATERIAL_QUESTION_TYPES,
  MATERIAL_QUESTION_TYPE_LABELS,
  buildMaterialQuestionnaireSnapshot,
  type MaterialQuestion,
  type MaterialQuestionOption,
  type MaterialQuestionnaireCategory,
} from "@/lib/material-questionnaires"
import { SHOP_TOOL_CATEGORIES, type DepartmentSymbolKey } from "@/lib/shop-tools"

const inputClass = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"

type CategoryDraft = {
  name: string
  departmentKey: string
  description: string
  isActive: boolean
  showInShop: boolean
  showPlanUpload: boolean
  showChatToOrder: boolean
  showTakeoff: boolean
  imageUrl: string
  symbols: DepartmentSymbolKey[]
}

function categorySettingsDraft(category: MaterialQuestionnaireCategory, addOns: ManagerCatalogAddOns): CategoryDraft {
  const base = SHOP_TOOL_CATEGORIES.find((entry) => entry.label === category.department_key)
  const override = departmentOverrideFor(addOns, category.department_key)
  const experience = departmentExperienceFor(addOns, category.department_key)
  return {
    name: override?.label || base?.label || category.name,
    departmentKey: category.department_key,
    description: override?.description || base?.description || category.description,
    isActive: category.is_active,
    showInShop: !isDepartmentHidden(addOns, category.department_key),
    showPlanUpload: experience.showPlanUpload,
    showChatToOrder: experience.showChatToOrder,
    showTakeoff: experience.showTakeoff,
    imageUrl: override?.imageUrl || base?.imageUrl || "",
    symbols: override?.symbols?.length ? override.symbols : base?.symbols ?? [],
  }
}

function FeatureToggle({ enabled, label, description, Icon, onClick }: { enabled: boolean; label: string; description: string; Icon: typeof ShoppingBag; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={enabled} className={`flex min-h-[92px] items-start gap-3 rounded-lg border p-3 text-left transition ${enabled ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}><span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${enabled ? "bg-[#0071e3] text-white" : "bg-slate-100 text-slate-500"}`}><Icon className="h-5 w-5" /></span><span className="min-w-0"><span className="flex items-center gap-2 text-sm font-bold text-slate-950">{label}<span className={`text-[10px] font-semibold uppercase ${enabled ? "text-emerald-700" : "text-slate-400"}`}>{enabled ? "On" : "Off"}</span></span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span></button>
}

function ActionMessage({ message }: { message: string | null }) {
  return message ? <p className={`text-sm font-medium ${message.startsWith("Saved") || message.startsWith("Added") ? "text-emerald-700" : "text-rose-700"}`}>{message}</p> : null
}

function OptionEditor({ option, questionId, first, last }: { option: MaterialQuestionOption; questionId: string; first: boolean; last: boolean }) {
  const router = useRouter()
  const [label, setLabel] = useState(option.label)
  const [value, setValue] = useState(option.value)
  const [active, setActive] = useState(option.is_active)
  const [pending, startTransition] = useTransition()

  function run(task: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => { await task(); router.refresh() })
  }

  return <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center"><input aria-label="Option label" value={label} onChange={(event) => setLabel(event.target.value)} className={inputClass} /><input aria-label="Option value" value={value} onChange={(event) => setValue(event.target.value)} className={inputClass} /><div className="flex items-center gap-1"><button type="button" disabled={pending || first} onClick={() => run(() => moveMaterialOptionAction({ id: option.id, questionId, direction: "up" }))} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-30" title="Move option up"><ChevronUp className="h-4 w-4" /></button><button type="button" disabled={pending || last} onClick={() => run(() => moveMaterialOptionAction({ id: option.id, questionId, direction: "down" }))} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-30" title="Move option down"><ChevronDown className="h-4 w-4" /></button><button type="button" disabled={pending} onClick={() => run(() => updateMaterialOptionAction({ id: option.id, label, value, isActive: active }))} className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white" title="Save option"><Save className="h-4 w-4" /></button><button type="button" onClick={() => setActive((entry) => !entry)} className={`h-10 rounded-lg border px-3 text-xs font-semibold ${active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-500"}`}>{active ? "On" : "Off"}</button><button type="button" disabled={pending} onClick={() => { if (window.confirm("Delete this answer option?")) run(() => deleteMaterialOptionAction(option.id)) }} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-700" title="Delete option"><Trash2 className="h-4 w-4" /></button></div></div>
}

function QuestionEditor({ question, questions, index, total }: { question: MaterialQuestion; questions: MaterialQuestion[]; index: number; total: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({
    label: question.label,
    helpText: question.help_text,
    placeholder: question.placeholder,
    questionType: question.question_type,
    unit: question.unit ?? "",
    isRequired: question.is_required,
    isActive: question.is_active,
    allowOther: question.allow_other,
    parentQuestionId: question.conditional_parent_question_id ?? "",
    conditionalOperator: question.conditional_operator ?? "equals",
    conditionalValue: typeof question.conditional_value === "string" ? question.conditional_value : "",
    quantityUnits: (question.configuration.units ?? []).join(", "),
    allowNotes: Boolean(question.configuration.allowNotes),
  })
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const optionType = ["single_select", "multi_select", "dropdown"].includes(draft.questionType)
  const eligibleParents = questions.filter((candidate) => candidate.sort_order < question.sort_order)

  function refreshTask(task: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => { const result = await task(); setMessage(result.ok ? success : result.error || "Could not save."); if (result.ok) router.refresh() })
  }

  return <article className={`rounded-2xl border bg-white ${question.is_active ? "border-slate-200" : "border-slate-200 opacity-65"}`}>
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-start justify-between gap-3 p-4 text-left"><span><span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">{MATERIAL_QUESTION_TYPE_LABELS[question.question_type]}</span><span className="mt-1 block text-sm font-semibold text-slate-950">{question.label}</span><span className="mt-1 block text-xs text-slate-500">{question.is_required ? "Required" : "Optional"}{question.conditional_parent_question_id ? " · Conditional" : ""}</span></span><Settings2 className="h-5 w-5 shrink-0 text-slate-400" /></button>
    {open ? <div className="grid gap-4 border-t border-slate-100 p-4">
      <label className="grid gap-1.5 text-sm font-semibold">Question label<input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} className={inputClass} /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-semibold">Question type<select value={draft.questionType} onChange={(event) => setDraft({ ...draft, questionType: event.target.value as typeof draft.questionType })} className={inputClass}>{MATERIAL_QUESTION_TYPES.map((type) => <option key={type} value={type}>{MATERIAL_QUESTION_TYPE_LABELS[type]}</option>)}</select></label><label className="grid gap-1.5 text-sm font-semibold">Unit<input value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} placeholder="sq. ft., gallons, pieces" className={inputClass} /></label></div>
      <label className="grid gap-1.5 text-sm font-semibold">Help text<textarea rows={2} value={draft.helpText} onChange={(event) => setDraft({ ...draft, helpText: event.target.value })} className={`${inputClass} py-2`} /></label>
      <label className="grid gap-1.5 text-sm font-semibold">Placeholder<input value={draft.placeholder} onChange={(event) => setDraft({ ...draft, placeholder: event.target.value })} className={inputClass} /></label>
      <div className="flex flex-wrap gap-2">{[["isRequired","Required"],["isActive","Enabled"],["allowOther","Allow Other"],["allowNotes","Allow notes"]].map(([key,label]) => <button key={key} type="button" onClick={() => setDraft({ ...draft, [key]: !draft[key as keyof typeof draft] })} className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${draft[key as keyof typeof draft] ? "border-sky-300 bg-sky-50 text-sky-800" : "border-slate-200 bg-white text-slate-600"}`}>{label}</button>)}</div>
      {draft.questionType === "quantity" ? <label className="grid gap-1.5 text-sm font-semibold">Quantity units<input value={draft.quantityUnits} onChange={(event) => setDraft({ ...draft, quantityUnits: event.target.value })} placeholder="pieces, boxes, buckets" className={inputClass} /></label> : null}
      <fieldset className="grid gap-3 rounded-xl border border-slate-200 p-3"><legend className="px-1 text-sm font-semibold">Conditional display</legend><label className="grid gap-1.5 text-sm font-semibold">Show after<select value={draft.parentQuestionId} onChange={(event) => setDraft({ ...draft, parentQuestionId: event.target.value })} className={inputClass}><option value="">Always show</option>{eligibleParents.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select></label>{draft.parentQuestionId ? <div className="grid gap-3 sm:grid-cols-2"><select aria-label="Condition operator" value={draft.conditionalOperator} onChange={(event) => setDraft({ ...draft, conditionalOperator: event.target.value as typeof draft.conditionalOperator })} className={inputClass}><option value="equals">Equals</option><option value="not_equals">Does not equal</option><option value="includes_any">Includes any</option><option value="includes_all">Includes all</option><option value="is_answered">Is answered</option></select>{draft.conditionalOperator !== "is_answered" ? <input aria-label="Condition value" value={draft.conditionalValue} onChange={(event) => setDraft({ ...draft, conditionalValue: event.target.value })} placeholder="Stored option value, e.g. yes" className={inputClass} /> : null}</div> : null}</fieldset>
      {optionType ? <section className="grid gap-2"><div className="flex items-center justify-between"><h4 className="text-sm font-semibold">Answer options</h4><button type="button" disabled={pending} onClick={() => refreshTask(() => createMaterialOptionAction(question.id), "Added option.")} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-slate-200 px-3 text-xs font-semibold"><Plus className="h-4 w-4" />Option</button></div>{question.options.map((option, optionIndex) => <OptionEditor key={option.id} option={option} questionId={question.id} first={optionIndex === 0} last={optionIndex === question.options.length - 1} />)}</section> : null}
      <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={pending} onClick={() => refreshTask(() => updateMaterialQuestionAction({ id: question.id, ...draft }), "Saved question.")} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white"><Save className="h-4 w-4" />Save question</button><button type="button" disabled={pending || index === 0} onClick={() => refreshTask(() => moveMaterialQuestionAction({ id: question.id, categoryId: question.category_id, direction: "up" }), "Saved order.")} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200" title="Move question up"><ChevronUp className="h-4 w-4" /></button><button type="button" disabled={pending || index === total - 1} onClick={() => refreshTask(() => moveMaterialQuestionAction({ id: question.id, categoryId: question.category_id, direction: "down" }), "Saved order.")} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200" title="Move question down"><ChevronDown className="h-4 w-4" /></button><button type="button" disabled={pending} onClick={() => { if (window.confirm("Delete this question? Historical order answers will remain saved.")) refreshTask(() => deleteMaterialQuestionAction(question.id), "Deleted question.") }} className="inline-flex h-11 items-center gap-2 rounded-full border border-rose-200 px-4 text-sm font-semibold text-rose-700"><Trash2 className="h-4 w-4" />Delete</button></div><ActionMessage message={message} />
    </div> : null}
  </article>
}

export function MaterialQuestionnaireAdmin({ categories, initialAddOns }: { categories: MaterialQuestionnaireCategory[]; initialAddOns: ManagerCatalogAddOns }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState("")
  const [activeTab, setActiveTab] = useState<"settings" | "questions" | "preview">("settings")
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: "", departmentKey: MATERIAL_DEPARTMENTS.find((department) => !categories.some((category) => category.department_key === department)) ?? MATERIAL_DEPARTMENTS[0] })
  const selected = categories.find((category) => category.id === selectedId) ?? null
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft | null>(selected ? categorySettingsDraft(selected, initialAddOns) : null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const departmentRows = useMemo(() => {
    const configured = new Map(categories.map((category) => [category.department_key, category]))
    const shopRows = MATERIAL_DEPARTMENTS.map((department) => ({ department, category: configured.get(department) ?? null }))
    const customRows = categories.filter((category) => !MATERIAL_DEPARTMENTS.some((department) => department === category.department_key)).map((category) => ({ department: category.department_key, category }))
    return [...shopRows, ...customRows]
  }, [categories])

  function choose(category: MaterialQuestionnaireCategory) { setSelectedId(category.id); setCategoryDraft(categorySettingsDraft(category, initialAddOns)); setActiveTab("settings"); setMessage(null) }
  function run(task: () => Promise<{ ok: boolean; error?: string; data?: { id: string } }>, success: string) { startTransition(async () => { const result = await task(); setMessage(result.ok ? success : result.error || "Could not save."); if (result.ok) { if (result.data?.id) setSelectedId(result.data.id); router.refresh() } }) }
  function setUpDepartment(department: string) { startTransition(async () => { const result = await createMaterialCategoryAction({ name: department, departmentKey: department }); setMessage(result.ok ? `Added ${department}. Open it to configure Quick Order.` : result.error || "Could not set up department."); router.refresh() }) }

  if (!selected) {
    return <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Departments</h2><p className="mt-1 text-sm text-slate-500">Choose one department to manage its settings and customer questions.</p></div><button type="button" onClick={() => setAddingCategory((value) => !value)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add department</button></div>
      {addingCategory ? <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="grid gap-1.5 text-sm font-semibold">Department name<input value={newCategory.name} onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })} placeholder="Department name" className={inputClass} /></label><label className="grid gap-1.5 text-sm font-semibold">Connect to Shop<select value={newCategory.departmentKey} onChange={(event) => setNewCategory({ ...newCategory, departmentKey: event.target.value as typeof newCategory.departmentKey })} className={inputClass}>{MATERIAL_DEPARTMENTS.filter((department) => !categories.some((category) => category.department_key === department)).map((department) => <option key={department}>{department}</option>)}</select></label><button type="button" disabled={pending || !newCategory.name.trim()} onClick={() => run(() => createMaterialCategoryAction(newCategory), "Added department.")} className="min-h-11 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white disabled:opacity-50">Create</button></section> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{departmentRows.map(({ department, category }) => <article key={department} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white"><Building2 className="h-5 w-5" /></span><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${category?.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{category?.is_active ? "Quick Order on" : category ? "Quick Order off" : "Not set up"}</span></div><h3 className="mt-5 text-lg font-bold">{category?.name ?? department}</h3><p className="mt-1 text-sm text-slate-500">{category ? `Connected to ${department}` : "Available in Let's Work"}</p><div className="mt-4 flex items-center gap-2 text-sm text-slate-600"><ListChecks className="h-4 w-4" />{category?.questions.length ?? 0} questions</div>{category ? <button type="button" onClick={() => choose(category)} className="mt-5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950 hover:border-sky-400 hover:bg-sky-50">Manage department</button> : <button type="button" disabled={pending} onClick={() => setUpDepartment(department)} className="mt-5 min-h-11 w-full rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">Set up department</button>}</article>)}</div>
      <ActionMessage message={message} />
    </div>
  }

  if (!categoryDraft) return null

  const tabs = [{ id: "settings", label: "Settings", icon: Settings2 }, { id: "questions", label: "Questions", icon: ListChecks }, { id: "preview", label: "Preview", icon: Eye }] as const

  return <div className="grid gap-5">
    <button type="button" onClick={() => setSelectedId("")} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#0066cc]"><ArrowLeft className="h-4 w-4" />All departments</button>
    <div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#0066cc]">Department</p><h2 className="mt-1 text-2xl font-bold">{selected.name}</h2><p className="mt-1 text-sm text-slate-500">Manage this department without changing any other department.</p></div>
    <nav className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-white p-1" aria-label="Department management sections">{tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold ${activeTab === tab.id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}><Icon className="h-4 w-4" /><span className="hidden sm:inline">{tab.label}</span></button> })}</nav>

    {activeTab === "settings" ? <section className="grid gap-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div><h3 className="text-lg font-bold">Department settings</h3><p className="mt-1 text-sm text-slate-500">Saved changes control this department in the customer Let&apos;s Work area.</p></div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold">Customer display name<input value={categoryDraft.name} onChange={(event) => setCategoryDraft({ ...categoryDraft, name: event.target.value })} className={inputClass} /></label>
        <label className="grid gap-1.5 text-sm font-semibold">Connected department<input value={categoryDraft.departmentKey} readOnly className={`${inputClass} bg-slate-100 text-slate-500`} /><span className="text-xs font-normal text-slate-500">The route stays fixed so renaming does not break links.</span></label>
        <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Customer description<textarea rows={3} value={categoryDraft.description} onChange={(event) => setCategoryDraft({ ...categoryDraft, description: event.target.value })} className={`${inputClass} py-2`} /></label>
        <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Department image<input value={categoryDraft.imageUrl} onChange={(event) => setCategoryDraft({ ...categoryDraft, imageUrl: event.target.value })} placeholder="/images/... or https://..." className={inputClass} /><span className="text-xs font-normal text-slate-500">Used on the Let&apos;s Work department card.</span></label>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-950">Customer experience</h4>
        <p className="mt-1 text-xs leading-5 text-slate-500">Turn each customer-facing tool on or off for this department.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureToggle enabled={categoryDraft.showInShop} label="Show in Let's Work" description="Display this department in the customer list." Icon={ShoppingBag} onClick={() => setCategoryDraft({ ...categoryDraft, showInShop: !categoryDraft.showInShop })} />
          <FeatureToggle enabled={categoryDraft.isActive} label="Quick Order" description="Ask the configured department questions." Icon={ListChecks} onClick={() => setCategoryDraft({ ...categoryDraft, isActive: !categoryDraft.isActive })} />
          <FeatureToggle enabled={categoryDraft.showPlanUpload} label="Plan upload" description="Accept a blueprint or shopping list." Icon={FileUp} onClick={() => setCategoryDraft({ ...categoryDraft, showPlanUpload: !categoryDraft.showPlanUpload })} />
          <FeatureToggle enabled={categoryDraft.showChatToOrder} label="Chat to Order" description="Show the written custom-order request." Icon={MessageSquareText} onClick={() => setCategoryDraft({ ...categoryDraft, showChatToOrder: !categoryDraft.showChatToOrder })} />
          <FeatureToggle enabled={categoryDraft.showTakeoff} label="Takeoff tools" description="Show calculators or takeoff tools when available." Icon={Calculator} onClick={() => setCategoryDraft({ ...categoryDraft, showTakeoff: !categoryDraft.showTakeoff })} />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-bold text-slate-950">Department symbols</legend>
        <p className="mt-1 text-xs leading-5 text-slate-500">Small badges shown on the department card.</p>
        <div className="mt-3 flex flex-wrap gap-2">{DEPARTMENT_SYMBOL_OPTIONS.map(({ key, label, Icon }) => { const enabled = categoryDraft.symbols.includes(key); return <button key={key} type="button" aria-pressed={enabled} onClick={() => setCategoryDraft({ ...categoryDraft, symbols: enabled ? categoryDraft.symbols.filter((symbol) => symbol !== key) : [...categoryDraft.symbols, key] })} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold ${enabled ? "border-sky-300 bg-sky-50 text-sky-800" : "border-slate-200 bg-white text-slate-600"}`}><Icon className="h-4 w-4" />{label}</button> })}</div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4"><button type="button" disabled={pending} onClick={() => run(() => updateMaterialCategoryAction({ id: selected.id, ...categoryDraft }), "Saved department.")} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0071e3] px-5 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />Save and publish</button><ActionMessage message={message} /></div>
    </section> : null}

    {activeTab === "questions" ? <section><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">Customer questions</h3><p className="text-sm text-slate-500">Open one question to edit its answers and follow-up rules.</p></div><button type="button" disabled={pending} onClick={() => run(() => createMaterialQuestionAction(selected.id), "Added question.")} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add question</button></div><div className="grid gap-2">{selected.questions.map((question, index) => <QuestionEditor key={question.id} question={question} questions={selected.questions} index={index} total={selected.questions.length} />)}</div></section> : null}

    {activeTab === "preview" ? <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-5"><div className="mb-4"><h3 className="text-lg font-bold">Customer preview</h3><p className="mt-1 text-sm text-slate-500">Test the exact question flow customers will see.</p></div><MaterialQuestionnaireWizard snapshot={buildMaterialQuestionnaireSnapshot(selected)} embedded /></section> : null}
  </div>
}
