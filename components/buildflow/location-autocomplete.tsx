"use client"

import { useEffect, useId, useState } from "react"

import type { LocationSuggestion } from "@/lib/location-types"

export function LocationAutocomplete({
  label,
  value,
  onChange,
  onSelect,
  mode = "address",
  placeholder,
  hint,
  className = "",
}: {
  label: React.ReactNode
  value: string
  onChange: (value: string) => void
  onSelect: (suggestion: LocationSuggestion) => void
  mode?: "address" | "store"
  placeholder: string
  hint?: React.ReactNode
  className?: string
}) {
  const listboxId = useId()
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const canSearch = value.trim().length >= 3

  useEffect(() => {
    const query = value.trim()
    if (query.length < 3) return
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/location/search?q=${encodeURIComponent(query)}&mode=${mode}`, { signal: controller.signal })
        const payload = await response.json() as { suggestions?: LocationSuggestion[] }
        setSuggestions(response.ok ? payload.suggestions || [] : [])
      } catch {
        if (!controller.signal.aborted) setSuggestions([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 350)
    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [mode, value])

  return (
    <label className={`relative grid gap-1.5 text-sm font-semibold text-slate-700 ${className}`}>
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        autoComplete={mode === "store" ? "organization" : "street-address"}
        placeholder={placeholder}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={focused && suggestions.length > 0}
        aria-controls={listboxId}
        className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
      />
      {canSearch && loading ? <span className="text-xs font-normal text-sky-700">Finding addresses…</span> : hint}
      {canSearch && focused && suggestions.length > 0 ? (
        <ul id={listboxId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl">
          {suggestions.map((suggestion) => (
            <li key={`${suggestion.source}-${suggestion.latitude}-${suggestion.longitude}`} role="option" aria-selected="false">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(mode === "store" && suggestion.name ? suggestion.name : suggestion.label)
                  onSelect(suggestion)
                  setSuggestions([])
                  setFocused(false)
                }}
                className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              >
                <span className="block text-sm font-semibold text-slate-900">{suggestion.name || suggestion.label}</span>
                {suggestion.name ? <span className="mt-0.5 block text-xs font-normal text-slate-500">{suggestion.label}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </label>
  )
}
