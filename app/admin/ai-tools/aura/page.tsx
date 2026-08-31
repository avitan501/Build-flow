import { ArrowLeft, ArrowRight, BookMarked, BookOpenCheck, Bot } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireManagerPortalProfile } from "@/lib/auth";

export default async function AuraAiManagerPage() {
  const { access } = await requireManagerPortalProfile();
  if (!access.owner) redirect("/admin/ai-tools");
  const sections = [
    { href: "/admin/ai-tools/sms-replies", title: "Reply Settings", icon: Bot },
    { href: "/admin/ai-tools/construction-knowledge", title: "Construction Knowledge", icon: BookOpenCheck },
    { href: "/admin/ai-tools/internal-library", title: "Internal Library", icon: BookMarked },
  ];
  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-8 lg:px-10"><div className="mx-auto max-w-3xl"><Link href="/admin/ai-tools" className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-slate-600"><ArrowLeft className="h-4 w-4" />Manager Tools</Link><header className="mt-3 border-b border-slate-200 pb-4"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#0066cc]">Private</p><h1 className="mt-1 text-2xl font-semibold">Aura AI</h1></header><section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">{sections.map(({ href, title, icon: Icon }) => <Link key={href} href={href} className="flex min-h-14 items-center gap-3 border-b border-slate-100 px-4 last:border-b-0 hover:bg-slate-50"><span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1 text-sm font-semibold">{title}</span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>)}</section></div></main>;
}
