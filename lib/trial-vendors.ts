export type TrialVendorEntry = {
  sourceId: string
  department: string
  name: string
  address: string
  phone: string
  email: string
  website: string
  materials: string
}

const vendorRows = {
  "kamco": ["Kamco Supply", "301 Robbins Ln, Syosset, NY 11791", "516-935-8660", "info@kamco.com", "https://www.kamcosupply.com/", "Lumber, steel framing, drywall, insulation"],
  "prince": ["Prince Lumber", "51-15 35th St, Long Island City, NY 11101", "212-863-9180", "sales@princelumber.com", "https://princelumber.com/", "Lumber, plywood, drywall, steel studs, doors"],
  "dykes": ["Dykes Lumber", "43-01 9th St, Long Island City, NY 11101", "718-784-3920", "info@dykeslumber.com", "https://www.dykeslumber.com/", "Lumber, wallboard, moulding, doors, windows"],
  "city": ["City Lumber", "84-02 72nd Dr, Glendale, NY 11385", "718-937-6300", "dspodek@citylumber.net", "https://citylumber.net/", "Lumber, steel framing, drywall, insulation"],
  "feldman": ["Feldman Lumber", "251 E Shore Rd, Great Neck, NY 11023", "516-487-1400", "info@feldmanlumber.com", "https://feldmanlumber.com/", "Lumber, wallboard, flooring, windows, millwork"],
  "allers": ["Allers Lumber", "217 W Montauk Hwy, Lindenhurst, NY 11757", "631-226-6666", "cs@allerslumber.com", "https://allerslumber.com/", "Lumber and general building materials"],
  "five_star": ["Five Star Lumber", "210 E Merrick Rd, Valley Stream, NY 11580", "516-872-0189", "bruce@fivestarkitchens.com", "https://www.fivestarlumber.com/", "Lumber, plywood, hardware, building materials"],
  "lenoble": ["LeNoble Lumber", "38-20 Review Ave, Long Island City, NY 11101", "718-784-5230", "sales@lenoblelumber.com", "https://lenoblelumber.com/", "Lumber, moulding, flooring, siding"],
  "pro": ["Pro Builders Material", "770 Coney Island Ave, Brooklyn, NY 11218", "718-633-3100", "sales@probuildersmaterial.com", "https://www.probuildersmaterial.com/more/manufacturers", "Lumber, drywall, roofing, siding, waterproofing"],
  "fourfrnt": ["4FRNT Supply", "3920 Veterans Memorial Hwy, Bohemia, NY 11716", "516-507-0377", "kyra@4frntsupply.com", "https://4frntsupply.com/", "Lumber, drywall, roofing, siding, windows"],
  "century": ["Century Building Materials", "275 E Sunrise Hwy, Lindenhurst, NY 11757", "631-888-8810", "sales@centurybuilding.com", "https://centurybuilding.com/", "Roofing, siding, windows, doors, lumber"],
  "florence": ["Florence Building Materials", "1667 E Jericho Tpke, Huntington, NY 11743", "631-499-6200", "info@florencecorp.com", "https://www.florencecorp.com/", "Roofing, siding, windows, doors, lumber"],
  "maranatha": ["Maranatha Roofing & Siding Supply", "125 Voice Rd, Carle Place, NY 11514", "347-497-2073", "sales@maranathabp.com", "https://maranathabp.com/", "Wholesale roofing and siding materials"],
  "ncbp": ["New Castle Building Products", "105-14 Astoria Blvd, East Elmhurst, NY 11369", "718-779-0280", "eastelmhurst@ncbp.com", "https://ncbp.com/locations/east-elmhurst-ny/", "Roofing, siding, trim, waterproofing, metal"],
  "sj": ["S&J Sheet Metal Supply", "70 Grand Ave, Brooklyn, NY 11205", "718-384-0800", "70grandave@gmail.com", "https://sjsupply.com/", "Roofing, waterproofing, sheet metal fabrication"],
  "df": ["DF Studio NYC", "243 Grandview Ave, Staten Island, NY 10303", "347-801-2855", "sales@dfstudio.nyc", "https://dfstudionyc.com/", "Roofing systems, siding, doors, moulding, flooring"],
  "luisi": ["Luisi Building Materials", "1628 62nd St, Brooklyn, NY 11204", "718-232-5757", "info@luisi.nyc", "https://luisi.nyc/", "Roofing supplies, tile, stone, masonry materials"],
  "qxo": ["QXO Building Products", "120 Whitehall St, Lynbrook, NY 11563", "516-872-0094", "customercare-1@qxo.com", "https://locations.qxo.com/NY/Lynbrook/Lynbrook-NY-11563/388", "Roofing, siding, insulation, vents, exterior products"],
  "anational": ["A. National Moulding", "1500 Shames Dr, Westbury, NY 11590", "516-338-5200", "anatmldg@aol.com", "https://www.anationalmoulding.com/", "Stock and custom wood mouldings"],
  "centre": ["Centre Millwork", "669 Long Beach Blvd, Long Beach, NY 11561", "516-432-6566", "sburker@centremillwork.com", "https://centremillwork.com/", "Doors, moulding, trim and architectural millwork"],
  "metalocke": ["Metalocke Industries", "32-02 57th St, Woodside, NY 11377", "718-267-9200", "metalocke@gmail.com", "https://metalocke.com/", "Doors, frames, hardware and mouldings"],
  "southside": ["Southside Workshop", "169 54th St, Brooklyn, NY 11220", "718-832-1058", "inna@sws.nyc", "https://sws.nyc/", "Custom wood door manufacturer and fabricator"],
  "authentic": ["Authentic Moulding & Door", "80 Glen Head Rd, Glen Head, NY 11545", "516-609-2535", "sales@authenticmoulding.com", "https://authenticmoulding.com/", "Interior doors, mouldings and millwork"],
  "jes": ["Jamaica Electrical Supply", "121-08 Jamaica Ave, Richmond Hill, NY 11418", "718-849-5555", "jamaicaelectric@gmail.com", "https://jamaicaelectricalsupply.com/", "Wire, cable, panels, devices and electrical supplies"],
  "qes": ["Queens Electrical Supply", "86-11 Atlantic Ave, Woodhaven, NY 11421", "718-849-5454", "queenselectric2@gmail.com", "https://queenselectricalsupply.com/", "Electrical and lighting supplies"],
  "industrial": ["Industrial Electric Supply", "259 Johnson Ave, Brooklyn, NY 11206", "718-386-7010", "office@industrialelectricbk.com", "https://www.industrialelectricbk.com/", "Wire, cable, conduit, panels, devices and lighting"],
  "electrix": ["Electrix Supply", "20 Meserole St, Brooklyn, NY 11206", "718-400-9092", "sales@electrixny.com", "https://www.electrixny.com/contact", "Electrical and lighting supplies"],
  "aura": ["Aura Electric & Lighting Supply", "1315 60th St, Brooklyn, NY 11219", "718-436-6000", "sales@auraelectricsupply.com", "https://www.auraelectricsupply.com/contact-us", "Electrical supplies and lighting"],
  "sb": ["S&B Electric Supply", "284 Richardson St, Brooklyn, NY 11222", "718-266-0432", "info@sbelectricalsupply.com", "https://sbelectricalsupply.com/", "Electrical supplies, lighting and fixtures"],
  "globe": ["Globe Electric Supply", "33-70 10th St, Long Island City, NY 11106", "718-932-1820", "sales@globeelec.com", "https://globeelec.com/about-us/", "Electrical construction materials and controls"],
  "greenvale": ["Greenvale Electric Supply", "385 Glen Cove Rd, Greenvale, NY 11548", "516-671-1440", "counter@greenvaleelectric.com", "https://www.greenvaleelectric.com/page-index.html", "Electrical and lighting products"],
  "michaels": ["Michael's Electrical Supply", "456 Merrick Rd, Lynbrook, NY 11563", "516-593-7200", "david@michaelselectric.com", "https://michaelselectric.com/", "Electrical supplies, wire and lighting"],
  "ns": ["N&S Electric Supply", "26 E Merrick Rd, Freeport, NY 11520", "516-378-1040", "jw@nselectric.com", "https://nselectric.com/", "Electrical supplies and lighting"],
  "cancos": ["Cancos Tile & Stone", "381 Sunrise Hwy, Lynbrook, NY 11563", "516-593-4117", "customerservice@cancos.com", "https://cancostileandstone.com/", "Tile, stone, mosaics and setting materials"],
  "nemo": ["Nemo Tile + Stone", "277 Old Country Rd, Hicksville, NY 11801", "516-935-5300", "info@nemotile.com", "https://nemotile.com/", "Tile, porcelain, stone and mosaics"],
  "galactic": ["Galactic Tiles", "150 35th St, Brooklyn, NY 11232", "718-768-6060", "webinfo@galactictiles.com", "https://galactictiles.com/", "Ceramic, porcelain, stone and mosaics"],
  "brooklyn_tile": ["Brooklyn Tile & Design", "830 Hempstead Tpke, Franklin Square, NY 11010", "516-998-3366", "info@brooklyntileanddesign.com", "https://www.brooklyntileanddesign.com/Contact", "Tile, stone, mosaics and bathroom finishes"],
  "eurohouse": ["Euro House Tile & Marble", "1743 McDonald Ave, Brooklyn, NY 11230", "718-339-9469", "info@eurohousetile.com", "https://eurohousetile.com/", "Tile, marble, porcelain and mosaics"],
  "tilesunlimited": ["Tiles Unlimited", "72-12 88th St, Glendale, NY 11385", "718-894-8300", "info@tilesunlimitedny.com", "https://tilesunlimitedny.com/", "Tile, stone, mosaics and installation materials"],
  "procida": ["Procida Tile", "430 Commack Rd, Deer Park, NY 11729", "631-393-2760", "wholesale@procidatile.com", "https://procidatile.com/", "Wholesale tile, stone, porcelain and mosaics"],
  "daltile": ["Daltile Sales Service Center", "58-40 55th Dr, Maspeth, NY 11378", "718-894-9574", "customerservice@daltile.com", "https://www.daltile.com/store-locator", "Tile manufacturer and distributor"],
  "bennaton": ["Bennaton Tile", "341 Avenue U, Brooklyn, NY 11223", "718-372-6000", "info@bennatontile.com", "https://www.bennatontile.com/contact", "Tile, stone and mosaics"],
  "pc": ["P.C. Hardwood Floors", "121 31st St, Brooklyn, NY 11232", "718-369-6892", "info@pcwoodfloors.com", "https://www.pcwoodfloors.com/", "Hardwood flooring and floor supplies"],
  "olson": ["Olson Floor Supply", "172-19 Liberty Ave, Jamaica, NY 11433", "718-297-3997", "orders@olsonfloors.com", "https://olsonfloors.com/", "Hardwood flooring, finishes and floor supplies"],
  "bkfloor": ["BK Floor Supply", "780 Humboldt St, Brooklyn, NY 11222", "718-218-9288", "sales@bkfloorsupply.com", "https://bkfloorsupply.com/", "Wood flooring and floor supplies"],
  "pid": ["PID Floors Pro Shop", "1930 47th St, Brooklyn, NY 11204", "718-972-9757", "distribution@pidfloors.com", "https://pidfloors.com/", "Wood flooring manufacturer and distributor"],
  "nyhardwood": ["New York Hardwood Floors & Supplies", "60 12th St, Brooklyn, NY 11215", "718-369-2668", "nywoodfloor@gmail.com", "https://nyhardwoodfloors.com/", "Hardwood flooring and floor supplies"],
  "unique": ["Unique Floor Supply", "111-44 Van Wyck Expy, South Ozone Park, NY 11420", "718-738-8400", "hello@uniquefloorsupply.com", "https://uniquefloorsupply.com/", "Wood flooring, finishes, adhesives and tools"],
  "bni": ["BNI Supply", "654 Powell St, Brooklyn, NY 11212", "347-408-5603", "ibrahimandao66@gmail.com", "https://bnisupply.com/", "Flooring, underlayment and floor supplies"],
  "jfd": ["JFD Sales / Manco Distributors", "11-12 44th Dr, Long Island City, NY 11101", "718-729-5222", "jchorchado@jfdsales.com", "https://jfdsales.com/", "Commercial flooring and flooring supplies"],
  "crystal": ["Crystal Window & Door Systems", "31-10 Whitestone Expy, Flushing, NY 11354", "718-961-7300", "info@crystalwindows.com", "https://crystalwindows.com/", "Window and door manufacturer"],
  "modern": ["Modern Window Manufacturing", "1420 Commerce Ave, Bronx, NY 10461", "718-822-5556", "sales@mwdny.com", "https://mwdny.com/", "Window manufacturer"],
  "starr": ["Starr Windows", "214 Starr St, Brooklyn, NY 11237", "718-213-3973", "info@starrwin.com", "https://starrwin.com/", "Window manufacturer"],
  "sussman": ["J. Sussman Architectural Products", "109-10 180th St, Jamaica, NY 11433", "718-297-0228", "sales@SussmanAP.com", "https://www.sussmanarchitectural.com/", "Custom window manufacturer"],
  "nuvue": ["Nu-Vue Window Factory", "3550 Lawson Blvd, Oceanside, NY 11572", "516-608-0379", "sales@nuvuewindow.com", "https://nuvuewindow.com/", "Wholesale replacement windows"],
} as const

