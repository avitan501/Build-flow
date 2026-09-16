import { expect,test } from '@playwright/test'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { requestItemFieldsMetadata } from '../lib/request-item-fields'
import { canonicalItemValue, itemEditSnapshot } from '../lib/request-item-continuity'
import { createHash } from 'node:crypto'
import { validMaterialSpreadsheetFields } from '../lib/material-spreadsheet-draft'

const revisionModule:Record<string,(...args:unknown[])=>string>={}
new Function('exports','require',ts.transpileModule(readFileSync('lib/request-item-revision.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(revisionModule,(name:string)=>name==='server-only'?{}:name==='node:crypto'?{createHash}:{canonicalItemValue,itemEditSnapshot})
const requestItemRevision=revisionModule.requestItemRevision

const input={requestId:'11111111-1111-4111-8111-111111111111',itemId:'22222222-2222-4222-8222-222222222222',name:'TJI 230 I-joist',quantity:22,unit:'pieces',details:'',fields:[{id:'depth',label:'Depth / thickness',value:'9.5 in'},{id:'length',label:'Length',value:'16 ft'}],recognitionText:'22 pc 10 inch TJI 230 — 16 ft',recognitionQuestions:[]}
function fixture(options:{denied?:boolean;requestMissing?:boolean;insertFailure?:boolean}={}) {
  const rows=new Map<string,Record<string,unknown>>();let inserts=0
  const supabase={from(table:string){
    const filters:Record<string,unknown>={}
    const query={select:()=>query,eq:(key:string,value:unknown)=>{filters[key]=value;return query},order:()=>query,limit:()=>query,
      maybeSingle:async()=>({data:table==='quote_requests'?(options.requestMissing?null:{id:input.requestId,project_id:'project',owner_id:'owner'}):filters.id?(rows.get(String(filters.id))?.request_id===filters.request_id?rows.get(String(filters.id)):null):{department:'Lumber'}}),
      insert:async(payload:Record<string,unknown>)=>{inserts++;if(options.insertFailure)return{error:{code:'database-error'}};if(rows.has(String(payload.id)))return{error:{code:'23505'}};rows.set(String(payload.id),structuredClone(payload));return{error:null}}}
    return query
  }}
  const exports:Record<string,(value:typeof input)=>Promise<{ok:boolean;item?:{metadata:Record<string,unknown>};revision?:string}>>={}
  const code=ts.transpileModule(readFileSync('app/owner/materials/requests/spreadsheet-row-actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
  new Function('exports','require',code)(exports,(name:string)=>{
    if(name==='next/cache')return{revalidatePath(){}}
    if(name==='@/lib/auth')return{requireStaffProfile:async(permission:string)=>{expect(permission).toBe('customers');if(options.denied)throw Error('Forbidden');return{supabase,user:{id:'staff'}}}}
    if(name==='@/lib/request-item-revision')return{requestItemRevision}
    if(name==='@/lib/request-item-fields')return{requestItemFieldsMetadata}
    if(name==='@/lib/request-item-continuity')return{canonicalItemValue}
    if(name==='@/lib/material-spreadsheet-draft')return{validMaterialSpreadsheetFields}
    throw Error('Unexpected import '+name)
  })
  return{action:exports.addSpreadsheetMaterialRow,rows,inserts:()=>inserts}
}
test('actual add action persists source/recognized fields and identical retry does not duplicate',async()=>{
  const f=fixture();const first=await f.action(input);const retry=await f.action(input)
  expect(first.ok).toBe(true);expect(retry.ok).toBe(true);expect(retry.revision).toBe(first.revision);expect(f.rows.size).toBe(1)
  expect(first.item?.metadata.source_text).toBe(input.recognitionText)
  expect(first.item?.metadata.request_item_fields).toEqual(input.fields)
  expect(first.item?.metadata.request_item_origin).toBe('manually_added')
})
test('duplicate row changed elsewhere is not overwritten; other-request collision is rejected',async()=>{
  const f=fixture();await f.action(input)
  expect((await f.action({...input,quantity:99})).ok).toBe(false)
  expect(f.rows.get(input.itemId)?.quantity).toBe(22)
  f.rows.set(input.itemId,{...f.rows.get(input.itemId),request_id:'another-request'})
  expect((await f.action(input)).ok).toBe(false)
})
test('permission, invisible request, invalid/truncated fields and failed insert never report saved',async()=>{
  await expect(fixture({denied:true}).action(input)).rejects.toThrow('Forbidden')
  const missing=fixture({requestMissing:true});expect((await missing.action(input)).ok).toBe(false);expect(missing.inserts()).toBe(0)
  expect((await fixture({insertFailure:true}).action(input)).ok).toBe(false)
  const invalid=fixture();expect((await invalid.action({...input,fields:Array(17).fill(input.fields[0])})).ok).toBe(false);expect(invalid.inserts()).toBe(0)
})
