import { redirect } from "next/navigation";

import { requireAdminProfile } from "@/lib/auth";
import { getInboxThread } from "@/lib/whatsapp-draft-inbox";

export default async function AdminWhatsAppThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  await requireAdminProfile();
  const { threadId } = await params;
  const detail = await getInboxThread(threadId).catch(() => null);
  const search = detail?.thread.phone || detail?.thread.contactName || "";
  redirect(
    search
      ? `/admin/communications?channel=whatsapp&q=${encodeURIComponent(search)}&thread=${encodeURIComponent(search)}`
      : "/admin/communications?channel=whatsapp",
  );
}
