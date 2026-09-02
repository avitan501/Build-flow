import { redirect } from "next/navigation";

export default function AdminWhatsAppInboxPage() {
  redirect("/admin/communications?channel=whatsapp");
}
