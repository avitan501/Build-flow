"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setFixedManagerGoalPriorityAction } from "@/app/admin/goals-progress/goal-actions";
import type { CarlosFixedGoalKey } from "@/lib/manager-goal-status";

const PRIORITIES = [
  { value: 1, label: "Focus now" },
  { value: 3, label: "Do later" },
  { value: 5, label: "Low priority" },
] as const;

export function ManagerGoalPrioritySelect({ fixedKey, priority, canManage }: { fixedKey: CarlosFixedGoalKey; priority: number; canManage: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState([1, 3, 5].includes(priority) ? priority : 3);
  const [pending, startTransition] = useTransition();
  const label = PRIORITIES.find((item) => item.value === value)?.label ?? "Do later";

  if (!canManage) {
    return <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{label}</span>;
  }

  return (
    <select
      aria-label="Task priority"
      value={value}
      disabled={pending}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        const next = Number(event.target.value);
        setValue(next);
        startTransition(async () => {
          const result = await setFixedManagerGoalPriorityAction({ key: fixedKey, priority: next });
          if (!result.ok) setValue(priority);
          router.refresh();
        });
      }}
      className="h-7 rounded-full border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 outline-none focus:border-sky-400 disabled:opacity-50"
    >
      {PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
  );
}
