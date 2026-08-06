import { MaterialQuestionnaireAdmin } from "@/components/buildflow/material-questionnaire-admin"
import { requireAdminProfile } from "@/lib/auth"
import { loadMaterialQuestionnaireCategories } from "@/lib/material-questionnaires-server"

export default async function MaterialOrderQuestionsPage() {
  const { supabase } = await requireAdminProfile()
  const categories = await loadMaterialQuestionnaireCategories(supabase, true)

  return <main className="min-h-screen bg-[#f5f5f7] px-4 pb-28 pt-5 text-slate-950 sm:px-8 sm:pb-12"><div className="mx-auto max-w-7xl"><div className="mb-6"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Departments & Questions</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Manage Quick Order settings and the questions customers answer for each department.</p></div><MaterialQuestionnaireAdmin categories={categories} /></div></main>
}
