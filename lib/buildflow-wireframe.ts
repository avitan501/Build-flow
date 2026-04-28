import fs from "node:fs";

export type UiStatus = "Live" | "Preview" | "Needs Work" | "Coming Soon" | "Blocked";
export type ProgressCategoryName =
  | "Foundation"
  | "Auth"
  | "Admin Users"
  | "WhatsApp"
  | "Projects"
  | "Upload Plans"
  | "AI Takeoff"
  | "Quotes"
  | "Orders"
  | "Payments"
  | "Notifications"
  | "Security"
  | "QA";

export type RouteSpec = {
  key: string;
  href: string;
  title: string;
  purpose: string;
  flow: "client" | "admin" | "whatsapp" | "ai" | "orders";
  audience: "public" | "signed_in" | "admin";
  category: ProgressCategoryName;
  status: UiStatus;
  progress: number;
  nextStep: string;
  missing: string[];
  actions: { label: string; href?: string; status?: UiStatus; disabled?: boolean }[];
};

type ProgressFile = {
  updated_at?: string;
  categories?: { name: string; status?: string; percent_complete?: number; next_action?: string }[];
};

type LiveStatusFile = {
  updated_at?: string;
  overall_status?: string;
  current_next_step?: string;
  current_blocker?: string;
  blocked?: [string, string, string][];
  whatsapp?: [string, string, string][];
  working_now?: [string, string, string][];
};

const progressFile = "/root/mysite/data/buildflow-progress.json";
const liveStatusFile = "/root/mysite/data/buildflow-live-status.json";

function readJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function categoryStatusToUiStatus(value?: string): UiStatus {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "working" || normalized === "healthy") return "Live";
  if (normalized === "partial" || normalized === "warning") return "Preview";
  if (normalized === "blocked" || normalized === "broken") return "Blocked";
  return "Coming Soon";
}

function clampProgress(value?: number, fallback = 0) {
  const safe = typeof value === "number" ? value : fallback;
  return Math.max(0, Math.min(100, Math.round(safe)));
}

