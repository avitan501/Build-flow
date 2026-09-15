import { expect, test } from "@playwright/test"
import { parseSupplierQuoteMetadata, parseSupplierQuoteText, supplierQuoteExtractionWarnings } from "../lib/supplier-quote-parser"
import { matchSupplierQuoteItems } from "../lib/supplier-quote-routing"

test("yard quote preserves all 29 priced rows, floors, SKUs and LF cut lists", () => {
  const source = `1ST FLOOR------------------
2092 10PWI32S 9-1/2 PWI-32S LF LF 2.95 6,171.40
2-1/2" PWT I-JOIST (LPI-32)
35/20’ 30/26’ 22/16’ 26/10’
380 10PW20LVL 1-3/4X9-1/2 PW LVL LF 2.0E LF 5.20 1,976.00
6/20’ 10/26’
77 34TGOSB350 23/32 4X8 T&G OSB 350 SIF ORG EA 25.25 1,944.25
250 2610DF2P 2X6-10 #2&BTR DF PREM EA 11.05 2,762.50
50 2616DF2P 2X6-16 #2&BTR DF PREM EA 17.83 891.50
150 2416DF2P 2X4-16 #2&BTR DF PREM EA 10.20 1,530.00
250 2410DF2P 2X4-10 #2&BTR DF PREM EA 6.70 1,675.00
24 PLPA-29 PL PREMIUM CONST ADHESIVE 28OZ EA 12.49 299.76
170 THFI2595-MTK MTK 2-1/2X9-1/2 INV MNT HGR EA 4.29 729.30
5 GRJH4DCHG 1-1/2 HDG JST HNGR 33DEG 3M EA 61.00 305.00
25 DS0912BW2 RECIP BLD 9IN 6/12TP EA 3.45 86.25
20 21016DF2 2X10-16 #2&BTR DF EA 31.64 632.80
15 21216DF2 2X12-16 #2&BTR DF EA 37.35 560.25
60 58CDXF 19/32 4X8 CDX FIR 4PLY RTD EA 32.25 1,935.00
2ND FLOOR---------------------
2176 10PWI32S 9-1/2 PWI-32S LF LF 2.95 6,419.20
60/16’ 18/28’ 12/26’ 20/20’
384 10PW20LVL 1-3/4X9-1/2 PW LVL LF 2.0E LF 5.20 1,996.80
10/26’ 2/18’ 2/16’ 2/28’
Page 2
QTY ITEM NO. DESCRIPTION U/M UNIT PRICE EXTENDED PRICE
300 2610DF2P 2X6-10 #2&BTR DF PREM EA 11.05 3,315.00
60 2616DF2P 2X6-16 #2&BTR DF PREM EA 17.83 1,069.80
600 2410DF2P 2X4-10 #2&BTR DF PREM EA 6.70 4,020.00
150 2416DF2P 2X4-16 #2&BTR DF PREM EA 10.20 1,530.00
30 21016DF2 2X10-16 #2&BTR DF EA 31.64 949.20
70 34TGOSB350 23/32 4X8 T&G OSB 350 SIF ORG EA 25.25 1,767.50
10 GRC10PD 3X.120 G-R 15 COIL CTD 2.5M EA 36.00 360.00
10 D0724A 7-1/4 DIABLO BLADE 24T EA 10.99 109.90
170 TFL2595-MTK MTK 2-1/2X9-1/2 TP FLG HGR EA 4.29 729.30
CEILING JOIST---------------
80 21216DF2 2X12-16 #2&BTR DF EA 37.35 2,988.00
40 21224DF2 2X12-24 #2&BTR DF EA 65.43 2,617.20
96 12PW20LVL 1-3/4X11-7/8 PW LVL LF 2.0E LF 6.20 595.20
4/24’
12 21228DF2 2X12-28 #2&BTR DF EA 148.00 1,776.00`
  const rows = parseSupplierQuoteText(source)
  expect(rows).toHaveLength(29)
  expect(rows.reduce((sum, row) => sum + Math.round((row.lineTotal ?? 0) * 100), 0)).toBe(5174211)
  expect(rows[0]).toMatchObject({ itemCode: "10PWI32S", quantity: 2092, unit: "lin. ft.", unitPrice: 2.95 })
  expect(rows[0].specification).toContain("Cut list: 35/20’ 30/26’ 22/16’ 26/10’")
  expect(rows.filter(row => row.itemCode === "2416DF2P").map(row => row.specification)).toEqual(["Section: 1ST FLOOR", "Section: 2ND FLOOR"])
  expect(rows[27]).toMatchObject({ quantity: 96, unit: "lin. ft." })
  expect(rows[27].specification).toContain("Section: CEILING JOIST")
})

test("identical printed rows are not silently discarded", () => {
  const line = "LUM-1 2 EA Framing lumber $10.00 $20.00"
  expect(parseSupplierQuoteText(`${line}\n${line}`)).toHaveLength(2)
})

test("a shared SKU cannot override a different floor", () => {
  const quote = { id: "q", item_code: "2416DF2P", description: "Lumber", specification: "Section: 2ND FLOOR" }
  const first = { id: "first", description: "Lumber", specification: "SKU 2416DF2P · Section: First floor" }
  const second = { ...first, id: "second", specification: "SKU 2416DF2P · Section: Second floor" }
  expect(matchSupplierQuoteItems([quote], [first])).toEqual([])
  expect(matchSupplierQuoteItems([quote], [first, second])).toEqual([{ item: quote, comparisonItem: second }])
})

test("an incomplete AI result warns about lost rows and subtotal discrepancy", () => {
  const rows = parseSupplierQuoteText("LUM-1 2 EA Framing lumber $10.00 $20.00\nLUM-2 3 EA Framing lumber $10.00 $30.00")
  expect(supplierQuoteExtractionWarnings(rows.slice(0, 1), rows, 50)).toContain("Check missing rows")
  expect(supplierQuoteExtractionWarnings(rows.slice(0, 1), rows, 50)).toContain("Check totals")
  expect(supplierQuoteExtractionWarnings(rows, rows, 50)).toBe("")
})

test("separated PDF totals require a unique reconciled currency triplet", () => {
  const source = "SUBTOTAL TAX TOTAL\nTerms and material rows\n51,742.11 4,527.44 56,269.55\nEffective:09/15/2026 Expires:09/30/2026"
  expect(parseSupplierQuoteMetadata(source)).toMatchObject({ subtotal: 51742.11, total: 56269.55, expiresOn: "2026-09-30" })
  expect(parseSupplierQuoteMetadata(source + "\n10.00 1.00 11.00").subtotal).toBeNull()
  expect(parseSupplierQuoteMetadata(source.replace("56,269.55", "56,000.00")).subtotal).toBeNull()
})
