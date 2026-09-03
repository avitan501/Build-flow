"use client"

import { Phone } from "lucide-react"

export const OPEN_REQUEST_CLIENT_CONTACT_EVENT = "avantia:open-request-client-contact"

export function RequestClientContact() {
  function openContactComposer() {
    window.dispatchEvent(new CustomEvent(OPEN_REQUEST_CLIENT_CONTACT_EVENT))
  }

  return (
    <button
      type="button"
      onClick={openContactComposer}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#0071e3] text-white shadow-sm transition hover:bg-[#0066cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
      aria-label="Contact client"
      title="Contact client"
      aria-haspopup="dialog"
      aria-controls="request-client-contact-dialog"
    >
      <Phone className="h-4 w-4" />
    </button>
  )
}
