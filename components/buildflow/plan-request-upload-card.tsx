"use client"

import { useRef, useState, type ReactNode } from "react"

import { QualifyingQuestionsModal } from "@/components/buildflow/qualifying-questions-modal"
import {
  readShopCartCount,
  upsertShopCustomCartItem,
  type ShopCartQuestionAnswer,
  type ShopCustomCartItem,
} from "@/lib/shop-cart"
import { getQualificationSettingForPlanRequest, type QualifyingQuestion } from "@/lib/shop-qualification"

type PlanRequestUploadCardProps = {
  requestId: string
  label: string
  description: string
  category: string
  accept: string
  icon: ReactNode
}

export function PlanRequestUploadCard({ requestId, label, description, category, accept, icon }: PlanRequestUploadCardProps) {
  const [activeItem, setActiveItem] = useState<ShopCustomCartItem | null>(null)
  const [questions, setQuestions] = useState<QualifyingQuestion[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function writeItem(status: ShopCustomCartItem["qualificationStatus"], answers: ShopCartQuestionAnswer[] = []) {
    const current = activeItem
    if (!current) return
    const next = { ...current, qualificationStatus: status, answers, updatedAt: new Date().toISOString() }
    upsertShopCustomCartItem(next)
    setActiveItem(next)
  }

  function handleFile(file: File | null) {
    if (!file) return

    const setting = getQualificationSettingForPlanRequest(requestId, label, category)
    const shouldAsk = setting.enabled && setting.questions.length > 0
    const item: ShopCustomCartItem = {
      id: `${requestId}-${Date.now()}`,
      name: label,
      category,
      quantity: 1,
      unit: "Request",
      unitPrice: 0,
      fileName: file.name,
      qualificationStatus: shouldAsk ? "pending" : "not_required",
      answers: [],
      updatedAt: new Date().toISOString(),
    }

    upsertShopCustomCartItem(item)
    setActiveItem(item)
    setQuestions(setting.questions)
    setMessage(`${label} added to cart${shouldAsk ? ". Quick questions opened." : "."} Cart items: ${readShopCartCount()}`)
    if (shouldAsk) {
      window.setTimeout(() => inputRef.current?.blur(), 0)
    }
  }

  return (
    <>
      <label className="flex min-h-[148px] cursor-pointer touch-manipulation flex-col justify-between rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition active:scale-[0.99] active:border-sky-300">
        <input ref={inputRef} type="file" accept={accept} className="sr-only" aria-label={label} onChange={(event) => handleFile(event.target.files?.[0] ?? null)} />
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
          {icon}
        </span>
        <span>
          <span className="block text-base font-bold leading-5 text-slate-950">{label}</span>
          <span className="mt-1 block text-xs font-medium leading-4 text-slate-500">{description}</span>
          {message ? <span className="mt-2 block text-xs font-semibold text-emerald-700">{message}</span> : null}
        </span>
      </label>

      <QualifyingQuestionsModal
        open={Boolean(activeItem && activeItem.qualificationStatus === "pending" && questions.length > 0)}
        title={activeItem?.name || label}
        questions={questions}
        onClose={() => {
          writeItem("skipped")
          setMessage("Item kept in cart. Questions skipped.")
        }}
        onSave={(answers) => {
          writeItem("answered", answers)
          setMessage("Answers saved with this cart request.")
        }}
        onSkip={() => {
          writeItem("skipped")
          setMessage("Item kept in cart. Questions skipped.")
        }}
      />
    </>
  )
}

