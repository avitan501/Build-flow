import {test,expect} from '@playwright/test'
import {comparisonQuoteColumns,quoteDuplicateKey} from '../lib/comparison-quote-columns'
test('identical source entries share a display column without removing their originals',()=>{
 const line={line_number:1,description:'Lumber',specification:'',quantity:2,unit:'each',unit_price:10,line_total:20,comparison_item_id:null}
 const quotes=[{id:'a',fileName:'q.pdf',duplicateKey:'same',sourceItems:[line]},{id:'b',fileName:'q.pdf',duplicateKey:'same',sourceItems:[{...line}]}]
 const before=JSON.stringify(quotes),result=comparisonQuoteColumns(quotes,[])
 expect(result.columns.map(q=>q.id)).toEqual(['a']);expect(result.aliases.b).toBe('a');expect(JSON.stringify(quotes)).toBe(before)
 expect(comparisonQuoteColumns([{...quotes[0],duplicateKey:undefined},quotes[1]],[]).columns.length).toBe(2)
 expect(comparisonQuoteColumns([quotes[0],{...quotes[1],sourceItems:[{...line,unit_price:11}]}],[]).columns.length).toBe(2)
 expect(comparisonQuoteColumns([quotes[0],{...quotes[1],sourceItems:[{...line,description:'LUMBER',specification:'Rephrased extraction'}]}],[]).columns.length).toBe(1)
 expect(comparisonQuoteColumns([quotes[0],{...quotes[1],sourceItems:[{...line,comparison_item_id:'different'}]}],[]).columns.length).toBe(2)
})
test('different source document identity never collapses under the same supplier name',async()=>{
 const q={supplier_name:'Midwood',quote_number:'12022',quote_date:'2026-09-17',file_name:'q.pdf',file_size:18455,mime_type:'application/pdf',raw_text:'Original source'}
 const key=await quoteDuplicateKey(q)
 expect(await quoteDuplicateKey({...q})).toBe(key)
 for(const changed of [{...q,quote_number:'12023'},{...q,quote_date:'2026-09-18'},{...q,raw_text:'Changed original'}])expect(await quoteDuplicateKey(changed)).not.toBe(key)
 expect(await quoteDuplicateKey({...q,raw_text:''})).toBeUndefined()
})
