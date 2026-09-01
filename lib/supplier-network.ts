import type { AffiliateProgram } from "@/lib/affiliate-tracker";
import { AFFILIATE_CALL_TARGETS } from "@/lib/affiliate-call-list";
import type {
  SupplierPartner,
  SupplierPartnerProgress,
} from "@/lib/supplier-partners/catalog";

export const SUPPLIER_NETWORK_CHANNELS = [
  "API",
  "Affiliate",
  "Partner",
  "Referral",
  "Trade",
  "Resale",
] as const;

export type SupplierNetworkChannel = (typeof SUPPLIER_NETWORK_CHANNELS)[number];
export type SupplierNetworkStage = "approved" | "contact" | "more";
export type SupplierNetworkSource = "Show" | "Friends" | "Google" | "Nearby";

export type SupplierNetworkRow = {
  key: string;
  name: string;
  departments: string;
  channels: SupplierNetworkChannel[];
  stage: SupplierNetworkStage;
  sources: SupplierNetworkSource[];
  ask: string;
  phone: string;
  phoneHref: string;
  link: string;
  status: string;
};

function canonicalName(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/the home depot pro|the home depot/g, "home depot")
    .replace(/lowe['’]s creator|lowe['’]s pro/g, "lowes")
    .replace(/build\.com \/ ferguson home|ferguson home/g, "ferguson")
    .replace(/abc supply api \/ integration partnership/g, "abc supply")
    .replace(
      /builders firstsource \/ mybldr \(trade account\)/g,
      "builders firstsource",
    )
    .replace(/u\.s\. electrical services \/ lade/g, "us electrical services")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return normalized;
}

function addChannel(
  channels: Set<SupplierNetworkChannel>,
  channel: SupplierNetworkChannel,
  when: boolean,
) {
  if (when) channels.add(channel);
}

function programChannels(program: AffiliateProgram): SupplierNetworkChannel[] {
  const text =
    `${program.supplier_name} ${program.affiliate_network} ${program.published_commission} ${program.next_action} ${program.api_status}`.toLowerCase();
  const channels = new Set<SupplierNetworkChannel>();
  addChannel(
    channels,
    "API",
    program.api_status !== "Not Started" || text.includes("api"),
  );
  addChannel(
    channels,
    "Affiliate",
    Boolean(program.affiliate_network) || text.includes("affiliate"),
  );
  addChannel(channels, "Partner", text.includes("partner"));
  addChannel(channels, "Referral", text.includes("referral"));
  addChannel(channels, "Trade", text.includes("trade") || text.includes("pro"));
  addChannel(channels, "Resale", /resell|wholesale|bulk|drop.?ship/.test(text));
  return [...channels];
}

function callTargetChannels(text: string): SupplierNetworkChannel[] {
  const value = text.toLowerCase();
  const channels = new Set<SupplierNetworkChannel>();
  addChannel(
    channels,
    "API",
    value.includes("api") || value.includes("product feed"),
  );
  addChannel(
    channels,
    "Affiliate",
    value.includes("affiliate") ||
      value.includes("impact") ||
      value.includes("awin") ||
      value.includes("cj"),
  );
  addChannel(channels, "Partner", value.includes("partner"));
  addChannel(channels, "Referral", value.includes("referral"));
  addChannel(
    channels,
    "Trade",
    value.includes("trade") ||
      value.includes("contractor") ||
      value.includes("pro"),
  );
  addChannel(
    channels,
    "Resale",
    /resell|wholesale|bulk|drop.?ship/.test(value),
  );
  return [...channels];
}

function programStage(
  status: AffiliateProgram["affiliate_status"],
): SupplierNetworkStage {
  if (status === "Approved" || status === "Set Up") return "approved";
  if (
    status === "Applied" ||
    status === "In Progress" ||
    status === "Waitlisted"
  )
    return "contact";
  return "more";
}

function partnerStage(
  status: SupplierPartnerProgress["status"],
): SupplierNetworkStage {
  if (status === "Approved" || status === "Set up") return "approved";
  if (["Email drafted", "Applied", "In progress", "Follow-up"].includes(status))
    return "contact";
  return "more";
}

