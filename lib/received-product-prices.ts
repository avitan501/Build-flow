import type { ReceivedSupplierQuote, ReceivedSupplierQuoteLine } from "@/components/buildflow/received-supplier-quote-table"
import type { QuoteComparisonItemRecord } from "@/lib/quote-comparison"
import { comparisonDepthInches } from "@/lib/material-nominal-dimensions"
import { normalizeMeasurementText } from '@/lib/material-measurement-text'

function text(value: string) { return normalizeMeasurementText(value).toLowerCase().replace(/×/g,"x").replace(/\b2\s*x\s*(\d+)\s*(?:x|-)\s*(\d+)\b/g,"2 x $1 $2 ft").replace(/(\d)x(?=\d)/g,"$1 x ").replace(/['′]/g," ft ").replace(/["″]/g," in ").replace(/\b(?:feet|foot)\b/g,"ft").replace(/\b(?:inch|inches)\b/g,"in").replace(/[^a-z0-9./]+/g," ").trim() }
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
function sheetDimensions(value:string) {
  const v=text(value),match=v.match(/\b(\d+(?:\.\d+)?)\s*(ft|in)?\s*x\s*(\d+(?:\.\d+)?)\s*(ft|in)?\b/)
  if(match){const unit=match[4]||match[2]||'ft';return [Number(match[1])/(match[2]==='in'||!match[2]&&unit==='in'?12:1),Number(match[3])/(unit==='in'?12:1)].sort((a,b)=>a-b)}
  const explicit=[...v.matchAll(/\b(\d+(?:\.\d+)?)\s*ft\b/g)].map(m=>Number(m[1]))
  return explicit.length===2?explicit.sort((a,b)=>a-b):null
}
function family(value: string) {
  const v=text(value)
  for(const [name,pattern] of [["nails",/nails?\b|\bnl\b|coil.*wire|wire.*coil|jst.*h(?:ng)?r.*(?:33deg|3m)/],["hanger",/hanger|face mount|top mount|\bhgr\b|\b(?:hu|huc|ius|iut)\d/],["joist",/tji|ni.?40|pwi|pwt|i.?joist/],["lvl",/\blvl\b|laminated veneer/],["plywood",/plywood|plyscord|\bcdx\b|\bosb\b|edge gold/],["blade",/blades?\b|\bbld\b|sawzall|recip/],["adhesive",/glue|adhes(?:ive)?\b|provan/],["lumber",/lumber|douglas fir|\bspf\b|\b2\s*x\s*\d+/]] as const) if(pattern.test(v))return name
  return null
}
function requestedLinearPrice(line:CandidateLine,item:QuoteComparisonItemRecord):CandidateLine {
 if(!/^(?:lin\.?\s*ft\.?|lf|lft|linear feet)$/i.test(line.unit.trim())||!['each','ea','pc','pcs','piece','pieces'].includes(item.unit.toLowerCase()))return line
 const length=lengths(text(`${item.description} ${item.specification||''}`))
 if(!Number.isFinite(Number(line.quantity))||Number(line.quantity)<=0||!Number.isFinite(Number(line.line_total))||Math.abs(Number(line.quantity)*Number(line.unit_price)-Number(line.line_total))>0.05)return line
 if(length.length!==1||Number(length[0])<=0||Number(item.quantity)<=0||line.unit_price===null||!Number.isFinite(Number(line.unit_price))||Number(line.unit_price)<0)return line
 return {...line,unit:item.unit,quantity:item.quantity,unit_price:Number(line.unit_price)*Number(length[0]),line_total:Number(line.unit_price)*Number(length[0])*Number(item.quantity),calculatedRate:Number(line.unit_price),requestedFeet:Number(length[0])*Number(item.quantity),originalFeet:Number(line.quantity),allocationKey:`${line.line_number}:rate:${item.id}`}
}
/** Explicit supplier replacement note, not a guessed cross-family equivalence. */
function declaredLumberReplacement(line:ReceivedSupplierQuoteLine,item:QuoteComparisonItemRecord){
 const a=text(`${line.description} ${line.specification||''}`),b=text(`${item.description} ${item.specification||''}`)
 if(family(a)!=='lvl'||family(b)!=='lumber')return false
 const dimension=b.match(/\b2\s*x\s*(\d+)\b/)
 if(!dimension)return false
 const note=a.match(/\blongest\s+2\s*x\s*(\d+)\s+(?:we\s+)?stock(?:ed)?\s+is\s+(\d+(?:\.\d+)?)\s*ft\b/)
 const requested=lengths(b),quoted=lengths(text(line.description))
 return Boolean(note&&note[1]===dimension[1]&&requested.length===1&&quoted.includes(requested[0])&&Number(requested[0])>Number(note[2])&&Number(line.quantity)===Number(item.quantity))
}
function candidateScore(line: ReceivedSupplierQuoteLine, item: QuoteComparisonItemRecord) {
  const sourceSpec=(line.specification||"").split(" · Source pricing:")[0].split(" · Printed Sale/Un:")[0]
  // A bulk LF rate without a balanced printed cut schedule is not a piece price.
  if (/^(?:lin\.?\s*ft\.?|lf|lft|linear feet)$/i.test(line.unit.trim()) && !/^(?:lin\.?\s*ft\.?|lf|lft|linear feet)$/i.test(item.unit.trim())) return 0
  const a=text(`${line.description} ${sourceSpec}`), b=text(`${item.description} ${item.specification||""}`)
  const fa=family(a),fb=family(b);if(!fa||fa!==fb)return declaredLumberReplacement(line,item)?10:0
  if(fa==="lumber") {
    const dimension=(v:string)=>v.match(/\b2\s*x\s*(\d+)\b/)?.[1]
    if(dimension(a)&&dimension(b)&&dimension(a)!==dimension(b))return 0
  }
  const al=lengths(a),bl=lengths(b)
  // Sheet width/height are not linear-stock lengths (4' x 8 versus 4 x 8 ft).
  if(fa!=="plywood"&&al.length&&bl.length&&!al.some(n=>bl.includes(n)))return 0
  const numbers=(v:string)=>new Set(v.match(/\b\d+(?:\.\d+)?\b/g)||[])
  const an=numbers(a),bn=numbers(b),shared=[...an].filter(n=>bn.has(n)).length
  if(!shared&&line.calculatedRate===undefined&&!["adhesive","blade","nails","hanger"].includes(fa))return 0
  const sa=fa==='plywood'?sheetDimensions(a):null,sb=fa==='plywood'?sheetDimensions(b):null
  return 1+shared + (sa&&sb&&sa.join('x')===sb.join('x')?4:0)+(fa!=="plywood"&&al.some(n=>bl.includes(n))?4:0)+(Number(line.quantity)===Number(item.quantity)?4:0)+(section(a)&&section(a)===section(b)?4:0)
}

/** Display-only candidates, never approved matches, bids, availability or selections. */
export function receivedProductPriceRows(items: QuoteComparisonItemRecord[], quotes: ReceivedSupplierQuote[]) {
  const candidates=quotes.map(quote=>(quote.sourceItems??[]).flatMap(expandPrintedCuts))
  const rows = items.map(item=>({item,cells:quotes.map((quote,index)=>{
    // Rank all candidates by the same evidence rules; a routing hint must not
    // override a stronger dimensional, quantity or section match.
    const blockedLines=candidates[index].filter(line=>line.comparison_item_id!==item.id&&items.some(target=>target.id===line.comparison_item_id)&&candidateScore(requestedLinearPrice(line,item),item)>0)
    const available=candidates[index].filter(line=>!line.comparison_item_id||!items.some(target=>target.id===line.comparison_item_id)||line.comparison_item_id===item.id).map(line=>requestedLinearPrice(line,item)).map(line=>({line,score:candidateScore(line,item)})).filter(x=>x.score>0)
    const assigned=available.filter(x=>x.line.comparison_item_id===item.id)
    const sectionConflict=(line:ReceivedSupplierQuoteLine)=>{const a=section(`${line.description} ${line.specification||''}`),b=section(`${item.description} ${item.specification||''}`);return Boolean(a&&b&&a!==b)}
    const sameSection=available.filter(x=>!sectionConflict(x.line))
    const ranked=(assigned.length?assigned:sameSection.length?sameSection:available).sort((a,b)=>b.score-a.score)
    // Ties are visible, not broken by PDF order or silently approved.
    const lines=ranked.filter(x=>x.score===ranked[0]?.score).map(x=>x.line)
    return {quote,lines,blockedLines,suggested:lines.length===1}
  })}))
  // A candidate can remain visible in multiple places, but must never masquerade
  // as coverage of two separate requested rows. Resolve the source allocation first.
  const uses = new Map<string, number>()
  const feetUsed=new Map<string,number>()
  for (const row of rows) for (const cell of row.cells) for (const line of cell.lines) {
    const key = `${cell.quote.id}:${line.allocationKey || line.line_number}`
    uses.set(key, (uses.get(key) || 0) + 1)
    if(line.calculatedRate!==undefined){const rateKey=`${cell.quote.id}:${line.line_number}`;feetUsed.set(rateKey,(feetUsed.get(rateKey)||0)+(line.requestedFeet||0))}
  }
  return rows.map(row => ({ ...row, cells: row.cells.map(cell => {
    const sharedSource = cell.lines.some(line => (uses.get(`${cell.quote.id}:${line.allocationKey || line.line_number}`) || 0) > 1)
    const reasons = cell.lines.length === 1 ? sourceComparisonReasons(row.item, cell.lines[0]) : []
    if(!cell.lines.length&&cell.blockedLines.length)reasons.push('A possible supplier line is already assigned to another requested item. No offer is allocated here; do not count the same supply twice.')
    if (sharedSource) reasons.unshift("This source line also appears against another requested row; assign it once.")
    if (cell.lines.length > 1) reasons.unshift("More than one supplier line could fit; choose the correct source line.")
    for(const line of cell.lines)if(line.calculatedRate!==undefined){reasons.push('Calculated from linear-foot rate; confirm requested cut lengths, availability and any cutting charges before approval.');if((feetUsed.get(`${cell.quote.id}:${line.line_number}`)||0)>(line.originalFeet||0))reasons.push('Requested linear footage across candidate rows exceeds quoted footage; confirm additional supply before approval.')}
    return { ...cell, suggested: cell.suggested && !sharedSource && !reasons.some(r=>r.startsWith('Section differs:')||r.startsWith('Explicit supplier substitution:')), reasons, sharedSource }
  }) }))
}

export function sourceComparisonReasons(item: QuoteComparisonItemRecord, line: ReceivedSupplierQuoteLine): string[] {
  const reasons: string[] = []
  const requested = text(`${item.description} ${item.specification || ""}`)
  const quoted = text(`${line.description} ${line.specification || ""}`)
  if(section(requested)&&section(quoted)&&section(requested)!==section(quoted))reasons.push(`Section differs: requested ${section(requested)}; quoted ${section(quoted)}. Confirm allocation; not an approved match.`)
  if (Number(item.quantity) !== Number(line.quantity)) reasons.push(`Quantity: requested ${item.quantity} ${item.unit}; quoted ${line.quantity} ${line.unit}.`)
  const unit = (v:string) => v.toLowerCase().replace(/^(?:pc|pcs|piece|pieces|ea)$/, "each")
  if (unit(item.unit || "") !== unit(line.unit || "") || /box|pack|carton|bundle/i.test(`${item.unit} ${line.unit}`)) reasons.push("Confirm selling unit and package contents before calculating the requested quantity.")
  if (/plywood|\bcdx\b/.test(requested) && /\bosb\b/.test(quoted)) reasons.push("OSB is offered against plywood; material substitution needs a decision.")
  const mount = (v:string) => /top (?:mount|flange)/.test(v) ? "top" : /face mount/.test(v) ? "face" : null
  if (mount(requested) && mount(quoted) && mount(requested) !== mount(quoted)) reasons.push(`Mount differs: requested ${mount(requested)}, quoted ${mount(quoted)}.`)
  if (family(requested)==="joist" && /\btji\b/.test(requested) && !/\btji\b/.test(quoted)) reasons.push("Different joist manufacturer/series; keep as an alternative until approved.")
  if (family(requested)==="adhesive" && /\bpl\b.*(?:strong )?premium/.test(requested) && !/pl premium/.test(quoted)) reasons.push("Adhesive product differs from requested PL Premium.")
  if(declaredLumberReplacement(line,item))reasons.push('Explicit supplier substitution: LVL offered instead of requested dimensional lumber. Supplier states the requested stock length is unavailable; approval is required.')
  return reasons
}

export type ComparisonIndicator = {kind:"quantity"|"measurement"|"alternative"|"packaging"|"unverified";label:string;notes:string[]}
const sellingUnit=(value:string)=>value.trim().toLowerCase().replace(/^(?:pc|pcs|piece|pieces|ea)$/, "each")
function inches(value:string, sheet=false) {
  // In plywood notation "4 x 8 3/4\"", 8 is the sheet length,
  // not the whole-number portion of an 8-3/4-inch thickness.
  const normalized=normalizeMeasurementText(value)
  const dimensionless=sheet?normalized.replace(/\b\d+(?:\.\d+)?\s*(?:ft)?\s*[x×]\s*\d+(?:\.\d+)?\s*(?:ft)?(?=\s|$)/gi,' '):normalized
  const fractions=dimensionless.toLowerCase().replace(/(\d+)[ -]+(\d+)\/(\d+)/g,(_,whole,n,d)=>String(Number(whole)+Number(n)/Number(d))).replace(/\b(\d+)\/(\d+)\b/g,(_,n,d)=>String(Number(n)/Number(d)))
  return [...text(fractions).matchAll(/\b(\d+(?:\.\d+)?)\s*in\b/g)].map(m=>Number(m[1]))
}
/** UI classification does not change source prices, approvals or matching eligibility. */
export function comparisonIndicators(item:QuoteComparisonItemRecord,lines:ReceivedSupplierQuoteLine[],reasons:string[]):ComparisonIndicator[] {
  const indicators:ComparisonIndicator[]=[]
  const packageQuestion=reasons.some(r=>r.startsWith('Confirm selling unit'))
  const comparable=lines.length===1&&sellingUnit(item.unit)===sellingUnit(lines[0].unit)&&!packageQuestion
  const quantity=reasons.filter(r=>r.startsWith('Quantity:'))
  if(comparable&&quantity.length)indicators.push({kind:'quantity',label:'Qty · כמות',notes:quantity})
  if(packageQuestion)indicators.push({kind:'packaging',label:'Units · אריזה',notes:[...quantity,...reasons.filter(r=>r.startsWith('Confirm selling unit'))]})
  const measurements:string[]=[]
  const missingMeasurements:string[]=[]
  if(lines.length===1){
    const a=lengths(text(`${item.description} ${item.specification||''}`)),b=lengths(text(`${lines[0].description} ${(lines[0].specification||'').split(' · Source pricing:')[0]}`))
    if(family(`${item.description} ${item.specification||''}`)!=='plywood'&&a.length&&b.length&&!a.some(n=>b.includes(n)))measurements.push(`Length differs: requested ${a.join('/')} ft; quoted ${b.join('/')} ft.`)
    const category=family(`${item.description} ${item.specification||''}`)
    const requested=inches(`${item.description} ${item.specification||''}`,category==='plywood'),quoted=inches(`${lines[0].description} ${(lines[0].specification||'').split(' · Source pricing:')[0]}`,category==='plywood')
    if(requested.length&&quoted.length){
      const requestContext=`${item.description} ${item.specification||''}`,quoteContext=`${lines[0].description} ${lines[0].specification||''}`
      const exactPanel=category==='plywood'&&/\b(?:actual|exact|minimum)\b/i.test(`${requestContext} ${quoteContext}`)
      const dimension=(n:number,context:string)=>exactPanel?n:comparisonDepthInches(category,n,context)
      const unmatched=[...new Set(requested)].filter(n=>!quoted.some(q=>Math.abs(dimension(n,requestContext)-dimension(q,quoteContext))<0.001))
      if(unmatched.length){
        const matched=requested.some(n=>quoted.some(q=>Math.abs(dimension(n,requestContext)-dimension(q,quoteContext))<0.001))
        if(matched&&new Set(quoted).size<new Set(requested).size)missingMeasurements.push(`Measurement missing: requested ${unmatched.join('/')} in is not specified in the supplier line. Confirm the omitted dimensions; matching notation is not a complete product verification.`)
        else measurements.push(`Measurement differs: requested ${unmatched.join('/')} in; quoted ${[...new Set(quoted)].join('/')} in. Verify the source dimensions.`)
      }
    }
    if(category==='plywood'){
      const requestedSheet=sheetDimensions(`${item.description} ${item.specification||''}`),quotedSheet=sheetDimensions(`${lines[0].description} ${lines[0].specification||''}`)
      if(requestedSheet&&quotedSheet&&requestedSheet.join('x')!==quotedSheet.join('x'))measurements.push(`Sheet dimensions differ: requested ${requestedSheet.join(' × ')}; quoted ${quotedSheet.join(' × ')}. Verify units in the source.`)
    }
  }
  if(measurements.length)indicators.push({kind:'measurement',label:'Size · מידה',notes:measurements})
  const alternatives=reasons.filter(r=>/substitution|Different joist|Mount differs|Adhesive product differs/.test(r))
  if(alternatives.length)indicators.push({kind:'alternative',label:'Alternative · חלופה',notes:alternatives})
  const unresolved=reasons.filter(r=>!alternatives.includes(r)&&!r.startsWith('Confirm selling unit')&&!((comparable||packageQuestion)&&quantity.includes(r)))
  indicators.push({kind:'unverified',label:'Unverified · לא אומת',notes:['Not fully manually verified. Check specifications, selling units and compatibility before approval.',...missingMeasurements,...unresolved]})
  return indicators
}
