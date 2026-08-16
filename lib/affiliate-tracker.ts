export const AFFILIATE_STATUSES = [
  "Not Applied", "Applied", "In Progress", "Approved", "Set Up",
  "Rejected", "Waitlisted", "Paused", "Closed",
] as const;

export type AffiliateStatus = (typeof AFFILIATE_STATUSES)[number];

export type AffiliateProgram = {
  id: string;
  supplier_name: string;
  priority: "A" | "B" | "C";
  affiliate_status: AffiliateStatus;
  api_status: string;
  category: string;
  new_york_access: string;
  affiliate_network: string;
  published_commission: string;
  commission_min: number | null;
  commission_max: number | null;
  cookie_window: string;
  cookie_days: number | null;
  application_difficulty: number;
  approval_outlook: string;
  avantia_fit: number;
  application_url: string;
  retailer_url: string | null;
  application_date: string | null;
  application_email: string | null;
  confirmation_received: boolean | null;
  last_contact_date: string | null;
  next_follow_up_date: string | null;
  approval_date: string | null;
  setup_date: string | null;
  assigned_owner: string | null;
  next_action: string;
  notes: string;
  application_requirements: string;
  program_restrictions: string;
  approved_commission: string | null;
  approved_promotional_methods: string | null;
  safe_tracking_id: string | null;
  product_feeds_allowed: boolean | null;
  deep_links_allowed: boolean | null;
  api_allowed: boolean | null;
  product_images_allowed: boolean | null;
  affiliate_test_url: string | null;
  affiliate_tested_at: string | null;
  last_verified_date: string;
  updated_at: string;
};

export type AffiliateChecklistItem = {
  id: string;
  program_id: string;
  item_key: string;
  label: string;
  completed: boolean;
  sort_order: number;
};

export type AffiliateActivity = {
  id: string;
  program_id: string;
  activity_type: string;
  title: string;
  details: string;
  old_status: AffiliateStatus | null;
  new_status: AffiliateStatus | null;
  activity_date: string;
};

export type AffiliateAttachment = {
  id: string;
  program_id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  signed_url?: string | null;
};

export type AffiliateIntegration = {
  id: string;
  supplier_name: string;
  relationship_type: string;
  status: string;
  submitted_at: string | null;
  submission_result: string;
  current_stage: string;
  requested_capabilities: string[];
  next_action: string;
  notes: string;
};

export type AffiliateTrackerSettings = {
  id: string;
  readiness: Record<string, boolean>;
  application_description: string;
  audience_description: string;
  promotion_description: string;
};

export const STATUS_STYLES: Record<AffiliateStatus, string> = {
  "Not Applied": "border-slate-200 bg-slate-100 text-slate-700",
  Applied: "border-blue-200 bg-blue-50 text-blue-700",
  "In Progress": "border-amber-200 bg-amber-50 text-amber-800",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Set Up": "border-teal-700 bg-teal-700 text-white",
  Rejected: "border-red-200 bg-red-50 text-red-700",
  Waitlisted: "border-violet-200 bg-violet-50 text-violet-700",
  Paused: "border-orange-200 bg-orange-50 text-orange-700",
  Closed: "border-slate-700 bg-slate-700 text-white",
};

export const AFFILIATE_DISCLOSURE = "AvantiaBuild may earn a commission if you purchase through certain retailer links. This does not increase the price you pay.";
export const RETAILER_PRICE_DISCLAIMER = "Final price, availability, delivery options, taxes, and product details are confirmed by the retailer.";
