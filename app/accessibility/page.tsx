import { PolicyPage } from "@/components/buildflow/policy-page"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({ title: "Accessibility | Avantia Build", description: "Avantia Build accessibility support and contact options.", path: "/accessibility" })

export default function AccessibilityPage() {
  return <PolicyPage eyebrow="Website access" title="Accessibility" updated="August 14, 2026" introduction="Avantia Build aims to make material ordering and pricing tools usable across common devices, browsers, keyboards, and assistive technologies." sections={[
    { title: "Our approach", paragraphs: ["We work to provide readable contrast, keyboard access, descriptive controls, responsive layouts, clear form errors, and text alternatives for meaningful images."] },
    { title: "Alternative assistance", paragraphs: ["If a website feature is difficult to use, Avantia can help receive a material list, plan, or question by phone, email, or WhatsApp and can provide information in another practical format."] },
    { title: "Report a problem", paragraphs: ["Tell us the page, device, browser, and task that caused difficulty. We will review the issue and provide a reasonable alternative while it is addressed."] },
    { title: "Ongoing improvement", paragraphs: ["Accessibility is reviewed as the website changes. Automated checks and real-device testing are used to identify practical problems in customer workflows."] },
  ]} />
}
