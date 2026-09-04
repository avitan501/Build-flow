export type ManagerSearchAccess = {
  owner: boolean
  customers: boolean
  communications: boolean
  quotes: boolean
  suppliers: boolean
  aiTools: boolean
  traffic: boolean
  managerSettings: boolean
}

export type ManagerSearchResult = {
  id: string
  title: string
  description: string
  href: string
  category: "Page" | "Client" | "Lead" | "Request" | "Supplier quote"
}

type ManagerPageSearchItem = ManagerSearchResult & {
  keywords: string
  capability?: keyof ManagerSearchAccess
  ownerOnly?: boolean
}

const MANAGER_PAGE_SEARCH_ITEMS: ManagerPageSearchItem[] = [
  { id: "dashboard", title: "Manager Dashboard", description: "Orders, requests, goals, and daily work", href: "/admin/build-map", category: "Page", keywords: "home dashboard overview manager" },
  { id: "customers", title: "Customers", description: "Customer directory and contact details", href: "/admin/users?view=customers", category: "Page", keywords: "client customer buyer homeowner contact phone email", capability: "customers" },
  { id: "leads", title: "Leads", description: "New and potential customers", href: "/admin/users?view=leads", category: "Page", keywords: "lead prospect potential buyer outreach", capability: "customers" },
  { id: "requests", title: "Client Requests", description: "Material requests and active pricing work", href: "/owner/materials/requests", category: "Page", keywords: "request material list client order", capability: "customers" },
  { id: "projects", title: "Projects", description: "Client projects and job addresses", href: "/admin/projects", category: "Page", keywords: "project job address location", capability: "customers" },
  { id: "orders", title: "Orders", description: "Orders and delivery progress", href: "/admin/orders", category: "Page", keywords: "order purchase delivery status", capability: "quotes" },
  { id: "quotes", title: "Client Quotes", description: "Estimates and quotes prepared for clients", href: "/admin/quotes", category: "Page", keywords: "client quote estimate proposal", capability: "quotes" },
  { id: "communications", title: "Messages & Calls", description: "Text, WhatsApp, email, and phone history", href: "/admin/communications", category: "Page", keywords: "communication sms text whatsapp email call inbox", capability: "communications" },
  { id: "suppliers", title: "Supplier Directory", description: "Suppliers, contacts, routes, and files", href: "/admin/vendors", category: "Page", keywords: "vendor supplier route contact company", capability: "suppliers" },
  { id: "supplier-quotes", title: "Supplier Quotes", description: "Uploaded supplier pricing and documents", href: "/admin/supplier-quotes", category: "Page", keywords: "vendor quote estimate pricing upload", capability: "suppliers" },
  { id: "quote-comparison", title: "Quote Comparison", description: "Compare client targets and supplier prices", href: "/admin/quote-comparison", category: "Page", keywords: "compare comparison profit margin client ready to pay", capability: "quotes" },
  { id: "catalog", title: "Material Catalog", description: "Products, supplier prices, and sources", href: "/admin/catalog", category: "Page", keywords: "catalog product item material price", capability: "suppliers" },
  { id: "documents", title: "Documents", description: "Client and supplier files", href: "/admin/documents", category: "Page", keywords: "document file photo attachment pdf", capability: "suppliers" },
  { id: "supplier-requests", title: "Supplier Requests", description: "Requests sent to suppliers", href: "/admin/supplier-requests", category: "Page", keywords: "contact supplier sent status", capability: "suppliers" },
  { id: "supplier-approvals", title: "Supplier Approvals", description: "Review supplier packages", href: "/admin/supplier-approvals", category: "Page", keywords: "approval supplier package", capability: "suppliers" },
  { id: "supplier-network", title: "Supplier Relationships", description: "Supplier network progress and next steps", href: "/admin/supplier-network", category: "Page", keywords: "vendor relationship network contact", capability: "suppliers" },
  { id: "payments", title: "Payments", description: "Invoices, payments, and receipts", href: "/admin/payments", category: "Page", keywords: "invoice payment receipt ach card", ownerOnly: true },
  { id: "manager-tools", title: "Manager Tools", description: "All operational and AI tools", href: "/admin/ai-tools", category: "Page", keywords: "tools ai manager", capability: "aiTools" },
  { id: "website-defects", title: "Website Defects", description: "Upload and track website problems", href: "/admin/ai-tools/website-defects", category: "Page", keywords: "issue bug defect video screenshot test", capability: "aiTools" },
  { id: "quick-lead", title: "Quick Add Lead", description: "Create a lead from a phone screenshot", href: "/admin/ai-tools/quick-add-lead", category: "Page", keywords: "add create new lead screenshot phone", capability: "aiTools" },
  { id: "material-list", title: "AI Material List", description: "Organize a material list", href: "/admin/ai-tools/material-list", category: "Page", keywords: "ai organize material list spelling", capability: "aiTools" },
  { id: "aura", title: "Aura AI", description: "Avantia business assistant", href: "/admin/ai-tools/aura", category: "Page", keywords: "assistant ask ai aura", capability: "aiTools" },
  { id: "sms-replies", title: "AI Message Replies", description: "Prepare clear customer and supplier replies", href: "/admin/ai-tools/sms-replies", category: "Page", keywords: "sms text reply spelling english spanish", capability: "aiTools" },
  { id: "media-messages", title: "Media & Messages", description: "Prepare media and communication material", href: "/admin/ai-tools/media-messages", category: "Page", keywords: "photo video message welcome package", capability: "aiTools" },
  { id: "locate-item", title: "Locate a Cheap Item", description: "Research material availability and pricing", href: "/admin/ai-tools/locate-cheap-item", category: "Page", keywords: "find cheap item low price source", capability: "aiTools" },
  { id: "jobsite-delivery", title: "Jobsite Delivery", description: "Delivery planning tools", href: "/admin/ai-tools/jobsite-delivery", category: "Page", keywords: "delivery truck jobsite schedule", capability: "aiTools" },
  { id: "construction-knowledge", title: "Construction Knowledge", description: "Construction information assistant", href: "/admin/ai-tools/construction-knowledge", category: "Page", keywords: "construction question material information", capability: "aiTools" },
  { id: "lead-drafts", title: "Lead Drafts", description: "Review leads prepared from incoming messages", href: "/admin/ai-tools/lead-drafts", category: "Page", keywords: "lead draft incoming screenshot", capability: "aiTools" },
  { id: "estimate-converter", title: "Estimate Converter", description: "Convert estimates and documents", href: "/admin/ai-tools/estimate-converter", category: "Page", keywords: "estimate convert document pdf", capability: "aiTools" },
  { id: "order-test", title: "Order Testing", description: "Run required website checks", href: "/admin/ai-tools/order-test", category: "Page", keywords: "qa test checks quality", capability: "aiTools" },
  { id: "employee-browser", title: "Employee Work Browser", description: "Carlos work browser and live screen", href: "/admin/ai-tools/work-browser", category: "Page", keywords: "employee carlos browser live screen monitor", ownerOnly: true },
  { id: "carlos-activity", title: "Carlos Activity", description: "Activity history and smart daily review", href: "/admin/carlos-activity", category: "Page", keywords: "employee activity ai review history", ownerOnly: true },
  { id: "daily-summary", title: "Daily Work Summary", description: "Time log and daily report", href: "/admin/daily-summary", category: "Page", keywords: "clock time hours report carlos", capability: "managerSettings" },
  { id: "traffic", title: "Website Traffic", description: "Visits and website performance", href: "/admin/traffic", category: "Page", keywords: "analytics visitor traffic performance", capability: "traffic" },
  { id: "settings", title: "Settings", description: "Manager and workflow settings", href: "/admin/settings", category: "Page", keywords: "configuration setting notification", capability: "managerSettings" },
  { id: "abc", title: "ABC Private Pricing", description: "Connected ABC Supply account tools", href: "/admin/abc", category: "Page", keywords: "abc supply private account price", ownerOnly: true },
]

export function normalizeManagerSearchQuery(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 100)
}

export function managerPageSearchResults(query: string, access: ManagerSearchAccess) {
  const normalized = normalizeManagerSearchQuery(query).toLocaleLowerCase()
  const permitted = MANAGER_PAGE_SEARCH_ITEMS.filter((item) => {
    if (item.ownerOnly && !access.owner) return false
    return !item.capability || access[item.capability]
  })
  if (!normalized) return permitted.slice(0, 7)
  return permitted.filter((item) => `${item.title} ${item.description} ${item.keywords}`.toLocaleLowerCase().includes(normalized)).slice(0, 8)
}

export function safeManagerDatabaseSearchTerm(value: string) {
  return normalizeManagerSearchQuery(value).replace(/[^\p{L}\p{N}@.+\-' ]/gu, " ").replace(/\s+/g, " ").trim()
}
