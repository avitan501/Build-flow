export type GuestProject = {
  id: string
  name: string
  address: string | null
  createdAt: string
  updatedAt: string
}

export const GUEST_PROJECTS_STORAGE_KEY = "buildflow-guest-projects"
export const GUEST_SELECTED_PROJECT_STORAGE_KEY = "buildflow-selected-guest-project"
export const GUEST_PROJECTS_UPDATED_EVENT = "buildflow-guest-projects-updated"

function nowIso() {
  return new Date().toISOString()
}

export function readGuestProjects(): GuestProject[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(GUEST_PROJECTS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.filter((item): item is GuestProject => Boolean(item && typeof item === "object" && typeof item.id === "string" && typeof item.name === "string"))
      : []
  } catch {
    return []
  }
}

export function writeGuestProjects(projects: GuestProject[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(GUEST_PROJECTS_STORAGE_KEY, JSON.stringify(projects))
  window.dispatchEvent(new Event(GUEST_PROJECTS_UPDATED_EVENT))
}

export function selectGuestProject(projectId: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(GUEST_SELECTED_PROJECT_STORAGE_KEY, projectId)
  window.dispatchEvent(new Event(GUEST_PROJECTS_UPDATED_EVENT))
}

export function clearSelectedGuestProject() {
  selectGuestProject("")
}

export function readSelectedGuestProject() {
  if (typeof window === "undefined") return null

  const selectedId = window.localStorage.getItem(GUEST_SELECTED_PROJECT_STORAGE_KEY)
  const projects = readGuestProjects()
  if (selectedId === "") return null
  return projects.find((project) => project.id === selectedId) ?? (selectedId === null ? projects[0] ?? null : null)
}

export function createGuestProject(name: string, address: string | null): GuestProject {
  const project: GuestProject = {
    id: `guest-${Date.now()}`,
    name,
    address,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  writeGuestProjects([project, ...readGuestProjects().filter((item) => item.id !== project.id)])
  selectGuestProject(project.id)
  return project
}
