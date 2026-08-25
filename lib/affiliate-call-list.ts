export type AffiliateCallTarget = {
  rank: number;
  company: string;
  phone: string;
  phoneHref: string;
  askFor: string;
  callRoute: string;
  contactLevel: "Dedicated team" | "Direct business" | "Pro or sales team" | "Network managed";
  category: string;
  priority: "A" | "B" | "C";
  programUrl: string;
  programStatus: "Official program" | "Confirm by phone";
};

type TargetOptions = Pick<AffiliateCallTarget, "askFor" | "callRoute" | "contactLevel"> & {
  programStatus?: AffiliateCallTarget["programStatus"];
};

const target = (
  rank: number,
  company: string,
  phone: string,
  category: string,
  programUrl: string,
  options: TargetOptions,
): AffiliateCallTarget => ({
  rank,
  company,
  phone,
  phoneHref: `tel:+1${phone.replace(/\D/g, "")}`,
  askFor: options.askFor,
  callRoute: options.callRoute,
  contactLevel: options.contactLevel,
  category,
  priority: rank <= 15 ? "A" : rank <= 35 ? "B" : "C",
  programUrl,
  programStatus: options.programStatus ?? "Official program",
});

const direct = (askFor: string, callRoute: string, programStatus: TargetOptions["programStatus"] = "Official program"): TargetOptions => ({ askFor, callRoute, contactLevel: "Direct business", programStatus });
const team = (askFor: string, callRoute: string, programStatus: TargetOptions["programStatus"] = "Official program"): TargetOptions => ({ askFor, callRoute, contactLevel: "Dedicated team", programStatus });
const sales = (askFor: string, callRoute: string, programStatus: TargetOptions["programStatus"] = "Confirm by phone"): TargetOptions => ({ askFor, callRoute, contactLevel: "Pro or sales team", programStatus });
const network = (askFor: string, callRoute: string): TargetOptions => ({ askFor, callRoute, contactLevel: "Network managed" });

