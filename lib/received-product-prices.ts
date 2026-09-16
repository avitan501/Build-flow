import type { ReceivedSupplierQuote, ReceivedSupplierQuoteLine } from "@/components/buildflow/received-supplier-quote-table"
import type { QuoteComparisonItemRecord } from "@/lib/quote-comparison"
import { matchSupplierQuoteItems } from "@/lib/supplier-quote-routing"

function text(value: string) { return value.toLowerCase().replace(/×/g,"x").replace(/['′]/g," ft ").replace(/["″]/g," in ").replace(/\b(?:feet|foot)\b/g,"ft").replace(/\b(?:inch|inches)\b/g,"in").replace(/[^a-z0-9./]+/g," ").trim() }
function section(value: string) { return text(value).match(/\b(first floor|second floor|third floor|ceiling joists?)\b/)?.[0] }
function family(value: string) {
  const v=text(value)
  for(const [name,pattern] of [["nails",/nails?\b/],["hanger",/hanger|face mount|top mount/],["joist",/tji|ni.?40|pwi|pwt|i.?joist/],["lvl",/\blvl\b|laminated veneer/],["plywood",/plywood|\bcdx\b|\bosb\b|edge gold/],["blade",/blades?\b|sawzall/],["adhesive",/glue|adhesive|provan/],["lumber",/lumber|douglas fir|\bspf\b|\b2\s*x\s*\d+/]] as const) if(pattern.test(v))return name
  return null
}
function candidateScore(line: ReceivedSupplierQuoteLine, item: QuoteComparisonItemRecord) {
  const sourceSpec=(line.specification||"").split(" · Source pricing:")[0].split(" · Printed Sale/Un:")[0]
  const a=text(`${line.description} ${sourceSpec}`), b=text(`${item.description} ${item.specification||""}`)
  if(section(a)&&section(b)&&section(a)!==section(b))return 0
  const fa=family(a),fb=family(b);if(!fa||fa!==fb)return 0
  if(fa==="lumber") {
    const dimension=(v:string)=>v.match(/\b2\s*x\s*(\d+)\b/)?.[1]
    if(dimension(a)&&dimension(b)&&dimension(a)!==dimension(b))return 0
  }
  const lengths=(v:string)=>[...v.matchAll(/\b(\d+(?:\.\d+)?)\s*ft\b/g)].map(m=>m[1])
  const al=lengths(a),bl=lengths(b)
  if(al.length&&bl.length&&!al.some(n=>bl.includes(n)))return 0
  const numbers=(v:string)=>new Set(v.match(/\b\d+(?:\.\d+)?\b/g)||[])
  const an=numbers(a),bn=numbers(b),shared=[...an].filter(n=>bn.has(n)).length
  if(!shared&&fa!=="adhesive"&&fa!=="blade"&&fa!=="nails")return 0
  return shared + (al.some(n=>bl.includes(n))?4:0)+(Number(line.quantity)===Number(item.quantity)?4:0)+(section(a)&&section(a)===section(b)?4:0)
}

/** Display-only candidates, never approved matches, bids, availability or selections. */
export function receivedProductPriceRows(items: QuoteComparisonItemRecord[], quotes: ReceivedSupplierQuote[]) {
  const matches=quotes.map(quote=>new Map(matchSupplierQuoteItems((quote.sourceItems??[]).map(line=>({...line,id:`${quote.id}:${line.line_number}`,specification:line.specification||""})),items).map(pair=>[pair.comparisonItem.id,pair.item])))
  const rows = items.map(item=>({item,cells:quotes.map((quote,index)=>{
    const matched=matches[index].get(item.id)
    if(matched&&candidateScore(matched,item)>0)return {quote,lines:[matched],suggested:true}
    const ranked=(quote.sourceItems??[]).map(line=>({line,score:candidateScore(line,item)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score)
    // Ties are visible, not broken by PDF order or silently approved.
    const lines=ranked.filter(x=>x.score===ranked[0]?.score).map(x=>x.line)
    return {quote,lines,suggested:lines.length===1}
  })}))
  // A candidate can remain visible in multiple places, but must never masquerade
  // as coverage of two separate requested rows. Resolve the source allocation first.
  const uses = new Map<string, number>()
  for (const row of rows) for (const cell of row.cells) for (const line of cell.lines) {
    const key = `${cell.quote.id}:${line.line_number}`
    uses.set(key, (uses.get(key) || 0) + 1)
  }
  return rows.map(row => ({ ...row, cells: row.cells.map(cell => {
    const sharedSource = cell.lines.some(line => (uses.get(`${cell.quote.id}:${line.line_number}`) || 0) > 1)
    const reasons = cell.lines.length === 1 ? sourceComparisonReasons(row.item, cell.lines[0]) : []
    if (sharedSource) reasons.unshift("This source line also appears against another requested row; assign it once.")
    if (cell.lines.length > 1) reasons.unshift("More than one supplier line could fit; choose the correct source line.")
    return { ...cell, suggested: cell.suggested && !sharedSource, reasons, sharedSource }
  }) }))
}

export function sourceComparisonReasons(item: QuoteComparisonItemRecord, line: ReceivedSupplierQuoteLine): string[] {
  const reasons: string[] = []
  const requested = text(`${item.description} ${item.specification || ""}`)
  const quoted = text(`${line.description} ${line.specification || ""}`)
  if (Number(item.quantity) !== Number(line.quantity)) reasons.push(`Quantity: requested ${item.quantity} ${item.unit}; quoted ${line.quantity} ${line.unit}.`)
  const unit = (v:string) => v.toLowerCase().replace(/^(?:pc|pcs|piece|pieces|ea)$/, "each")
  if (unit(item.unit || "") !== unit(line.unit || "") || /box|pack|carton|bundle/i.test(`${item.unit} ${line.unit}`)) reasons.push("Confirm selling unit and package contents before calculating the requested quantity.")
  if (/plywood|\bcdx\b/.test(requested) && /\bosb\b/.test(quoted)) reasons.push("OSB is offered against plywood; material substitution needs a decision.")
  const mount = (v:string) => /top (?:mount|flange)/.test(v) ? "top" : /face mount/.test(v) ? "face" : null
  if (mount(requested) && mount(quoted) && mount(requested) !== mount(quoted)) reasons.push(`Mount differs: requested ${mount(requested)}, quoted ${mount(quoted)}.`)
  if (family(requested) === "hanger") reasons.push("Confirm hanger compatibility; matching the mount alone is not engineering approval.")
  if (/\btji\b/.test(requested) && !/\btji\b/.test(quoted)) reasons.push("Different joist manufacturer/series; keep as an alternative until approved.")
  if (/pl premium/.test(requested) && !/pl premium/.test(quoted)) reasons.push("Adhesive product differs from requested PL Premium.")
  if (!reasons.length) reasons.push("Source line located; verify dimensions, grade and specification before approval.")
  return reasons
}
