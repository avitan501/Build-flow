import type { ReceivedSupplierQuote, ReceivedSupplierQuoteLine } from "@/components/buildflow/received-supplier-quote-table"
import type { QuoteComparisonItemRecord } from "@/lib/quote-comparison"

function text(value: string) { return value.toLowerCase().replace(/×/g,"x").replace(/\b2\s*x\s*(\d+)\s*(?:x|-)\s*(\d+)\b/g,"2 x $1 $2 ft").replace(/(\d)x(?=\d)/g,"$1 x ").replace(/['′]/g," ft ").replace(/["″]/g," in ").replace(/\b(?:feet|foot)\b/g,"ft").replace(/\b(?:inch|inches)\b/g,"in").replace(/[^a-z0-9./]+/g," ").trim() }
function section(value: string) { return text(value).replace(/\b1st\b/g,"first").replace(/\b2nd\b/g,"second").replace(/\b3rd\b/g,"third").match(/\b(first floor|second floor|third floor|ceiling joists?)\b/)?.[0]?.replace(/joists$/, "joist") }
type CandidateLine = ReceivedSupplierQuoteLine & { allocationKey?: string }

/** Cut schedules are evidence, not guessed allocations. Originals remain untouched. */
export function expandPrintedCuts(line: ReceivedSupplierQuoteLine): CandidateLine[] {
  if (!/^(?:lin\.?\s*ft\.?|lf|lft|linear feet)$/i.test(line.unit.trim())) return [line]
  if ([line.quantity,line.unit_price,line.line_total].some(value=>value===null||value===undefined||!Number.isFinite(Number(value)))) return [line]
  const schedule = (line.specification || "").match(/(?:sizes listed|notes?):\s*((?:\d+\s*\/\s*\d+(?:\s+|$))+)/i)?.[1]
  if (!schedule) return [line]
  const cuts = [...schedule.matchAll(/(\d+)\s*\/\s*(\d+)/g)].map(m => ({ quantity:Number(m[1]), length:Number(m[2]) }))
  const keys = cuts.map(c => `${c.quantity}/${c.length}`)
  const feet = cuts.reduce((sum,c) => sum+c.quantity*c.length,0)
  if (!cuts.length || new Set(keys).size !== cuts.length || cuts.some(c=>c.quantity<=0||c.length<=0) || Math.abs(feet-Number(line.quantity))>0.001 || !Number.isFinite(Number(line.unit_price)) || Number(line.unit_price)<0 || Math.abs(Number(line.line_total)-feet*Number(line.unit_price))>0.05) return [line]
  return cuts.map(c => ({...line,quantity:c.quantity,unit:"each",unit_price:Number(line.unit_price)*c.length,line_total:c.quantity*c.length*Number(line.unit_price),allocationKey:`${line.line_number}:${c.quantity}/${c.length}`,specification:`${line.specification} · Length: ${c.length} ft · Source pricing: printed cut ${c.quantity}/${c.length}; ${line.quantity} ${line.unit} at ${line.unit_price}; derived piece price`}))
}
function lengths(value:string) {
  const explicit=[...value.matchAll(/\b(\d+(?:\.\d+)?)\s*ft\b/g)].map(m=>m[1])
  const encoded=[...value.matchAll(/\b2\s*x\s*\d+\s*(?:x|-)\s*(\d+)\b/g)].map(m=>m[1])
  return [...new Set([...explicit,...encoded])]
}
function family(value: string) {
  const v=text(value)
  for(const [name,pattern] of [["nails",/nails?\b/],["hanger",/hanger|face mount|top mount/],["joist",/tji|ni.?40|pwi|pwt|i.?joist/],["lvl",/\blvl\b|laminated veneer/],["plywood",/plywood|\bcdx\b|\bosb\b|edge gold/],["blade",/blades?\b|sawzall/],["adhesive",/glue|adhesive|provan/],["lumber",/lumber|douglas fir|\bspf\b|\b2\s*x\s*\d+/]] as const) if(pattern.test(v))return name
  return null
}
function candidateScore(line: ReceivedSupplierQuoteLine, item: QuoteComparisonItemRecord) {
  const sourceSpec=(line.specification||"").split(" · Source pricing:")[0].split(" · Printed Sale/Un:")[0]
  // A bulk LF rate without a balanced printed cut schedule is not a piece price.
  if (/^(?:lin\.?\s*ft\.?|lf|lft|linear feet)$/i.test(line.unit.trim()) && !/^(?:lin\.?\s*ft\.?|lf|lft|linear feet)$/i.test(item.unit.trim())) return 0
  const a=text(`${line.description} ${sourceSpec}`), b=text(`${item.description} ${item.specification||""}`)
  if(section(a)&&section(b)&&section(a)!==section(b))return 0
  const fa=family(a),fb=family(b);if(!fa||fa!==fb)return 0
  if(fa==="lumber") {
    const dimension=(v:string)=>v.match(/\b2\s*x\s*(\d+)\b/)?.[1]
    if(dimension(a)&&dimension(b)&&dimension(a)!==dimension(b))return 0
  }
  const al=lengths(a),bl=lengths(b)
  if(al.length&&bl.length&&!al.some(n=>bl.includes(n)))return 0
  const numbers=(v:string)=>new Set(v.match(/\b\d+(?:\.\d+)?\b/g)||[])
  const an=numbers(a),bn=numbers(b),shared=[...an].filter(n=>bn.has(n)).length
  if(!shared&&fa!=="adhesive"&&fa!=="blade"&&fa!=="nails")return 0
  return shared + (al.some(n=>bl.includes(n))?4:0)+(Number(line.quantity)===Number(item.quantity)?4:0)+(section(a)&&section(a)===section(b)?4:0)
}

/** Display-only candidates, never approved matches, bids, availability or selections. */
export function receivedProductPriceRows(items: QuoteComparisonItemRecord[], quotes: ReceivedSupplierQuote[]) {
  const candidates=quotes.map(quote=>(quote.sourceItems??[]).flatMap(expandPrintedCuts))
  const rows = items.map(item=>({item,cells:quotes.map((quote,index)=>{
    // Rank all candidates by the same evidence rules; a routing hint must not
    // override a stronger dimensional, quantity or section match.
    const ranked=candidates[index].map(line=>({line,score:candidateScore(line,item)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score)
    // Ties are visible, not broken by PDF order or silently approved.
    const lines=ranked.filter(x=>x.score===ranked[0]?.score).map(x=>x.line)
    return {quote,lines,suggested:lines.length===1}
  })}))
  // A candidate can remain visible in multiple places, but must never masquerade
  // as coverage of two separate requested rows. Resolve the source allocation first.
  const uses = new Map<string, number>()
  for (const row of rows) for (const cell of row.cells) for (const line of cell.lines) {
    const key = `${cell.quote.id}:${line.allocationKey || line.line_number}`
    uses.set(key, (uses.get(key) || 0) + 1)
  }
  return rows.map(row => ({ ...row, cells: row.cells.map(cell => {
    const sharedSource = cell.lines.some(line => (uses.get(`${cell.quote.id}:${line.allocationKey || line.line_number}`) || 0) > 1)
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
  if (/\btji\b/.test(requested) && !/\btji\b/.test(quoted)) reasons.push("Different joist manufacturer/series; keep as an alternative until approved.")
  if (/pl premium/.test(requested) && !/pl premium/.test(quoted)) reasons.push("Adhesive product differs from requested PL Premium.")
  return reasons
}