function hasBlockedText(live: LiveStatusFile, text: string) {
  const haystack = [
    live.current_blocker || "",
    ...(live.blocked || []).flatMap((item) => item),
    ...(live.whatsapp || []).flatMap((item) => item),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(text.toLowerCase());
}

export function getBuildflowWireframeData() {
  const progressData = readJson<ProgressFile>(progressFile, { categories: [] });
  const liveData = readJson<LiveStatusFile>(liveStatusFile, {});
  const progressMap = new Map(
    (progressData.categories || []).map((category) => [category.name, category])
  );

  const byCategory = (name: ProgressCategoryName, fallback: Partial<RouteSpec>) => {
    const category = progressMap.get(name);
    return {
      status: categoryStatusToUiStatus(category?.status),
      progress: clampProgress(category?.percent_complete, fallback.progress ?? 0),
      nextStep: category?.next_action || fallback.nextStep || "Continue the next safe wireframe step.",
    };
  };

  const projects = byCategory("Projects", { progress: 10, nextStep: "Build the first project shell." });
  const uploadPlans = byCategory("Upload Plans", { progress: 10, nextStep: "Build the upload handoff shell." });
  const aiTakeoff = byCategory("AI Takeoff", { progress: 5, nextStep: "Keep draft-only takeoff review mode." });
  const quotes = byCategory("Quotes", { progress: 5, nextStep: "Add the quote review shell." });
  const orders = byCategory("Orders", { progress: 35, nextStep: "Keep the order flow visual while data stays draft-only." });
  const adminUsers = byCategory("Admin Users", { progress: 65, nextStep: "Improve audit clarity without changing auth." });
  const whatsapp = byCategory("WhatsApp", { progress: 70, nextStep: "Build read-only importer from WhatsApp logs into DB." });
  const foundation = byCategory("Foundation", { progress: 88, nextStep: liveData.current_next_step || "Keep the shell clear and readable." });
  const auth = byCategory("Auth", { progress: 85, nextStep: "Keep auth routes stable while UI grows." });
  const security = byCategory("Security", { progress: 72, nextStep: "Protect routes without loosening current guards." });

  const specs: RouteSpec[] = [
    {
      key: "home",
      href: "/",
      title: "Home",
      purpose: "Entry screen for the client workflow.",
      flow: "client",
      audience: "public",
      category: "Foundation",
      status: foundation.status,
      progress: foundation.progress,
      nextStep: foundation.nextStep,
      missing: ["Project start handoff", "Upload route link clarity", "Order tracking step context"],
      actions: [
        { label: "Start Project", href: "/projects/new", status: projects.status },
        { label: "Upload Plans", href: "/upload", status: uploadPlans.status },
        { label: "Review Materials", href: "/materials", status: quotes.status },
        { label: "Approve Order", href: "/orders", status: orders.status },
        { label: "Track Delivery", href: "/orders/demo", status: orders.status },
      ],
    },
    {
      key: "dashboard",
      href: "/dashboard",
      title: "Dashboard",
      purpose: "Signed-in command center for the next client step.",
      flow: "client",
      audience: "signed_in",
      category: "Auth",
      status: auth.status,
      progress: auth.progress,
      nextStep: "Keep the dashboard as the main signed-in command center.",
      missing: ["Project list module", "Upload queue summary", "Order progress cards"],
      actions: [
        { label: "My Projects", href: "/projects", status: projects.status },
        { label: "Upload Plans", href: "/upload", status: uploadPlans.status },
        { label: "WhatsApp Messages", href: "/admin/whatsapp", status: whatsapp.status },
        { label: "Materials", href: "/materials", status: quotes.status },
        { label: "Orders", href: "/orders", status: orders.status },
      ],
    },
    {
      key: "projects",
      href: "/projects",
      title: "Projects",
      purpose: "Project list and folder view.",
      flow: "client",
      audience: "signed_in",
      category: "Projects",
      status: projects.status,
      progress: projects.progress,
      nextStep: projects.nextStep,
      missing: ["Real project records", "Project filters", "Project detail drawer"],
      actions: [
        { label: "New Project", href: "/projects/new", status: projects.status },
        { label: "Upload Plans", href: "/upload", status: uploadPlans.status },
      ],
    },
    {
      key: "projects-new",
      href: "/projects/new",
      title: "Start Project",
      purpose: "First step form for creating a project shell.",
      flow: "client",
      audience: "signed_in",
      category: "Projects",
      status: projects.status,
      progress: clampProgress(projects.progress - 5, 5),
      nextStep: "Decide the minimum draft fields for a new project.",
      missing: ["Saved draft action", "Project owner selection", "Files handoff"],
      actions: [
        { label: "Back to Projects", href: "/projects", status: projects.status },
        { label: "Upload Plans", href: "/upload", status: uploadPlans.status },
      ],
    },
    {
      key: "upload",
      href: "/upload",
      title: "Upload Plans",
      purpose: "Dropzone and file step preview.",
      flow: "client",
      audience: "signed_in",
      category: "Upload Plans",
      status: uploadPlans.status,
      progress: uploadPlans.progress,
      nextStep: uploadPlans.nextStep,
      missing: ["Real file persistence", "Project attachment flow", "QA upload validation"],
      actions: [
        { label: "Back to Projects", href: "/projects", status: projects.status },
        { label: "Takeoff Review", href: "/takeoff-review", status: aiTakeoff.status },
      ],
    },
    {
      key: "takeoff-review",
      href: "/takeoff-review",
      title: "AI Takeoff Review",
      purpose: "Draft-only review step for future takeoff output.",
      flow: "ai",
      audience: "signed_in",
      category: "AI Takeoff",
      status: hasBlockedText(liveData, "DB-backed WhatsApp") ? "Blocked" : aiTakeoff.status,
      progress: aiTakeoff.progress,
      nextStep: aiTakeoff.nextStep,
      missing: ["Real takeoff engine", "Confidence rows", "Approval action"],
      actions: [
        { label: "Upload Plans", href: "/upload", status: uploadPlans.status },
        { label: "Materials List", href: "/materials", status: quotes.status },
      ],
    },
    {
      key: "materials",
      href: "/materials",
      title: "Materials List",
      purpose: "Draft materials list review.",
      flow: "ai",
      audience: "signed_in",
      category: "Quotes",
      status: quotes.status,
      progress: clampProgress(quotes.progress + 10, 15),
      nextStep: "Connect takeoff and quote review states visually.",
      missing: ["Grouped materials", "Manual adjustments", "Approval summary"],
      actions: [
        { label: "Quote Review", href: "/quotes", status: quotes.status },
        { label: "Back to Takeoff", href: "/takeoff-review", status: aiTakeoff.status },
      ],
    },
    {
      key: "quotes",
      href: "/quotes",
      title: "Quote Review",
      purpose: "Compare draft quotes before order approval.",
      flow: "orders",
      audience: "signed_in",
      category: "Quotes",
      status: quotes.status,
      progress: clampProgress(quotes.progress + 15, 20),
      nextStep: quotes.nextStep,
      missing: ["Vendor compare grid", "Selection step", "Approved quote handoff"],
      actions: [
        { label: "Materials", href: "/materials", status: quotes.status },
        { label: "Orders", href: "/orders", status: orders.status },
      ],
    },
    {
      key: "orders",
      href: "/orders",
      title: "Orders",
      purpose: "Approval and order pipeline view.",
      flow: "orders",
      audience: "signed_in",
      category: "Orders",
      status: orders.status,
      progress: orders.progress,
      nextStep: orders.nextStep,
      missing: ["Real order records", "Delivery milestones", "Approval history"],
      actions: [
        { label: "Open Demo Order", href: "/orders/demo", status: orders.status },
        { label: "Quote Review", href: "/quotes", status: quotes.status },
      ],
    },
    {
      key: "orders-demo",
      href: "/orders/demo",
      title: "Order Status",
      purpose: "Single order walkthrough screen.",
      flow: "orders",
      audience: "signed_in",
      category: "Orders",
      status: orders.status,
      progress: clampProgress(orders.progress + 10, 45),
      nextStep: "Define the minimum order timeline states.",
      missing: ["Real supplier sync", "Delivery updates", "Approval audit"],
      actions: [
        { label: "Back to Orders", href: "/orders", status: orders.status },
        { label: "Track Next Step", href: "/dashboard", status: auth.status },
      ],
    },
    {
      key: "admin-users",
      href: "/admin/users",
      title: "Admin Users",
      purpose: "Protected user approval and roles workspace.",
      flow: "admin",
      audience: "admin",
      category: "Admin Users",
      status: adminUsers.status,
      progress: adminUsers.progress,
      nextStep: adminUsers.nextStep,
      missing: ["Deeper audit filters", "Safer bulk actions", "Search/segment tools"],
      actions: [
        { label: "WhatsApp Inbox", href: "/admin/whatsapp", status: whatsapp.status },
        { label: "Build Map", href: "/admin/build-map", status: foundation.status },
      ],
    },
    {
      key: "admin-whatsapp",
      href: "/admin/whatsapp",
      title: "WhatsApp Inbox",
      purpose: "Protected DB-backed read-only inbox preview.",
      flow: "whatsapp",
      audience: "admin",
      category: "WhatsApp",
      status: "Preview",
      progress: clampProgress(whatsapp.progress, 70),
      nextStep: "Build read-only importer from WhatsApp logs into DB.",
      missing: [
        "WhatsApp log importer",
        "Real draft write/actions",
        "Contact permissions connected to DB",
        "Approve Send rules later",
        "Outbound sending still disabled",
      ],
      actions: [
        { label: "Inbox Settings", href: "/admin/whatsapp/settings", status: "Preview" },
        { label: "Build Map", href: "/admin/build-map", status: foundation.status },
      ],
    },
    {
      key: "admin-whatsapp-settings",
      href: "/admin/whatsapp/settings",
      title: "WhatsApp Settings",
      purpose: "Protected preview settings screen for safe behavior rules.",
      flow: "whatsapp",
      audience: "admin",
      category: "WhatsApp",
      status: hasBlockedText(liveData, "preview-only") ? "Preview" : whatsapp.status,
      progress: clampProgress(whatsapp.progress + 5, 60),
      nextStep: "Keep preview mode safe until DB-backed storage is approved.",
      missing: ["Persistent production storage", "Change history", "Shared admin state"],
      actions: [
        { label: "Back to Inbox", href: "/admin/whatsapp", status: whatsapp.status },
        { label: "Build Map", href: "/admin/build-map", status: foundation.status },
      ],
    },
    {
      key: "admin-projects",
      href: "/admin/projects",
      title: "Admin Projects",
      purpose: "Admin project list and handoff queue.",
      flow: "admin",
      audience: "admin",
      category: "Projects",
      status: projects.status,
      progress: projects.progress,
      nextStep: projects.nextStep,
      missing: ["Project status board", "Assignment tools", "Project detail panel"],
      actions: [
        { label: "Client Projects", href: "/projects", status: projects.status },
        { label: "Build Map", href: "/admin/build-map", status: foundation.status },
      ],
    },
    {
      key: "admin-quotes",
      href: "/admin/quotes",
      title: "Admin Quotes",
      purpose: "Admin quote intake and review queue.",
      flow: "admin",
      audience: "admin",
      category: "Quotes",
      status: quotes.status,
      progress: quotes.progress,
      nextStep: quotes.nextStep,
      missing: ["Upload queue", "Vendor compare review", "Approval handoff"],
      actions: [
        { label: "Materials", href: "/admin/materials", status: quotes.status },
        { label: "Build Map", href: "/admin/build-map", status: foundation.status },
      ],
    },
    {
      key: "admin-materials",
      href: "/admin/materials",
      title: "Admin Materials",
      purpose: "Admin materials review and grouping shell.",
      flow: "admin",
      audience: "admin",
      category: "Quotes",
      status: quotes.status,
      progress: clampProgress(quotes.progress + 10, 15),
      nextStep: "Prepare the materials approval view.",
      missing: ["Approval controls", "Category grouping", "Vendor source notes"],
      actions: [
        { label: "Quotes", href: "/admin/quotes", status: quotes.status },
        { label: "Orders", href: "/admin/orders", status: orders.status },
      ],
    },
    {
      key: "admin-orders",
      href: "/admin/orders",
      title: "Admin Orders",
      purpose: "Admin order review and release queue.",
      flow: "admin",
      audience: "admin",
      category: "Orders",
      status: orders.status,
      progress: orders.progress,
      nextStep: orders.nextStep,
      missing: ["Release approval", "Status filters", "Delivery timeline"],
      actions: [
        { label: "Demo Order", href: "/orders/demo", status: orders.status },
        { label: "Build Map", href: "/admin/build-map", status: foundation.status },
      ],
    },
    {
      key: "admin-vendors",
      href: "/admin/vendors",
      title: "Admin Vendors",
      purpose: "Vendor list and relationship shell.",
      flow: "admin",
      audience: "admin",
      category: "Orders",
      status: orders.status === "Coming Soon" ? "Coming Soon" : "Preview",
      progress: clampProgress(orders.progress - 10, 15),
      nextStep: "Build the vendor comparison list without pricing claims.",
      missing: ["Vendor profiles", "Comparison grid", "Contact history"],
      actions: [
        { label: "Quotes", href: "/admin/quotes", status: quotes.status },
        { label: "Build Map", href: "/admin/build-map", status: foundation.status },
      ],
    },
    {
      key: "admin-settings",
      href: "/admin/settings",
      title: "Admin Settings",
      purpose: "High-level internal settings map.",
      flow: "admin",
      audience: "admin",
      category: "Security",
      status: security.status,
      progress: security.progress,
      nextStep: security.nextStep,
      missing: ["Settings sections", "Audit visibility", "Safe edit boundaries"],
      actions: [
        { label: "WhatsApp Settings", href: "/admin/whatsapp/settings", status: whatsapp.status },
        { label: "Build Map", href: "/admin/build-map", status: foundation.status },
      ],
    },
    {
      key: "admin-build-map",
      href: "/admin/build-map",
      title: "Build Map",
      purpose: "Main clickable map of the system.",
      flow: "admin",
      audience: "admin",
      category: "Foundation",
      status: foundation.status,
      progress: foundation.progress,
      nextStep: "Keep every route visible with status and next step.",
      missing: ["Deeper QA overlays", "Route ownership tags", "History snapshots"],
      actions: [
        { label: "Open Control Center", href: "http://5.78.189.133:3000/admin/flow-check?password=BuildFlowOwner2800", status: foundation.status },
        { label: "Admin Users", href: "/admin/users", status: adminUsers.status },
      ],
    },
  ];

  return {
    progressData,
    liveData,
    specs,
    specMap: new Map(specs.map((spec) => [spec.key, spec])),
  };
}
