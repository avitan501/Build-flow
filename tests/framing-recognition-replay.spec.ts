import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { validateRecognizedRows } from '../lib/material-row-recognition'
import { receivedProductPriceRows } from '../lib/received-product-prices'
import { requestItemSpecification } from '../lib/supplier-quote-routing'
import type { QuoteComparisonItemRecord } from '../lib/quote-comparison'

test('separate width/depth retain comparison dimensions',()=>{
 expect(requestItemSpecification({request_item_fields:[{id:'width',label:'Width',value:'2 in'},{id:'depth',label:'Depth',value:'6 in'},{id:'length',label:'Length',value:'16 ft'}]},'Framing')).toContain('2 x 6 in')
})
test('replay real 39-row AI output through sequential three supplier snapshots without mutations',async()=>{
 test.skip(!process.env.FRAMING_REPLAY_DIR,'Private fixtures are opt-in, never committed')
 const read=async(name:string)=>JSON.parse(await readFile(join(process.env.FRAMING_REPLAY_DIR!,name),'utf8'))
 const fixture=await read('framing-full-test-results.json')
 const actual=await read('framing-live-recognition-result.json')
 const raw=actual.rows?{rows:actual.rows}:JSON.parse(actual.output.flatMap((p:{content?:{type:string;text:string}[]})=>p.content||[]).filter((p:{type:string})=>p.type==='output_text').map((p:{text:string})=>p.text).join(''))
 const sources=fixture.requested.map((r:{id:string;source:string;section:string})=>({id:r.id,text:r.source,section:r.section}))
 const before=JSON.stringify(fixture)
 const recognized=validateRecognizedRows(raw,sources,{tjiTenIsNineHalf:true})
 expect(recognized).toHaveLength(39)
 const items=recognized.map((r,index)=>({id:r.id,description:r.name,quantity:r.quantity!,unit:r.unit,specification:requestItemSpecification({request_item_fields:[{id:'width',label:'Width',value:r.width},{id:'depth',label:'Depth',value:r.depth},{id:'length',label:'Length',value:r.length},{id:'model',label:'Model',value:r.model},{id:'section',label:'Section',value:sources[index].section}],request_details:r.details},'Framing')} as QuoteComparisonItemRecord))
 type Line={line:number;description:string;spec:string;qty:number;unit:string;price:number;total:number}
 const quotes=fixture.quotes.map((q:{id:string;name:string;file:string;items:Line[]})=>({id:q.id,fileName:q.file,supplierName:q.name,sourceItems:q.items.map(l=>({line_number:l.line,description:l.description,specification:l.spec,quantity:l.qty,unit:l.unit,unit_price:l.price,line_total:l.total}))}))
 for(let count=1;count<=3;count++){
   const rows=receivedProductPriceRows(items,quotes.slice(0,count))
   expect(rows).toHaveLength(39)
   for(const row of rows){expect(row.cells).toHaveLength(count);for(const cell of row.cells){if(cell.sharedSource)expect(cell.suggested).toBe(false)}}
 }
 for(const row of recognized)expect(row.quantity).toBe(fixture.requested.find((r:{id:string})=>r.id===row.id).qty)
 expect(JSON.stringify(fixture)).toBe(before)
 console.log(JSON.stringify({sourceRows:39,supplierColumns:3,scope:'saved actual AI + sequential snapshot replay, NOT upload or persistence',questionRows:recognized.filter(r=>r.questions.length).length}))
})
