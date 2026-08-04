"use client"

import { useMemo, useState } from "react"

import type { ShopCartQuestionAnswer } from "@/lib/shop-cart"
import type { QualifyingQuestion } from "@/lib/shop-qualification"

type QualifyingQuestionsModalProps = {
  open: boolean
  title: string
  questions: QualifyingQuestion[]
  onClose: () => void
  onSave: (answers: ShopCartQuestionAnswer[]) => void
  onSkip: () => void
}

export function QualifyingQuestionsModal({ open, title, questions, onClose, onSave, onSkip }: QualifyingQuestionsModalProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const requiredQuestionIds = useMemo(() => questions.filter((question) => question.required).map((question) => question.id), [questions])
  const missingRequired = requiredQuestionIds.some((questionId) => !answers[questionId]?.trim())

  if (!open) return null

  function updateAnswer(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }))
  }

  function saveAnswers() {
    const nextAnswers = questions
      .map((question) => ({
        questionId: question.id,
        label: question.label,
        value: answers[question.id]?.trim() || "",
      }))
      .filter((answer) => answer.value.length > 0)

    onSave(nextAnswers)
    setAnswers({})
  }

  function skipQuestions() {
    onSkip()
    setAnswers({})
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/42 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-8 backdrop-blur-sm sm:items-center sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="qualifying-question-title" className="max-h-[88vh] w-full max-w-xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.32)]">
        <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Quick questions</div>
              <h2 id="qualifying-question-title" className="mt-1 text-xl font-bold tracking-normal text-slate-950">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">This is already in your cart. These answers help prepare a better quote.</p>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl leading-none text-slate-500 shadow-sm" aria-label="Close questions">
              ×
            </button>
          </div>
        </div>

        <div className="max-h-[56vh] overflow-y-auto px-5 py-4">
          <div className="grid gap-4">
            {questions.map((question) => (
              <label key={question.id} className="grid gap-2 text-sm font-semibold text-slate-900">
                <span>
                  {question.label}
                  {question.required ? <span className="text-rose-500"> *</span> : null}
                </span>
                {question.type === "textarea" ? (
                  <textarea value={answers[question.id] || ""} onChange={(event) => updateAnswer(question.id, event.target.value)} rows={4} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                ) : question.type === "select" ? (
                  <select value={answers[question.id] || ""} onChange={(event) => updateAnswer(question.id, event.target.value)} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100">
                    <option value="">Choose one</option>
                    {(question.options || []).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <input value={answers[question.id] || ""} onChange={(event) => updateAnswer(question.id, event.target.value)} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
          <div className="text-xs leading-5 text-slate-500">You can skip this and keep the item in the cart.</div>
          <button type="button" onClick={skipQuestions} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
            Skip
          </button>
          <button type="button" onClick={saveAnswers} disabled={missingRequired} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            Save answers
          </button>
        </div>
      </section>
    </div>
  )
}

