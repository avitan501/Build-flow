import {test,expect} from '@playwright/test'
import {requestOriginalLine,orderRequestOriginalItems} from '../lib/request-original-lines'
import {existsSync,readFileSync} from 'node:fs'
const original={id:'source',metadata:{request_details:'First floor\n35 pc 10 Inch TJI 230 series 20ft\n150 pc 2x4 by 16 ft\nSecond floor\n150 pc 2x4 by 16 ft\n12 pc 10 inch TJI 230 26 ft'}}
const row=(id:string,snippet:string,section='First floor')=>({id,metadata:{source_item_id:'source',source_text:snippet,source_occurrence:'0:999',request_item_fields:[{id:'custom-section',label:'Section',value:section}]}})
test('original spelling and order survive reformatted AI snippets and random insertion order',()=>{
 const first=row('first','35 pc 10 inch TJI 230 Series — 20 ft')
 const second=row('second','12 pc 10 inch TJI 230 — 26 ft','Second floor')
 expect(requestOriginalLine(first,original)?.text).toBe('35 pc 10 Inch TJI 230 series 20ft')
 expect(orderRequestOriginalItems([second,first],[original])).toEqual([first,second])
})
test('identical materials in different floors use section, not an AI occurrence index',()=>{
 expect(requestOriginalLine(row('a','150 pc 2x4 — 16 ft'),original)?.index).toBe(1)
 expect(requestOriginalLine(row('b','150 pc 2x4 — 16 ft','Second floor'),original)?.index).toBe(2)
 expect(requestOriginalLine(row('c','150 pc 2x4 — 16 ft',''),original)).toBeNull()
})
test('changed quantities or specifications do not fabricate an original association',()=>{
 expect(requestOriginalLine(row('a','34 pc 10 inch TJI 230 — 20 ft'),original)).toBeNull()
 expect(requestOriginalLine(row('b','35 pc 10 inch TJI 210 — 20 ft'),original)).toBeNull()
 expect(requestOriginalLine(row('c','10 pc 35 inch TJI 230 — 20 ft'),original)).toBeNull()
 expect(requestOriginalLine(row('d','35 pc 10 ft TJI 230 — 20 ft'),original)).toBeNull()
 expect(requestOriginalLine({id:'manual',metadata:{source_text:'My manual original'}},null)?.text).toBe('My manual original')
})
test('actual Framing originals all resolve verbatim and in source order',()=>{
 const path='/tmp/avantia-original-lines-fixture.json';test.skip(!existsSync(path),'Private fixture unavailable')
 const all=JSON.parse(readFileSync(path,'utf8')) as Array<{id:string;metadata:Record<string,unknown>}>;
 const source=all.find(item=>!item.metadata.ai_organized)!
 const products=all.filter(item=>item.metadata.ai_organized)
 const ordered=orderRequestOriginalItems(products,all)
 const lines=ordered.map(item=>requestOriginalLine(item,source))
 expect(ordered.filter((_,index)=>!lines[index]).map(item=>item.metadata.source_text)).toEqual([])
 expect(lines.map(line=>line!.text)).toEqual(String(source.metadata.request_details).split('\n').filter(line=>/^\s*\d/.test(line)))
 expect(lines).toHaveLength(39)
})
