type SourceItem={id:string;metadata:Record<string,unknown>|null}
type OriginalLine={text:string;index:number;section:string}
function key(text:string){
  const numbers=(text.match(/\d+(?:\.\d+)?/g)||[]).join('|')
  return numbers+' :: '+text.toLowerCase().normalize('NFKC').replace(/[×]/g,'x').replace(/(\d)\s*x\s*(?=\d)/g,'$1 x ').replace(/(\d)\s*(inch|inches|in|ft)\b/g,'$1 $2').replace(/[—–]/g,' ').replace(/[^a-z0-9/]+/g,' ').split(/\s+/).filter(token=>token&&!['pc','pcs','piece','pieces','inch','inches','in','ft','by','for','series'].includes(token)).map(token=>token==='blades'?'blade':token).sort().join(' ')
}
function originalLines(source:SourceItem):OriginalLine[]{
  let section='';let index=0
  return String(source.metadata?.request_details||'').split(/\r?\n/).flatMap(text=>{
    if(!/^\s*\d/.test(text)){if(/first floor|second floor|ceiling joists/i.test(text))section=text.toLowerCase().replace(/[^a-z ]/g,'').trim();return[]}
    return[{text,index:index++,section}]
  })
}
function compatibleUnits(original:string,snippet:string){
  const units=(text:string)=>new Map(Array.from(text.matchAll(/\d+(?:\.\d+)?\s*(inches|inch|in|ft)\b/gi)).map(match=>[(text.slice(0,match.index).match(/\d+(?:\.\d+)?/g)||[]).length,match[1].toLowerCase()==='ft'?'ft':'in'] as const))
  const a=units(original),b=units(snippet)
  return Array.from(a).every(([position,unit])=>!b.has(position)||b.get(position)===unit)
}
/** Historical AI snippets are not originals. Only a unique source-backed match is shown. */
export function requestOriginalLine(item:SourceItem,source:SourceItem|null):OriginalLine|null{
  const snippet=String(item.metadata?.source_text||'')
  if(!source)return snippet?{text:snippet,index:Number.MAX_SAFE_INTEGER,section:''}:null
  const lines=originalLines(source)
  const matches=lines.filter(line=>key(line.text)===key(snippet)&&compatibleUnits(line.text,snippet))
  const fields=Array.isArray(item.metadata?.request_item_fields)?item.metadata.request_item_fields:[]
  const section=fields.find(field=>field&&typeof field==='object'&&'id'in field&&field.id==='custom-section')
  const sectionValue=section&&typeof section==='object'&&'value'in section?String(section.value).toLowerCase().trim():''
  const scoped=sectionValue?matches.filter(line=>line.section===sectionValue):matches
  if(scoped.length===1)return scoped[0]
  // Chunk/AI occurrence is NOT a document line number; never use it to break an ambiguity.
  return null
}
export function orderRequestOriginalItems<T extends SourceItem>(products:T[],allItems:SourceItem[]):T[]{
  const sources=new Map(allItems.map(item=>[item.id,item]))
  const sourceOrder=new Map(products.map(item=>String(item.metadata?.source_item_id||item.id)).map((id,index)=>[id,index] as const).reverse())
  return products.map((item,index)=>({item,index,sourceId:String(item.metadata?.source_item_id||''),line:requestOriginalLine(item,sources.get(String(item.metadata?.source_item_id||''))??null)})).sort((a,b)=>{
    if(a.sourceId!==b.sourceId)return (sourceOrder.get(a.sourceId||a.item.id)??a.index)-(sourceOrder.get(b.sourceId||b.item.id)??b.index)
    return (a.line?.index??Number.MAX_SAFE_INTEGER)-(b.line?.index??Number.MAX_SAFE_INTEGER)||a.index-b.index
  }).map(entry=>entry.item)
}
