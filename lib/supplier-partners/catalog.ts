import supplierPartnerRows from "@/data/supplier-partners.json";

export const SUPPLIER_PARTNER_STATUSES = [
  "Research ready",
  "Call needed",
  "Email drafted",
  "Applied",
  "In progress",
  "Follow-up",
  "Approved",
  "Set up",
  "Not a fit",
] as const;

export type SupplierPartnerStatus = (typeof SUPPLIER_PARTNER_STATUSES)[number];

type SupplierPartnerSourceRow = {
  Show: string;
  Company: string;
  "Public person / best role": string;
  "What they sell": string;
  Website: string;
  Phone: string;
  "Right department": string;
  "Program / contact URL": string;
  "Affiliate / dealer / reseller finding": string;
  "Published commission or benefit": string;
  "Best ask for AvantiaBuild": string;
  "Research source": string;
  Confidence: string;
  "Logo URL": string;
  Status: string;
  "Carlos call opening": string;
};

export type SupplierPartner = {
  slug: string;
  show: string;
  company: string;
  contactRole: string;
  products: string;
  website: string;
  phone: string;
  department: string;
  programUrl: string;
  programFinding: string;
  publishedBenefit: string;
  bestAsk: string;
  researchSource: string;
  confidence: string;
  logoPath: string;
  researchStatus: string;
  callScript: string;
  emailSubject: string;
  emailBody: string;
  defaultStatus: SupplierPartnerStatus;
};

export type SupplierPartnerActivity = {
  id: string;
  type: "status" | "call" | "email" | "note" | "application";
  detail: string;
  at: string;
};

export type SupplierPartnerProgress = {
  status: SupplierPartnerStatus;
  contactEmail: string;
  followUpDate: string;
  notes: string;
  activities: SupplierPartnerActivity[];
  updatedAt: string | null;
};

const logoOverrides: Record<string, string> = {
  "prime-lumber-and-home-center": "prime-lumber-home-center",
  "central-jersey-screw-and-bolt": "central-jersey-screw-bolt",
  "exclusive-doors-and-moldings": "exclusive-doors-moldings",
  lowes: "lowe-s",
};

export function supplierPartnerSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function defaultStatusFor(row: SupplierPartnerSourceRow): SupplierPartnerStatus {
  const finding = `${row.Status} ${row["Affiliate / dealer / reseller finding"]}`.toLowerCase();
  if (finding.includes("no public") || finding.includes("call sales")) return "Call needed";
  return "Research ready";
}

function emailCopy(row: SupplierPartnerSourceRow) {
  const programLanguage = row["Affiliate / dealer / reseller finding"].toLowerCase();
  const relationship = programLanguage.includes("affiliate") || programLanguage.includes("referral")
    ? "affiliate or referral relationship"
    : programLanguage.includes("dealer")
      ? "dealer or project-sales relationship"
      : "trade, referral, or independent-sales relationship";

  return {
    subject: `AvantiaBuild partnership inquiry — ${row.Company}`,
    body: `Hello ${row.Company} team,\n\nMy name is Carlos and I’m reaching out for AvantiaBuild, a New York construction-material sourcing website. We would like to discuss a ${relationship} that lets us introduce qualified customers and projects while your company keeps control of approved pricing, product terms, and fulfillment.\n\nWe are specifically interested in: ${row["Best ask for AvantiaBuild"]}.\n\nCould you connect me with the right person in ${row["Right department"]}? We will not advertise a partnership or use private pricing until we have written approval.\n\nThank you,\nCarlos\nAvantiaBuild\nhttps://build.avantiap.com`,
  };
}

export const SUPPLIER_PARTNERS: SupplierPartner[] = (supplierPartnerRows as SupplierPartnerSourceRow[]).map((row) => {
  const slug = supplierPartnerSlug(row.Company);
  const email = emailCopy(row);
  return {
    slug,
    show: row.Show,
    company: row.Company,
    contactRole: row["Public person / best role"],
    products: row["What they sell"],
    website: row.Website,
    phone: row.Phone,
    department: row["Right department"],
    programUrl: row["Program / contact URL"],
    programFinding: row["Affiliate / dealer / reseller finding"],
    publishedBenefit: row["Published commission or benefit"],
    bestAsk: row["Best ask for AvantiaBuild"],
    researchSource: row["Research source"],
    confidence: row.Confidence,
    logoPath: `/images/supplier-partners/${logoOverrides[slug] || slug}.png`,
    researchStatus: row.Status,
    callScript: row["Carlos call opening"],
    emailSubject: email.subject,
    emailBody: email.body,
    defaultStatus: defaultStatusFor(row),
  };
});

export function findSupplierPartner(slug: string) {
  return SUPPLIER_PARTNERS.find((partner) => partner.slug === slug) || null;
}

export function emptySupplierPartnerProgress(partner: SupplierPartner): SupplierPartnerProgress {
  return {
    status: partner.defaultStatus,
    contactEmail: "",
    followUpDate: "",
    notes: "",
    activities: [],
    updatedAt: null,
  };
}
