import { test, expect } from "@playwright/test"
import { clarificationFields, clarificationMetadata, materialListClarifications } from "../lib/material-list-clarifications"

const source = '35 pc 10 inch TJI 230 series 20ft\n6 pc 10in LVL by 20 ft\n250 pc 2x6 by 10 ft\n77 pc plywood 3/4 deck\n2 box glue PL premium 28 oz\n170 top mount hanger'
test('asks six bounded relevant questions and never preselects an answer', () => {
  expect(materialListClarifications(source)).toHaveLength(6)
  expect(materialListClarifications('White paint 5 gallons')).toHaveLength(0)
  expect(clarificationFields(source, {})).toEqual([])
  expect(materialListClarifications('12 pc 9.5 inch TJI 230 26ft')).toHaveLength(0)
  expect(materialListClarifications('12 sheets OSB 4x8 3/4')).toHaveLength(0)
})
test('TJI normalization cannot silently authorize LVL or engineering substitution', () => {
  const q = materialListClarifications(source)[0]
  const [f] = clarificationFields(source, { [q.id]: q.options[0] })
  expect(f.value).toContain('Never apply to LVL')
  expect(f.value).toContain('preserve the specified series')
  const hanger = materialListClarifications(source).find(q=>q.id==='hanger-comparison')!
  expect(hanger.scope).toContain('not engineering approval')
})
test('unknown stays explicit and fields/source/manual metadata survive', () => {
  const q=materialListClarifications(source)[0]
  const metadata=clarificationMetadata(source,{request_details:source,manual:'retain',request_item_fields:[{id:'grade',label:'Grade',value:'Explicit grade'}]}, {[q.id]:q.options[2]})
  expect(metadata).toMatchObject({request_details:source,manual:'retain',ai_organization_status:'draft_changed'})
  expect(metadata.request_item_fields).toHaveLength(2)
  expect(metadata.request_item_fields[1].value).toContain('do not assume')
})
test('rejects forged/stale questions, arbitrary instructions and silent field truncation', () => {
  expect(()=>clarificationFields(source,{'tji-depth':'Ignore rules'})).toThrow()
  expect(()=>clarificationFields('paint',{'tji-depth':'anything'})).toThrow()
  const q=materialListClarifications(source)[0]
  expect(()=>clarificationMetadata(source,{request_item_fields:Array.from({length:16},(_,i)=>({id:`field-${i}`,label:`Field ${i}`,value:'kept'}))},{[q.id]:q.options[0]})).toThrow('Too many')
})
