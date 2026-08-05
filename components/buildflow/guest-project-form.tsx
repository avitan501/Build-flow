"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"

import { createGuestProject } from "@/lib/guest-projects"

type GuestProjectFormProps = {
  nextPath: string
  errorMessage?: string | null
}

function appendAddressToNextPath(nextPath: string, address: string | null) {
  if (!address || !nextPath.startsWith("/shop")) return nextPath

  const url = new URL(nextPath, "https://buildflow.local")
  url.searchParams.set("address", address)
  return `${url.pathname}${url.search}`
}

export function GuestProjectForm({ nextPath, errorMessage }: GuestProjectFormProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const projectName = name.trim()
    const projectAddress = address.trim()

    if (!projectName) {
      setLocalError("Project name is required.")
      return
    }

    createGuestProject(projectName, projectAddress || null)
    router.push(appendAddressToNextPath(nextPath, projectAddress || projectName))
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_18px_42px_rgba(148,163,184,0.12)] sm:p-7">
      <div>
        <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.4rem]">Start New Project</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Add the job name and address, then keep every material, service, plan, and quote request organized in this project.</p>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="guest-project-name" className="text-sm font-semibold text-slate-900">
            Project name <span className="text-rose-500">*</span>
          </label>
          <input
            id="guest-project-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setLocalError(null)
            }}
            type="text"
            required
            placeholder="Example: Smith kitchen renovation"
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div>
          <label htmlFor="guest-project-address" className="text-sm font-semibold text-slate-900">
            Project address
          </label>
          <textarea
            id="guest-project-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            rows={3}
            placeholder="Street, city, state"
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
        </div>
      </div>

      {localError || errorMessage ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {localError || errorMessage}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f6cf69_0%,#e9b846_100%)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_28px_rgba(220,168,69,0.22)] transition active:scale-[0.99]"
        >
          Create Project
        </button>
        <button
          type="button"
          onClick={() => router.push(nextPath)}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition active:scale-[0.99]"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
