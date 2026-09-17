import type { RequestItemField } from "./request-item-fields"

const logistics = /^(?:shipping|delivery-address|delivery_address|shipping-delivery|price-requirements)$/

/** Presentation only: retain delivery data on the request, outside material specifications. */
export function materialCleanLine(input: { name: string; quantity: string | number; unit: string; fields: RequestItemField[]; details: string }) {
  const omitted = input.fields.filter(f => logistics.test(f.id) || /^delivery address$/i.test(f.label))
  const details = input.details.split(/\s*[·\n]\s*/).filter(part => !omitted.some(f => part === f.value || part === `${f.label}: ${f.value}`))
  const measurement=(id:string)=>input.fields.find(f=>f.id===id)?.value.match(/^\s*(\d+(?:\.\d+)?)\s*(in|ft)\s*$/i)
  const width=measurement('width'),depth=measurement('depth')
  let name=input.name
  const escape=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
  const pair=width&&depth&&width[2].toLowerCase()===depth[2].toLowerCase()?new RegExp(`\\b${escape(width[1])}\\s*[x×]\\s*${escape(depth[1])}(?![\\d.])(?:\\s*(in|ft)\\b)?`,'i'):null
  const embedded=pair?.exec(name)
  const dimensionsCovered=Boolean(embedded&&(!embedded[1]||embedded[1].toLowerCase()===width![2].toLowerCase()))
  if(dimensionsCovered&&!embedded![1])name=name.replace(pair!,match=>`${match} ${width![2]}`)
  const canonical=(text:string)=>text.toLowerCase().replace(/(\d+)[ -]+(\d+)\/(\d+)/g,(_,whole,n,d)=>String(Number(whole)+Number(n)/Number(d))).replace(/\b(\d+)\/(\d+)\b/g,(_,n,d)=>String(Number(n)/Number(d))).replace(/(\d)\s*(ft|inches|inch|in)\b/g,'$1 $2').replace(/\b(?:series)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')
  const nameKey=` ${canonical(name)} `
  const order=['model','thickness','width','depth','length','dimensions','size','type','material','grade','section']
  const fields=input.fields.filter(f=>!f.id.startsWith('clarify-')&&!omitted.includes(f)&&!(dimensionsCovered&&['width','depth'].includes(f.id))&&!(['model','length','type','material'].includes(f.id)&&canonical(f.value)&&nameKey.includes(` ${canonical(f.value)} `))).sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):8)-(order.includes(b.id)?order.indexOf(b.id):8))
  const location=(v:string)=>/^(?:first floor|second floor|third floor|ceiling joists?)$/i.test(v.trim())
  const values=[...fields.map(f=>f.value),...details]
  const seen=new Set<string>()
  return [
    `${input.quantity} ${input.unit}`.trim(), name,
    ...values.filter(v=>!location(v)),
    ...values.filter(location),
  ].filter(Boolean).filter(value=>{const key=canonical(value);if(seen.has(key))return false;seen.add(key);return true}).join(" · ")
}
