"use client"

import { MessageSquareText } from "lucide-react"

export const OPEN_REQUEST_CLIENT_CONTACT_EVENT = "avantia:open-request-client-contact"

export function RequestClientContact() {
  function openContactComposer() {
    window.dispatchEvent(new CustomEvent(OPEN_REQUEST_CLIENT_CONTACT_EVENT))
  }

  return (
    <button
      type="button"
      onClick={openContactComposer}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0071e3] px-3 text-xs font-bold text-white"
      aria-haspopup="dialog"
      aria-controls="request-client-contact-dialog"
    >
      <MessageSquareText className="h-4 w-4" />
      Contact client
    </button>
  )
}
