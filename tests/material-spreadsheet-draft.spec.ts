import { test, expect } from "@playwright/test"
import { materialSpreadsheetDraft, editMaterialMeasurement, recognizedMaterialDraft } from "../lib/material-spreadsheet-draft"
import { materialCleanLine } from "../lib/material-clean-line"
import { requestItemFieldsMetadata } from "../lib/request-item-fields"
import { relevantMaterialQuestions, type RecognizedMaterialRow } from "../lib/material-row-recognition"

const item={id:'one',name:'TJI 230 I-joist',quantity:12,unit:'pieces',department:'Framing',metadata:{ai_organized:true,source_text:'12 pc 10 inch TJI230 —26ft',request_item_fields:[{id:'dimensions',label:'Size / dimensions',value:'10 in × 26 ft'},{id:'length',label:'Length',value:'26 ft'},{id:'section',label:'Section',value:'Second floor'}]}}
test('legacy saved dimensions appear in separate inputs without doubling the copied line',()=>{
  const draft=materialSpreadsheetDraft(item)
  expect(draft.fields.find(f=>f.id==='depth')?.value).toBe('10 in')
  expect(draft.fields.find(f=>f.id==='width')).toBeUndefined()
  expect(draft.fields.some(f=>f.id==='dimensions')).toBe(false)
  expect(materialCleanLine(draft).match(/26 ft/g)).toHaveLength(1)
})
test('manual depth edits replace stale dimensions and survive metadata round-trip; cleared fields remain clear',()=>{
  const edited=editMaterialMeasurement(materialSpreadsheetDraft(item),'depth','Depth / thickness','9.5 in')
  const saved={...item,metadata:{...item.metadata,...requestItemFieldsMetadata(edited.fields)}}
  expect(materialCleanLine(materialSpreadsheetDraft(saved))).toBe(materialCleanLine(edited))
  expect(materialCleanLine(materialSpreadsheetDraft(saved))).not.toContain('10 in')
  const cleared=editMaterialMeasurement(edited,'depth','Depth / thickness','')
  const clearedSaved={...saved,metadata:{...saved.metadata,...requestItemFieldsMetadata(cleared.fields)}}
  expect(materialSpreadsheetDraft(clearedSaved).fields.some(f=>f.id==='depth')).toBe(false)
})
test('recognition replaces structured fields in one step while retaining floor and original draft for undo',()=>{
  const draft=materialSpreadsheetDraft(item),before=JSON.stringify(draft)
  const row:RecognizedMaterialRow={id:'one',name:'TJI 230',quantity:22,unit:'pieces',width:'',depth:'9.5 in',length:'16 ft',model:'230 Series',details:'',questions:[]}
  const next=recognizedMaterialDraft(draft,row)
  expect(next.quantity).toBe('22');expect(materialCleanLine(next)).toContain('16 ft')
  expect(materialCleanLine(next)).toContain('Second floor');expect(JSON.stringify(draft)).toBe(before)
  expect(next.fields.some(f=>f.id==='dimensions'||f.id==='thickness')).toBe(false)
})
test('TJI questions discard generic brand/width/box prompts but retain depth and actual package questions',()=>{
  const questions=['Confirm the manufacturer/brand','Is there a nominal width?','Are the pieces packaged or boxed?','Confirm grade or performance specification','Confirm required depth','Confirm the delivery address']
  expect(relevantMaterialQuestions(questions,'12 pc 10 inch TJI 230 26ft')).toEqual(['Confirm required depth'])
  expect(relevantMaterialQuestions(['Confirm units per box','Confirm hanger width'],'2 boxes of joist hangers')).toEqual(['Confirm units per box','Confirm hanger width'])
})
