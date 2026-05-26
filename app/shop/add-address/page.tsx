import { redirect } from "next/navigation"

import { getSessionWithProfile } from "@/lib/auth"
import { createProjectEvent, type ProjectRecord } from "@/lib/projects"

type AddAddressPageProps = {
  searchParams?: Promise<{ address?: string }>
}

export default async function AddShopAddressPage({ searchParams }: AddAddressPageProps) {
  const params = (await searchParams) ?? {}
  const address = params.address?.trim() || ""

  if (!address) {
    redirect("/shop")
  }

  const { supabase, user } = await getSessionWithProfile()
  const encodedAddress = encodeURIComponent(address)

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/shop/add-address?address=${encodedAddress}`)}`)
  }

  const { data: existingProject, error: existingError } = await supabase
    .from("projects")
    .select("id, owner_id, name, address, status, created_at, updated_at")
    .eq("owner_id", user.id)
    .eq("address", address)
    .maybeSingle<ProjectRecord>()

  if (existingError) {
    redirect(`/shop?address=${encodedAddress}&error=project-create-failed`)
  }

  if (existingProject) {
    redirect(`/shop?project=${existingProject.id}&created=existing`)
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      name: address,
      address,
      status: "draft",
    })
    .select("id, name")
    .single<{ id: string; name: string }>()

  if (error || !project) {
    redirect(`/shop?address=${encodedAddress}&error=project-create-failed`)
  }

  await createProjectEvent({
    supabase,
    projectId: project.id,
    ownerId: user.id,
    eventType: "project_opened",
    source: "website",
    title: "Project created from shop address",
    description: `Project ${project.name} was created from the shop page.`,
    metadata: { project_id: project.id, address },
  })

  redirect(`/shop?project=${project.id}&created=1`)
}
