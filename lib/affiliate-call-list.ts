export type AffiliateCallTarget = {
  rank: number;
  company: string;
  phone: string;
  phoneHref: string;
  askFor: string;
  category: string;
  priority: "A" | "B" | "C";
  programUrl: string;
  programStatus: "Official program" | "Confirm by phone";
};

const target = (
  rank: number,
  company: string,
  phone: string,
  category: string,
  programUrl: string,
  programStatus: AffiliateCallTarget["programStatus"] = "Official program",
): AffiliateCallTarget => ({
  rank,
  company,
  phone,
  phoneHref: `tel:+1${phone.replace(/\D/g, "")}`,
  askFor: "Affiliate or Partnerships Manager",
  category,
  priority: rank <= 15 ? "A" : rank <= 35 ? "B" : "C",
  programUrl,
  programStatus,
});

// Public business lines only. Carlos should ask the switchboard for the role shown.
export const AFFILIATE_CALL_TARGETS: AffiliateCallTarget[] = [
  target(1, "The Home Depot", "800-466-3337", "Building materials and tools", "https://www.homedepot.com/c/SF_MS_The_Home_Depot_Affiliate_Program"),
  target(2, "Lowe's", "800-445-6937", "Building materials and home improvement", "https://www.lowes.com/l/creator/joinlowescreator"),
  target(3, "Ace Hardware", "888-827-4223", "Hardware, paint, tools and plumbing", "https://www.acehardware.com/affiliates"),
  target(4, "Amazon Associates", "866-216-1072", "Tools and construction supplies", "https://affiliate-program.amazon.com/"),
  target(5, "Walmart Creator", "800-925-6278", "Tools and home improvement", "https://creator.walmart.com/"),
  target(6, "Target Partners", "800-440-0680", "Home improvement and storage", "https://partners.target.com/"),
  target(7, "eBay Partner Network", "866-540-3229", "Tools, equipment and parts", "https://partnernetwork.ebay.com/"),
  target(8, "Tractor Supply", "877-718-6750", "Jobsite, outdoor and power equipment", "https://www.tractorsupply.com/tsc/cms/policies-information/affiliate-program"),
  target(9, "Northern Tool + Equipment", "800-221-0516", "Tools, generators and equipment", "https://www.northerntool.com/affiliate-program"),
  target(10, "Acme Tools", "877-345-2263", "Professional tools and equipment", "https://www.acmetools.com/affiliates.html"),
  target(11, "The Tool Nut", "877-866-5688", "Professional power tools", "https://www.toolnut.com/pages/affiliate-program"),
  target(12, "KC Tool", "913-440-9766", "Professional hand tools", "https://kctool.com/pages/affiliate-program"),
  target(13, "CPO Outlets", "866-577-3014", "New and reconditioned tools", "https://www.cpopowertools.com/outlets-affiliate.html"),
  target(14, "Ohio Power Tool", "800-242-4424", "Professional tools and equipment", "https://ui.awin.com/merchant-profile/89545"),
  target(15, "HVACDirect", "888-376-5487", "HVAC systems and equipment", "https://hvacdirect.com/affiliates-home"),
  target(16, "Global Industrial", "888-978-7759", "Industrial and material-handling supplies", "https://www.globalindustrial.com/affiliate"),
  target(17, "Zoro", "855-289-9676", "Industrial supplies, tools and MRO", "https://www.zoro.com/resellers/", "Confirm by phone"),
  target(18, "VEVOR", "888-838-3006", "Tools, machinery and construction equipment", "https://ui.awin.com/merchant-profile/28831"),
  target(19, "Greenworks", "888-909-6757", "Outdoor power equipment", "https://www.greenworkstools.com/pages/affiliate-program"),
  target(20, "1000Bulbs", "800-624-4488", "Commercial and residential lighting", "https://shop.1000bulbs.com/partnerwithus/", "Confirm by phone"),
  target(21, "Lumens", "877-445-4486", "Lighting and ceiling fans", "https://www.lumens.com/affiliate-application/"),
  target(22, "YLighting", "866-428-9289", "Modern lighting and fans", "https://www.ylighting.com/affiliates/"),
  target(23, "Lamps Plus", "800-782-1967", "Lighting and ceiling fans", "https://www.lampsplus.com/partners/"),
  target(24, "Ferguson Home", "800-375-3403", "Plumbing, HVAC, kitchen and lighting", "https://www.fergusonhome.com/", "Confirm by phone"),
  target(25, "Build.com", "800-375-3403", "Plumbing, lighting and hardware", "https://www.build.com/", "Confirm by phone"),
  target(26, "SupplyHouse", "888-757-4774", "Plumbing, HVAC and electrical", "https://www.supplyhouse.com/", "Confirm by phone"),
  target(27, "PlumbersStock", "435-868-4020", "Plumbing and irrigation supplies", "https://www.plumbersstock.com/support/contact.html", "Confirm by phone"),
  target(28, "Kingston Brass", "877-252-7277", "Faucets and plumbing fixtures", "https://www.kingstonbrass.com/pages/affiliate-program"),
  target(29, "The RTA Store", "877-992-2246", "Kitchen and bathroom cabinets", "https://www.thertastore.com/partner-with-us"),
  target(30, "Cabinets.com", "844-804-7702", "Kitchen cabinets", "https://www.cabinets.com/", "Confirm by phone"),
  target(31, "Blinds.com", "800-505-1905", "Window coverings", "https://www.blinds.com/affiliates"),
  target(32, "Blindsgalore", "877-702-5463", "Blinds, shades and shutters", "https://www.blindsgalore.com/affiliate-programs"),
  target(33, "Tile Club", "888-900-0498", "Tile and mosaics", "https://www.tileclub.com/pages/affiliate-program"),
  target(34, "TileBar", "888-541-3840", "Tile and surface finishes", "https://www.tilebar.com/", "Confirm by phone"),
  target(35, "BuildDirect", "877-631-2845", "Flooring and building materials", "https://www.builddirect.com/pages/partner-with-us", "Confirm by phone"),
  target(36, "Floor City", "800-898-9540", "Commercial flooring", "https://www.floorcity.com/", "Confirm by phone"),
  target(37, "Flooring Inc", "800-613-0996", "Residential and commercial flooring", "https://www.flooringinc.com/", "Confirm by phone"),
  target(38, "AJ Madison", "800-570-3355", "Appliances and kitchen fixtures", "https://www.ajmadison.com/", "Confirm by phone"),
  target(39, "Factory Buys Direct", "855-607-6557", "Heating and outdoor equipment", "https://www.factorybuysdirect.com/pages/affiliates"),
  target(40, "IpeDepot", "877-232-3915", "Decking, siding and hardwood", "https://buy.ipedepot.com/pages/affiliates"),
  target(41, "Wurth Tool", "800-526-5228", "Tools, fasteners and electrical supplies", "https://wurthtool.com/pages/affiliate"),
  target(42, "MegaDepot", "800-884-5767", "Industrial and safety equipment", "https://ui.awin.com/merchant-profile/89059"),
  target(43, "Rockler", "800-279-4441", "Woodworking tools and hardware", "https://www.rockler.com/", "Confirm by phone"),
  target(44, "Woodcraft", "800-535-4482", "Woodworking tools and supplies", "https://www.woodcraft.com/", "Confirm by phone"),
  target(45, "Max Tool", "800-629-3325", "Power tools and equipment", "https://www.maxtool.com/pages/affiliate-program"),
  target(46, "Toolbarn", "866-597-3850", "Power tools and pressure-washing equipment", "https://www.toolbarn.com/pages/affiliate-program"),
  target(47, "Garrett Wade", "800-221-2942", "Specialty hand tools", "https://garrettwade.com/", "Confirm by phone"),
  target(48, "Wayfair", "844-263-4868", "Fixtures, storage and renovation finishes", "https://www.aboutwayfair.com/partner-with-us", "Confirm by phone"),
  target(49, "US Door & More", "813-876-6699", "Interior and exterior doors", "https://www.doornmore.com/help/doornmore-customer-service/affiliate-program.html"),
  target(50, "1620 Workwear", "781-305-2900", "Contractor workwear", "https://www.avantlink.com/programs/22169/1620-workwear-affiliate-program"),
];
