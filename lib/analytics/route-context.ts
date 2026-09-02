const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LONG_TOKEN_SEGMENT = /^[A-Za-z0-9_-]{18,}$/;

const STATIC_SINGLE_SHOP_ROUTES = new Set([
  "/shop/add-address",
  "/shop/appliances",
  "/shop/concrete-masonry",
  "/shop/door-and-molding",
  "/shop/eitan",
  "/shop/electrical",
  "/shop/exterior",
  "/shop/framing",
  "/shop/kitchen",
  "/shop/materials",
  "/shop/paper-work",
  "/shop/roofing",
  "/shop/services",
  "/shop/sheet-rock",
  "/shop/siding",
  "/shop/tile-work",
  "/shop/window",
  "/shop/wood-floor",
]);

const DYNAMIC_ROUTE_TEMPLATES: Array<[RegExp, string]> = [
  [/^\/admin\/supplier-quotes\/requests\/[^/]+\/chart\/?$/, "/admin/supplier-quotes/requests/:id/chart"],
  [/^\/owner\/materials\/requests\/[^/]+\/supplier-request\/?$/, "/owner/materials/requests/:id/supplier-request"],
  [/^\/projects\/[^/]+\/requests\/[^/]+\/?$/, "/projects/:id/requests/:id"],
  [/^\/admin\/documents\/[^/]+\/?$/, "/admin/documents/:id"],
  [/^\/admin\/quote-comparison\/[^/]+\/?$/, "/admin/quote-comparison/:id"],
  [/^\/admin\/supplier-approvals\/[^/]+\/?$/, "/admin/supplier-approvals/:id"],
  [/^\/admin\/supplier-quotes\/[^/]+\/?$/, "/admin/supplier-quotes/:id"],
  [/^\/admin\/whatsapp\/(?!settings\/?$)[^/]+\/?$/, "/admin/whatsapp/:id"],
  [/^\/owner\/materials\/requests\/[^/]+\/?$/, "/owner/materials/requests/:id"],
  [/^\/projects\/[^/]+\/?$/, "/projects/:id"],
  [/^\/requests\/[^/]+\/pdf\/?$/, "/requests/:id/pdf"],
  [/^\/shop\/window\/uploads\/[^/]+\/?$/, "/shop/window/uploads/:id"],
  [/^\/auth\/confirm\/[^/]+\/?$/, "/auth/confirm/:token"],
];

export type AnalyticsRouteContext = {
  route: string;
  entity_id?: string;
};

function dynamicRouteTemplate(pathname: string) {
  for (const [pattern, template] of DYNAMIC_ROUTE_TEMPLATES) {
    if (pattern.test(pathname)) return template;
  }
  if (!STATIC_SINGLE_SHOP_ROUTES.has(pathname) && /^\/shop\/[^/]+\/?$/.test(pathname)) {
    return "/shop/:slug";
  }
  return null;
}

export function analyticsRouteContext(value: string): AnalyticsRouteContext {
  const pathname = value.split(/[?#]/, 1)[0] || "/";
  let entityId: string | undefined;
  for (const segment of pathname.split("/")) {
    if (UUID_SEGMENT.test(segment)) {
      entityId = segment.toLowerCase();
      break;
    }
  }
  const template = dynamicRouteTemplate(pathname);
  if (template) {
    return {
      route: template,
      ...(entityId ? { entity_id: entityId } : {}),
    };
  }
  const segments = pathname.split("/").filter(Boolean).map((segment) => {
    if (UUID_SEGMENT.test(segment)) {
      return ":id";
    }
    if (LONG_TOKEN_SEGMENT.test(segment)) return ":token";
    return segment.slice(0, 64);
  });
  return {
    route: `/${segments.join("/")}` || "/",
    ...(entityId ? { entity_id: entityId } : {}),
  };
}

export function analyticsArea(route: string) {
  if (route.startsWith("/admin")) return "manager";
  if (route.startsWith("/owner")) return "owner";
  if (route.startsWith("/projects")) return "projects";
  if (route.startsWith("/request") || route.startsWith("/beat-a-quote")) return "request";
  if (route.startsWith("/shop") || route.startsWith("/cart")) return "shop";
  if (route.startsWith("/account")) return "account";
  if (route === "/") return "home";
  return "public";
}
