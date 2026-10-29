import { Clock3, Video } from "lucide-react";
import { WhatsAppIcon } from "@/components/buildflow/whatsapp-icon";
import { connection } from "next/server";
import { pageMetadata } from "@/lib/site-metadata";
import { ConsultationCalendar } from "./consultation-calendar";
import styles from "./consultation.module.css";

export const metadata = pageMetadata({
  title: "Free 15-Minute Strategy Meeting | Avantia",
  description: "Book a free 15-minute strategy meeting with Avantia. Choose a day and time to build a plan for your construction material needs.",
  path: "/consultation",
});

export default async function ConsultationPage() {
  await connection();
  return (
    <section className={styles.page} aria-labelledby="consultation-title">
      <div className={styles.content}>
        <header className={styles.intro}>
          <h1 id="consultation-title">Let’s talk about your project.</h1>
          <p className={styles.description}>Tell us what you’re building. We’ll talk through the materials, supplier quotes, and deliveries we can help you handle.</p>
          <div className={styles.facts}>
            <span>Free</span>
            <span><Clock3 size={16} aria-hidden="true" />15 minutes</span>
            <span><Video size={17} aria-hidden="true" />Google Meet</span>
          </div>
        </header>
        <ConsultationCalendar initialNow={new Date().toISOString()} />
        <div className={styles.whatsappHelp}>
          <span>Prefer to chat?</span>
          <a href="https://wa.me/15169398484" target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon aria-hidden="true" />
            <span>WhatsApp us · 516-939-8484</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>

      </div>
    </section>
  );
}