// Public business numbers only. Rankings favor Avantia's active construction departments,
// an official affiliate/referral program, and the fastest publicly documented call route.
export const AFFILIATE_CALL_TARGETS: AffiliateCallTarget[] = [
  target(1, "Concrete Tools Direct", "855-281-1918", "Concrete and masonry tools", "https://concretetoolsdirect.com/pages/join-concrete-tools-direct-affiliate-program", direct("Affiliate program owner", "Say: affiliate application for a construction-material sourcing website")),
  target(2, "Rara RTA Cabinets", "516-979-6789", "Kitchen and bathroom cabinets", "https://www.rarartacabinets.com/create-affiliate-program/", direct("Affiliate or partnerships manager", "Local Long Island line; ask for the in-house affiliate program")),
  target(3, "Tile Club", "833-845-3252", "Tile and surface finishes", "https://www.tileclub.com/pages/affiliate-program", team("Commercial Sales Manager", "Choose Trade Support, extension 2; mention affiliate plus trade referrals")),
  target(4, "Global Industrial", "844-671-1547", "Industrial and jobsite supplies", "https://www.globalindustrial.com/affiliate", team("Reseller Support Team", "Dedicated reseller line; ask about affiliate attribution and product feed")),
  target(5, "KC Tool", "913-440-9766", "Professional tools and business accounts", "https://kctool.com/pages/affiliate-program", team("Business Accounts or affiliate manager", "Ask for B2B first, then the Refersion affiliate owner")),
  target(6, "US Door & More", "813-876-6699", "Interior and exterior doors", "https://www.doornmore.com/partner-program", direct("VIP and affiliate program manager", "Ask for the professional partner program for builders and contractors")),
  target(7, "ADM Flooring", "888-729-6781", "Hardwood flooring", "https://admflooring.com/about-affiliate-program/", direct("Affiliate marketing team", "Ask for the affiliate member program and phone-order attribution")),
  target(8, "HVACDirect", "800-397-1392", "HVAC systems and equipment", "https://hvacdirect.com/affiliates-home", direct("In-house affiliate manager", "Ask sales to transfer you to the affiliate program owner")),
  target(9, "The Tool Nut", "914-621-0200", "Professional power tools", "https://www.toolnut.com/pages/affiliate-program", direct("Affiliate partnerships team", "Local New York line; ask about unique Impact partnership terms")),
  target(10, "Kingston Brass", "877-252-7277", "Plumbing fixtures and faucets", "https://www.kingstonbrass.com/pages/affiliate-program", team("B2B or wholesale inquiries", "Ask for B2B first, then affiliate and trade-program attribution")),
  target(11, "Acme Tools", "877-345-2263", "Professional tools and heavy equipment", "https://www.acmetools.com/affiliates.html", sales("Affiliate partnership contact", "Ask the representative to route an Impact affiliate-program inquiry", "Official program")),
  target(12, "U.S. Electrical Services / LADE", "770-659-7246", "Electrical supplies, wire and lighting", "https://store.ladesupply.com/affiliate", team("Dedicated Affiliate Program Manager", "Online support line; ask for the AvantLink affiliate manager")),
  target(13, "Floor & Decor", "800-631-0958", "Tile, flooring and installation materials", "https://www.flooranddecor.com/pro-premier-rewards-program", team("PRO Customer Care", "Dedicated PRO line; ask about referral attribution and brand partnerships")),
  target(14, "Contractors Direct", "800-709-0002", "Tile, concrete and contractor tools", "https://www.contractorsdirect.com/pages/contact-us", direct("Trade pricing or partnerships manager", "Ask for contractor pricing and a referral partnership", "Confirm by phone")),
  target(15, "Tools4Flooring", "866-634-1189", "Flooring tools and installation supplies", "https://www.tools4flooring.com/contact", direct("Business development or partnerships", "Ask for bulk pricing, product feed, and referral terms", "Confirm by phone")),
  target(16, "Plumbing Deals", "888-682-5956", "Plumbing products and fixtures", "https://plumbing-deals.com/pages/contact-us", direct("Sales or affiliate partnerships", "Ask Mack or Kris for the person handling referral partnerships", "Confirm by phone")),
  target(17, "WinSoon Hardware", "929-391-8558", "Door and barn-door hardware", "https://www.winsoonhardware.com/affiliate/login", direct("In-house affiliate manager", "Ask for the existing affiliate program owner")),
  target(18, "Door Armor", "888-582-2295", "Door security and reinforcement", "https://doorarmor.com/pages/affiliate-program", direct("Affiliate Referral Program", "Ask for the affiliate program managed by iAffiliate Management")),
  target(19, "Specialized Industrial Materials", "281-850-0301", "Concrete repair and specialty materials", "https://www.simaterials.com/products/affiliate/login", direct("Affiliate or business development manager", "Ask for its in-house affiliate account", "Official program")),
  target(20, "IpeDepot", "877-232-3915", "Decking, siding and hardwood", "https://buy.ipedepot.com/pages/affiliates", team("Wholesale or affiliate manager", "Ask for the International & Wholesale division and affiliate terms")),
  target(21, "Ferguson", "888-222-1785", "Plumbing, HVAC and mechanical supplies", "https://www.ferguson.com/content/pro-services/", team("Dedicated phone sales team", "Ask about contractor referrals, account attribution, and a named account rep", "Confirm by phone")),
  target(22, "Lowe's Pro", "844-569-4776", "Building materials and home improvement", "https://www.lowes.com/l/creator/joinlowescreator", team("Pro Service Desk", "Dedicated Pro line; ask for Creator or affiliate-program escalation")),
  target(23, "SupplyHouse", "888-757-4774", "Plumbing, HVAC and electrical", "https://www.supplyhouse.com/", sales("TradeMaster or partnerships manager", "Ask for TradeMaster and referral attribution", "Confirm by phone")),
  target(24, "PlumbersStock", "435-868-4020", "Plumbing and irrigation supplies", "https://www.plumbersstock.com/support/contact.html", direct("Sales partnerships manager", "Ask for contractor, reseller, or referral terms", "Confirm by phone")),
  target(25, "1000Bulbs", "800-624-4488", "Commercial and residential lighting", "https://shop.1000bulbs.com/partnerwithus/", sales("Sales partnership manager", "Ask for partner-with-us and referral attribution", "Confirm by phone")),
  target(26, "BuildDirect", "877-631-2845", "Flooring and building materials", "https://www.builddirect.com/pages/partner-with-us", sales("Partner program manager", "Ask for the partner-with-us team", "Confirm by phone")),
  target(27, "Floor City", "800-898-9540", "Commercial flooring", "https://www.floorcity.com/", sales("Commercial sales or partnerships", "Ask for quote sales and referral attribution", "Confirm by phone")),
  target(28, "Flooring Inc", "800-613-0996", "Residential and commercial flooring", "https://www.flooringinc.com/", sales("Commercial sales or partnerships", "Ask for contractor pricing and referral terms", "Confirm by phone")),
  target(29, "AJ Madison", "800-570-3355", "Appliances and kitchen fixtures", "https://www.ajmadison.com/", team("Corporate Sales", "Choose Sales, then Corporate Sales; ask about referral attribution", "Confirm by phone")),
  target(30, "Factory Buys Direct", "855-607-6557", "Heating and outdoor equipment", "https://www.factorybuysdirect.com/pages/affiliates", direct("In-house affiliate management", "Ask for the AvantLink affiliate owner")),
  target(31, "Wurth Tool", "800-987-8487", "Tools, fasteners and electrical supplies", "https://wurthtool.com/pages/affiliate", direct("Affiliate or business-account manager", "Ask for WurthTool affiliate and business account options")),
  target(32, "MegaDepot", "800-884-5767", "Industrial and safety equipment", "https://ui.awin.com/merchant-profile/89059", network("Awin affiliate-program contact", "Ask sales to identify the employee who owns its Awin program")),
  target(33, "Max Tool", "800-629-3325", "Power tools and equipment", "https://www.maxtool.com/pages/affiliate-program", direct("Affiliate program manager", "Ask for the in-house affiliate contact")),
  target(34, "Toolbarn", "866-597-3850", "Power tools and jobsite equipment", "https://www.toolbarn.com/pages/affiliate-program", direct("Affiliate program manager", "Ask for affiliate and product-feed support")),
  target(35, "Northern Tool + Equipment", "800-221-0516", "Tools, generators and equipment", "https://www.northerntool.com/affiliate-program", network("CJ affiliate-program manager", "Ask for the person responsible for the CJ affiliate program")),
  target(36, "Ohio Power Tool", "800-242-4424", "Professional tools and equipment", "https://ui.awin.com/merchant-profile/89545", network("Awin affiliate-program contact", "Ask for the employee responsible for its Awin program")),
  target(37, "CPO Outlets", "866-577-3014", "New and reconditioned tools", "https://www.cpopowertools.com/outlets-affiliate.html", sales("Affiliate-program owner", "Ask the representative for the affiliate-program contact")),
  target(38, "VEVOR", "888-838-3006", "Tools and construction equipment", "https://ui.awin.com/merchant-profile/28831", network("Awin affiliate-program contact", "Ask for affiliate or creator-program escalation")),
  target(39, "Zoro", "855-289-9676", "Industrial supplies, tools and MRO", "https://www.zoro.com/resellers/", team("Reseller team", "Ask for reseller or referral-program support", "Confirm by phone")),
  target(40, "Rockler", "800-279-4441", "Woodworking tools and hardware", "https://www.rockler.com/", sales("Business development or partnerships", "Ask for referral, creator, or partnership programs", "Confirm by phone")),
  target(41, "Woodcraft", "800-535-4482", "Woodworking tools and supplies", "https://www.woodcraft.com/", sales("Business development or affiliate manager", "Ask for referral or affiliate-program ownership", "Confirm by phone")),
  target(42, "The RTA Store", "877-992-2246", "Kitchen and bathroom cabinets", "https://www.thertastore.com/partner-with-us", sales("Partner program representative", "Ask for the partner-with-us program")),
  target(43, "Cabinets.com", "844-804-7702", "Kitchen cabinets", "https://www.cabinets.com/", sales("Trade or partnerships manager", "Ask for contractor and referral options", "Confirm by phone")),
  target(44, "TileBar", "888-541-3840", "Tile and surface finishes", "https://www.tilebar.com/", sales("Trade sales or partnerships", "Ask for trade referrals and an affiliate option", "Confirm by phone")),
  target(45, "Lumens", "877-445-4486", "Lighting and ceiling fans", "https://www.lumens.com/affiliate-application/", network("Impact affiliate-program manager", "Ask for affiliate-program escalation")),
  target(46, "YLighting", "866-428-9289", "Lighting and ceiling fans", "https://www.ylighting.com/affiliates/", network("Affiliate-program manager", "Ask for the current affiliate contact")),
  target(47, "Build.com / Ferguson Home", "800-375-3403", "Plumbing, lighting and hardware", "https://www.fergusonhome.com/", sales("Trade sales or partnerships", "Ask for professional trade referrals; this is part of Ferguson", "Confirm by phone")),
  target(48, "The Home Depot Pro", "800-466-3337", "Building materials and tools", "https://www.homedepot.com/c/SF_MS_The_Home_Depot_Affiliate_Program", network("Pro or affiliate-program escalation", "No public affiliate extension; request Pro support, then affiliate escalation")),
  target(49, "Ace Hardware", "888-827-4223", "Hardware, paint, tools and plumbing", "https://www.acehardware.com/affiliates", network("Impact affiliate-program manager", "Affiliate support is network-managed; ask for the affiliate escalation path")),
  target(50, "Tractor Supply", "877-718-6750", "Jobsite and outdoor equipment", "https://www.tractorsupply.com/tsc/cms/policies-information/affiliate-program", network("Partnerize affiliate-program manager", "Ask for the person responsible for the Partnerize program")),
];
