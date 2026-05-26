import Link from "next/link"

import { DrywallCalculator } from "@/components/buildflow/drywall-calculator"
import { DrywallPlanTakeoffCalculator } from "@/components/buildflow/drywall-plan-takeoff-calculator"
import { getSessionWithProfile } from "@/lib/auth"
import type { ProjectRecord } from "@/lib/projects"

type DrywallCalculatorPageProps = {
  searchParams?: Promise<{ projectId?: string; project?: string }>
}

export default async function DrywallCalculatorPage({ searchParams }: DrywallCalculatorPageProps) {
  const params = (await searchParams) ?? {}
  const defaultProjectId = params.projectId || params.project || ""
  const { supabase, user } = await getSessionWithProfile()
  let projects: Pick<ProjectRecord, "id" | "name">[] = []

  if (user) {
    const { data } = await supabase
      .from("projects")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .returns<Pick<ProjectRecord, "id" | "name">[]>()

    projects = data || []
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-4 pb-28 text-slate-900 sm:px-6 sm:py-5 sm:pb-10 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-4">
        <Link href="/shop/sheet-rock" className="w-fit text-sm font-bold text-sky-700">
          Back to Sheet rock
        </Link>
        <div>
          <h1 className="text-[2rem] font-bold tracking-normal text-slate-950 sm:text-[2.4rem]">Drywall calculator</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Estimate Sheetrock from a proposed floor plan ruler takeoff, section height, and door/window schedules.
          </p>
        </div>
        <DrywallPlanTakeoffCalculator projects={projects} isSignedIn={Boolean(user)} defaultProjectId={defaultProjectId} />
        <DrywallCalculator />
      </section>
    </main>
  )
}
