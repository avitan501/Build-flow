"use client"

import { useState } from "react"
import { splitQuotedEmail } from "@/lib/communication-presentation"

export function CommunicationMessageText({ text, email }: { text: string; email: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const { current, previous } = email ? splitQuotedEmail(text) : { current: text, previous: "" }
  const long = current.length > 520 || current.split("\n").length > 8
  return <div>
    <p className={`whitespace-pre-wrap break-words text-sm leading-6 ${long && !expanded ? "max-h-36 overflow-hidden" : ""}`}>{current}</p>
    {long ? <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="min-h-11 text-xs font-semibold text-sky-700 focus-visible:ring-2">{expanded ? "Show less" : "Read full message"}</button> : null}
    {previous ? <details className="mt-2 border-t border-slate-100"><summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold text-slate-500">Previous email</summary><p className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-500">{previous}</p></details> : null}
  </div>
}
