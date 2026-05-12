import { OwnerMaterialsQuoteEditor } from "@/components/buildflow/owner-materials-quote-editor";
import { requireAdminProfile } from "@/lib/auth";

export default async function OwnerMaterialsPage() {
  await requireAdminProfile();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#edf4fb_0%,#f7fbff_32%,#ffffff_100%)] px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <OwnerMaterialsQuoteEditor />
      </section>
    </main>
  );
}
