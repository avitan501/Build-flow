import { ArrowUpRight, Clock3, Video } from "lucide-react";
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
          <span className={styles.eyebrow}>Let’s take the material work off your plate.</span>
          <h1 id="consultation-title">Book your free<br className={styles.phoneBreak} /> strategy meeting.</h1>
          <div className={styles.facts}>
            <span><Clock3 size={16} aria-hidden="true" />15 minutes</span>
            <span><Video size={17} aria-hidden="true" />Google Meet</span>
          </div>
        </header>
        <ConsultationCalendar initialNow={new Date().toISOString()} />
        <aside className={styles.preparation} aria-labelledby="meeting-preparation-title">
          <div>
            <h2 id="meeting-preparation-title">Before we meet <span>Optional</span></h2>
            <p>Share your material needs so we can prepare.</p>
          </div>
          <a className={styles.questionnaireLink} href="/questionnaire" target="_blank" rel="noopener noreferrer">
            Fill out the questionnaire <ArrowUpRight size={16} aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </aside>
      </div>
    </section>
  );
}