const departmentRows = {
  "Framing": ["kamco", "prince", "dykes", "city", "feldman", "allers", "five_star", "lenoble", "pro", "fourfrnt"],
  "Electrical": ["jes", "qes", "industrial", "electrix", "aura", "sb", "globe", "greenvale", "michaels", "ns"],
  "Tile": ["cancos", "nemo", "galactic", "brooklyn_tile", "eurohouse", "tilesunlimited", "procida", "daltile", "bennaton", "luisi"],
  "Sheet Rock": ["kamco", "prince", "dykes", "city", "feldman", "allers", "pro", "fourfrnt", "century", "florence"],
  "Door & Molding": ["centre", "metalocke", "southside", "authentic", "century", "dykes", "prince", "feldman", "anational", "df"],
  "Flooring": ["pc", "olson", "bkfloor", "pid", "nyhardwood", "unique", "bni", "jfd", "lenoble", "feldman"],
  "Siding": ["century", "florence", "maranatha", "ncbp", "pro", "fourfrnt", "df", "qxo", "lenoble", "feldman"],
  "Roofing": ["century", "florence", "maranatha", "ncbp", "pro", "fourfrnt", "sj", "df", "luisi", "qxo"],
  "Windows": ["crystal", "modern", "starr", "sussman", "nuvue", "dykes", "feldman", "century", "florence", "fourfrnt"],
} as const

export const TRIAL_VENDOR_ENTRIES: TrialVendorEntry[] = Object.entries(departmentRows).flatMap(([department, sourceIds]) =>
  sourceIds.map((sourceId) => {
    const [name, address, phone, email, website, materials] = vendorRows[sourceId]
    return { sourceId, department, name, address, phone, email, website, materials }
  }),
)

export const TRIAL_VENDOR_DEPARTMENTS = Object.keys(departmentRows)
export const TRIAL_VENDOR_ENTRY_COUNT = TRIAL_VENDOR_ENTRIES.length
export const TRIAL_VENDOR_UNIQUE_COUNT = Object.keys(vendorRows).length

