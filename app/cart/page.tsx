import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionWithProfile } from "@/lib/auth";

export default async function CartPage() {
  const { user } = await getSessionWithProfile();
  if (user) redirect("/projects");
  return <main className="mx-auto max-w-xl px-5 py-12 text-[#071126]">
    <h1 className="text-3xl font-semibold">Your material request</h1>
    <p className="mt-3 text-sm leading-6 text-slate-600">Send your material list for pricing, or open your existing project workspace.</p>
    <nav className="mt-6 flex flex-wrap gap-3" aria-label="Material request options">
      <Link href="/request-quote" className="inline-flex min-h-11 items-center rounded-md bg-[#0066cc] px-4 text-sm font-semibold text-white">Send material list</Link>
      <Link href="/projects" className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold">Open projects</Link>
    </nav>
  </main>;
}
