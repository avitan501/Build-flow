import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {materialPageRanges,nextMissingMaterialChunk,materialChunkInstruction} from '../supabase/functions/client-material-list-ai/chunk-plan'

test('15 source pages covered exactly once in five bounded chunks',()=>{
 const ranges=materialPageRanges(15)
 expect(ranges).toHaveLength(5)
 expect(ranges.flatMap(r=>Array.from({length:r.last-r.first+1},(_,i)=>r.first+i))).toEqual(Array.from({length:15},(_,i)=>i))
 for(const count of [0,-1,193,NaN,1.5]) expect(()=>materialPageRanges(count)).toThrow('document_page_limit')
 expect(materialPageRanges(4)).toEqual([{first:0,last:2},{first:3,last:3}])
})

test('mocked interrupted extraction resumes completed chunks and preserves all 62 source rows',()=>{
 const checkpoint:Record<string,unknown>={}; const paidCalls:number[]=[]
 const extract=(index:number)=>{paidCalls.push(index);if(index===1&&paidCalls.filter(i=>i===1).length===1)throw Error('timeout');return Array.from({length:index===0?31:31},(_,i)=>({sourceRow:index*31+i+1,quantity:'HOLD'}))}
 let index=nextMissingMaterialChunk(checkpoint,2)!
 checkpoint[index]=extract(index)
 expect(()=>extract(nextMissingMaterialChunk(checkpoint,2)!)).toThrow('timeout')
 // New worker only has persisted JSON; no in-memory job state is required.
 const resumed=JSON.parse(JSON.stringify(checkpoint))
 index=nextMissingMaterialChunk(resumed,2)!
 resumed[index]=extract(index)
 expect(nextMissingMaterialChunk(resumed,2)).toBeNull()
 expect(paidCalls).toEqual([0,1,1]) // Failed chunk may retry; completed chunk never does.
 expect(Object.values(resumed).flat()).toHaveLength(62)
 expect(new Set((Object.values(resumed).flat() as Array<{sourceRow:number}>).map(row=>row.sourceRow)).size).toBe(62)
})

test('chunk instructions preserve source holds and avoid repeating typed notes',()=>{
 expect(materialChunkInstruction(0,5,'RFQ pages1-3')).toContain('HOLD')
 expect(materialChunkInstruction(1,5,'RFQ pages4-6')).toContain('Typed notes are context only')
 expect(materialChunkInstruction(0,5,'RFQ pages1-3')).toContain('Plans alone still require takeoff')
})

test('checkpoint contract fences generations and publishes atomically after every chunk',async()=>{
 const sql=await readFile('supabase/migrations/20260914180138_resumable_material_list_chunks.sql','utf8')
 const ai=await readFile('supabase/functions/client-material-list-ai/index.ts','utf8')
 const worker=await readFile('supabase/functions/client-material-list-worker/index.ts','utf8')
 expect(sql).toContain('primary key (job_id, generation)')
 expect(sql).toContain("v_job.generation<>p_generation")
 expect(sql).toContain("raise exception 'incomplete_chunks'")
 expect(sql).toContain('attempts=greatest(attempts-1,0)')
 expect(sql).toContain('from public,anon,authenticated')
 expect(sql).toContain('v_checkpoint.published_at is not null')
 expect(ai).toContain('sourceOnHold ? "check"')
 expect(ai.indexOf('if (sourceError)')).toBeGreaterThan(0)
 expect(ai.indexOf('if (sourceError)')).toBeLessThan(ai.indexOf('apiKey=await openAiKey()'))
 expect(worker).toContain('generation:job.generation')
 expect(worker).toContain('"continue_material_list_job"')
})
