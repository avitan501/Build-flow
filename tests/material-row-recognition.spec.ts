import { test, expect } from "@playwright/test"
import { recognizeMaterialRows, validateRecognizedRows, groundRecognizedRow } from "../lib/material-row-recognition"
const row={id:'1',name:'TJI 230',quantity:12,unit:'pieces',width:'',depth:'9.5 in',length:'26 ft',model:'TJI 230',details:'',questions:[]}
const sources=[{id:'1',text:'12 pc 10 inch TJI 230 26 ft'}]
test('strict coverage rejects missing, invented, repeated and invalid rows',()=>{
 for(const rows of [[],[row,row],[{...row,id:'other'}],[{...row,quantity:-1}],[{...row,unit:3}]])expect(()=>validateRecognizedRows({rows},sources)).toThrow()
 expect(validateRecognizedRows({rows:[row]},sources)[0].width).toBe('')
})
test('recognition transmits explicit scoped answers and preserves original input',async()=>{
 const before=JSON.stringify(sources);let payload:Record<string,unknown>={}
 const result=await recognizeMaterialRows(sources,'TJI only: 10 means9.5',{apiKey:'test-only',conventions:{tjiTenIsNineHalf:true},fetcher:async(_,init)=>{payload=JSON.parse(String(init?.body));return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({rows:[row]})}]}]}))}})
 expect(result.rows).toEqual([row]);expect(payload.store).toBe(false);expect(String(payload.input)).toContain('TJI only');expect(JSON.stringify(sources)).toBe(before)
})
test('only explicit scoped conventions normalize depth, not model guesses',()=>{
 expect(groundRecognizedRow(row,sources[0]).depth).toBe('10 in')
 expect(groundRecognizedRow(row,sources[0],{tjiTenIsNineHalf:true}).depth).toBe('9.5 in')
 const lvl={id:'1',text:'12 pc 10 inch LVL 26 ft'}
 expect(groundRecognizedRow(row,lvl,{tjiTenIsNineHalf:true}).depth).toBe('10 in')
 expect(groundRecognizedRow(row,lvl,{lvlTenIsNineHalf:true}).depth).toBe('9.5 in')
})
test('provider failure or truncation is never a successful empty list',async()=>{
 await expect(recognizeMaterialRows(sources,'',{apiKey:'test',fetcher:async()=>new Response('{}',{status:429})})).rejects.toThrow('429')
 await expect(recognizeMaterialRows(sources,'',{apiKey:'test',fetcher:async()=>new Response('{"status":"incomplete"}')})).rejects.toThrow('did not finish')
})
test('real AI regression: TJI depth is not width; lumber and LVL dimensions split correctly',()=>{
 expect(groundRecognizedRow({...row,width:'10 in'},sources[0]).width).toBe('')
 expect(groundRecognizedRow({...row,width:'2x6',depth:''},{id:'1',text:'12 pc 2x6 by 16 ft'})).toMatchObject({width:'2 in',depth:'6 in',length:'16 ft'})
 expect(groundRecognizedRow({...row,width:'1-3/4 in',depth:''},{id:'1',text:'12 pc 1-3/4x11-1/4 LVL by 24 ft'})).toMatchObject({width:'1.75 in',depth:'11.25 in',length:'24 ft'})
 expect(groundRecognizedRow({...row,length:'deck (sheet)'},{id:'1',text:'12 pc plywood 3/4 deck'})).toMatchObject({width:'',length:''})
 expect(groundRecognizedRow({...row,quantity:5},{id:'1',text:'5 box nails'}).questions.join(' ')).toContain('units per box')
})
