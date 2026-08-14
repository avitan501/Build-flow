import { PolicyPage } from "@/components/buildflow/policy-page"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({ title: "Privacy Policy | Avantia Build", description: "How Avantia Build collects, uses, and protects customer and project information.", path: "/privacy" })

export default function PrivacyPage() {
  return <PolicyPage eyebrow="Customer information" title="Privacy Policy" updated="August 14, 2026" introduction="This policy explains the information Avantia Build uses to prepare material requests, communicate with customers and suppliers, and operate this website." sections={[
    { title: "Information we collect", paragraphs: ["We may collect contact information, project names and addresses, material selections, uploaded plans or lists, communications, account information, and basic website activity needed to operate and secure the service."] },
    { title: "How information is used", paragraphs: ["We use information to prepare pricing, organize orders, coordinate suppliers and delivery, respond to requests, improve the website, prevent misuse, and meet legal or accounting obligations."] },
    { title: "Service providers and suppliers", paragraphs: ["Information may be shared with hosting, database, email, analytics, and communication providers that help operate the service. Project and order details may be shared with selected suppliers or delivery providers when needed to price or fulfill a request."] },
    { title: "Retention and security", paragraphs: ["We keep information only as long as reasonably needed for active requests, records, security, and legal obligations. No online system is completely secure, but we use access controls and reputable service providers to reduce risk."] },
    { title: "Your choices", paragraphs: ["You may ask to review, correct, or delete eligible personal information by contacting Avantia Build. Some records may need to be retained for completed transactions, disputes, security, or legal obligations."] },
  ]} />
}