function mergeRow(
  map: Map<string, SupplierNetworkRow>,
  incoming: SupplierNetworkRow,
) {
  const current = map.get(incoming.key);
  if (!current) {
    map.set(incoming.key, incoming);
    return;
  }
  const stageRank: Record<SupplierNetworkStage, number> = {
    more: 0,
    contact: 1,
    approved: 2,
  };
  map.set(incoming.key, {
    ...current,
    name:
      current.name.length <= incoming.name.length
        ? current.name
        : incoming.name,
    departments:
      current.departments.length >= incoming.departments.length
        ? current.departments
        : incoming.departments,
    channels: Array.from(new Set([...current.channels, ...incoming.channels])),
    sources: Array.from(new Set([...current.sources, ...incoming.sources])),
    stage:
      stageRank[incoming.stage] > stageRank[current.stage]
        ? incoming.stage
        : current.stage,
    ask:
      incoming.stage === "contact" || incoming.stage === "approved"
        ? incoming.ask
        : current.ask || incoming.ask,
    phone: current.phone || incoming.phone,
    phoneHref: current.phoneHref || incoming.phoneHref,
    link: current.link || incoming.link,
    status:
      incoming.stage === "contact" || incoming.stage === "approved"
        ? incoming.status
        : current.status,
  });
}

export function buildSupplierNetwork(input: {
  programs?: AffiliateProgram[];
  partners: SupplierPartner[];
  progress: Record<string, SupplierPartnerProgress>;
  channelOverrides?: Record<string, SupplierNetworkChannel[]>;
}) {
  const rows = new Map<string, SupplierNetworkRow>();

  for (const target of AFFILIATE_CALL_TARGETS) {
    const key = canonicalName(target.trackerName || target.company);
    mergeRow(rows, {
      key,
      name: target.company,
      departments: target.category,
      channels: callTargetChannels(
        `${target.askFor} ${target.callRoute} ${target.programStatus}`,
      ),
      stage: "more",
      sources: ["Google"],
      ask: target.recommendedScript || `${target.askFor}. ${target.callRoute}`,
      phone: target.phone,
      phoneHref: target.phoneHref,
      link: target.programUrl,
      status: "Research ready",
    });
  }

  for (const program of input.programs ?? []) {
    const key = canonicalName(program.supplier_name);
    mergeRow(rows, {
      key,
      name: program.supplier_name,
      departments: program.category,
      channels: programChannels(program),
      stage: programStage(program.affiliate_status),
      sources: ["Google"],
      ask: program.next_action,
      phone: "",
      phoneHref: "",
      link: program.application_url,
      status: program.affiliate_status,
    });
  }

  for (const partner of input.partners) {
    const itemProgress = input.progress[partner.slug];
    if (!itemProgress?.important) continue;
    const text = `${partner.programFinding} ${partner.bestAsk} ${partner.publishedBenefit}`;
    const key = canonicalName(partner.company);
    mergeRow(rows, {
      key,
      name: partner.company,
      departments: partner.products,
      channels: Array.from(
        new Set([
          "Partner" as const,
          "Trade" as const,
          ...callTargetChannels(text),
        ]),
      ),
      stage: partnerStage(itemProgress.status),
      sources: ["Show"],
      ask: partner.bestAsk || partner.callScript,
      phone: partner.phone,
      phoneHref: `tel:${partner.phone.replace(/[^0-9+]/g, "")}`,
      link: partner.programUrl || partner.website,
      status: itemProgress.status,
    });
  }

  for (const [key, channels] of Object.entries(input.channelOverrides ?? {})) {
    const row = rows.get(key);
    if (row) rows.set(key, { ...row, channels });
  }

  return [...rows.values()].sort((a, b) => {
    const stageRank: Record<SupplierNetworkStage, number> = {
      approved: 0,
      contact: 1,
      more: 2,
    };
    return (
      stageRank[a.stage] - stageRank[b.stage] || a.name.localeCompare(b.name)
    );
  });
}
